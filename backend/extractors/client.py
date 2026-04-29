"""
Client tagger CSV → Standardized internal event schema.

The CSV format is flat — one row per action — with columns:
  player_name, match_id, minutes_played, action_type,
  start_x, start_y, end_x, end_y, outcome, body_part, set_piece

end_x, end_y are empty for actions that don't need them.
Coordinates are already in 100x100 space.
"""

from pathlib import Path
import pandas as pd

from config.settings import ALWAYS_SUCCESS_ACTIONS, NO_END_COORDS_ACTIONS
from extractors.base import validate_events, events_to_dataframe


# ---------------------------------------------------------------------------
# Expected CSV columns
# ---------------------------------------------------------------------------

REQUIRED_COLS = {
    "player_name", "match_id", "minutes_played",
    "action_type", "start_x", "start_y",
}

OPTIONAL_COLS = {
    "end_x", "end_y", "outcome", "body_part", "set_piece",
}

ALL_COLS = REQUIRED_COLS | OPTIONAL_COLS


# ---------------------------------------------------------------------------
# Row → event dict
# ---------------------------------------------------------------------------

def _parse_row(row: pd.Series) -> dict:
    action_type = str(row["action_type"]).strip().lower()

    # End coordinates: only include if action type uses them
    end_x = None
    end_y = None
    if action_type not in NO_END_COORDS_ACTIONS:
        end_x = row.get("end_x")
        end_y = row.get("end_y")
        end_x = None if pd.isna(end_x) else float(end_x)
        end_y = None if pd.isna(end_y) else float(end_y)

    # Outcome
    if action_type in ALWAYS_SUCCESS_ACTIONS:
        outcome = True
    elif action_type == "pass":
        raw_outcome = row.get("outcome")
        if pd.isna(raw_outcome) or raw_outcome == "":
            outcome = True   # no outcome on a pass = completed, same as StatsBomb
        elif str(raw_outcome).strip().lower() in ("true", "1", "yes", "success", "successful"):
            outcome = True
        else:
            outcome = False
    else:
        raw_outcome = row.get("outcome")
        if pd.isna(raw_outcome) or raw_outcome == "":
            outcome = None
        elif str(raw_outcome).strip().lower() in ("true", "1", "yes", "success", "successful"):
            outcome = True
        else:
            outcome = False

    # Body part
    raw_bp = row.get("body_part")
    if pd.isna(raw_bp) or raw_bp == "":
        body_part = None
    else:
        body_part = str(raw_bp).strip().lower()
        if body_part not in ("foot", "head"):
            body_part = None

    # Set piece
    raw_sp = row.get("set_piece")
    if pd.isna(raw_sp) or raw_sp == "":
        set_piece = False
    else:
        set_piece = str(raw_sp).strip().lower() in ("true", "1", "yes")

    return {
        "player_name": str(row["player_name"]).strip(),
        "match_id":    str(row["match_id"]).strip(),
        "minutes":     float(row["minutes_played"]),
        "action_type": action_type,
        "start_x":     float(row["start_x"]),
        "start_y":     float(row["start_y"]),
        "end_x":       end_x,
        "end_y":       end_y,
        "outcome":     outcome,
        "body_part":   body_part,
        "set_piece":   set_piece,
    }


# ---------------------------------------------------------------------------
# Main parsing function
# ---------------------------------------------------------------------------

def parse_client_csv(filepath: str | Path) -> list[dict]:
    """
    Parses a client tagger CSV file into a validated list of event dicts.

    Returns a list of standardized event dicts ready for feature computation.
    """
    df = pd.read_csv(filepath, dtype=str)

    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]

    # Check required columns
    missing = REQUIRED_COLS - set(df.columns)
    if missing:
        raise ValueError(
            f"Client CSV missing required columns: {missing}\n"
            f"Found columns: {list(df.columns)}"
        )

    # Add optional columns as NaN if absent
    for col in OPTIONAL_COLS:
        if col not in df.columns:
            df[col] = None

    # Parse each row
    events = []
    errors = []
    for i, row in df.iterrows():
        try:
            events.append(_parse_row(row))
        except Exception as e:
            errors.append(f"Row {i + 2}: {e}")  # +2 for header + 1-indexed

    if errors:
        raise ValueError(
            f"Client CSV parsing failed on {len(errors)} row(s):\n" +
            "\n".join(errors[:10]) +  # show first 10 errors
            ("\n..." if len(errors) > 10 else "")
        )

    validate_events(events)
    return events


def parse_client_csv_to_dataframe(filepath: str | Path) -> pd.DataFrame:
    """Convenience wrapper that returns a DataFrame instead of list of dicts."""
    return events_to_dataframe(parse_client_csv(filepath))