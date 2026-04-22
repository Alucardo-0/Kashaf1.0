"""
Builds the human-readable scouting report dict.
"""

import json
import numpy as np
from pathlib import Path
import pickle

from inference.profile import profile_player
from inference.twins import find_twins

MODELS_DIR = Path("models")

PERCENTAGE_FIELDS = {
    "pass_completion_pct",
    "dribble_success_pct",
    "tackle_win_pct",
    "cross_completion_pct",
    "progressive_pass_pct",
    "cut_inside_carry_pct",
    "penalty_area_touch_pct",
    "drop_deep_reception_pct",
}

# Archetypes indicating insufficient data rather than a stable profile.
INSUFFICIENT_DATA_ARCHETYPES = {"Sweeper"}
INSUFFICIENT_DATA_THRESHOLD = 60.0


def _round_floats(obj, decimals: int = 4):
    """Recursively normalize numpy/python numeric scalars and round floats."""
    if isinstance(obj, np.floating):
        return round(float(obj), decimals)
    if isinstance(obj, float):
        return round(obj, decimals)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, dict):
        return {k: _round_floats(v, decimals) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_round_floats(v, decimals) for v in obj]
    return obj


def _get_scaled_vector(core_features: dict, unit: str) -> np.ndarray:
    with open(MODELS_DIR / unit / "scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    with open(MODELS_DIR / unit / "feature_cols.json", encoding="utf-8") as f:
        feature_cols = json.load(f)
    x = np.array([core_features[col] for col in feature_cols], dtype=float).reshape(1, -1)
    return scaler.transform(x)[0]


def _filter_and_renormalize(
    archetypes: dict[str, float],
) -> tuple[dict[str, float], str | None]:
    """
    Removes insufficient-data archetypes from display unless they dominate.
    If an insufficient-data archetype dominates, returns warning and leaves
    archetypes unchanged.
    """
    for archetype, pct in archetypes.items():
        if archetype in INSUFFICIENT_DATA_ARCHETYPES and pct >= INSUFFICIENT_DATA_THRESHOLD:
            return archetypes, (
                "Insufficient match data for a reliable profile. "
                "Add more matches to improve accuracy. "
                f"(Profile dominated by '{archetype}' at {pct:.1f}%)"
            )

    filtered = {
        k: v for k, v in archetypes.items()
        if k not in INSUFFICIENT_DATA_ARCHETYPES
    }

    total = sum(filtered.values())
    if total == 0:
        return archetypes, None

    renormalized = {
        k: round((v / total) * 100, 4)
        for k, v in filtered.items()
    }
    return renormalized, None


def build_report(
    events_df,
    unit: str,
    player_name: str,
) -> dict:
    """Builds full scouting report with insufficient-data archetype filtering."""
    profile = profile_player(events_df, unit)
    x_scaled = _get_scaled_vector(profile["core_features"], unit)
    twins = find_twins(x_scaled, unit, exclude_name=player_name)

    raw_archetypes = {
        k: round(v * 100, 4)
        for k, v in profile["archetypes"].items()
    }
    archetypes, data_warning = _filter_and_renormalize(raw_archetypes)

    top_archetype = max(archetypes, key=archetypes.get)
    top_pct = archetypes[top_archetype]

    context = profile["context_features"]
    context_display = {
        k: round(float(v) * 100, 2) if k in PERCENTAGE_FIELDS else _round_floats(v, decimals=4)
        for k, v in context.items()
    }

    report = {
        "player_name": player_name,
        "unit": unit,
        "archetypes": archetypes,
        "top_archetype": top_archetype,
        "top_pct": top_pct,
        "core_features": profile["core_features"],
        "context_features": context_display,
        "twins": twins,
        "data_warning": data_warning,
        "archetypes_note": (
            "Percentages exclude low-data archetype and are renormalized to 100%."
            if any(k in INSUFFICIENT_DATA_ARCHETYPES for k in raw_archetypes)
            and data_warning is None
            else None
        ),
    }

    return _round_floats(report, decimals=4)
