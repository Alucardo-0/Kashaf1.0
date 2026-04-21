"""
Entry point.
Usage:
  python main.py --player "Mohamed Salah" --unit wg --source statsbomb
  python main.py --player "Player Name"   --unit cb --source client --file data/my_file.csv
  python main.py --find-player "van Dijk"

Run once before first use:
  python -m tools.build_player_index
"""

import argparse
import json
import sys
from pathlib import Path

from extractors.base import events_to_dataframe
from report.builder import build_report

PLAYER_INDEX_PATH = Path("data/statsbomb/player_index.json")


def _strip_season(versioned_name: str) -> str:
    """Converts 'Name [Season]' -> 'Name' for extractor lookups."""
    if " [" in versioned_name:
        return versioned_name[:versioned_name.rfind(" [")]
    return versioned_name


def _load_player_index() -> dict[str, list[str]]:
    """
    Loads the pre-built player name index from disk.

    Returns:
        Dict mapping player name -> list of match ID strings.

    Raises:
        FileNotFoundError: If the index hasn't been built yet.
    """
    if not PLAYER_INDEX_PATH.exists():
        raise FileNotFoundError(
            f"Player index not found at {PLAYER_INDEX_PATH}.\n"
            f"Build it first by running:\n"
            f"  python -m tools.build_player_index"
        )
    with open(PLAYER_INDEX_PATH, encoding="utf-8") as f:
        return json.load(f)


def find_player_name(search: str, index: dict[str, list[str]]) -> list[str]:
    """
    Searches the pre-built player index for player-season keys matching
    a partial string. Case-insensitive.

    Args:
        search: Partial name to search for.
        index: Player index dict from _load_player_index().

    Returns:
        Alphabetically sorted list of matching player-season key strings.
    """
    search_lower = search.lower()
    return sorted(key for key in index if search_lower in key.lower())


def run_statsbomb(
    player_name: str,
    unit: str,
    events_dir: Path,
    index: dict[str, list[str]],
) -> dict:
    """
    Runs the full profiling pipeline for a player using StatsBomb event data.
    Uses the player index to find only the relevant match files.

    Args:
        player_name: Exact player name as it appears in the StatsBomb index.
        unit: Position unit string (cb/fb/mf/wg/st).
        events_dir: Path to the StatsBomb events directory.
        index: Player index dict from _load_player_index().

    Returns:
        Full scouting report dict.

    Raises:
        ValueError: If the player isn't in the index or no events are found.
    """
    from extractors.statsbomb import extract_player_events_from_competition

    if player_name not in index:
        suggestions = find_player_name(player_name.split()[0], index)[:5]
        suggestion_text = (
            "\nDid you mean:\n" + "\n".join(f"  {s}" for s in suggestions)
            if suggestions else ""
        )
        raise ValueError(
            f"'{player_name}' not found in player index.{suggestion_text}\n"
            f"Use --find-player to search."
        )

    match_ids = index[player_name]
    raw_name = _strip_season(player_name)
    events = extract_player_events_from_competition(events_dir, match_ids, raw_name)

    if not events:
        raise ValueError(
            f"Player '{player_name}' is in the index ({len(match_ids)} matches) "
            f"but no events were extracted. Check extractor logs above."
        )

    df = events_to_dataframe(events)
    # Temporary debug: inspect aerial outcome distribution from extracted events.
    aerials = df[df["action_type"] == "aerial"]
    print(aerials[["outcome"]].value_counts(dropna=False))
    print(
        f"  Loaded {len(df)} events across {df['match_id'].nunique()} matches",
        file=sys.stderr,
    )
    return build_report(df, unit, player_name)


def run_client(player_name: str, unit: str, filepath: str) -> dict:
    """
    Runs the full profiling pipeline for a player using a client tagger CSV.

    Args:
        player_name: Player name to filter from the CSV.
        unit: Position unit string (cb/fb/mf/wg/st).
        filepath: Path to the client CSV file.

    Returns:
        Full scouting report dict.

    Raises:
        ValueError: If no rows are found for the player in the CSV.
    """
    from extractors.client import parse_client_csv_to_dataframe

    df = parse_client_csv_to_dataframe(filepath)
    df = df[df["player_name"] == player_name].reset_index(drop=True)

    if df.empty:
        raise ValueError(
            f"No rows found for player '{player_name}' in {filepath}."
        )
    return build_report(df, unit, player_name)


def main():
    """
    CLI entry point. Parses arguments and dispatches to the appropriate
    source handler (statsbomb or client CSV).
    """
    parser = argparse.ArgumentParser(description="Kashaf Football Scouting Engine")
    parser.add_argument("--player", default=None, help="Exact player name")
    parser.add_argument("--unit", default=None, choices=["cb", "fb", "mf", "wg", "st"])
    parser.add_argument("--source", default=None, choices=["statsbomb", "client"])
    parser.add_argument("--file", default=None, help="CSV path for client source")
    parser.add_argument("--events-dir", default="data/statsbomb/data/events")
    parser.add_argument(
        "--find-player",
        default=None,
        help="Search for a player name (partial, case-insensitive)",
    )
    args = parser.parse_args()

    events_dir = Path(args.events_dir)

    if args.find_player:
        index = _load_player_index()
        matches = find_player_name(args.find_player.strip(), index)
        if matches:
            print(f"Found {len(matches)} result(s):")
            for m in matches:
                print(f"  {m}")
        else:
            print(f"No players found matching '{args.find_player}'.")
        return

    if not args.player or not args.unit or not args.source:
        parser.error("--player, --unit, and --source are required for profiling.")

    args.player = args.player.strip()

    if args.source == "statsbomb":
        index = _load_player_index()
        report = run_statsbomb(args.player, args.unit, events_dir, index)
    else:
        if not args.file:
            parser.error("--file is required when --source is client.")
        report = run_client(args.player, args.unit, args.file)

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

