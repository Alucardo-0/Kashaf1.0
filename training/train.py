"""
Train KMeans models for each unit.

For each unit:
  1. Load all player events from StatsBomb data
  2. Extract core features
  3. Filter players below MIN_EVENTS_THRESHOLD
  4. Normalize with StandardScaler
  5. Fit KMeans
  6. Remove outliers (> OUTLIER_STD_THRESHOLD from nearest centroid)
  7. Refit on clean pool
  8. Save model + scaler + reference pool to disk
"""

import json
import pickle
import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from config.settings import (
    K_VALUES, N_INIT, RANDOM_STATE,
    OUTLIER_STD_THRESHOLD, MIN_EVENTS_THRESHOLD, MIN_EVENTS_THRESHOLD_BY_UNIT,
    ISOLATION_FOREST_CONTAMINATION,
    POSITION_UNIT_MAP,
    DIAG_MAX_WARNINGS_BEFORE_ABORT,
    DIAG_CORE_ZERO_ABORT_COUNT,
    DIAG_MISSING_CRITICAL_ACTION_ABORT_COUNT,
    DIAG_PASS_SUCCESS_ABORT_THRESHOLD,
    DIAG_PASS_SUCCESS_WARN_THRESHOLD,
    DIAG_END_COVERAGE_ABORT_THRESHOLD,
    DIAG_END_COVERAGE_WARN_THRESHOLD,
)
from extractors.statsbomb import extract_player_events_from_competition
from extractors.base import events_to_dataframe
import features.cb as cb
import features.fb as fb
import features.mf as mf
import features.wg as wg
import features.st as st

# Maps StatsBomb full position names → our abbreviations
SB_POSITION_NAME_MAP = {
    "Center Back":            "CB",
    "Left Center Back":       "CB",
    "Right Center Back":      "CB",
    "Left Back":              "LB",
    "Right Back":             "RB",
    "Left Wing Back":         "LB",
    "Right Wing Back":        "RB",
    "Defensive Midfield":     "DM",
    "Left Defensive Midfield":"DM",
    "Right Defensive Midfield":"DM",
    "Center Midfield":        "CM",
    "Left Center Midfield":   "CM",
    "Right Center Midfield":  "CM",
    "Attacking Midfield":     "AM",
    "Left Attacking Midfield":"AM",
    "Right Attacking Midfield":"AM",
    "Left Wing":              "LW",
    "Right Wing":             "RW",
    "Left Midfield":          "LW",
    "Right Midfield":         "RW",
    "Center Forward":         "ST",
    "Left Center Forward":    "ST",
    "Right Center Forward":   "ST",
    "Secondary Striker":      "ST",
}

FEATURE_MODULES = {"cb": cb, "fb": fb, "mf": mf, "wg": wg, "st": st}

EVENTS_DIR  = Path("data/statsbomb/data/events")
LINEUPS_DIR = Path("data/statsbomb/data/lineups")
MATCHES_DIR = Path("data/statsbomb/data/matches")
OUTPUT_DIR  = Path("models")
OUTPUT_DIR.mkdir(exist_ok=True)


def _safe_console_text(text: str) -> str:
    """Returns text safely representable in the current stdout encoding."""
    encoding = getattr(sys.stdout, "encoding", None) or "utf-8"
    return text.encode(encoding, errors="replace").decode(encoding, errors="replace")


def _safe_name(name: str, max_len: int = 50) -> str:
    """Shortens and normalizes player names for progress printing."""
    return _safe_console_text(name[:max_len])


def _events_threshold(unit: str) -> int:
    """Returns the configured minimum event threshold for a given unit."""
    return MIN_EVENTS_THRESHOLD_BY_UNIT.get(unit, MIN_EVENTS_THRESHOLD)


def _load_match_gender_map(matches_dir: Path) -> dict[str, str]:
    """Loads {match_id: gender} from StatsBomb matches metadata."""
    match_gender: dict[str, str] = {}

    for season_file in matches_dir.glob("*/*.json"):
        with open(season_file, encoding="utf-8") as f:
            matches = json.load(f)
        for match in matches:
            match_id = str(match.get("match_id"))
            competition = match.get("competition", {}) or {}
            raw_gender = str(competition.get("competition_gender", "")).strip().lower()
            competition_name = str(competition.get("competition_name", "")).strip().lower()
            combined = f"{raw_gender} {competition_name}"

            if any(token in combined for token in ("female", "women", "woman", "girls")):
                gender = "female"
            else:
                # Treat non-female competitions as male so we only exclude
                # explicitly female datasets.
                gender = "male"

            match_gender[match_id] = gender

    return match_gender


def _filter_registry_to_male_matches(
    player_registry: dict[str, list[str]],
    match_gender: dict[str, str],
) -> dict[str, list[str]]:
    """Keeps only male matches in each player's registry entry."""
    filtered: dict[str, list[str]] = {}
    for player_name, match_ids in player_registry.items():
        male_ids = [mid for mid in match_ids if match_gender.get(str(mid)) == "male"]
        if male_ids:
            filtered[player_name] = male_ids
    return filtered


def load_player_registry(
    lineups_dir: Path,
    player_index: dict[str, list[str]],
) -> dict[str, list[str]]:
    """
    Returns the player index directly; kept signature-compatible with callers.
    """

    return player_index


def _strip_season(versioned_name: str) -> str:
    """Converts 'Name [Season]' -> 'Name' for lineup/extractor matching."""
    if " [" in versioned_name:
        return versioned_name[:versioned_name.rfind(" [")]
    return versioned_name


def build_player_unit_map(
    lineups_dir: Path,
    player_index: dict[str, list[str]],
) -> dict[str, str]:
    """
    Reads lineup files once, then maps versioned player keys to dominant unit.
    """
    position_counts: dict[str, dict[str, int]] = {}
    lineup_files = list(lineups_dir.glob("*.json"))

    for i, lineup_file in enumerate(lineup_files, 1):
        print(f"    Reading lineup files... {i}/{len(lineup_files)}", end="\r")
        with open(lineup_file, encoding="utf-8") as f:
            lineups = json.load(f)
        for team in lineups:
            for player in team.get("lineup", []):
                name = player["player_name"]
                for pos_entry in player.get("positions", []):
                    pos = pos_entry.get("position", {})
                    pos_name = pos.get("name", "") if isinstance(pos, dict) else str(pos)
                    pos_abbr = SB_POSITION_NAME_MAP.get(pos_name)
                    if pos_abbr and pos_abbr in POSITION_UNIT_MAP:
                        unit = POSITION_UNIT_MAP[pos_abbr]
                        position_counts.setdefault(name, {})
                        position_counts[name][unit] = position_counts[name].get(unit, 0) + 1
    print()

    raw_name_to_unit = {
        name: max(units, key=units.get)
        for name, units in position_counts.items()
    }

    return {
        versioned_key: raw_name_to_unit[raw_name]
        for versioned_key in player_index
        if (raw_name := _strip_season(versioned_key)) in raw_name_to_unit
    }


def build_feature_matrix(
    unit: str,
    player_registry: dict[str, list[str]],
    player_unit_map: dict[str, str],
) -> tuple[pd.DataFrame, list[str]]:
    """Builds core features for all player-seasons in the given unit."""
    module = FEATURE_MODULES[unit]
    rows, names = [], []

    unit_players = [
        (key, match_ids)
        for key, match_ids in player_registry.items()
        if player_unit_map.get(key) == unit
    ]
    print(f"  {len(unit_players)} player-seasons mapped to {unit.upper()}")

    skipped_threshold = 0
    errors = 0
    threshold = _events_threshold(unit)

    for i, (versioned_key, match_ids) in enumerate(unit_players, 1):
        print(f"  [{i}/{len(unit_players)}] {_safe_name(versioned_key):<50}", end="\r")

        raw_name = _strip_season(versioned_key)
        try:
            events = extract_player_events_from_competition(
                EVENTS_DIR, match_ids, raw_name
            )
        except Exception:
            errors += 1
            continue

        if len(events) < threshold:
            skipped_threshold += 1
            continue

        df = events_to_dataframe(events)
        core = module.extract_core_features(df)
        core["player_name"] = versioned_key
        rows.append(core)
        names.append(versioned_key)

    print()
    print(f"  OK Qualified: {len(names)}  X Too few events: {skipped_threshold}  X Errors: {errors}")

    if not rows:
        print(f"  WARNING: No player-seasons found for unit '{unit}'")
        return pd.DataFrame(), []

    feature_df = pd.DataFrame(rows).set_index("player_name")
    return feature_df, names

def diagnose_unit_sample(
    unit: str,
    player_registry: dict[str, list],
    player_unit_map: dict[str, str],
) -> bool:
    """
    Smoke test: extracts core + context features for the first eligible player.
    Returns True for healthy or warning-only cases, False on severe issues.
    """
    module = FEATURE_MODULES[unit]
    print(f"  Running diagnostic for {unit.upper()}...")

    EXPECTED_CORE_COUNTS = {"cb": 6, "fb": 5, "mf": 6, "wg": 6, "st": 5}
    EXPECTED_CTX_COUNTS = {"cb": 6, "fb": 6, "mf": 8, "wg": 7, "st": 6}
    threshold = _events_threshold(unit)


    RATIO_FEATURES = {
        "tackle_ratio", "tackle_to_interception_ratio",
        "cut_inside_carry_pct", "penalty_area_touch_pct",
        "drop_deep_reception_pct", "pass_completion_pct",
        "dribble_success_pct", "tackle_win_pct", "cross_completion_pct",
        "progressive_pass_pct", "headed_shots_pct",
    }

    for player_name, match_ids in player_registry.items():
        if player_unit_map.get(player_name) != unit:
            continue

        raw_name = _strip_season(player_name)
        try:
            events = extract_player_events_from_competition(EVENTS_DIR, match_ids, raw_name)
        except Exception as exc:
            print(f"  Diagnostic skip ({_safe_name(player_name)}): {exc}")
            continue

        if len(events) < threshold:
            continue

        df = events_to_dataframe(events)
        errors: list[str] = []
        warnings: list[str] = []
        success_rate: float | None = None

        # Core features
        try:
            core = module.extract_core_features(df)
        except Exception as exc:
            print(f"  X CORE extraction crashed for {player_name}: {exc}")
            return False

        expected_core = EXPECTED_CORE_COUNTS[unit]
        if len(core) != expected_core:
            errors.append(f"core has {len(core)} features, expected {expected_core}")

        core_zeros = [k for k, v in core.items() if v == 0.0 and k not in RATIO_FEATURES]
        if len(core_zeros) >= DIAG_CORE_ZERO_ABORT_COUNT:
            errors.append(f"too many core zeros: {core_zeros}")
        elif core_zeros:
            warnings.append(f"core zeros: {core_zeros}")

        # Context features
        try:
            context = module.extract_context_features(df)
        except Exception as exc:
            print(f"  X CONTEXT extraction crashed for {player_name}: {exc}")
            return False

        expected_ctx = EXPECTED_CTX_COUNTS[unit]
        if len(context) != expected_ctx:
            errors.append(f"context has {len(context)} features, expected {expected_ctx}")

        ctx_zeros = [k for k, v in context.items() if v == 0.0 and k not in RATIO_FEATURES]
        if len(ctx_zeros) == len(context):
            errors.append("all context features are 0")
        elif ctx_zeros:
            warnings.append(f"context zeros: {ctx_zeros}")

        # Action type sanity check
        action_counts = df["action_type"].value_counts().to_dict()
        unit_critical = {
            "cb": ["tackle", "interception", "aerial", "pass"],
            "fb": ["pass", "carry", "tackle"],
            "mf": ["pass", "carry", "tackle"],
            "wg": ["dribble", "pass", "carry"],
            "st": ["shot", "reception"],
        }
        missing_actions = [
            a for a in unit_critical[unit]
            if action_counts.get(a, 0) == 0
        ]
        if len(missing_actions) >= DIAG_MISSING_CRITICAL_ACTION_ABORT_COUNT:
            errors.append(f"missing critical actions: {missing_actions}")
        elif missing_actions:
            warnings.append(f"missing one critical action: {missing_actions}")

        # Pass outcome sanity check
        passes = df[df["action_type"] == "pass"]
        if not passes.empty:
            success_rate = (passes["outcome"] == True).mean()
            if success_rate <= DIAG_PASS_SUCCESS_ABORT_THRESHOLD:
                errors.append(f"pass success <= {DIAG_PASS_SUCCESS_ABORT_THRESHOLD:.0%}")
            elif success_rate < DIAG_PASS_SUCCESS_WARN_THRESHOLD:
                warnings.append(f"low pass success: {success_rate:.1%}")

        # End coordinate coverage
        pass_end_coverage = (
            df[df["action_type"] == "pass"]["end_x"].notna().mean()
            if (df["action_type"] == "pass").any() else 1.0
        )
        carry_end_coverage = (
            df[df["action_type"] == "carry"]["end_x"].notna().mean()
            if (df["action_type"] == "carry").any() else 1.0
        )
        if pass_end_coverage < DIAG_END_COVERAGE_ABORT_THRESHOLD:
            errors.append(f"very low pass end_x coverage: {pass_end_coverage:.1%}")
        elif pass_end_coverage < DIAG_END_COVERAGE_WARN_THRESHOLD:
            warnings.append(f"low pass end_x coverage: {pass_end_coverage:.1%}")

        if carry_end_coverage < DIAG_END_COVERAGE_ABORT_THRESHOLD:
            errors.append(f"very low carry end_x coverage: {carry_end_coverage:.1%}")
        elif carry_end_coverage < DIAG_END_COVERAGE_WARN_THRESHOLD:
            warnings.append(f"low carry end_x coverage: {carry_end_coverage:.1%}")

        # Report
        if errors:
            print(f"  X Diagnostic FAILED for {_safe_name(player_name)}:")
            for issue in errors:
                print(f"      - {issue}")
            print(f"  X Aborting {unit.upper()} training due to severe diagnostic issues.")
            return False

        if len(warnings) >= DIAG_MAX_WARNINGS_BEFORE_ABORT:
            print(f"  X Diagnostic FAILED for {_safe_name(player_name)}: too many warnings ({len(warnings)}).")
            for issue in warnings:
                print(f"      - {issue}")
            print(f"  X Aborting {unit.upper()} training (warning limit={DIAG_MAX_WARNINGS_BEFORE_ABORT}).")
            return False

        if warnings:
            print(f"  ! Diagnostic warnings for {_safe_name(player_name)}:")
            for issue in warnings:
                print(f"      - {issue}")

        pass_success_text = f"{success_rate:.0%}" if success_rate is not None else "N/A"
        print(
            f"  OK Diagnostic sample: {_safe_name(player_name)} | "
            f"events={len(df)} | matches={df['match_id'].nunique()} | "
            f"core={len(core)} | context={len(context)} | "
            f"pass_success={pass_success_text}"
        )
        return True

    print(f"  X No eligible {unit.upper()} player found (threshold={threshold}).")
    return False

def remove_outliers_isolation_forest(
    X_scaled: np.ndarray,
    player_names: list[str],
    unit: str,
    contamination: float = 0.05,
) -> tuple[np.ndarray, list[str]]:
    """
    First-pass outlier removal using Isolation Forest before KMeans fitting.
    """
    contamination = ISOLATION_FOREST_CONTAMINATION.get(unit, contamination)
    clf = IsolationForest(
        contamination=contamination,
        random_state=RANDOM_STATE,
        n_estimators=200,
    )
    preds = clf.fit_predict(X_scaled)
    mask = preds == 1

    removed = int((~mask).sum())
    if removed > 0:
        print(f"  Isolation Forest removed {removed} outliers from {unit.upper()}")

    return X_scaled[mask], [n for n, m in zip(player_names, mask) if m]


def remove_outliers_centroid(
    X_scaled: np.ndarray,
    player_names: list[str],
    kmeans: KMeans,
    unit: str,
) -> tuple[np.ndarray, list[str]]:
    """
    Second-pass outlier removal after KMeans fitting.
    Removes players far from centroids and drops degenerate clusters.
    """
    from config.settings import MIN_CLUSTER_POPULATION

    distances = np.min(
        np.linalg.norm(
            X_scaled[:, np.newaxis] - kmeans.cluster_centers_,
            axis=2,
        ),
        axis=1,
    )
    mean_d = distances.mean()
    std_d = distances.std()
    dist_mask = distances <= (mean_d + OUTLIER_STD_THRESHOLD * std_d)

    labels = kmeans.predict(X_scaled)
    cluster_counts: dict[int, int] = {}
    for label, keep in zip(labels, dist_mask):
        if keep:
            cluster_counts[label] = cluster_counts.get(label, 0) + 1

    degenerate = {
        label for label, count in cluster_counts.items()
        if count < MIN_CLUSTER_POPULATION
    }
    if degenerate:
        print(
            f"  WARNING Degenerate clusters in {unit.upper()}: "
            f"{sorted(degenerate)} (< {MIN_CLUSTER_POPULATION} members) - removing"
        )

    pop_mask = np.array([label not in degenerate for label in labels])
    final_mask = dist_mask & pop_mask

    return (
        X_scaled[final_mask],
        [n for n, m in zip(player_names, final_mask) if m],
    )


