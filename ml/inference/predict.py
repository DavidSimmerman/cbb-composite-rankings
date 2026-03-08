"""
Prediction logic: load models, compute features, run inference, generate matchup keys.
"""

import json
import os

import joblib
import pandas as pd

from ml.config import MODELS_DIR
from ml.data.features import compute_features_for_matchup
from ml.data.query import load_team_game_history, load_team_ratings
from ml.inference.keys import compute_matchup_keys


class Predictor:
    """Loads trained models and makes predictions with matchup-based keys."""

    def __init__(self):
        self.win_model = None
        self.margin_model = None
        self.metadata = None
        self.feature_names = None

    def load(self):
        """Load models and metadata from disk."""
        win_path = os.path.join(MODELS_DIR, "win_model.joblib")
        margin_path = os.path.join(MODELS_DIR, "margin_model.joblib")
        meta_path = os.path.join(MODELS_DIR, "model_meta.json")

        if not os.path.exists(win_path):
            raise FileNotFoundError(
                f"No trained model found at {win_path}. Run training first."
            )

        self.win_model = joblib.load(win_path)
        self.margin_model = joblib.load(margin_path)

        with open(meta_path) as f:
            self.metadata = json.load(f)

        self.feature_names = self.metadata["features"]
        print(f"Loaded model v{self.metadata['version']} with {len(self.feature_names)} features")

    def predict(self, home_team_key: str, away_team_key: str) -> dict:
        """
        Predict a matchup and return structured results.

        Returns dict with home/away predictions, spread, total, keys to the game.
        """
        # Load latest ratings for both teams
        home_ratings = load_team_ratings(home_team_key)
        away_ratings = load_team_ratings(away_team_key)

        if not home_ratings:
            raise ValueError(f"No ratings found for team: {home_team_key}")
        if not away_ratings:
            raise ValueError(f"No ratings found for team: {away_team_key}")

        # Compute features from home perspective
        home_features = compute_features_for_matchup(
            home_ratings, away_ratings, is_home=True
        )
        # Compute features from away perspective
        away_features = compute_features_for_matchup(
            away_ratings, home_ratings, is_home=False
        )

        # Build feature vectors in the correct order
        home_X = pd.DataFrame([home_features])[self.feature_names]
        away_X = pd.DataFrame([away_features])[self.feature_names]

        # Win probabilities
        home_win_prob = float(self.win_model.predict_proba(home_X)[0, 1])
        away_win_prob = float(self.win_model.predict_proba(away_X)[0, 1])

        # Normalize so they sum to 1
        total_prob = home_win_prob + away_win_prob
        home_win_prob = home_win_prob / total_prob
        away_win_prob = away_win_prob / total_prob

        # Score margin predictions
        home_margin = float(self.margin_model.predict(home_X)[0])
        away_margin = float(self.margin_model.predict(away_X)[0])

        # Average the margins (they should be close to negatives of each other)
        avg_margin = (home_margin - away_margin) / 2

        # Estimate total score from tempo
        home_tempo = home_ratings.get("kp_adjusted_tempo", 68)
        away_tempo = away_ratings.get("kp_adjusted_tempo", 68)
        avg_tempo = (float(home_tempo) + float(away_tempo)) / 2

        # Rough total estimation: average D1 game ~= 140 points at ~68 possessions
        # Scale linearly with tempo
        estimated_total = 140 * (avg_tempo / 68)

        home_predicted_score = round(estimated_total / 2 + avg_margin / 2)
        away_predicted_score = round(estimated_total / 2 - avg_margin / 2)

        # Load game history for record splits
        home_history = load_team_game_history(home_team_key)
        away_history = load_team_game_history(away_team_key)

        # Matchup-based keys to the game
        home_keys = compute_matchup_keys(home_ratings, away_ratings, num_keys=3, team_history=home_history)
        away_keys = compute_matchup_keys(away_ratings, home_ratings, num_keys=3, team_history=away_history)

        return {
            "home": {
                "team_key": home_team_key,
                "win_probability": round(home_win_prob, 4),
                "predicted_score": int(home_predicted_score),
                "keys_to_game": home_keys,
            },
            "away": {
                "team_key": away_team_key,
                "win_probability": round(away_win_prob, 4),
                "predicted_score": int(away_predicted_score),
                "keys_to_game": away_keys,
            },
            "predicted_spread": round(avg_margin, 1),
            "predicted_total": round(estimated_total),
            "model_version": self.metadata["version"],
        }

    def get_model_info(self) -> dict:
        """Return model metadata for the /model/info endpoint."""
        if self.metadata is None:
            return {"status": "no model loaded"}
        return {
            "version": self.metadata["version"],
            "trained_at": self.metadata["trained_at"],
            "seasons": self.metadata["seasons"],
            "num_features": len(self.feature_names),
            "features": self.feature_names,
            "train_accuracy": self.metadata.get("train_accuracy"),
            "train_mae": self.metadata.get("train_mae"),
        }
