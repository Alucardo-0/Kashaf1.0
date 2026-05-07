"""
Shared feature derivation logic.
All unit-specific feature files import from here.
Nothing in this file knows about specific units — it only
knows about events, coordinates, and our derivation rules.
"""

import numpy as np
import pandas as pd
from config.settings import (
    PROGRESSIVE_THRESHOLD_STANDARD,
    PROGRESSIVE_THRESHOLD_FINAL_THIRD,
    PROGRESSIVE_FORWARD_RATIO,
    MAX_PASS_LENGTH,
    LONG_PASS_THRESHOLD,
    FINAL_THIRD_UNITS,
    FINAL_THIRD_X_MIN,
    WIDE_ZONE_Y_MAX,
    WIDE_ZONE_Y_MIN,
    BOX_X_MIN, BOX_Y_MIN, BOX_Y_MAX,
    CENTRAL_ZONE_Y_MIN, CENTRAL_ZONE_Y_MAX,
)


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def euclidean(x1: float, y1: float, x2: float, y2: float) -> float:
    return np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def per90(count: float, minutes: float) -> float:
    """Normalize a count to per-90-minutes rate."""
    if minutes <= 0:
        return 0.0
    return (count / minutes) * 90.0


def safe_ratio(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Division with zero-denominator guard."""
    if denominator == 0:
        return default
    return numerator / denominator


# ---------------------------------------------------------------------------
# Filtering helpers
# ---------------------------------------------------------------------------

def open_play(df: pd.DataFrame) -> pd.DataFrame:
    """Filter to open play events only."""
    return df[~df["set_piece"].fillna(False)]


def action_filter(df: pd.DataFrame, *action_types: str) -> pd.DataFrame:
    """Filter to specific action types."""
    return df[df["action_type"].isin(action_types)]


def successful(df: pd.DataFrame) -> pd.DataFrame:
    """Filter to successful outcomes only."""
    return df[df["outcome"] == True]


# ---------------------------------------------------------------------------
# Coordinate-based event classifications
# ---------------------------------------------------------------------------

def is_progressive(
    start_x: pd.Series,
    start_y: pd.Series,
    end_x: pd.Series,
    end_y: pd.Series,
    unit: str,
) -> pd.Series:
    """
    Returns a boolean Series indicating whether each pass/carry is progressive.

    Rules:
      1. Forward gain >= threshold (unit-dependent)
      2. Forward gain / total length >= PROGRESSIVE_FORWARD_RATIO
      3. end coords must exist (not NaN)
    """
    threshold = (
        PROGRESSIVE_THRESHOLD_FINAL_THIRD
        if unit in FINAL_THIRD_UNITS
        else PROGRESSIVE_THRESHOLD_STANDARD
    )

    x_gain = end_x - start_x

    length = np.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
    length = length.replace(0, np.nan)

    forward_ratio = x_gain / length

    has_end_coords = end_x.notna() & end_y.notna()

    return (
        has_end_coords &
        (x_gain >= threshold) &
        (forward_ratio >= PROGRESSIVE_FORWARD_RATIO)
    )


def is_cross(
    start_x: pd.Series,
    start_y: pd.Series,
    end_x: pd.Series,
    end_y: pd.Series,
) -> pd.Series:
    """
    A cross is a pass that:
      - Starts in the wide zone (y < 25 or y > 55)
      - Starts in the final third (x > 66.7)
      - Ends in the penalty box (x > 83, y between 20-80)
    """
    starts_wide      = (start_y < WIDE_ZONE_Y_MAX) | (start_y > WIDE_ZONE_Y_MIN)
    starts_final_3rd = start_x > FINAL_THIRD_X_MIN
    ends_in_box      = (
        end_x.notna() &
        (end_x > BOX_X_MIN) &
        (end_y.notna()) &
        (end_y > BOX_Y_MIN) &
        (end_y < BOX_Y_MAX)
    )
    return starts_wide & starts_final_3rd & ends_in_box


def is_cut_inside_carry(
    start_y: pd.Series,
    end_y: pd.Series,
) -> pd.Series:
    """
    A cut-inside carry moves from a wide zone to the central zone.
      Start: y < 25 (top wide) or y > 55 (bottom wide)
      End:   y between 25-55 (central)
    """
    starts_wide    = (start_y < WIDE_ZONE_Y_MAX) | (start_y > WIDE_ZONE_Y_MIN)
    ends_central   = (
        end_y.notna() &
        (end_y >= CENTRAL_ZONE_Y_MIN) &
        (end_y <= CENTRAL_ZONE_Y_MAX)
    )
    return starts_wide & ends_central


def is_long_pass(
    start_x: pd.Series,
    start_y: pd.Series,
    end_x: pd.Series,
    end_y: pd.Series,
) -> pd.Series:
    """Pass with length > LONG_PASS_THRESHOLD."""
    has_end = end_x.notna() & end_y.notna()
    length  = np.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
    return has_end & (length > LONG_PASS_THRESHOLD)


def is_valid_pass_length(
    start_x: pd.Series,
    start_y: pd.Series,
    end_x: pd.Series,
    end_y: pd.Series,
) -> pd.Series:
    """
    Pass length within the allowed range for progressive pass detection.
    Filters out goal kicks and outlier long balls.
    """
    has_end = end_x.notna() & end_y.notna()
    length  = np.sqrt((end_x - start_x) ** 2 + (end_y - start_y) ** 2)
    return has_end & (length <= MAX_PASS_LENGTH)


def is_in_box(x: pd.Series, y: pd.Series) -> pd.Series:
    """Returns True for coordinates inside the penalty box."""
    return (x > BOX_X_MIN) & (y > BOX_Y_MIN) & (y < BOX_Y_MAX)


def is_in_final_third(x: pd.Series) -> pd.Series:
    """Returns True for events starting in the final third."""
    return x > FINAL_THIRD_X_MIN


def is_drop_deep(x: pd.Series) -> pd.Series:
    """
    Reception in the middle third or own half (x < 66.7).
    Used for strikers: a reception below the final third = dropping deep.
    """
    return x <= FINAL_THIRD_X_MIN


# ---------------------------------------------------------------------------
# Core derivation functions
# ---------------------------------------------------------------------------

def get_total_minutes(df: pd.DataFrame) -> float:
    """
    Total minutes played across all matches.
    Sum across unique matches (minutes column is per-match).
    """
    return df.groupby("match_id")["minutes"].first().sum()


def defensive_actions_p90(df: pd.DataFrame, minutes: float) -> float:
    """Tackles + Interceptions + Aerials (open play only)."""
    def_events = open_play(
        action_filter(df, "tackle", "interception", "aerial")
    )
    return per90(len(def_events), minutes)


def tackle_ratio(df: pd.DataFrame) -> float:
    """
    Tackles / (Tackles + Interceptions).
    Behavioral ratio: engager vs reader.
    Returns 0.5 as neutral default if no defensive actions.
    """
    tackles       = len(action_filter(df, "tackle"))
    interceptions = len(action_filter(df, "interception"))
    total         = tackles + interceptions
    return safe_ratio(tackles, total, default=0.5)


def tackles_p90(df: pd.DataFrame, minutes: float) -> float:
    """Open play tackle attempts per 90 minutes."""
    tackles = open_play(action_filter(df, "tackle"))
    return per90(len(tackles), minutes)


def interceptions_p90(df: pd.DataFrame, minutes: float) -> float:
    """Open play interceptions per 90 minutes."""
    interceptions = open_play(action_filter(df, "interception"))
    return per90(len(interceptions), minutes)


def tackle_to_interception_ratio(df: pd.DataFrame) -> float:
    """
    Tackles / (Tackles + Interceptions) - open play only.
    Returns 0.5 as neutral default if no defensive actions.
    """
    tackles = len(open_play(action_filter(df, "tackle")))
    interceptions = len(open_play(action_filter(df, "interception")))
    total = tackles + interceptions
    return safe_ratio(tackles, total, default=0.5)


def headed_actions_p90(df: pd.DataFrame, minutes: float) -> float:
    """Open play headed passes plus headed clearances per 90."""
    passes = open_play(action_filter(df, "pass"))
    clearances = open_play(action_filter(df, "clearance"))

    headed_passes = (passes["body_part"] == "head").sum()
    headed_clearances = (clearances["body_part"] == "head").sum()

    return per90(headed_passes + headed_clearances, minutes)


def aerial_duels_p90(df: pd.DataFrame, minutes: float) -> float:
    """All aerial duel attempts per 90 (open play)."""
    aerials = open_play(action_filter(df, "aerial"))
    return per90(len(aerials), minutes)


def progressive_passes_p90(df: pd.DataFrame, minutes: float, unit: str) -> float:
    """
    Successful open play progressive passes per 90.
    Applies unit-specific threshold and MAX_PASS_LENGTH filter.
    """
    passes = open_play(successful(action_filter(df, "pass")))
    if passes.empty:
        return 0.0

    length_ok    = is_valid_pass_length(
        passes["start_x"], passes["start_y"],
        passes["end_x"],   passes["end_y"],
    )
    progressive  = is_progressive(
        passes["start_x"], passes["start_y"],
        passes["end_x"],   passes["end_y"],
        unit=unit,
    )
    count = (length_ok & progressive).sum()
    return per90(count, minutes)


def progressive_carries_p90(df: pd.DataFrame, minutes: float, unit: str) -> float:
    """
    Open play progressive carries per 90.
    Applies unit-specific threshold.
    """
    carries = open_play(action_filter(df, "carry"))
    if carries.empty:
        return 0.0

    progressive = is_progressive(
        carries["start_x"], carries["start_y"],
        carries["end_x"],   carries["end_y"],
        unit=unit,
    )
    count = progressive.sum()
    return per90(count, minutes)


def wide_carries_p90(df: pd.DataFrame, minutes: float) -> float:
    """
    Open-play carries ending near either touchline, per 90.
    """
    from config.settings import WIDE_CARRY_TOUCHLINE_DIST

    carries = open_play(action_filter(df, "carry"))
    carries = carries[carries["end_y"].notna()]
    if carries.empty:
        return 0.0

    near_touchline = (
        (carries["end_y"] <= WIDE_CARRY_TOUCHLINE_DIST)
        | (carries["end_y"] >= (100.0 - WIDE_CARRY_TOUCHLINE_DIST))
    )
    return per90(near_touchline.sum(), minutes)


def crosses_p90(df: pd.DataFrame, minutes: float) -> float:
    """Crosses per 90 (using explicit is_cross flag from source data)."""
    passes = open_play(action_filter(df, "pass"))
    if passes.empty:
        return 0.0
    return per90(passes["is_cross"].sum(), minutes)


def dribble_attempts_p90(df: pd.DataFrame, minutes: float) -> float:
    """All dribble attempts per 90 (successful or failed)."""
    dribbles = open_play(action_filter(df, "dribble"))
    return per90(len(dribbles), minutes)


def shots_p90(df: pd.DataFrame, minutes: float) -> float:
    """All shot attempts per 90 (open play only)."""
    shots = open_play(action_filter(df, "shot"))
    return per90(len(shots), minutes)


def median_defensive_action_height(df: pd.DataFrame) -> float:
    """
    Median x-coordinate of all defensive actions (open play).
    Used for CB core feature.
    """
    def_events = open_play(action_filter(df, "tackle", "interception", "aerial"))
    if def_events.empty:
        return 0.0
    return float(def_events["start_x"].median())


def median_action_height(df: pd.DataFrame) -> float:
    """
    Median x-coordinate of ALL actions (open play).
    Used as context feature and FB core feature.
    """
    events = open_play(df)
    if events.empty:
        return 0.0
    return float(events["start_x"].median())


def median_lateral_position(df: pd.DataFrame) -> float:
    """
    Median absolute distance from pitch center (y=50) for open-play actions.
    Higher values indicate wider average positioning.
    """
    events = open_play(df)
    if events.empty:
        return 0.0
    distance_from_center = (events["start_y"] - 50).abs()
    return float(distance_from_center.median())


def cut_inside_carry_pct(df: pd.DataFrame) -> float:
    """
    % of carries that move from wide to central zone.
    Used in Winger core.
    """
    carries = open_play(action_filter(df, "carry"))
    carries = carries[carries["end_y"].notna()]
    if carries.empty:
        return 0.0
    cut_inside = is_cut_inside_carry(carries["start_y"], carries["end_y"])
    return safe_ratio(cut_inside.sum(), len(carries))


def penalty_area_touch_pct(df: pd.DataFrame) -> float:
    """
    % of all open play touches that occur in the penalty box.
    Used in Striker core.
    """
    events = open_play(df)
    if events.empty:
        return 0.0
    in_box = is_in_box(events["start_x"], events["start_y"])
    return safe_ratio(in_box.sum(), len(events))


def drop_deep_reception_pct(df: pd.DataFrame) -> float:
    """
    % of receptions that occur outside the final third (dropping deep).
    Used in Striker core.
    """
    receptions = open_play(action_filter(df, "reception"))
    if receptions.empty:
        return 0.0
    deep = is_drop_deep(receptions["start_x"])
    return safe_ratio(deep.sum(), len(receptions))


def headed_shots_pct(df: pd.DataFrame) -> float:
    """
    Proportion of open-play shots taken with the head.
    Returns 0.0 if no shots recorded.
    """
    shots = open_play(action_filter(df, "shot"))
    total = len(shots)
    if total == 0:
        return 0.0

    headed = (shots["body_part"] == "head").sum()
    return safe_ratio(headed, total)


# ---------------------------------------------------------------------------
# Context-only derivations
# ---------------------------------------------------------------------------

def aerial_win_pct(df: pd.DataFrame) -> float:
    aerials = action_filter(df, "aerial")
    total   = len(aerials)
    if total == 0:
        return 0.0
    won = (aerials["outcome"] == True).sum()
    return safe_ratio(won, total)


def pass_completion_pct(df: pd.DataFrame) -> float:
    passes = open_play(action_filter(df, "pass"))
    total  = len(passes)
    if total == 0:
        return 0.0
    completed = (passes["outcome"] == True).sum()
    return safe_ratio(completed, total)


def dribble_success_pct(df: pd.DataFrame) -> float:
    dribbles = action_filter(df, "dribble")
    total    = len(dribbles)
    if total == 0:
        return 0.0
    won = (dribbles["outcome"] == True).sum()
    return safe_ratio(won, total)


def tackle_win_pct(df: pd.DataFrame) -> float:
    tackles = action_filter(df, "tackle")
    total   = len(tackles)
    if total == 0:
        return 0.0
    won = (tackles["outcome"] == True).sum()
    return safe_ratio(won, total)


def cross_completion_pct(df: pd.DataFrame) -> float:
    all_passes = open_play(action_filter(df, "pass"))
    if all_passes.empty:
        return 0.0

    all_crosses = all_passes[all_passes["is_cross"]]
    total_crosses = len(all_crosses)
    if total_crosses == 0:
        return 0.0

    completed = (all_crosses["outcome"] == True).sum()
    return safe_ratio(completed, total_crosses)


def progressive_pass_pct(df: pd.DataFrame, unit: str) -> float:
    """% of total open play passes that are progressive."""
    passes = open_play(successful(action_filter(df, "pass")))
    all_passes = open_play(action_filter(df, "pass"))
    if all_passes.empty:
        return 0.0
    total = len(all_passes)

    if passes.empty:
        return 0.0

    length_ok   = is_valid_pass_length(
        passes["start_x"], passes["start_y"],
        passes["end_x"],   passes["end_y"],
    )
    progressive = is_progressive(
        passes["start_x"], passes["start_y"],
        passes["end_x"],   passes["end_y"],
        unit=unit,
    )
    prog_count = (length_ok & progressive).sum()
    return safe_ratio(prog_count, total)


def long_passes_p90(df: pd.DataFrame, minutes: float) -> float:
    passes = open_play(action_filter(df, "pass"))
    if passes.empty:
        return 0.0
    long_mask = is_long_pass(
        passes["start_x"], passes["start_y"],
        passes["end_x"],   passes["end_y"],
    )
    return per90(long_mask.sum(), minutes)


def defensive_action_height_iqr(df: pd.DataFrame) -> float:
    """IQR of defensive action x-coordinates. Context feature for CBs."""
    def_events = open_play(action_filter(df, "tackle", "interception", "aerial"))
    if len(def_events) < 4:
        return 0.0
    q75, q25 = np.percentile(def_events["start_x"], [75, 25])
    return float(q75 - q25)


def avg_shot_distance(df: pd.DataFrame) -> float:
    """Average distance of shots from goal center (100, 50)."""
    shots = open_play(action_filter(df, "shot"))
    if shots.empty:
        return 0.0
    distances = np.sqrt(
        (shots["start_x"] - 100) ** 2 +
        (shots["start_y"] - 50) ** 2
    )
    return float(distances.mean())


def receptions_final_third_p90(df: pd.DataFrame, minutes: float) -> float:
    receptions = open_play(action_filter(df, "reception"))
    if receptions.empty:
        return 0.0
    in_final_third = is_in_final_third(receptions["start_x"])
    return per90(in_final_third.sum(), minutes)

def passes_into_final_third_p90(df: pd.DataFrame, minutes: float) -> float:
    """
    Open play passes that start outside the final third (start_x <= 66.7)
    and end inside it (end_x > 66.7), per 90 minutes.

    The primary Wide Playmaker signature — they receive in the middle
    third and thread balls into dangerous areas. Wide Wingers already
    operate from the final third so their passes don't generate this.
    Inside Forwards receive in the final third rather than pass into it.
    The main weakness: if you're a wide-playmaker of a dominent team and 
    camp in the opponent's final third, well... it might not work as intended 
    """
    passes = open_play(successful(action_filter(df, "pass")))
    if passes.empty:
        return 0.0

    has_end = passes["end_x"].notna()
    enters_final_third = (
        has_end &
        (passes["start_x"] <= FINAL_THIRD_X_MIN) &
        (passes["end_x"] > FINAL_THIRD_X_MIN)
    )
    return per90(enters_final_third.sum(), minutes)

def penalty_area_receptions_p90(df: pd.DataFrame, minutes: float) -> float:
    """Open-play receptions received inside the penalty box per 90."""
    receptions = open_play(action_filter(df, "reception"))
    if receptions.empty:
        return 0.0
    in_box = is_in_box(receptions["start_x"], receptions["start_y"])
    return per90(in_box.sum(), minutes)


def penalty_area_touches_p90(df: pd.DataFrame, minutes: float) -> float:
    events = open_play(df)
    if events.empty:
        return 0.0
    in_box = is_in_box(events["start_x"], events["start_y"])
    return per90(in_box.sum(), minutes)


def action_bias(df: pd.DataFrame) -> float:
    """
    Shot/Cross Preference: shots / (shots + crosses).
    1.0 = pure shooter (Inside Forward).
    0.0 = pure crosser (Touchline Winger).
    Returns 0.5 (neutral) if no shots or crosses.
    """
    shots = len(open_play(action_filter(df, "shot")))
    crosses = open_play(action_filter(df, "pass"))
    cross_count = crosses["is_cross"].sum() if not crosses.empty else 0
    total = shots + cross_count
    return safe_ratio(shots, total, default=0.5)


def attacking_directness(df: pd.DataFrame) -> float:
    """
    End-Product Rate: (shots + crosses) / final_third_receptions.
    Measures how efficiently possession in the final third
    converts into scoring actions.  Neutralizes team possession level.
    Wide Playmakers score low; IFs and TWs score high.
    Returns 0.0 if no final third receptions.
    """
    shots = len(open_play(action_filter(df, "shot")))
    crosses = open_play(action_filter(df, "pass"))
    cross_count = crosses["is_cross"].sum() if not crosses.empty else 0

    receptions = open_play(action_filter(df, "reception"))
    if receptions.empty:
        return 0.0
    ft_receptions = is_in_final_third(receptions["start_x"]).sum()
    if ft_receptions == 0:
        return 0.0

    return safe_ratio(shots + cross_count, ft_receptions)


def box_magnetism(df: pd.DataFrame) -> float:
    """
    Penalty Area Reception %: box_receptions / attacking_half_receptions.
    Where the player gravitates to receive the ball.
    Inside Forwards score high; Touchline Wingers score very low.
    Returns 0.0 if no attacking half receptions.
    """
    from config.settings import ATTACKING_HALF_X_MIN

    receptions = open_play(action_filter(df, "reception"))
    if receptions.empty:
        return 0.0

    attacking_half = receptions["start_x"] >= ATTACKING_HALF_X_MIN
    ah_count = attacking_half.sum()
    if ah_count == 0:
        return 0.0

    in_box = is_in_box(receptions["start_x"], receptions["start_y"])
    box_count = (in_box & attacking_half).sum()
    return safe_ratio(box_count, ah_count)
