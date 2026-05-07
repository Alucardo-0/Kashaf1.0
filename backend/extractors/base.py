from dataclasses import dataclass, field
from typing import Optional
import pandas as pd

#- Schema -#


@dataclass
class Event:
    #Identity
    player_name:    str
    match_id:       str
    minutes:        float       # total minutes played this match

    # Action
    action_type:    str         # one of the 10 action types

    # Coordinates
    start_x:        float
    start_y:        float
    end_x:          Optional[float] = None
    end_y:          Optional[float] = None

    # Attributes
    outcome:        Optional[bool] = None   # True=success False=fail None=N/A
    body_part:      Optional[str]  = None   # "foot" | "head" | None
    set_piece:      bool = False
    is_cross:       bool = False             # explicit cross flag (from SB / analyst)


VALID_ACTION_TYPES = {
    "pass",
    "carry",
    "dribble",
    "shot",
    "reception",
    "tackle",
    "interception",
    "aerial",
    "clearance",
    "foul",
}

VALID_BODY_PARTS = {"foot", "head", None}


#- Validation -#

def validate_events(events: list[dict]) -> list[dict]:
    """
    Validates a list of event dicts against the schema.
    Raises ValueError on the first structural violation.
    Returns the same list if all events pass.
    """
    required_fields = {
        "player_name", "match_id", "minutes",
        "action_type", "start_x", "start_y",
    }

    for i, ev in enumerate(events):
        # Required fields present
        missing = required_fields - ev.keys()
        if missing:
            raise ValueError(f"Event {i}: missing required fields {missing}")

        # Valid action type
        if ev["action_type"] not in VALID_ACTION_TYPES:
            raise ValueError(
                f"Event {i}: invalid action_type '{ev['action_type']}'. "
                f"Must be one of {VALID_ACTION_TYPES}"
            )

        # Valid body part
        if ev.get("body_part") not in VALID_BODY_PARTS:
            raise ValueError(
                f"Event {i}: invalid body_part '{ev['body_part']}'. "
                f"Must be 'foot', 'head', or None"
            )

        # Coordinates are numeric
        for coord in ("start_x", "start_y"):
            if not isinstance(ev[coord], (int, float)):
                raise ValueError(
                    f"Event {i}: {coord} must be numeric, got {type(ev[coord])}"
                )

        # Clamp coordinates to [0, 100] (handles floating-point rounding artifacts)
        ev["start_x"] = max(0, min(100, ev["start_x"]))
        ev["start_y"] = max(0, min(100, ev["start_y"]))

        # End coordinates: validate type if present, then clamp
        if ev.get("end_x") is not None:
            if not isinstance(ev["end_x"], (int, float)):
                raise ValueError(f"Event {i}: end_x must be numeric")
            ev["end_x"] = max(0, min(100, ev["end_x"]))
        if ev.get("end_y") is not None:
            if not isinstance(ev["end_y"], (int, float)):
                raise ValueError(f"Event {i}: end_y must be numeric")
            ev["end_y"] = max(0, min(100, ev["end_y"]))

        # Minutes is positive
        if ev["minutes"] <= 0:
            raise ValueError(
                f"Event {i}: minutes must be > 0, got {ev['minutes']}"
            )

    return events

#- Conversion Helper -#

def events_to_dataframe(events: list[dict]) -> pd.DataFrame:
    """
    Converts validated event dicts to a DataFrame.
    Ensures consistent column presence and types.
    """
    df = pd.DataFrame(events)

    # Ensure all schema columns exist even if not in any event
    schema_cols = [
        "player_name", "match_id", "minutes",
        "action_type", "start_x", "start_y",
        "end_x", "end_y", "outcome", "body_part", "set_piece", "is_cross",
    ]
    for col in schema_cols:
        if col not in df.columns:
            df[col] = None

    # Type enforcement
    df["start_x"]   = pd.to_numeric(df["start_x"],   errors="coerce")
    df["start_y"]   = pd.to_numeric(df["start_y"],   errors="coerce")
    df["end_x"]     = pd.to_numeric(df["end_x"],     errors="coerce")
    df["end_y"]     = pd.to_numeric(df["end_y"],     errors="coerce")
    df["minutes"]   = pd.to_numeric(df["minutes"],   errors="coerce")
    df["set_piece"] = df["set_piece"].fillna(False).astype(bool)
    df["is_cross"]  = df["is_cross"].fillna(False).astype(bool)

    return df[schema_cols]