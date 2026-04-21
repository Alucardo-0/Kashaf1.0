"""
Profile a player from their event data.
Returns archetype soft-assignment percentages + context features.
"""

import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

from config.settings import SOFT_ASSIGNMENT_POWER
from extractors.base import events_to_dataframe
import features.cb as cb
import features.fb as fb
import features.mf as mf
import features.wg as wg
import features.st as st

FEATURE_MODULES = {"cb": cb, "fb": fb, "mf": mf, "wg": wg, "st": st}
MODELS_DIR = Path("models")


def _load_unit_artifacts(unit: str) -> tuple:
    unit_dir = MODELS_DIR / unit
    with open(unit_dir / "kmeans.pkl", "rb") as f:
        kmeans = pickle.load(f)
    with open(unit_dir / "scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    with open(unit_dir / "cluster_names.json") as f:
        cluster_names = json.load(f)  # {"0": "Stopper", ...}
    with open(unit_dir / "feature_cols.json") as f:
        feature_cols = json.load(f)
    return kmeans, scaler, cluster_names, feature_cols


def soft_assignment(
    x_scaled: np.ndarray,
    centroids: np.ndarray,
    power: int = SOFT_ASSIGNMENT_POWER,
) -> dict[int, float]:
    """
    Inverse distance weighting across all centroids.
    Returns {cluster_id: percentage}.
    """
    distances = np.linalg.norm(centroids - x_scaled, axis=1)
    # Guard against zero distance (exact centroid hit)
    distances = np.where(distances == 0, 1e-9, distances)
    weights = 1.0 / (distances ** power)
    total = weights.sum()
    return {i: float(w / total) for i, w in enumerate(weights)}


def profile_player(
    events_df: pd.DataFrame,
    unit: str,
) -> dict:
    """
    Given a validated events DataFrame and unit string,
    returns the full player profile dict:
      {
        "unit": "cb",
        "archetypes": {"Stopper": 0.68, "Interceptor": 0.22, ...},
        "core_features": {...},
        "context_features": {...},
      }
    """
    module = FEATURE_MODULES[unit]
    kmeans, scaler, cluster_names, feature_cols = _load_unit_artifacts(unit)

    core    = module.extract_core_features(events_df)
    context = module.extract_context_features(events_df)

    # Build feature vector in correct column order
    x = np.array([core[col] for col in feature_cols], dtype=float).reshape(1, -1)
    x_scaled = scaler.transform(x)[0]

    assignments = soft_assignment(x_scaled, kmeans.cluster_centers_)
    archetypes  = {
        cluster_names[str(k)]: v
        for k, v in sorted(assignments.items(), key=lambda kv: -kv[1])
    }

    return {
        "unit":             unit,
        "archetypes":       archetypes,
        "core_features":    core,
        "context_features": context,
    }