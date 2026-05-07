"""
Winger feature extraction.
K=3: Inside Forward / Wide Playmaker / Wide Winger

Design notes:
- action_bias:           shot/cross preference ratio — cleanly separates
                         shooters (IF) from crossers (TW)
- attacking_directness:  end-product rate — neutralizes team possession level
- box_magnetism:         where the player gravitates to receive the ball
- cut_inside_carry_pct:  ratio of carries moving wide → central
- dribble_attempts_p90:  attacking intent volume
- progressive_passes_p90: wide playmaker distribution signal
- median_lateral_position: touchline proximity axis
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    action_bias,
    attacking_directness,
    box_magnetism,
    cut_inside_carry_pct,
    dribble_attempts_p90,
    progressive_passes_p90,
    median_lateral_position,
    passes_into_final_third_p90,
    # context
    dribble_success_pct,
    cross_completion_pct,
    pass_completion_pct,
    progressive_pass_pct,
)

UNIT = "wg"


def extract_core_features(df: pd.DataFrame) -> dict:
    """ 
    7 core features for WG clustering.

    Feature → Archetype signal:
      action_bias:                Inside Forward = high (shooter),
                                  Wide Winger = low (crosser)
      attacking_directness:       IF + TW high, Wide Playmaker low
      box_magnetism:              Inside Forward high, TW very low
      cut_inside_carry_pct:       Inside Forward — ratio of carries
                                  moving from wide to central zone.
                                  Volume-independent: works even for
                                  low-activity players
      dribble_attempts_p90:       attacking intent — separates active
                                  from passive within archetypes
      progressive_passes_p90:     Wide Playmaker — distribution
      median_lateral_position:    Touchline Winger = high,
                                  Inside Forward = low
    """
    minutes = get_total_minutes(df)

    return {
        "action_bias":                  action_bias(df),
        "attacking_directness":         attacking_directness(df),
        "box_magnetism":                box_magnetism(df),
        "cut_inside_carry_pct":         cut_inside_carry_pct(df),
        "dribble_attempts_p90":         dribble_attempts_p90(df, minutes),
        "progressive_passes_p90":       progressive_passes_p90(df, minutes, UNIT),
        "median_lateral_position":      median_lateral_position(df),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """Context features for WG scouting report only."""
    minutes = get_total_minutes(df)

    return {
        "passes_into_final_third_p90":  passes_into_final_third_p90(df, minutes),
        "dribble_success_pct":          dribble_success_pct(df),
        "cross_completion_pct":         cross_completion_pct(df),
        "pass_completion_pct":          pass_completion_pct(df),
        "progressive_pass_pct":         progressive_pass_pct(df, UNIT),
    }


def extract_all(df: pd.DataFrame) -> dict:
    """Returns both core and context feature dicts."""
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }