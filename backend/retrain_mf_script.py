import json
from pathlib import Path
import sys

# Ensure backend directory is in path if run from inside backend
sys.path.append(str(Path(__file__).resolve().parent))

from training.train import (
    load_player_registry,
    build_player_unit_map,
    train_unit,
    _load_match_gender_map,
    _filter_registry_to_male_matches,
    LINEUPS_DIR,
    MATCHES_DIR
)

def retrain_mf():
    index_path = Path("data/statsbomb/player_index.json")
    if not index_path.exists():
        raise FileNotFoundError("Player index not found.")

    with open(index_path, encoding="utf-8") as f:
        player_index = json.load(f)
    print(f"Loaded player index: {len(player_index)} player-seasons")

    match_gender = _load_match_gender_map(MATCHES_DIR)
    player_registry = load_player_registry(LINEUPS_DIR, player_index)
    player_registry = _filter_registry_to_male_matches(player_registry, match_gender)
    print(f"Male-only player registry: {len(player_registry)} player-seasons")

    player_unit_map = build_player_unit_map(LINEUPS_DIR, player_registry)
    print(f"Player-seasons with known unit: {len(player_unit_map)}")

    print("\n--- Retraining MF unit ---")
    train_unit('mf', player_registry, player_unit_map)

if __name__ == "__main__":
    retrain_mf()
