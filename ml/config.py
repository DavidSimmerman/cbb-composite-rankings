import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgres://postgres:zOP9hbW5NI6tt9uadybKhwZjvAMrMCkDCuCl7ajRPKvd9Wwp1eUiMjTeTT5mxXmx@192.168.1.56:3120/postgres",
)

ML_PORT = int(os.environ.get("ML_PORT", "8100"))
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# --- Feature definitions ---
# Each matchup feature is (label, team_offense_col, opponent_defense_col, source_table)
# "diff" features use the same column from both teams (team_value - opp_value)

# Rating differential features (team - opponent)
RATING_DIFF_FEATURES = {
    "kp_net_rating_diff": {
        "label": "Overall Rating Edge",
        "description": "KenPom efficiency margin",
        "col": "net_rating",
        "table": "kenpom",
    },
    "bt_barthag_diff": {
        "label": "Power Rating Edge",
        "description": "BartTorvik overall power rating",
        "col": "barthag",
        "table": "barttorvik",
    },
    "em_relative_rating_diff": {
        "label": "Relative Rating Edge",
        "description": "EvanMiya relative rating",
        "col": "relative_rating",
        "table": "evanmiya",
    },
    "comp_avg_zscore_diff": {
        "label": "Composite Rating Edge",
        "description": "Composite z-score across all sources",
        "col": "avg_zscore",
        "table": "composite",
    },
    "net_rank_diff": {
        "label": "NET Ranking Edge",
        "description": "NCAA NET ranking differential",
        "col": "rank",
        "table": "net",
        "invert": True,  # lower rank = better, so flip sign
    },
    "kp_pythag_diff": {
        "label": "Expected Win Rate",
        "description": "KenPom Pythagorean win expectation",
        "col": "pythag",
        "table": "kenpom",
    },
    "kp_luck_diff": {
        "label": "Luck Factor",
        "description": "KenPom luck rating (variance from expected)",
        "col": "luck",
        "table": "kenpom",
    },
}

# Offense-vs-defense matchup features (team offense vs opponent defense)
MATCHUP_FEATURES = {
    "kp_efficiency_matchup": {
        "label": "Efficiency Matchup",
        "description": "Adjusted offensive efficiency vs opponent defensive efficiency",
        "off_col": "offensive_rating",
        "def_col": "defensive_rating",
        "table": "kenpom",
        "def_lower_better": True,
    },
    "bt_efficiency_matchup": {
        "label": "BT Efficiency Matchup",
        "description": "BartTorvik adjusted offensive vs defensive efficiency",
        "off_col": "adjoe",
        "def_col": "adjde",
        "table": "barttorvik",
        "def_lower_better": True,
    },
    "em_efficiency_matchup": {
        "label": "EM Efficiency Matchup",
        "description": "EvanMiya offensive rate vs opponent defensive rate",
        "off_col": "o_rate",
        "def_col": "d_rate",
        "table": "evanmiya",
        "def_lower_better": True,
    },
    "bt_efg_matchup": {
        "label": "Effective Shooting Matchup",
        "description": "Effective FG% offense vs effective FG% defense",
        "off_col": "efg_pct",
        "def_col": "efgd_pct",
        "table": "barttorvik",
        "def_lower_better": True,
    },
    "bt_3p_matchup": {
        "label": "3-Point Shooting Matchup",
        "description": "3pt shooting vs 3pt defense",
        "off_col": "3p_pct",
        "def_col": "3p_pct_d",
        "table": "barttorvik",
        "def_lower_better": True,
    },
    "bt_2p_matchup": {
        "label": "2-Point Shooting Matchup",
        "description": "2pt shooting vs 2pt defense",
        "off_col": "2p_pct",
        "def_col": "2p_pct_d",
        "table": "barttorvik",
        "def_lower_better": True,
    },
    "bt_3pr_matchup": {
        "label": "3-Point Rate Matchup",
        "description": "3pt attempt rate vs opponent 3pt rate allowed",
        "off_col": "3pr",
        "def_col": "3prd",
        "table": "barttorvik",
        "def_lower_better": True,
    },
    "bt_ftr_matchup": {
        "label": "Free Throw Rate Matchup",
        "description": "Free throw rate vs opponent free throw rate allowed",
        "off_col": "ftr",
        "def_col": "ftrd",
        "table": "barttorvik",
        "def_lower_better": True,
    },
    "bt_turnover_matchup": {
        "label": "Ball Security Matchup",
        "description": "Turnover rate vs opponent forced turnover rate",
        "off_col": "tor",
        "def_col": "tord",
        "table": "barttorvik",
        "off_lower_better": True,  # lower turnover rate = better offense
        "def_lower_better": False,  # higher forced TO rate = better defense
    },
    "bt_rebound_matchup": {
        "label": "Rebounding Matchup",
        "description": "Offensive rebound rate vs opponent defensive rebound rate",
        "off_col": "orb",
        "def_col": "drb",
        "table": "barttorvik",
        "def_lower_better": False,  # higher DRB = better defense, so matchup = off - def
    },
    "em_killshots_matchup": {
        "label": "Explosive Play Matchup",
        "description": "Kill shots made vs kill shots conceded per game",
        "off_col": "kill_shots_per_game",
        "def_col": "kill_shots_conceded_per_game",
        "table": "evanmiya",
        "def_lower_better": True,
    },
}

# Simple differential features (same column, team - opponent)
SIMPLE_DIFF_FEATURES = {
    "kp_tempo_diff": {
        "label": "Tempo Preference",
        "description": "Adjusted tempo differential",
        "col": "adjusted_tempo",
        "table": "kenpom",
    },
    "em_tempo_diff": {
        "label": "True Tempo Difference",
        "description": "EvanMiya true tempo differential",
        "col": "true_tempo",
        "table": "evanmiya",
    },
    "kp_sos_diff": {
        "label": "Strength of Schedule Edge",
        "description": "KenPom SOS net rating differential",
        "col": "sos_net_rating",
        "table": "kenpom",
    },
    "net_q1_wins_diff": {
        "label": "Quality Wins Edge",
        "description": "Quad 1 wins differential",
        "col": "q1_wins",
        "table": "net",
    },
    "espn_scoring_eff_diff": {
        "label": "Scoring Efficiency Edge",
        "description": "ESPN scoring efficiency differential",
        "col": "off_scoring_efficiency",
        "table": "espn_stats",
    },
    "espn_ato_diff": {
        "label": "Assist-Turnover Ratio Edge",
        "description": "Assist-to-turnover ratio differential",
        "col": "assist_turnover_ratio",
        "table": "espn_stats",
    },
}

# All feature names in order
ALL_FEATURE_NAMES = (
    ["is_home"]
    + list(RATING_DIFF_FEATURES.keys())
    + list(MATCHUP_FEATURES.keys())
    + list(SIMPLE_DIFF_FEATURES.keys())
)

# XGBoost hyperparameters
_XGB_BASE_PARAMS = {
    "max_depth": 5,
    "learning_rate": 0.05,
    "n_estimators": 300,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 5,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": 42,
}

XGB_WIN_PARAMS = {
    **_XGB_BASE_PARAMS,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
}

XGB_MARGIN_PARAMS = {
    **_XGB_BASE_PARAMS,
    "objective": "reg:squarederror",
    "eval_metric": "mae",
}

# Table name mapping
TABLE_MAP = {
    "kenpom": "kenpom_rankings",
    "barttorvik": "barttorvik_rankings",
    "evanmiya": "evanmiya_rankings",
    "net": "net_rankings",
    "composite": "composite_rankings",
    "espn_stats": "espn_stats",
}
