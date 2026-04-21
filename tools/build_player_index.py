"""
Builds a player name index from StatsBomb event files.
Run once after cloning StatsBomb data:
  python -m tools.build_player_index

Output: data/statsbomb/player_index.json
  {
    "Virgil van Dijk": ["3788741", "3794685", ...],
    ...
  }
"""

import json
from pathlib import Path

EVENTS_DIR = Path("data/statsbomb/data/events")
OUTPUT_PATH = Path("data/statsbomb/player_index.json")


def build_player_index(events_dir: Path, output_path: Path) -> None:
    """
    Scans all StatsBomb event files and builds a {player_name: [match_ids]}
    index. Writes the result to output_path as UTF-8 JSON.

    Args:
        events_dir: Path to the directory containing StatsBomb event JSON files.
        output_path: Path where the index JSON will be written.
    """
    event_files = sorted(events_dir.glob("*.json"))
    if not event_files:
        raise FileNotFoundError(f"No event files found in {events_dir.resolve()}")

    index: dict[str, list[str]] = {}
    total = len(event_files)

    for i, events_path in enumerate(event_files, 1):
        print(f"  Scanning {i}/{total}: {events_path.name}    ", end="\r")

        match_id = events_path.stem
        with open(events_path, encoding="utf-8") as f:
            events = json.load(f)

        seen_in_match: set[str] = set()
        for event in events:
            name = event.get("player", {}).get("name", "")
            if name and name not in seen_in_match:
                seen_in_match.add(name)
                index.setdefault(name, []).append(match_id)

    print()  # newline after \r

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"  ✓ Index built: {len(index)} players across {total} matches")
    print(f"  ✓ Saved to {output_path}")


if __name__ == "__main__":
    build_player_index(EVENTS_DIR, OUTPUT_PATH)
