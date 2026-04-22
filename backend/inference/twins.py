"""
Twin matching: find the 3 most similar reference pool players
and return their context features for side-by-side comparison.
"""

import json
import numpy as np
from pathlib import Path

from config.settings import N_TWINS

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
    "headed_shots_pct",
}


def _load_reference_pool(unit: str) -> tuple[list[str], np.ndarray]:
    """
    Loads the scaled core feature vectors for all reference pool players.

    Args:
        unit: Position unit string.

    Returns:
        Tuple of (list of player-season keys, array of shape [n_players, n_features]).
    """
    with open(MODELS_DIR / unit / "reference_pool.json", encoding="utf-8") as f:
        pool = json.load(f)
    names = list(pool.keys())
    vectors = np.array(list(pool.values()), dtype=float)
    return names, vectors


def _load_reference_context(unit: str) -> dict[str, dict]:
    """
    Loads the context features for all reference pool players.

    Args:
        unit: Position unit string.

    Returns:
        Dict mapping player-season key -> context feature dict.
    """
    path = MODELS_DIR / unit / "reference_context.json"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _twin_similarity_score(
    query_vec: np.ndarray,
    ref_vectors: np.ndarray,
) -> np.ndarray:
    """
    Computes similarity scores between a query vector and all reference vectors.
    Uses 1 / (1 + distance / median_pairwise_distance) so the denominator is
    derived from the data, not a magic number.

    Args:
        query_vec: 1D array of the query player's scaled features.
        ref_vectors: 2D array of reference pool scaled features.

    Returns:
        1D array of similarity scores in [0, 1] for each reference player.
    """
    distances = np.linalg.norm(ref_vectors - query_vec, axis=1)

    pairwise = np.linalg.norm(
        ref_vectors[:, np.newaxis] - ref_vectors[np.newaxis, :],
        axis=2,
    )
    upper = pairwise[np.triu_indices(len(ref_vectors), k=1)]
    median_dist = np.median(upper) if len(upper) > 0 else 1.0

    return 1.0 / (1.0 + distances / median_dist)


def _strip_season(versioned_name: str) -> str:
    """
    Strips the season tag from a versioned player-season key.
    "Virgil van Dijk [2019/2020]" -> "Virgil van Dijk"
    """
    if " [" in versioned_name:
        return versioned_name[:versioned_name.rfind(" [")]
    return versioned_name


def _format_context_for_display(raw_context: dict) -> dict:
    """Convert ratio fields to percentages for readable twin output."""
    return {
        k: round(float(v) * 100, 2) if k in PERCENTAGE_FIELDS else round(float(v), 4)
        for k, v in raw_context.items()
    }


def find_twins(
    x_scaled: np.ndarray,
    unit: str,
    exclude_name: str | None = None,
) -> list[dict]:
    """
    Returns the top N_TWINS most similar players from the reference pool,
    deduplicated by raw player name so the same player can't appear twice
    across different seasons. Only the highest-scoring season is kept per player.
    Includes context features for side-by-side scouting comparison.

    Args:
        x_scaled: Scaled core feature vector of the query player.
        unit: Position unit string (cb/fb/mf/wg/st).
        exclude_name: Versioned player-season key to exclude (the query player).

    Returns:
        List of up to N_TWINS dicts, each containing:
          - player_name: versioned player-season key
          - similarity: float in [0, 100]
          - context: dict of context feature name -> value
    """
    names, vectors = _load_reference_pool(unit)
    ref_context = _load_reference_context(unit)
    scores = _twin_similarity_score(x_scaled, vectors)

    ranked = sorted(zip(names, scores), key=lambda x: -x[1])
    exclude_raw = _strip_season(exclude_name) if exclude_name else None

    seen_raw: set[str] = set()
    twins: list[dict] = []

    for versioned_name, score in ranked:
        raw_name = _strip_season(versioned_name)

        if exclude_raw and raw_name == exclude_raw:
            continue
        if raw_name in seen_raw:
            continue

        seen_raw.add(raw_name)
        raw_context = ref_context.get(versioned_name, {})
        display_context = _format_context_for_display(raw_context)
        twins.append(
            {
                "player_name": versioned_name,
                "similarity": round(float(score) * 100, 1),
                "context": display_context,
            }
        )
        if len(twins) >= N_TWINS:
            break

    return twins
