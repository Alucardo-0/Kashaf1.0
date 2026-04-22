"""
Midfielder feature extraction.
K=4: Anchor / Deep Playmaker / Carrying Midfielder / Advanced Playmaker

Design notes:
- 6 core features chosen carefully to avoid curse of dimensionality
  with K=4. Rule of thumb: ~1.5x features per cluster.
- tackles_p90 kept over interceptions_p90: more stylistically decisive
  for Anchor separation. Interceptions partially captured by height.
- progressive_passes_p90 kept over long_passes_p90: captures Deep
  Playmaker signature. Long passes moved to context.
- dribble_attempts_p90 kept over progressive_carries_p90: more directly
  captures Advanced Playmaker intent. Carries redundant with height+dribbles.
- tackles_p90 separates Anchor (physical) from Deep Playmaker (reader).
- median_action_height + penalty_area_receptions_p90 give positional
  axes independent of volume - break the all-negative garbage cluster.
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    tackles_p90,
    progressive_passes_p90,
    dribble_attempts_p90,
    long_passes_p90,
    median_action_height,
    penalty_area_receptions_p90,
    # context
    defensive_actions_p90,
    interceptions_p90,
    progressive_carries_p90,
    pass_completion_pct,
    tackle_win_pct,
    dribble_success_pct,
    progressive_pass_pct,
)

UNIT = "mf"


def extract_core_features(df: pd.DataFrame) -> dict:
    """
    6 core features for MF clustering.
    Kept at 6 to avoid curse of dimensionality with K=4.

    Feature -> Archetype signal:
      tackles_p90:                  Anchor - physical ball-winning
      progressive_passes_p90:       Deep Playmaker - progression + range
      dribble_attempts_p90:         Advanced Playmaker - 1v1 intent
      long_passes_p90:              Deep Playmaker - distribution range,
                                    separates from Anchor on creativity
      median_action_height:         positional depth - all archetypes
                                    have characteristic height even at
                                    low volume, breaks garbage cluster
      penalty_area_receptions_p90:  Advanced Playmaker - box presence,
                                    positional axis independent of volume
    """
    minutes = get_total_minutes(df)

    return {
        "tackles_p90":                  tackles_p90(df, minutes),
        "progressive_passes_p90":       progressive_passes_p90(df, minutes, UNIT),
        "long_passes_p90":              long_passes_p90(df, minutes),
        "dribble_attempts_p90":         dribble_attempts_p90(df, minutes),
        "median_action_height":         median_action_height(df),
        "penalty_area_receptions_p90":  penalty_area_receptions_p90(df, minutes),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """
    Context features for MF scouting report.
    interceptions_p90 and progressive_carries_p90 moved here -
    useful scouting narrative but redundant in core.
    """
    minutes = get_total_minutes(df)

    return {
        "defensive_actions_p90":  defensive_actions_p90(df, minutes),
        "interceptions_p90":      interceptions_p90(df, minutes),
        "progressive_carries_p90": progressive_carries_p90(df, minutes, UNIT),
        "pass_completion_pct":    pass_completion_pct(df),
        "tackle_win_pct":         tackle_win_pct(df),
        "dribble_success_pct":    dribble_success_pct(df),
        "progressive_pass_pct":   progressive_pass_pct(df, UNIT),
        "long_passes_p90":        long_passes_p90(df, minutes),
    }


def extract_all(df: pd.DataFrame) -> dict:
    """Returns both core and context feature dicts."""
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }