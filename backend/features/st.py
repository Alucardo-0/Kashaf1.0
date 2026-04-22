"""
Striker feature extraction.
K=3: Poacher / Target Man / Link-Up Striker
"""

import pandas as pd
from features.base import (
    get_total_minutes,
    shots_p90,
    penalty_area_touch_pct,
    headed_shots_pct,
    aerial_duels_p90,
    drop_deep_reception_pct,
    dribble_attempts_p90,
    # context
    dribble_success_pct,
    pass_completion_pct,
    avg_shot_distance,
    receptions_final_third_p90,
    penalty_area_touches_p90,
)

UNIT = "st"


def extract_core_features(df: pd.DataFrame) -> dict:
    minutes = get_total_minutes(df)

    return {
        "shots_p90":               shots_p90(df, minutes),
        "penalty_area_touch_pct":  penalty_area_touch_pct(df),
        "headed_shots_pct":        headed_shots_pct(df),
        "drop_deep_reception_pct": drop_deep_reception_pct(df),
        "dribble_attempts_p90":    dribble_attempts_p90(df, minutes),
    }


def extract_context_features(df: pd.DataFrame) -> dict:
    """
    Context features for ST scouting report.
    aerial_win_pct removed due StatsBomb loser-side aerial logging.
    """
    minutes = get_total_minutes(df)

    return {
        "aerial_duels_p90":             aerial_duels_p90(df, minutes),
        "dribble_success_pct":          dribble_success_pct(df),
        "pass_completion_pct":          pass_completion_pct(df),
        "avg_shot_distance":            avg_shot_distance(df),
        "receptions_final_third_p90":   receptions_final_third_p90(df, minutes),
        "penalty_area_touches_p90":     penalty_area_touches_p90(df, minutes),
    }


def extract_all(df: pd.DataFrame) -> dict:
    return {
        "core":    extract_core_features(df),
        "context": extract_context_features(df),
    }