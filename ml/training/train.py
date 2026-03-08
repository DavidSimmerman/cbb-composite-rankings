"""
Train win-probability and score-margin XGBoost models.

Usage:
    python -m ml.training.train
    python -m ml.training.train --features feature1,feature2,...
"""

import argparse
import json
import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier, XGBRegressor

from ml.config import MODELS_DIR, XGB_MARGIN_PARAMS, XGB_WIN_PARAMS
from ml.data.features import load_and_prepare


def train_models(
    feature_names: list[str] | None = None,
    save: bool = True,
) -> tuple[XGBClassifier, XGBRegressor, pd.DataFrame, dict]:
    """
    Train both models on all available data.

    Returns: (win_model, margin_model, feature_df, metadata)
    """
    df, feature_names = load_and_prepare(feature_names)

    X = df[feature_names]
    y_win = df["won"]
    y_margin = df["score_margin"]

    print(f"\nTraining win-probability model on {len(X)} rows, {len(feature_names)} features...")
    win_model = XGBClassifier(**XGB_WIN_PARAMS)
    win_model.fit(X, y_win)

    train_acc = (win_model.predict(X) == y_win).mean()
    print(f"  Training accuracy: {train_acc:.4f}")

    print("Training score-margin model...")
    margin_model = XGBRegressor(**XGB_MARGIN_PARAMS)
    margin_model.fit(X, y_margin)

    train_mae = np.abs(margin_model.predict(X) - y_margin).mean()
    print(f"  Training MAE: {train_mae:.2f} points")

    metadata = {
        "version": _get_next_version(),
        "trained_at": datetime.now().isoformat(),
        "seasons": sorted(int(s) for s in df["season"].unique()),
        "num_games": len(df) // 2,
        "num_rows": len(df),
        "features": feature_names,
        "train_accuracy": round(float(train_acc), 4),
        "train_mae": round(float(train_mae), 2),
    }

    if save:
        os.makedirs(MODELS_DIR, exist_ok=True)

        win_path = os.path.join(MODELS_DIR, "win_model.joblib")
        margin_path = os.path.join(MODELS_DIR, "margin_model.joblib")
        meta_path = os.path.join(MODELS_DIR, "model_meta.json")

        joblib.dump(win_model, win_path)
        joblib.dump(margin_model, margin_path)

        with open(meta_path, "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"\nModels saved to {MODELS_DIR}/")
        print(f"  win_model.joblib")
        print(f"  margin_model.joblib")
        print(f"  model_meta.json")

    return win_model, margin_model, df, metadata


def _get_next_version() -> str:
    """Get the next model version number."""
    meta_path = os.path.join(MODELS_DIR, "model_meta.json")
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            meta = json.load(f)
        return str(int(meta.get("version", "0")) + 1)
    return "1"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train game prediction models")
    parser.add_argument(
        "--features",
        type=str,
        default=None,
        help="Comma-separated list of feature names to use (default: all)",
    )
    args = parser.parse_args()

    feature_names = args.features.split(",") if args.features else None
    win_model, margin_model, df, metadata = train_models(feature_names=feature_names)

    print(f"\nMetadata:")
    print(json.dumps(metadata, indent=2))
