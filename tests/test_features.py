"""
Verify feature extraction produces expected output shapes and types
on known StatsBomb players.
"""

import pytest
import pandas as pd
from pathlib import Path

import features.cb as cb
import features.fb as fb
import features.mf as mf
import features.wg as wg
import features.st as st

from extractors.statsbomb import extract_player_events_from_competition
from extractors.base import events_to_dataframe


# ── Fixtures ────────────────────────────────────────────────────────────────

EVENTS_DIR = Path("data/statsbomb/events")
MATCH_IDS  = []  # populate with actual match IDs from your StatsBomb data


def _load_player_df(player_name: str, match_ids: list) -> pd.DataFrame:
    events = extract_player_events_from_competition(
        EVENTS_DIR, match_ids, player_name
    )
    return events_to_dataframe(events)


# ── Core feature count tests ─────────────────────────────────────────────────

def test_cb_core_feature_count():
    # Just test structure with a synthetic dataframe
    df = _make_synthetic_df("pass")
    result = cb.extract_core_features(df)
    assert len(result) == 6
    assert "tackle_to_interception_ratio" in result
    assert all(isinstance(v, float) for v in result.values())


def test_fb_core_feature_count():
    df = _make_synthetic_df("pass")
    result = fb.extract_core_features(df)
    assert len(result) == 5


def test_mf_core_feature_count():
    df = _make_synthetic_df("carry")
    result = mf.extract_core_features(df)
    assert len(result) == 6


def test_mf_context_feature_count():
    df = _make_synthetic_df("carry")
    result = mf.extract_context_features(df)
    assert len(result) == 8


def test_wg_core_feature_count():
    df = _make_synthetic_df("dribble")
    result = wg.extract_core_features(df)
    assert len(result) == 6


def test_st_core_feature_count():
    df = _make_synthetic_df("shot")
    result = st.extract_core_features(df)
    assert len(result) == 5


# ── Helper ───────────────────────────────────────────────────────────────────

def _make_synthetic_df(action_type: str) -> pd.DataFrame:
    """Minimal synthetic df for structural tests."""
    rows = []
    for i in range(20):
        rows.append({
            "player_name": "Test Player",
            "match_id":    "match_001",
            "minutes":     90.0,
            "action_type": action_type,
            "start_x":     50.0 + i * 0.5,
            "start_y":     40.0,
            "end_x":       60.0 + i * 0.5,
            "end_y":       40.0,
            "outcome":     True,
            "body_part":   "foot",
            "set_piece":   False,
        })
    return pd.DataFrame(rows)