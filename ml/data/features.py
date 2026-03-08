"""
Feature engineering: converts raw game data into matchup-differential features.
Each game produces 2 rows (home perspective + away perspective).
"""

import numpy as np
import pandas as pd

from ml.config import (
    ALL_FEATURE_NAMES,
    MATCHUP_FEATURES,
    RATING_DIFF_FEATURES,
    SIMPLE_DIFF_FEATURES,
)

TABLE_TO_ALIAS = {
    "kenpom": "kp",
    "barttorvik": "bt",
    "evanmiya": "em",
    "net": "net",
    "composite": "comp",
    "espn_stats": "espn",
}


def compute_features_for_perspective(
    row: pd.Series,
    team_prefix: str,  # "h" for home perspective, "a" for away
    opp_prefix: str,
) -> dict:
    """Compute all features for one team's perspective of a game."""
    features = {}

    # Home court advantage
    features["is_home"] = 1.0 if team_prefix == "h" else 0.0

    # Rating differential features
    for feat_name, feat_def in RATING_DIFF_FEATURES.items():
        alias = TABLE_TO_ALIAS[feat_def["table"]]
        team_val = row.get(f"{alias}_{team_prefix}_{feat_def['col']}")
        opp_val = row.get(f"{alias}_{opp_prefix}_{feat_def['col']}")

        if pd.notna(team_val) and pd.notna(opp_val):
            diff = float(team_val) - float(opp_val)
            if feat_def.get("invert"):
                diff = -diff  # For rank-type columns where lower = better
            features[feat_name] = diff
        else:
            features[feat_name] = np.nan

    # Offense-vs-defense matchup features
    for feat_name, feat_def in MATCHUP_FEATURES.items():
        alias = TABLE_TO_ALIAS[feat_def["table"]]
        team_off = row.get(f"{alias}_{team_prefix}_{feat_def['off_col']}")
        opp_def = row.get(f"{alias}_{opp_prefix}_{feat_def['def_col']}")

        if pd.notna(team_off) and pd.notna(opp_def):
            team_off = float(team_off)
            opp_def = float(opp_def)

            if feat_def.get("off_lower_better"):
                # Lower offensive stat = better (e.g., turnovers), flip so positive = good
                features[feat_name] = opp_def - team_off
            else:
                # Positive = advantage for the team
                features[feat_name] = team_off - opp_def
        else:
            features[feat_name] = np.nan

    # Simple differential features
    for feat_name, feat_def in SIMPLE_DIFF_FEATURES.items():
        alias = TABLE_TO_ALIAS[feat_def["table"]]
        team_val = row.get(f"{alias}_{team_prefix}_{feat_def['col']}")
        opp_val = row.get(f"{alias}_{opp_prefix}_{feat_def['col']}")

        if pd.notna(team_val) and pd.notna(opp_val):
            features[feat_name] = float(team_val) - float(opp_val)
        else:
            features[feat_name] = np.nan

    return features


def build_feature_matrix(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert raw game data into a feature matrix with 2 rows per game.
    Returns DataFrame with columns: game_id, season, date, team_key, opp_key,
    is_home, [features...], won, score_margin
    """
    rows = []

    for _, game in raw_df.iterrows():
        # Home team perspective
        home_features = compute_features_for_perspective(game, "h", "a")
        home_features.update(
            {
                "game_id": game["game_id"],
                "season": game["season"],
                "date": game["date"],
                "team_key": game["home_team_key"],
                "opp_key": game["away_team_key"],
                "won": 1 if game.get("home_won") else 0,
                "score_margin": (
                    int(game["home_score"]) - int(game["away_score"])
                    if pd.notna(game["home_score"])
                    else np.nan
                ),
                "team_score": game["home_score"],
                "opp_score": game["away_score"],
            }
        )
        rows.append(home_features)

        # Away team perspective
        away_features = compute_features_for_perspective(game, "a", "h")
        away_features.update(
            {
                "game_id": game["game_id"],
                "season": game["season"],
                "date": game["date"],
                "team_key": game["away_team_key"],
                "opp_key": game["home_team_key"],
                "won": 0 if game.get("home_won") else 1,
                "score_margin": (
                    int(game["away_score"]) - int(game["home_score"])
                    if pd.notna(game["away_score"])
                    else np.nan
                ),
                "team_score": game["away_score"],
                "opp_score": game["home_score"],
            }
        )
        rows.append(away_features)

    df = pd.DataFrame(rows)
    return df


def compute_features_for_matchup(
    team_ratings: dict, opp_ratings: dict, is_home: bool
) -> dict:
    """
    Compute features for a single matchup prediction (inference time).
    team_ratings and opp_ratings come from load_team_ratings().
    Keys are like 'kp_net_rating', 'bt_barthag', etc.
    """
    features = {}
    features["is_home"] = 1.0 if is_home else 0.0

    for feat_name, feat_def in RATING_DIFF_FEATURES.items():
        alias = TABLE_TO_ALIAS[feat_def["table"]]
        team_val = team_ratings.get(f"{alias}_{feat_def['col']}")
        opp_val = opp_ratings.get(f"{alias}_{feat_def['col']}")

        if team_val is not None and opp_val is not None:
            diff = float(team_val) - float(opp_val)
            if feat_def.get("invert"):
                diff = -diff
            features[feat_name] = diff
        else:
            features[feat_name] = 0.0

    for feat_name, feat_def in MATCHUP_FEATURES.items():
        alias = TABLE_TO_ALIAS[feat_def["table"]]
        team_off = team_ratings.get(f"{alias}_{feat_def['off_col']}")
        opp_def = opp_ratings.get(f"{alias}_{feat_def['def_col']}")

        if team_off is not None and opp_def is not None:
            team_off = float(team_off)
            opp_def = float(opp_def)

            if feat_def.get("off_lower_better"):
                features[feat_name] = opp_def - team_off
            else:
                features[feat_name] = team_off - opp_def
        else:
            features[feat_name] = 0.0

    for feat_name, feat_def in SIMPLE_DIFF_FEATURES.items():
        alias = TABLE_TO_ALIAS[feat_def["table"]]
        team_val = team_ratings.get(f"{alias}_{feat_def['col']}")
        opp_val = opp_ratings.get(f"{alias}_{feat_def['col']}")

        if team_val is not None and opp_val is not None:
            features[feat_name] = float(team_val) - float(opp_val)
        else:
            features[feat_name] = 0.0

    return features


def get_feature_columns() -> list[str]:
    """Return the ordered list of feature column names."""
    return ALL_FEATURE_NAMES


def load_and_prepare(
    feature_names: list[str] | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    """
    Shared data-prep pipeline: load games, build features, drop high-NaN rows, fill NaNs.
    Returns (prepared DataFrame, list of feature column names used).
    """
    from ml.data.query import load_training_data

    if feature_names is None:
        feature_names = list(ALL_FEATURE_NAMES)

    print("Loading training data...")
    raw_df = load_training_data()
    print(f"  Loaded {len(raw_df)} games")

    print("Building feature matrix...")
    df = build_feature_matrix(raw_df)

    feature_cols = [f for f in feature_names if f in df.columns]
    missing = [f for f in feature_names if f not in df.columns]
    if missing:
        print(f"  Warning: missing features: {missing}")

    nan_threshold = len(feature_cols) * 0.3
    nan_counts = df[feature_cols].isna().sum(axis=1)
    df = df[nan_counts <= nan_threshold].copy()
    df[feature_cols] = df[feature_cols].fillna(0)

    print(f"  Rows: {len(df)} ({len(df) // 2} games x 2 perspectives)")
    return df, feature_cols
