"""
Winger feature extraction.
K=4: Wide Winger / Inside Forward / Wide Playmaker / Low Data Winger

Design notes:
- progressive_carries_p90 replaced in core with wide_carries_p90,
  then kept in context as narrative volume.
- median_lateral_position provides a stable width axis independent of volume.
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    crosses_p90,
    shots_p90,
    wide_carries_p90,
    progressive_passes_p90,
    penalty_area_receptions_p90,
    median_lateral_position,
    # context
    progressive_carries_p90,
    dribble_attempts_p90,
    dribble_success_pct,
    cross_completion_pct,
    pass_completion_pct,
    progressive_pass_pct,
    cut_inside_carry_pct,
)

UNIT = "wg"


def extract_core_features(df: pd.DataFrame) -> dict:
    """ 
    7 core features for WG clustering.

    Feature → Archetype signal:
      crosses_p90:                  Wide Winger — delivery from wide
      shots_p90:                    Inside Forward — goal threat
      cut_inside_carry_pct:         Inside Forward — ratio of carries
                                    moving from wide to central zone.
                                    Volume-independent: works even for
                                    low-activity players, breaks garbage
                                    cluster the same way
                                    tackle_to_interception_ratio fixed CB
      dribble_attempts_p90:         attacking intent — separates active
                                    from passive within archetypes
      progressive_passes_p90:       Wide Playmaker — distribution
      penalty_area_receptions_p90:  Inside Forward — box presence
      median_lateral_position:      Touchline Winger = high,
                                    Inside Forward = low
    """
    minutes = get_total_minutes(df)

    return {
        "crosses_p90":                  crosses_p90(df, minutes),
        "shots_p90":                    shots_p90(df, minutes),
        "cut_inside_carry_pct":         cut_inside_carry_pct(df),
        "dribble_attempts_p90":         dribble_attempts_p90(df, minutes),
        "progressive_passes_p90":       progressive_passes_p90(df, minutes, UNIT),
        "penalty_area_receptions_p90":  penalty_area_receptions_p90(df, minutes),
        "median_lateral_position":      median_lateral_position(df),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """Context features for WG scouting report only."""
    minutes = get_total_minutes(df)

    return {
        "progressive_carries_p90":  progressive_carries_p90(df, minutes, UNIT),
        "wide_carries_p90":         wide_carries_p90(df, minutes),
        "dribble_success_pct":      dribble_success_pct(df),
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