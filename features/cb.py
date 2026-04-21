"""
Center Back feature extraction.
Core features (used for clustering) + context features (scouting report only).

Core design notes:
- tackle_ratio removed: replaced with tackles_p90 + interceptions_p90.
- aerial_duels_p90 removed from core due StatsBomb loser-only aerial logging.
- headed_actions_p90 used as aerial output proxy.
- aerial_win_pct removed from context; aerial_duels_p90 kept as narrative volume.
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    tackles_p90,
    interceptions_p90,
    tackle_to_interception_ratio,
    headed_actions_p90,
    progressive_passes_p90,
    median_defensive_action_height,
    # context
    aerial_duels_p90,
    pass_completion_pct,
    tackle_win_pct,
    long_passes_p90,
    defensive_action_height_iqr,
    median_action_height,
)

UNIT = "cb"


def extract_core_features(df: pd.DataFrame) -> dict:
    """
    6 core features for CB clustering.
    Combines volume features (p90) with a defensive style ratio.
    """
    minutes = get_total_minutes(df)

    return {
        "tackles_p90":                    tackles_p90(df, minutes),
        "interceptions_p90":              interceptions_p90(df, minutes),
        "tackle_to_interception_ratio":   tackle_to_interception_ratio(df),
        "headed_actions_p90":            headed_actions_p90(df, minutes),
        "progressive_passes_p90":        progressive_passes_p90(df, minutes, UNIT),
        "median_defensive_action_height": median_defensive_action_height(df),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """Context features for CB scouting report only."""
    minutes = get_total_minutes(df)

    return {
        "aerial_duels_p90":               aerial_duels_p90(df, minutes),
        "pass_completion_pct":          pass_completion_pct(df),
        "tackle_win_pct":               tackle_win_pct(df),
        "long_passes_p90":              long_passes_p90(df, minutes),
        "defensive_action_height_iqr":  defensive_action_height_iqr(df),
        "median_action_height":         median_action_height(df),
    }


def extract_all(df: pd.DataFrame) -> dict:
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }