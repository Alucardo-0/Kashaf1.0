"""
StatsBomb JSON → Standardized internal event schema.

Handles:
- Coordinate normalization (120x80 → 100x100)
- Event type mapping (StatsBomb types → our 10 action types)
- Duel splitting (tackle vs aerial)
- Outcome mapping
- Set piece detection
- Player minutes from lineups + substitution events
"""

import json
import os
from pathlib import Path
from typing import Optional

from config.settings import (
    SB_PITCH_LENGTH, SB_PITCH_WIDTH,
    SB_EVENT_TYPE_MAP,
    SB_DUEL_TACKLE_TYPES, SB_DUEL_AERIAL_TYPES,
    SB_SET_PIECE_PATTERNS, SB_SET_PIECE_PASS_TYPES,
    SB_SUCCESS_OUTCOMES, SB_FAILURE_OUTCOMES,
    ALWAYS_SUCCESS_ACTIONS, NO_END_COORDS_ACTIONS,
)
from extractors.base import validate_events, events_to_dataframe


#- Coordinate normalization -#

def _norm_x(raw_x: float) -> float:
    return round(min(max((raw_x / SB_PITCH_LENGTH) * 100.0, 0.0), 100.0), 4)

def _norm_y(raw_y: float) -> float:
    return round(min(max((raw_y / SB_PITCH_WIDTH) * 100.0, 0.0), 100.0), 4)


def _norm_coords(location: Optional[list]) -> tuple[Optional[float], Optional[float]]:
    if location is None or len(location) < 2:
        return None, None
    return _norm_x(location[0]), _norm_y(location[1])


#- Safe field extraction -#

def _safe_get(obj: dict, *keys, default=None):
    """Traverse nested dict keys safely. Returns default if any key is missing."""
    for key in keys:
        if not isinstance(obj, dict):
            return default
        obj = obj.get(key, default)
        if obj is default:
            return default
    return obj


#- Outcome mapping -#

def _map_outcome(outcome_name: Optional[str], action_type: str) -> Optional[bool]:
    """
    Maps StatsBomb outcome name to our binary True/False.
    Actions in ALWAYS_SUCCESS_ACTIONS always return True.
    """
    if action_type in ALWAYS_SUCCESS_ACTIONS:
        return True
    if outcome_name is None:
        return None
    if outcome_name in SB_SUCCESS_OUTCOMES:
        return True
    if outcome_name in SB_FAILURE_OUTCOMES:
        return False
    # Unknown outcome — treat as None
    return None


#- Set piece detection -#

def _is_set_piece(event: dict) -> bool:
    play_pattern = _safe_get(event, "play_pattern", "name", default="")
    if play_pattern in SB_SET_PIECE_PATTERNS:
        return True
    # For passes specifically, also check pass.type
    pass_type = _safe_get(event, "pass", "type", "name", default="")
    if pass_type in SB_SET_PIECE_PASS_TYPES:
        return True
    return False


#- Body part mapping -#

def _map_body_part(event: dict, action_type: str) -> Optional[str]:
    """
    Maps StatsBomb event data to our body_part schema field.
    Returns 'head', 'foot', or None.
    """
    if action_type == "aerial":
        return "head"
    if action_type in ("tackle", "interception", "foul", "reception"):
        return None

    # pass, shot, carry, dribble, clearance - read from event
    bp_name = (
        _safe_get(event, "pass", "body_part", "name") or
        _safe_get(event, "shot", "body_part", "name") or
        _safe_get(event, "clearance", "body_part", "name")
    )
    if bp_name is None:
        return None
    return "head" if "Head" in bp_name else "foot"


#- Single event parsing -#

def _parse_event(
    event: dict,
    player_name: str,
    match_id: str,
    minutes: float,
) -> Optional[dict]:
    """
    Parses a single StatsBomb event dict into our schema.
    Returns None if the event should be skipped.
    """
    event_type = _safe_get(event, "type", "name", default="")

    # ── Direct mapped event types ──────────────────────────────────────────
    if event_type in SB_EVENT_TYPE_MAP:
        action_type = SB_EVENT_TYPE_MAP[event_type]

        start_x, start_y = _norm_coords(event.get("location"))
        if start_x is None:
            return None  # no location → skip

        # End coordinates
        end_x, end_y = None, None
        if action_type not in NO_END_COORDS_ACTIONS:
            if action_type == "pass":
                end_x, end_y = _norm_coords(
                    _safe_get(event, "pass", "end_location")
                )
            elif action_type == "carry":
                end_x, end_y = _norm_coords(
                    _safe_get(event, "carry", "end_location")
                )
            elif action_type == "shot":
                # shots don't need end coords in our schema
                pass

        # Outcome

        outcome_name = (
                _safe_get(event, "pass", "outcome", "name") or
                _safe_get(event, "shot", "outcome", "name") or
                _safe_get(event, "dribble", "outcome", "name") or
                _safe_get(event, "interception", "outcome", "name") or
                _safe_get(event, "clearance", "outcome", "name") or
                _safe_get(event, "ball_receipt", "outcome", "name")
        )

        # StatsBomb pass-specific: no outcome field = complete
        if action_type == "pass" and outcome_name is None:
            outcome = True
        # StatsBomb reception-specific: no outcome field = successful receipt
        elif action_type == "reception" and outcome_name is None:
            outcome = True
        # StatsBomb interception-specific: no outcome field = successful interception
        elif action_type == "interception" and outcome_name is None:
            outcome = True
        else:
            outcome = _map_outcome(outcome_name, action_type)
        # For shots: success = goal only
        if action_type == "shot":
            shot_outcome = _safe_get(event, "shot", "outcome", "name", default="")
            outcome = shot_outcome == "Goal"

        # StatsBomb tags crosses as passes with {"pass": {"cross": true}}
        is_cross = bool(_safe_get(event, "pass", "cross", default=False)) if action_type == "pass" else False

        return {
            "player_name": player_name,
            "match_id":    str(match_id),
            "minutes":     minutes,
            "action_type": action_type,
            "start_x":     start_x,
            "start_y":     start_y,
            "end_x":       end_x,
            "end_y":       end_y,
            "outcome":     outcome,
            "body_part":   _map_body_part(event, action_type),
            "set_piece":   _is_set_piece(event),
            "is_cross":    is_cross,
        }

    # ── Duel events (split into tackle or aerial) ──────────────────────────
    if event_type == "Duel":
        duel_type = _safe_get(event, "duel", "type", "name", default="")

        if duel_type in SB_DUEL_TACKLE_TYPES:
            action_type = "tackle"
        elif duel_type in SB_DUEL_AERIAL_TYPES:
            action_type = "aerial"
        else:
            return None  # ground duels etc. — skip

        start_x, start_y = _norm_coords(event.get("location"))
        if start_x is None:
            return None

        outcome_name = _safe_get(event, "duel", "outcome", "name")

        if action_type == "aerial":
            # StatsBomb usually encodes aerial result in duel type (Aerial Won/Lost).
            if outcome_name in SB_SUCCESS_OUTCOMES:
                outcome = True
            elif outcome_name in SB_FAILURE_OUTCOMES:
                outcome = False
            else:
                outcome = duel_type == "Aerial Won"
        else:
            outcome = _map_outcome(outcome_name, action_type)

        return {
            "player_name": player_name,
            "match_id":    str(match_id),
            "minutes":     minutes,
            "action_type": action_type,
            "start_x":     start_x,
            "start_y":     start_y,
            "end_x":       None,
            "end_y":       None,
            "outcome":     outcome,
            "body_part":   "head" if action_type == "aerial" else None,
            "set_piece":   _is_set_piece(event),
        }

    return None  # event type not relevant to us


#- Player minutes calculation -#

def _get_player_minutes(events: list[dict], player_name: str) -> float:
    """
    Computes minutes played for a player from match events.
    Logic:
      - Default assumption: played full match
      - If player is subbed off → minutes = substitution minute
      - If player comes on as sub → minutes = 90 - sub minute
      - Handles extra time crudely (caps at 90 for now)
    """
    total_minutes = 90.0

    for event in events:
        event_type = _safe_get(event, "type", "name", default="")

        if event_type == "Substitution":
            subbed_off = _safe_get(event, "player", "name", default="")
            if subbed_off == player_name:
                total_minutes = float(event.get("minute", 90))
                break

        if event_type == "Player On":
            player_on = _safe_get(event, "player", "name", default="")
            if player_on == player_name:
                minute_on = float(event.get("minute", 0))
                total_minutes = max(90.0 - minute_on, 0.0)
                break

    return max(total_minutes, 1.0)  # guard against 0 minutes


#- Main extraction function -#

def extract_player_events_from_match(
    events_path: str | Path,
    player_name: str,
) -> list[dict]:
    """
    Given a StatsBomb events JSON file path and a player name,
    returns a validated list of standardized event dicts for that player.
    """
    with open(events_path, "r", encoding="utf-8") as f:
        raw_events = json.load(f)

    match_id = Path(events_path).stem
    minutes  = _get_player_minutes(raw_events, player_name)

    extracted = []
    for event in raw_events:
        # Only process events for our target player
        event_player = _safe_get(event, "player", "name", default="")
        if event_player != player_name:
            continue

        parsed = _parse_event(event, player_name, match_id, minutes)
        if parsed is not None:
            extracted.append(parsed)

    validate_events(extracted)
    return extracted


def extract_player_events_from_competition(
    events_dir: str | Path,
    match_ids: list[str | int],
    player_name: str,
) -> list[dict]:
    all_events = []
    events_dir = Path(events_dir)
    failed = []
    """
    Extracts and concatenates all events for a player across multiple matches.
    Used during training to get a full season of data for one player.
    """
    for match_id in match_ids:
        events_path = events_dir / f"{match_id}.json"
        if not events_path.exists():
            continue
        try:
            match_events = extract_player_events_from_match(events_path, player_name)
            all_events.extend(match_events)
        except Exception as e:
            failed.append((match_id, str(e)))

    if failed and all_events:
        # Some matches failed but we still got data — warn but continue
        import sys
        print(f"  Warning: {len(failed)} match(es) failed for '{player_name}' (got {len(all_events)} events from others)", file=sys.stderr)
    elif failed and not all_events:
        # Everything failed — surface the first error so it's diagnosable
        raise ValueError(
            f"All {len(failed)} matches failed for '{player_name}'. "
            f"First error: {failed[0][1]}"
        )

    return all_events

