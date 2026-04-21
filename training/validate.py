"""
Post-training validation.
Inspect cluster centroids and name them manually.
Produces a cluster_names.json for each unit.
"""

import json
import pickle
import numpy as np
from pathlib import Path

MODELS_DIR = Path("models")


def inspect_unit(unit: str):
    unit_dir = MODELS_DIR / unit

    with open(unit_dir / "kmeans.pkl", "rb") as f:
        kmeans = pickle.load(f)

    with open(unit_dir / "feature_cols.json") as f:
        feature_cols = json.load(f)

    print(f"\n{'='*50}")
    print(f"  {unit.upper()} — {kmeans.n_clusters} clusters")
    print(f"{'='*50}")

    for cluster_id, centroid in enumerate(kmeans.cluster_centers_):
        print(f"\n  Cluster {cluster_id}:")
        for col, val in zip(feature_cols, centroid):
            print(f"    {col:40s} {val:+.3f}")


def inspect_all():
    for unit in ["cb", "fb", "mf", "wg", "st"]:
        unit_dir = MODELS_DIR / unit
        if not unit_dir.exists():
            print(f"  {unit}: no model found, skipping")
            continue
        inspect_unit(unit)


if __name__ == "__main__":
    inspect_all()
    print("\n\nAfter inspection, create models/<unit>/cluster_names.json:")
    print('  e.g. {"0": "Stopper", "1": "Ball-Playing Defender", "2": "Interceptor"}')