def train_unit(unit: str, player_registry: dict, player_unit_map: dict):
    """
    Trains one unit using two-pass outlier removal:
    1) Isolation Forest pre-filter before first KMeans fit
    2) Centroid distance + population check post-fit
    """
    print(f"\n{'=' * 50}")
    print(f"  Training {unit.upper()}")
    print(f"{'=' * 50}")

    healthy = diagnose_unit_sample(unit, player_registry, player_unit_map)
    if not healthy:
        print(f"  Skipping {unit.upper()} - diagnostic failed.")
        return

    module = FEATURE_MODULES[unit]
    threshold = _events_threshold(unit)

    core_rows, context_rows, player_names = [], [], []
    unit_players = [
        (key, match_ids)
        for key, match_ids in player_registry.items()
        if player_unit_map.get(key) == unit
    ]

    for i, (versioned_key, match_ids) in enumerate(unit_players, 1):
        print(f"  [{i}/{len(unit_players)}] {_safe_name(versioned_key):<50}", end="\r")

        raw_name = _strip_season(versioned_key)
        try:
            events = extract_player_events_from_competition(EVENTS_DIR, match_ids, raw_name)
        except Exception:
            continue

        if len(events) < threshold:
            continue

        df = events_to_dataframe(events)
        core = module.extract_core_features(df)
        context = module.extract_context_features(df)

        core["player_name"] = versioned_key
        core_rows.append(core)
        context_rows.append({"player_name": versioned_key, **context})
        player_names.append(versioned_key)

    print()

    if not core_rows or len(player_names) < K_VALUES[unit]:
        print(f"  Not enough player-seasons ({len(player_names)}), skipping.")
        return

    feature_df = pd.DataFrame(core_rows).set_index("player_name")
    context_df = pd.DataFrame(context_rows).set_index("player_name")

    X = feature_df.values.astype(float)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print(f"  Players before outlier removal: {len(player_names)}")

    # Pass 1: Isolation Forest pre-filter
    X_pre, names_pre = remove_outliers_isolation_forest(X_scaled, player_names, unit)
    print(f"  After Isolation Forest: {len(names_pre)}")
    if len(names_pre) < K_VALUES[unit]:
        print(f"  Not enough player-seasons after Isolation Forest ({len(names_pre)}), skipping.")
        return

    print(f"  Fitting pre-filter KMeans (k={K_VALUES[unit]})...")
    kmeans = KMeans(n_clusters=K_VALUES[unit], n_init=N_INIT, random_state=RANDOM_STATE)
    kmeans.fit(X_pre)

    # Pass 2: centroid distance + population filter
    X_clean, clean_names = remove_outliers_centroid(X_pre, names_pre, kmeans, unit)
    print(f"  After centroid pass: {len(clean_names)}")
    if len(clean_names) < K_VALUES[unit]:
        print(f"  Not enough player-seasons after centroid pass ({len(clean_names)}), skipping.")
        return

    kmeans_final = KMeans(n_clusters=K_VALUES[unit], n_init=N_INIT, random_state=RANDOM_STATE)
    kmeans_final.fit(X_clean)

    unit_dir = OUTPUT_DIR / unit
    unit_dir.mkdir(exist_ok=True)

    with open(unit_dir / "kmeans.pkl", "wb") as f:
        pickle.dump(kmeans_final, f)
    with open(unit_dir / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    ref_pool = {
        name: X_clean[i].tolist()
        for i, name in enumerate(clean_names)
    }
    with open(unit_dir / "reference_pool.json", "w", encoding="utf-8") as f:
        json.dump(ref_pool, f, ensure_ascii=False, indent=2)

    ref_context = {
        name: {k: round(float(v), 4) for k, v in context_df.loc[name].to_dict().items()}
        for name in clean_names
        if name in context_df.index
    }
    with open(unit_dir / "reference_context.json", "w", encoding="utf-8") as f:
        json.dump(ref_context, f, ensure_ascii=False, indent=2)

    with open(unit_dir / "feature_cols.json", "w", encoding="utf-8") as f:
        json.dump(list(feature_df.columns), f, ensure_ascii=False)

    print(f"  OK Saved to {unit_dir}/")


def train_all():
    if not EVENTS_DIR.exists():
        raise FileNotFoundError(f"Events dir not found: {EVENTS_DIR.resolve()}")
    if not LINEUPS_DIR.exists():
        raise FileNotFoundError(f"Lineups dir not found: {LINEUPS_DIR.resolve()}")
    if not MATCHES_DIR.exists():
        raise FileNotFoundError(f"Matches dir not found: {MATCHES_DIR.resolve()}")

    index_path = Path("data/statsbomb/player_index.json")
    if not index_path.exists():
        raise FileNotFoundError(
            "Player index not found. Run first:\n"
            "  python -m tools.build_player_index"
        )

    with open(index_path, encoding="utf-8") as f:
        player_index = json.load(f)
    print(f"  OK Loaded player index: {len(player_index)} player-seasons")

    match_gender = _load_match_gender_map(MATCHES_DIR)
    male_count = sum(1 for g in match_gender.values() if g == "male")
    female_count = sum(1 for g in match_gender.values() if g == "female")
    unknown_count = sum(1 for g in match_gender.values() if g == "unknown")
    print(
        f"  Match metadata loaded: male={male_count}, "
        f"female={female_count}, unknown={unknown_count}"
    )

    player_registry = load_player_registry(LINEUPS_DIR, player_index)
    player_registry = _filter_registry_to_male_matches(player_registry, match_gender)
    print(f"  Male-only player registry: {len(player_registry)} player-seasons")

    player_unit_map = build_player_unit_map(LINEUPS_DIR, player_registry)

    print(f"Events:  {len(list(EVENTS_DIR.glob('*.json')))} files")
    print(f"Lineups: {len(list(LINEUPS_DIR.glob('*.json')))} files")
    print(f"Player-seasons in registry: {len(player_registry)}")
    print(f"Player-seasons with known unit: {len(player_unit_map)}")

    for unit in K_VALUES:
        train_unit(unit, player_registry, player_unit_map)


if __name__ == "__main__":
    train_all()