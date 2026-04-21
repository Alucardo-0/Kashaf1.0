"""Core integration service helpers for running engine jobs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib import request

from extractors.base import events_to_dataframe, validate_events
from extractors.client import parse_client_csv_to_dataframe
from report.builder import build_report


def _build_dataframe(payload: dict[str, Any]):
    """Build a validated DataFrame from inline events or a CSV path."""
    if "events" in payload:
        events = payload["events"]
        if not isinstance(events, list):
            raise ValueError("'events' must be a list of event objects.")
        validate_events(events)
        return events_to_dataframe(events)

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

