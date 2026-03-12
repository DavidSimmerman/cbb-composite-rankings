"""
Train tournament-specific XGBoost models.

Usage:
    python -m ml.training.train_tournament
"""

import json
import os
from datetime import datetime

import joblib
import numpy as np
from xgboost import XGBClassifier, XGBRegressor

from ml.config import MODELS_DIR
from ml.data.tournament_query import (
    TOURNAMENT_FEATURE_NAMES,
    compute_tournament_features,
    load_tournament_data,
)

# Conservative hyperparams for smaller dataset (~1400 games)
_TOURNEY_BASE_PARAMS = {
    "max_depth": 4,
    "learning_rate": 0.05,
    "n_estimators": 200,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 10,
    "reg_alpha": 0.5,
    "reg_lambda": 2.0,
    "random_state": 42,
}

TOURNEY_WIN_PARAMS = {
    **_TOURNEY_BASE_PARAMS,
    "objective": "binary:logistic",
    "eval_metric": "logloss",
}

TOURNEY_MARGIN_PARAMS = {
    **_TOURNEY_BASE_PARAMS,
    "objective": "reg:squarederror",
    "eval_metric": "mae",
}


def train_tournament_models(save: bool = True):
    """Train tournament-specific win probability and margin models."""
    raw_df = load_tournament_data()
    df = compute_tournament_features(raw_df)

    # Drop rows with too many NaNs
    feature_cols = [f for f in TOURNAMENT_FEATURE_NAMES if f in df.columns]
    missing_pct = df[feature_cols].isna().mean(axis=1)
    df = df[missing_pct < 0.3].copy()
    df[feature_cols] = df[feature_cols].fillna(0.0)

    X = df[feature_cols]
    y_win = df["won"]
    y_margin = df["score_margin"]

    print(f"\nTraining tournament win model on {len(X)} rows, {len(feature_cols)} features...")
    win_model = XGBClassifier(**TOURNEY_WIN_PARAMS)
    win_model.fit(X, y_win)

    train_acc = (win_model.predict(X) == y_win).mean()
    print(f"  Training accuracy: {train_acc:.4f}")

    print("Training tournament margin model...")
    margin_model = XGBRegressor(**TOURNEY_MARGIN_PARAMS)
    margin_model.fit(X, y_margin)

    train_mae = np.abs(margin_model.predict(X) - y_margin).mean()
    print(f"  Training MAE: {train_mae:.2f} points")

    metadata = {
        "type": "tournament",
        "version": _get_next_version(),
        "trained_at": datetime.now().isoformat(),
        "seasons": sorted(int(s) for s in df["season"].unique()),
        "num_games": len(df) // 2,
        "num_rows": len(df),
        "features": feature_cols,
        "train_accuracy": round(float(train_acc), 4),
        "train_mae": round(float(train_mae), 2),
    }

    if save:
        os.makedirs(MODELS_DIR, exist_ok=True)

        joblib.dump(win_model, os.path.join(MODELS_DIR, "tourney_win_model.joblib"))
        joblib.dump(margin_model, os.path.join(MODELS_DIR, "tourney_margin_model.joblib"))

        with open(os.path.join(MODELS_DIR, "tourney_model_meta.json"), "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"\nTournament models saved to {MODELS_DIR}/")

    return win_model, margin_model, df, metadata


def _get_next_version() -> int:
    meta_path = os.path.join(MODELS_DIR, "tourney_model_meta.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            return json.load(f).get("version", 0) + 1
    return 1


if __name__ == "__main__":
    train_tournament_models()
