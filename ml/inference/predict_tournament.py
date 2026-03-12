"""
Tournament-specific prediction: uses tournament-trained models with seed and round context.
"""

import json
import os

import joblib
import numpy as np
import pandas as pd

from ml.config import DATABASE_URL, MODELS_DIR
from ml.data.tournament_query import TOURNAMENT_FEATURE_NAMES

import psycopg2


class TournamentPredictor:
    """Loads tournament-specific models and makes bracket predictions."""

    def __init__(self):
        self.win_model = None
        self.margin_model = None
        self.metadata = None
        self.feature_names = None

    def load(self):
        """Load tournament models from disk."""
        win_path = os.path.join(MODELS_DIR, "tourney_win_model.joblib")
        margin_path = os.path.join(MODELS_DIR, "tourney_margin_model.joblib")
        meta_path = os.path.join(MODELS_DIR, "tourney_model_meta.json")

        if not os.path.exists(win_path):
            raise FileNotFoundError(f"No tournament model at {win_path}")

        self.win_model = joblib.load(win_path)
        self.margin_model = joblib.load(margin_path)

        with open(meta_path) as f:
            self.metadata = json.load(f)

        self.feature_names = self.metadata["features"]
        print(f"Loaded tournament model v{self.metadata['version']} with {len(self.feature_names)} features")

    def predict(self, team_a_key: str, team_b_key: str, seed_a: int, seed_b: int, round_number: int) -> dict:
        """
        Predict a tournament matchup.

        Returns dict with win probabilities and predicted margin.
        """
        if self.win_model is None:
            raise RuntimeError("Tournament model not loaded")

        # Load current ratings for both teams
        ratings_a = self._load_ratings(team_a_key)
        ratings_b = self._load_ratings(team_b_key)

        if ratings_a is None:
            raise ValueError(f"No ratings found for {team_a_key}")
        if ratings_b is None:
            raise ValueError(f"No ratings found for {team_b_key}")

        # Compute features from team A's perspective
        features_a = self._compute_features(ratings_a, ratings_b, seed_a, seed_b, round_number)
        features_b = self._compute_features(ratings_b, ratings_a, seed_b, seed_a, round_number)

        X_a = pd.DataFrame([features_a])[self.feature_names]
        X_b = pd.DataFrame([features_b])[self.feature_names]
        X_a = X_a.fillna(0.0)
        X_b = X_b.fillna(0.0)

        # Probabilities
        prob_a = float(self.win_model.predict_proba(X_a)[0, 1])
        prob_b = float(self.win_model.predict_proba(X_b)[0, 1])

        # Normalize
        total = prob_a + prob_b
        prob_a /= total
        prob_b /= total

        # Margin
        margin_a = float(self.margin_model.predict(X_a)[0])
        margin_b = float(self.margin_model.predict(X_b)[0])
        avg_margin = (margin_a - margin_b) / 2

        return {
            "team_a_win_probability": prob_a,
            "team_b_win_probability": prob_b,
            "predicted_margin": round(avg_margin, 1),
            "model_version": self.metadata.get("version", 0),
        }

    def _compute_features(self, team_ratings: dict, opp_ratings: dict, seed: int, opp_seed: int, round_number: int) -> dict:
        features = {}

        features["seed_a"] = seed
        features["seed_b"] = opp_seed
        features["seed_diff"] = seed - opp_seed
        features["seed_product"] = seed * opp_seed
        features["round_number"] = round_number

        # Rating diffs
        features["kp_net_diff"] = _diff(team_ratings.get("kp_net_rating"), opp_ratings.get("kp_net_rating"))
        features["bt_barthag_diff"] = _diff(team_ratings.get("bt_barthag"), opp_ratings.get("bt_barthag"))
        features["comp_zscore_diff"] = _diff(team_ratings.get("comp_zscore"), opp_ratings.get("comp_zscore"))

        # Efficiency matchups
        features["kp_off_vs_def"] = _diff(team_ratings.get("kp_off_rating"), opp_ratings.get("kp_def_rating"))
        features["bt_efg_matchup"] = _diff(team_ratings.get("bt_efg_pct"), opp_ratings.get("bt_efg_pct"))
        features["bt_3p_matchup"] = _diff(team_ratings.get("bt_3p_pct"), opp_ratings.get("bt_3p_pct_d"))
        features["bt_2p_matchup"] = _diff(team_ratings.get("bt_2p_pct"), opp_ratings.get("bt_2p_pct"))

        # Style
        features["bt_turnover_matchup"] = _diff(opp_ratings.get("bt_tor"), team_ratings.get("bt_tor"))
        features["bt_rebound_matchup"] = _diff(team_ratings.get("bt_orb"), opp_ratings.get("bt_orb"))
        features["bt_ftr_matchup"] = _diff(team_ratings.get("bt_ftr"), opp_ratings.get("bt_ftr"))
        features["bt_3pr_diff"] = _diff(team_ratings.get("bt_3pr"), opp_ratings.get("bt_3pr"))

        # Context
        features["kp_tempo_diff"] = _diff(team_ratings.get("kp_tempo"), opp_ratings.get("kp_tempo"))
        features["kp_sos_diff"] = _diff(team_ratings.get("kp_sos"), opp_ratings.get("kp_sos"))
        features["kp_luck_diff"] = _diff(team_ratings.get("kp_luck"), opp_ratings.get("kp_luck"))

        features["kp_a_rank"] = team_ratings.get("kp_rank", 0)
        features["kp_b_rank"] = opp_ratings.get("kp_rank", 0)

        return features

    def _load_ratings(self, team_key: str) -> dict | None:
        query = """
        SELECT
            kp.net_rating AS kp_net_rating,
            kp.offensive_rating AS kp_off_rating,
            kp.defensive_rating AS kp_def_rating,
            kp.adjusted_tempo AS kp_tempo,
            kp.sos_net_rating AS kp_sos,
            kp.rank AS kp_rank,
            kp.luck AS kp_luck,
            bt.barthag AS bt_barthag,
            bt."3p_pct" AS bt_3p_pct,
            bt."3p_pct_d" AS bt_3p_pct_d,
            bt."2p_pct" AS bt_2p_pct,
            bt.efg_pct AS bt_efg_pct,
            bt.tor AS bt_tor,
            bt.tord AS bt_tord,
            bt.orb AS bt_orb,
            bt.ftr AS bt_ftr,
            bt."3pr" AS bt_3pr,
            comp.avg_zscore AS comp_zscore,
            comp.avg_offensive_zscore AS comp_off_zscore,
            comp.avg_defensive_zscore AS comp_def_zscore
        FROM (
            SELECT * FROM kenpom_rankings WHERE team_key = %s ORDER BY date DESC LIMIT 1
        ) kp
        LEFT JOIN LATERAL (
            SELECT * FROM barttorvik_rankings WHERE team_key = %s ORDER BY date DESC LIMIT 1
        ) bt ON TRUE
        LEFT JOIN LATERAL (
            SELECT * FROM composite_rankings WHERE team_key = %s AND sources = 'kp,em,bt' ORDER BY date DESC LIMIT 1
        ) comp ON TRUE
        """
        with psycopg2.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (team_key, team_key, team_key))
                row = cur.fetchone()
                if not row:
                    return None
                cols = [d[0] for d in cur.description]
                return dict(zip(cols, row))


def _diff(a, b):
    if a is not None and b is not None:
        return float(a) - float(b)
    return 0.0
