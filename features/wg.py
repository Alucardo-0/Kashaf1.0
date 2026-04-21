"""
Winger feature extraction.
K=3: experimental split

Design notes:
- median_lateral_position adds a stable positional width axis.
- progressive_passes_p90 stays in core for Wide Playmaker separation.
- progressive_carries_p90 stays in core for wide-running profiles.
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    crosses_p90,
    shots_p90,
    progressive_carries_p90,
    progressive_passes_p90,
    penalty_area_receptions_p90,
    median_lateral_position,
    # context
    dribble_attempts_p90,
    dribble_success_pct,
    cross_completion_pct,
    pass_completion_pct,
    progressive_pass_pct,
    cut_inside_carry_pct,
)

UNIT = "wg"


def extract_core_features(df: pd.DataFrame) -> dict:
    """6 core features for WG clustering."""
    minutes = get_total_minutes(df)

    return {
        "crosses_p90":                  crosses_p90(df, minutes),
        "shots_p90":                    shots_p90(df, minutes),
        "progressive_carries_p90":      progressive_carries_p90(df, minutes, UNIT),
        "progressive_passes_p90":       progressive_passes_p90(df, minutes, UNIT),
        "penalty_area_receptions_p90":  penalty_area_receptions_p90(df, minutes),
        "median_lateral_position":      median_lateral_position(df),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """Context features for WG scouting report only."""
    minutes = get_total_minutes(df)

    return {
        "dribble_attempts_p90":     dribble_attempts_p90(df, minutes),
        "dribble_success_pct":      dribble_success_pct(df),
        "cut_inside_carry_pct":     cut_inside_carry_pct(df),
        "cross_completion_pct":     cross_completion_pct(df),
        "pass_completion_pct":      pass_completion_pct(df),
        "progressive_pass_pct":     progressive_pass_pct(df, UNIT),
    }


def extract_all(df: pd.DataFrame) -> dict:
    """Returns both core and context feature dicts."""
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }