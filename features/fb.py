"""
Fullback feature extraction.
K=3: Defensive FB / Wing-Back / Playmaking FB
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    defensive_actions_p90,
    crosses_p90,
    progressive_passes_p90,
    progressive_carries_p90,
    median_action_height,
    # context
    aerial_win_pct,
    pass_completion_pct,
    tackle_win_pct,
    cross_completion_pct,
    progressive_pass_pct,
    dribble_success_pct,
)

UNIT = "fb"


def extract_core_features(df: pd.DataFrame) -> dict:
    minutes = get_total_minutes(df)

    return {
        "defensive_actions_p90":   defensive_actions_p90(df, minutes),
        "crosses_p90":             crosses_p90(df, minutes),
        "progressive_passes_p90":  progressive_passes_p90(df, minutes, UNIT),
        "progressive_carries_p90": progressive_carries_p90(df, minutes, UNIT),
        "median_action_height":    median_action_height(df),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    minutes = get_total_minutes(df)

    return {
        "aerial_win_pct":          aerial_win_pct(df),
        "pass_completion_pct":     pass_completion_pct(df),
        "tackle_win_pct":          tackle_win_pct(df),
        "cross_completion_pct":    cross_completion_pct(df),
        "progressive_pass_pct":    progressive_pass_pct(df, UNIT),
        "dribble_success_pct":     dribble_success_pct(df),
    }


def extract_all(df: pd.DataFrame) -> dict:
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }