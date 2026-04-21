# PITCH DIMENSIONS
# All coordinates normalized to 100x100
# x=0: own goal line, x=100: opponent goal line
# y=0: top touchline, y=100: bottom touchline

PITCH_LENGTH = 100.0
PITCH_WIDTH = 100.0

# StatsBomb native dimensions (for normalization on load)
SB_PITCH_LENGTH = 120.0
SB_PITCH_WIDTH  = 80.0

#- ZONE DEFINITIONS -#

# Thirds
OWN_THIRD_X_MAX      = 33.3
MIDDLE_THIRD_X_MIN   = 33.3
MIDDLE_THIRD_X_MAX   = 66.7
FINAL_THIRD_X_MIN    = 66.7

# Wide zones (for cross detection and cut-inside carry)

WIDE_ZONE_Y_MAX      = 25.0   # top wide channel  (y < 25)
WIDE_ZONE_Y_MIN      = 55.0   # bottom wide channel (y > 55)
CENTRAL_ZONE_Y_MIN   = 25.0
CENTRAL_ZONE_Y_MAX   = 55.0

# Penalty box
BOX_X_MIN            = 83.0
BOX_Y_MIN            = 20.0
BOX_Y_MAX            = 80.0

# PROGRESSIVE PASS / CARRY THRESHOLDS

# Standard units: CB, FB, MF
PROGRESSIVE_THRESHOLD_STANDARD     = 10.0

# Final-third units: WG, ST (less pitch ahead)
PROGRESSIVE_THRESHOLD_FINAL_THIRD  =  7.0

# Minimum fraction of pass/carry distance that must be forward
PROGRESSIVE_FORWARD_RATIO          =  0.40


# Pass-specific
MAX_PASS_LENGTH                    = 60.0   # filters goal kicks and outlier long balls
LONG_PASS_THRESHOLD                = 32.0   # for context feature: long passes p90

# Units that use the lower progressive threshold
FINAL_THIRD_UNITS = {"wg", "st"}


#- Clustering -#

K_VALUES = {
    "cb": 4,
    "fb": 3,
    "mf": 4,
    "wg": 3,
    "st": 3,
}

SOFT_ASSIGNMENT_POWER   = 2      # inverse distance weighting exponent
OUTLIER_STD_THRESHOLD   = 2.5    # std devs from nearest centroid -> excluded from reference pool
N_INIT                  = 20     # KMeans n_init (multiple restarts for stability)
RANDOM_STATE            = 42
# Minimum number of players a cluster must contain after outlier removal.
# Clusters below this threshold have their members removed before the
# final KMeans refit — prevents a single statistical outlier from
# capturing its own cluster and warping the entire archetype space.
MIN_CLUSTER_POPULATION  = 10

#- Training -#



MIN_EVENTS_THRESHOLD    = 150    # minimum total events for a player to enter training

MIN_EVENTS_THRESHOLD_BY_UNIT = {
    "cb": 200,
    "fb": 150,
    "mf": 250,
    "wg": 150,
    "st": 150,
}

# Isolation Forest contamination parameter per unit.
# Represents expected proportion of statistical outliers.
# MF is slightly higher because low-volume midfielders are more common
# in the StatsBomb open data pool.
ISOLATION_FOREST_CONTAMINATION = {
    "cb": 0.05,
    "fb": 0.05,
    "mf": 0.08,
    "wg": 0.05,
    "st": 0.05,
}


# Pre-training diagnostic thresholds
DIAG_MAX_WARNINGS_BEFORE_ABORT = 4
DIAG_CORE_ZERO_ABORT_COUNT = 3
DIAG_MISSING_CRITICAL_ACTION_ABORT_COUNT = 2
DIAG_PASS_SUCCESS_ABORT_THRESHOLD = 0.05
DIAG_PASS_SUCCESS_WARN_THRESHOLD = 0.30
DIAG_END_COVERAGE_ABORT_THRESHOLD = 0.30
DIAG_END_COVERAGE_WARN_THRESHOLD = 0.50


#- Twin Matching -#

N_TWINS                 = 3      # number of twins to return per player


#- Unit Mapping -#


POSITION_UNIT_MAP = {
    "CB":  "cb",
    "LB":  "fb",
    "RB":  "fb",
    "DM":  "mf",
    "CM":  "mf",
    "AM":  "mf",
    "LW":  "wg",
    "RW":  "wg",
    "ST":  "st",
}

#- STATSBOMB EVENT TYPE MAPPING → OUR ACTION TYPES -#


SB_EVENT_TYPE_MAP = {
    "Pass":           "pass",
    "Carry":          "carry",
    "Dribble":        "dribble",
    "Shot":           "shot",
    "Ball Receipt*":  "reception",
    "Interception":   "interception",
    "Clearance":      "clearance",
    "Foul Committed": "foul",
    # Duels are handled separately (split into tackle / aerial based on duel subtype)
}

# StatsBomb duel subtypes that map to our action types
SB_DUEL_TACKLE_TYPES  = {"Tackle"}
SB_DUEL_AERIAL_TYPES  = {"Aerial Lost", "Aerial Won"}

# StatsBomb play patterns that indicate a set piece (for set_piece flag)
SB_SET_PIECE_PATTERNS = {
    "From Corner",
    "From Free Kick",
    "From Goal Kick",
    "From Throw In",
    "From Keeper",
}

# StatsBomb pass types that force set_piece = True regardless of play pattern
SB_SET_PIECE_PASS_TYPES = {
    "Corner",
    "Free Kick",
    "Goal Kick",
    "Throw-in",
    "Kick Off",
}

# StatsBomb outcomes that map to success = True
SB_SUCCESS_OUTCOMES = {
    "Complete",
    "Won",
    "Success",
    "Success In Play",
    "Success Out",
    "Goal",
    "No Touch",
}

# StatsBomb outcomes that map to success = False
SB_FAILURE_OUTCOMES = {
    "Incomplete",
    "Lost",
    "Fail",
    "Blocked",
    "Off T",
    "Post",
    "Saved",
    "Wayward",
    "Lost In Play",
    "Lost Out",
    "No Foul",
}

# Action types where outcome is ALWAYS True (success by definition)
ALWAYS_SUCCESS_ACTIONS = {"reception", "interception", "clearance"}

# Action types where end coordinates are not needed
NO_END_COORDS_ACTIONS = {
    "dribble",
    "shot",
    "reception",
    "tackle",
    "interception",
    "aerial",
    "clearance",
    "foul",
}
