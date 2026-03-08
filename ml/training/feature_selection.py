"""
Automated feature selection using forward selection with walk-forward CV.

Tests adding one feature at a time, keeping whichever improves accuracy most.
Also supports dropping features that don't contribute.

Usage:
    python -m ml.training.feature_selection
    python -m ml.training.feature_selection --method forward
    python -m ml.training.feature_selection --method backward
"""

import argparse
import json
import os
from datetime import datetime

import pandas as pd
from sklearn.metrics import accuracy_score, roc_auc_score
from xgboost import XGBClassifier

from ml.config import MODELS_DIR, XGB_WIN_PARAMS
from ml.data.features import load_and_prepare


def _build_folds(df: pd.DataFrame) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
    """Build walk-forward CV folds. Uses season-based if multiple seasons, else monthly."""
    seasons = sorted(df["season"].unique())

    if len(seasons) >= 2:
        folds = []
        for i in range(1, len(seasons)):
            train_df = df[df["season"].isin(seasons[:i])]
            test_df = df[df["season"] == seasons[i]]
            if len(train_df) >= 100 and len(test_df) >= 50:
                folds.append((train_df, test_df))
        return folds

    # Single season: split by month
    df = df.copy()
    df["_month"] = pd.to_datetime(df["date"]).dt.to_period("M")
    months = sorted(df["_month"].unique())
    folds = []
    for i in range(2, len(months)):
        train_df = df[df["_month"].isin(months[:i])]
        test_df = df[df["_month"] == months[i]]
        if len(train_df) >= 100 and len(test_df) >= 50:
            folds.append((train_df, test_df))
    return folds


def _evaluate_features(
    df: pd.DataFrame,
    feature_names: list[str],
    folds: list[tuple[pd.DataFrame, pd.DataFrame]],
) -> dict:
    """Run walk-forward CV for a given feature set and return aggregate metrics."""
    fold_accs = []
    fold_aucs = []
    fold_weights = []

    for train_df, test_df in folds:
        X_train = train_df[feature_names]
        y_train = train_df["won"]
        X_test = test_df[feature_names]
        y_test = test_df["won"]

        model = XGBClassifier(**XGB_WIN_PARAMS)
        model.fit(X_train, y_train, verbose=False)

        probs = model.predict_proba(X_test)[:, 1]
        preds = model.predict(X_test)

        fold_accs.append(accuracy_score(y_test, preds))
        fold_aucs.append(roc_auc_score(y_test, probs))
        fold_weights.append(len(test_df))

    if not fold_accs:
        return {"accuracy": 0, "auc": 0}

    total = sum(fold_weights)
    return {
        "accuracy": sum(a * w for a, w in zip(fold_accs, fold_weights)) / total,
        "auc": sum(a * w for a, w in zip(fold_aucs, fold_weights)) / total,
    }


def forward_selection(
    df: pd.DataFrame,
    candidate_features: list[str],
    folds: list[tuple[pd.DataFrame, pd.DataFrame]],
    metric: str = "auc",
) -> list[dict]:
    """
    Greedy forward selection: start empty, add the best feature each round.
    Returns a list of selection steps with metrics.
    """
    selected = []
    remaining = list(candidate_features)
    steps = []

    print(f"\nForward selection using {metric} as optimization target")
    print(f"Candidate features: {len(remaining)}, CV folds: {len(folds)}")
    print("=" * 70)

    best_score = 0.0

    while remaining:
        best_feat = None
        best_feat_score = best_score

        for feat in remaining:
            test_features = selected + [feat]
            result = _evaluate_features(df, test_features, folds)
            score = result[metric]

            if score > best_feat_score:
                best_feat_score = score
                best_feat = feat

        if best_feat is None:
            print(f"\nNo feature improves {metric}. Stopping.")
            break

        improvement = best_feat_score - best_score
        selected.append(best_feat)
        remaining.remove(best_feat)
        best_score = best_feat_score

        step = {
            "step": len(selected),
            "added": best_feat,
            "score": round(best_score, 6),
            "improvement": round(improvement, 6),
            "selected_features": list(selected),
        }
        steps.append(step)

        print(
            f"  Step {len(selected):2d}: +{best_feat:<35s} "
            f"{metric}={best_score:.5f} (+{improvement:.5f})"
        )

        # Stop if improvement is negligible
        if improvement < 0.0005 and len(selected) > 5:
            print(f"\n  Improvement < 0.0005, stopping early.")
            break

    return steps


def backward_elimination(
    df: pd.DataFrame,
    candidate_features: list[str],
    folds: list[tuple[pd.DataFrame, pd.DataFrame]],
    metric: str = "auc",
) -> list[dict]:
    """
    Backward elimination: start with all features, remove the least useful each round.
    """
    current = list(candidate_features)
    steps = []

    baseline = _evaluate_features(df, current, folds)
    baseline_score = baseline[metric]
    print(f"\nBackward elimination using {metric}")
    print(f"Starting with {len(current)} features, baseline {metric}={baseline_score:.5f}")
    print("=" * 70)

    while len(current) > 1:
        worst_feat = None
        best_after_removal = 0.0

        for feat in current:
            test_features = [f for f in current if f != feat]
            result = _evaluate_features(df, test_features, folds)
            score = result[metric]

            if score >= best_after_removal:
                best_after_removal = score
                worst_feat = feat

        if best_after_removal < baseline_score - 0.001:
            print(f"\nRemoving any feature drops {metric} by >0.001. Stopping.")
            break

        change = best_after_removal - baseline_score
        current.remove(worst_feat)
        baseline_score = best_after_removal

        step = {
            "step": len(candidate_features) - len(current),
            "removed": worst_feat,
            "score": round(baseline_score, 6),
            "change": round(change, 6),
            "remaining_features": list(current),
        }
        steps.append(step)

        print(
            f"  Step {step['step']:2d}: -{worst_feat:<35s} "
            f"{metric}={baseline_score:.5f} ({change:+.5f})"
        )

    return steps


def run_feature_selection(method: str = "forward", metric: str = "auc") -> dict:
    """Run feature selection and return results."""
    df, feature_cols = load_and_prepare()

    folds = _build_folds(df)
    print(f"  CV folds: {len(folds)}")
    print(f"  Candidate features: {len(feature_cols)}")

    if not folds:
        print("  No valid folds for CV. Need more data.")
        return {}

    if method == "forward":
        steps = forward_selection(df, feature_cols, folds, metric=metric)
        if steps:
            best_step = max(steps, key=lambda s: s["score"])
            selected = best_step["selected_features"]
        else:
            selected = feature_cols
    elif method == "backward":
        steps = backward_elimination(df, feature_cols, folds, metric=metric)
        if steps:
            selected = steps[-1]["remaining_features"]
        else:
            selected = feature_cols
    else:
        raise ValueError(f"Unknown method: {method}")

    # Final evaluation with selected features
    final_metrics = _evaluate_features(df, selected, folds)

    results = {
        "run_at": datetime.now().isoformat(),
        "method": method,
        "metric": metric,
        "all_features": feature_cols,
        "selected_features": selected,
        "num_selected": len(selected),
        "num_candidates": len(feature_cols),
        "final_accuracy": round(final_metrics["accuracy"], 4),
        "final_auc": round(final_metrics["auc"], 4),
        "steps": steps,
    }

    print(f"\n{'='*60}")
    print(f"FEATURE SELECTION RESULTS")
    print(f"{'='*60}")
    print(f"  Method: {method}")
    print(f"  Selected {len(selected)} / {len(feature_cols)} features")
    print(f"  Final accuracy: {final_metrics['accuracy']:.4f}")
    print(f"  Final AUC: {final_metrics['auc']:.4f}")
    print(f"\n  Selected features:")
    for f in selected:
        print(f"    - {f}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automated feature selection")
    parser.add_argument(
        "--method",
        choices=["forward", "backward"],
        default="forward",
        help="Selection method (default: forward)",
    )
    parser.add_argument(
        "--metric",
        choices=["accuracy", "auc"],
        default="auc",
        help="Metric to optimize (default: auc)",
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Save results to models/feature_selection.json",
    )
    args = parser.parse_args()

    results = run_feature_selection(method=args.method, metric=args.metric)

    if args.save and results:
        os.makedirs(MODELS_DIR, exist_ok=True)
        path = os.path.join(MODELS_DIR, "feature_selection.json")
        with open(path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to {path}")
