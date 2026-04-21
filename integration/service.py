"""Core integration service helpers for running engine jobs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib import request

from extractors.base import events_to_dataframe, validate_events
from extractors.client import parse_client_csv_to_dataframe
from report.builder import build_report


_DNS_TO_ENGINE_ACTION = {
    "ball receipt*": "reception",
    "ball receipt": "reception",
    "receipt": "reception",
}


def _normalize_outcome(value: Any) -> bool | None:
    """Normalizes mixed outcome formats to bool/None for engine features."""
    if isinstance(value, bool):
        return value
    if value is None:
        return None

    text = str(value).strip().lower()
    if text in {"", "none", "null", "na", "n/a"}:
        return None
    if text in {"true", "success", "complete", "completed", "won", "goal", "yes", "1"}:
        return True
    if text in {"false", "fail", "failed", "incomplete", "lost", "no", "0"}:
        return False
    return None


def _normalize_action_type(raw_action: Any) -> str:
    text = str(raw_action or "").strip().lower()
    return _DNS_TO_ENGINE_ACTION.get(text, text)


def _to_engine_event(
    event: dict[str, Any],
    default_player_name: str,
    default_match_id: str,
    default_minutes: float,
) -> dict[str, Any]:
    """Converts DNS-style event payloads to the engine schema."""
    action_type = _normalize_action_type(event.get("action_type", event.get("eventType")))
    return {
        "player_name": str(event.get("player_name", default_player_name)),
        "match_id": str(event.get("match_id", default_match_id)),
        "minutes": float(event.get("minutes", default_minutes)),
        "action_type": action_type,
        "start_x": event.get("start_x", event.get("originX")),
        "start_y": event.get("start_y", event.get("originY")),
        "end_x": event.get("end_x", event.get("destinationX")),
        "end_y": event.get("end_y", event.get("destinationY")),
        "outcome": _normalize_outcome(event.get("outcome")),
        "body_part": event.get("body_part"),
        "set_piece": bool(event.get("set_piece", event.get("isSetPiece", False))),
    }


def _build_dataframe(payload: dict[str, Any]):
    """Build a validated DataFrame from inline events or a CSV path."""
    if "events" in payload:
        events = payload["events"]
        if not isinstance(events, list):
            raise ValueError("'events' must be a list of event objects.")

        default_player_name = str(payload.get("player_name", "")).strip()
        default_match_id = str((payload.get("metadata") or {}).get("matchId") or payload.get("match_id") or "dns_match")
        default_minutes = float(payload.get("minutes", 90.0))

        normalized_events = [
            _to_engine_event(ev, default_player_name, default_match_id, default_minutes)
            for ev in events
        ]
        validate_events(normalized_events)
        return events_to_dataframe(normalized_events)

    csv_path = payload.get("csv_path")
    if not csv_path:
        raise ValueError("Provide either 'events' or 'csv_path'.")
    return parse_client_csv_to_dataframe(Path(csv_path))


def run_engine_job(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Execute one profiling job from an API payload.

    Required payload fields:
      - player_name: str
      - unit: cb|fb|mf|wg|st
      - events (list) OR csv_path (str)
    """
    player_name = str(payload.get("player_name", "")).strip()
    unit = str(payload.get("unit", "")).strip().lower()

    if not player_name:
        raise ValueError("'player_name' is required.")
    if unit not in {"cb", "fb", "mf", "wg", "st"}:
        raise ValueError("'unit' must be one of: cb, fb, mf, wg, st.")

    df = _build_dataframe(payload)
    player_df = df[df["player_name"] == player_name].reset_index(drop=True)
    if player_df.empty:
        raise ValueError(f"No events found for player '{player_name}' in supplied payload.")

    report = build_report(player_df, unit, player_name)
    return {
        "player_name": player_name,
        "unit": unit,
        "report": report,
    }


def send_callback(callback_url: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> None:
    """POST JSON payload to a callback URL."""
    callback_headers = {"Content-Type": "application/json"}
    if headers:
        callback_headers.update(headers)

    req = request.Request(
        url=callback_url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers=callback_headers,
        method="POST",
    )
    with request.urlopen(req, timeout=20) as response:
        if response.status >= 400:
            raise RuntimeError(f"Callback failed with HTTP {response.status}")

