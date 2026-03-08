"""
Walk-forward cross-validation.

Supports two modes:
- Season-based: Train on seasons [S1..Sn-1], test on Sn (when multiple seasons available)
- Time-based: Split single season into monthly folds, train on earlier months, test on later

Usage:
    python -m ml.training.backtest
    python -m ml.training.backtest --features feature1,feature2,...
"""

import argparse
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    log_loss,
    mean_absolute_error,
    mean_squared_error,
    roc_auc_score,
)
from xgboost import XGBClassifier, XGBRegressor

from ml.config import MODELS_DIR, XGB_MARGIN_PARAMS, XGB_WIN_PARAMS
from ml.data.features import load_and_prepare


def _evaluate_fold(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: list[str],
    fold_label: str,
) -> dict | None:
    """Train and evaluate on a single fold."""
    if len(train_df) < 100 or len(test_df) < 50:
        print(f"  Skipping fold {fold_label}: train={len(train_df)}, test={len(test_df)}")
        return None

    X_train = train_df[feature_cols]
    y_train_win = train_df["won"]
    y_train_margin = train_df["score_margin"]

    X_test = test_df[feature_cols]
    y_test_win = test_df["won"]
    y_test_margin = test_df["score_margin"]

    win_model = XGBClassifier(**XGB_WIN_PARAMS)
    win_model.fit(X_train, y_train_win)

    win_probs = win_model.predict_proba(X_test)[:, 1]
    win_preds = win_model.predict(X_test)

    margin_model = XGBRegressor(**XGB_MARGIN_PARAMS)
    margin_model.fit(X_train, y_train_margin)

    margin_preds = margin_model.predict(X_test)

    fold = {
        "fold": fold_label,
        "train_size": len(train_df),
        "test_size": len(test_df),
        "test_games": len(test_df) // 2,
        "accuracy": round(accuracy_score(y_test_win, win_preds), 4),
        "log_loss": round(log_loss(y_test_win, win_probs), 4),
        "auc": round(roc_auc_score(y_test_win, win_probs), 4),
        "brier_score": round(brier_score_loss(y_test_win, win_probs), 4),
        "margin_mae": round(mean_absolute_error(y_test_margin, margin_preds), 2),
        "margin_rmse": round(np.sqrt(mean_squared_error(y_test_margin, margin_preds)), 2),
    }

    print(
        f"  {fold_label}: "
        f"Acc={fold['accuracy']:.3f}, "
        f"AUC={fold['auc']:.3f}, "
        f"LogLoss={fold['log_loss']:.3f}, "
        f"MAE={fold['margin_mae']:.1f}pts "
        f"(train={len(train_df)}, test={len(test_df)})"
    )
    return fold


def run_backtest(feature_names: list[str] | None = None) -> dict:
    """
    Walk-forward cross-validation.
    Auto-selects season-based or time-based mode.
    """
    df, feature_cols = load_and_prepare(feature_names)

    seasons = sorted(df["season"].unique())
    print(f"  Seasons: {seasons}, Features: {len(feature_cols)}, Rows: {len(df)}")

    fold_results = []

    if len(seasons) >= 2:
        # Season-based walk-forward CV
        print("\nUsing season-based walk-forward CV")
        for i in range(1, len(seasons)):
            test_season = seasons[i]
            train_seasons = seasons[:i]

            train_df = df[df["season"].isin(train_seasons)]
            test_df = df[df["season"] == test_season]

            fold = _evaluate_fold(
                train_df, test_df, feature_cols, f"Season {int(test_season)}"
            )
            if fold:
                fold_results.append(fold)
    else:
        # Time-based: split by month within the single season
        print("\nUsing time-based walk-forward CV (single season)")
        df["date_parsed"] = pd.to_datetime(df["date"])
        df["month"] = df["date_parsed"].dt.to_period("M")

        months = sorted(df["month"].unique())
        print(f"  Months available: {[str(m) for m in months]}")

        for i in range(2, len(months)):
            test_month = months[i]
            train_months = months[:i]

            train_df = df[df["month"].isin(train_months)]
            test_df = df[df["month"] == test_month]

            fold = _evaluate_fold(
                train_df, test_df, feature_cols, str(test_month)
            )
            if fold:
                fold_results.append(fold)

    if not fold_results:
        print("No valid folds!")
        return {}

    # Aggregate metrics (weighted by test size)
    total_test = sum(f["test_size"] for f in fold_results)
    aggregate = {}
    for metric in ["accuracy", "log_loss", "auc", "brier_score", "margin_mae", "margin_rmse"]:
        aggregate[metric] = round(
            sum(f[metric] * f["test_size"] for f in fold_results) / total_test, 4
        )

    results = {
        "run_at": datetime.now().isoformat(),
        "features": feature_cols,
        "num_features": len(feature_cols),
        "num_folds": len(fold_results),
        "total_test_rows": total_test,
        "aggregate": aggregate,
        "folds": fold_results,
    }

    print(f"\n{'='*60}")
    print(f"AGGREGATE RESULTS ({len(fold_results)} folds, {total_test // 2} test games)")
    print(f"{'='*60}")
    print(f"  Accuracy:    {aggregate['accuracy']:.4f}")
    print(f"  AUC:         {aggregate['auc']:.4f}")
    print(f"  Log Loss:    {aggregate['log_loss']:.4f}")
    print(f"  Brier Score: {aggregate['brier_score']:.4f}")
    print(f"  Margin MAE:  {aggregate['margin_mae']:.2f} points")
    print(f"  Margin RMSE: {aggregate['margin_rmse']:.2f} points")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run walk-forward backtesting")
    parser.add_argument(
        "--features",
        type=str,
        default=None,
        help="Comma-separated list of features (default: all)",
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Save results to models/backtest_results.json",
    )
    args = parser.parse_args()

    feature_names = args.features.split(",") if args.features else None
    results = run_backtest(feature_names=feature_names)

    if args.save and results:
        os.makedirs(MODELS_DIR, exist_ok=True)
        path = os.path.join(MODELS_DIR, "backtest_results.json")
        with open(path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {path}")
