"""
Pre-calculate all possible bracket matchup predictions and store in DB.

For each pair of bracket teams and each round (0-6), runs the tournament ML model
and stores the result in bracket_predictions table. Also computes keys-to-game
and predicted scores using the general prediction system.

Usage:
    cd /path/to/cbb-composite-rankings
    DATABASE_URL="..." python scripts/precalculate-bracket-predictions.py
"""

import itertools
import json
import sys
import time

import pandas as pd
import psycopg2
from psycopg2.extras import Json

# Add project root to path so we can import ml modules
sys.path.insert(0, ".")

from ml.config import DATABASE_URL
from ml.data.query import load_team_ratings, load_team_game_history
from ml.inference.keys import compute_matchup_keys
from ml.inference.predict_tournament import TournamentPredictor


def get_bracket_teams(conn) -> list[dict]:
    """Get all bracket teams for the current season with their seeds."""
    cur = conn.cursor()

    # Determine current season (same logic as TypeScript getCurrentSeason)
    cur.execute("SELECT EXTRACT(MONTH FROM NOW()), EXTRACT(YEAR FROM NOW())")
    month, year = cur.fetchone()
    season = int(year) + 1 if month >= 7 else int(year)

    # Get teams from tournament_games (real bracket) or bracket_matrix projected seeds
    # First try tournament_games for real bracket data
    cur.execute(
        """
        SELECT DISTINCT team_key, seed FROM (
            SELECT team_a_key AS team_key, team_a_seed AS seed
            FROM tournament_games
            WHERE season = %s
            UNION
            SELECT team_b_key AS team_key, team_b_seed AS seed
            FROM tournament_games
            WHERE season = %s AND team_b_key IS NOT NULL
        ) t
        WHERE team_key IS NOT NULL
        ORDER BY seed, team_key
        """,
        (season, season),
    )
    rows = cur.fetchall()

    if not rows:
        # Fall back to composite rankings top 64 teams with projected seeds
        print("No tournament_games found, falling back to projected seeds...")
        cur.execute(
            """
            SELECT c.team_key, ROW_NUMBER() OVER (ORDER BY c.avg_zscore DESC) as seed_rank
            FROM composite_rankings c
            WHERE c.sources = 'kp,em,bt'
            ORDER BY c.date DESC, c.avg_zscore DESC
            LIMIT 64
            """
        )
        rows = cur.fetchall()
        # Map rank to seed (4 teams per seed line)
        return [{"team_key": r[0], "seed": min(16, (r[1] - 1) // 4 + 1)} for r in rows]

    # Deduplicate by team_key (a team may appear in multiple games with same seed)
    seen = {}
    for r in rows:
        if r[0] not in seen:
            seen[r[0]] = {"team_key": r[0], "seed": r[1]}
    return list(seen.values())


def create_table(conn):
    """Create bracket_predictions table if it doesn't exist, and add new columns."""
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS bracket_predictions (
            id SERIAL PRIMARY KEY,
            season INT NOT NULL,
            team_a_key TEXT NOT NULL,
            team_b_key TEXT NOT NULL,
            seed_a INT NOT NULL,
            seed_b INT NOT NULL,
            round_number INT NOT NULL,
            prob_a DOUBLE PRECISION NOT NULL,
            prob_b DOUBLE PRECISION NOT NULL,
            predicted_margin DOUBLE PRECISION NOT NULL,
            predicted_score_a INT,
            predicted_score_b INT,
            keys_a JSONB,
            keys_b JSONB,
            model_version TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (season, team_a_key, team_b_key, round_number)
        );
        CREATE INDEX IF NOT EXISTS idx_bracket_predictions_season ON bracket_predictions (season);
        CREATE INDEX IF NOT EXISTS idx_bracket_predictions_teams ON bracket_predictions (season, team_a_key, team_b_key);
    """)

    # Add new columns if they don't exist (for existing tables)
    for col, coltype in [
        ("predicted_score_a", "INT"),
        ("predicted_score_b", "INT"),
        ("keys_a", "JSONB"),
        ("keys_b", "JSONB"),
    ]:
        try:
            cur.execute(f"ALTER TABLE bracket_predictions ADD COLUMN {col} {coltype}")
        except psycopg2.errors.DuplicateColumn:
            conn.rollback()

    conn.commit()
    print("Table bracket_predictions ready.")


def estimate_scores(
    margin: float,
    tempo_a: float, tempo_b: float,
    off_a: float, def_a: float,
    off_b: float, def_b: float,
) -> tuple[int, int]:
    """
    Estimate individual team scores using KenPom-style efficiency model.

    Each team's expected points = (their offense vs opponent defense) * possessions / 100.
    The D1 average efficiency is ~100 pts/100 possessions (both offense and defense).
    We then adjust the scores so the difference matches the predicted margin.
    """
    # Estimate game possessions from both teams' tempos
    # D1 average tempo ~68 possessions per game
    avg_tempo = (tempo_a + tempo_b) / 2

    # Each team's expected efficiency against this opponent:
    # team_a scores at (off_a attack vs def_b), team_b scores at (off_b attack vs def_a)
    # Normalize against D1 average (~100): eff_a = off_a * (100 / def_b) isn't quite right
    # Simpler: raw_score = off_eff * possessions / 100, then adjust for opponent defense
    # KenPom approach: expected_pts = (off_rating * opp_def_rating / D1_avg) * tempo / 100
    D1_AVG_EFF = 100.0
    raw_a = (off_a * def_b / D1_AVG_EFF) * avg_tempo / 100
    raw_b = (off_b * def_a / D1_AVG_EFF) * avg_tempo / 100

    # Adjust so the score differential matches the predicted margin
    raw_margin = raw_a - raw_b
    adjustment = (margin - raw_margin) / 2
    score_a = round(raw_a + adjustment)
    score_b = round(raw_b - adjustment)

    # Ensure no ties (winner gets +1 if tied)
    if score_a == score_b:
        if margin >= 0:
            score_a += 1
        else:
            score_b += 1

    return int(score_a), int(score_b)


def main():
    conn = psycopg2.connect(DATABASE_URL)

    # Create table
    create_table(conn)

    # Load tournament model
    predictor = TournamentPredictor()
    try:
        predictor.load()
    except FileNotFoundError:
        print("ERROR: Tournament model not found. Train with: python -m ml.training.train_tournament")
        sys.exit(1)

    # Get bracket teams
    teams = get_bracket_teams(conn)
    print(f"Found {len(teams)} bracket teams")

    if len(teams) < 2:
        print("Not enough teams to generate predictions")
        sys.exit(1)

    # Pre-load tournament model ratings (for ML predictions)
    print("Pre-loading tournament model ratings...")
    tourney_ratings_cache = {}
    for team in teams:
        ratings = predictor._load_ratings(team["team_key"])
        if ratings:
            tourney_ratings_cache[team["team_key"]] = ratings
        else:
            print(f"  WARNING: No tournament ratings for {team['team_key']}")
    print(f"  Loaded {len(tourney_ratings_cache)}/{len(teams)} teams")

    # Pre-load full ratings (for keys-to-game, includes rank columns)
    print("Pre-loading full ratings (with ranks)...")
    full_ratings_cache = {}
    for team in teams:
        ratings = load_team_ratings(team["team_key"])
        if ratings:
            full_ratings_cache[team["team_key"]] = ratings
        else:
            print(f"  WARNING: No full ratings for {team['team_key']}")
    print(f"  Loaded {len(full_ratings_cache)}/{len(teams)} teams")

    # Pre-load game history (for keys-to-game context)
    print("Pre-loading game history...")
    history_cache = {}
    for team in teams:
        try:
            history = load_team_game_history(team["team_key"])
            history_cache[team["team_key"]] = history
        except Exception as e:
            print(f"  WARNING: No history for {team['team_key']}: {e}")
            history_cache[team["team_key"]] = []
    print(f"  Loaded history for {len(history_cache)}/{len(teams)} teams")

    # Build seed lookup
    seed_map = {t["team_key"]: t["seed"] for t in teams}

    # Determine season
    cur = conn.cursor()
    cur.execute("SELECT EXTRACT(MONTH FROM NOW()), EXTRACT(YEAR FROM NOW())")
    month, year = cur.fetchone()
    season = int(year) + 1 if month >= 7 else int(year)

    # Clear existing predictions for this season
    cur.execute("DELETE FROM bracket_predictions WHERE season = %s", (season,))
    deleted = cur.rowcount
    if deleted:
        print(f"Cleared {deleted} existing predictions for season {season}")
    conn.commit()

    # Generate all pairs
    team_keys = [t["team_key"] for t in teams if t["team_key"] in tourney_ratings_cache]
    pairs = list(itertools.combinations(team_keys, 2))
    total = len(pairs) * 7  # 7 rounds (0=First Four through 6=Championship)
    print(f"Generating {total} predictions ({len(pairs)} pairs × 7 rounds)...")

    start = time.time()
    batch = []
    count = 0
    errors = 0

    for pair_idx, (team_a, team_b) in enumerate(pairs):
        seed_a = seed_map[team_a]
        seed_b = seed_map[team_b]
        t_ratings_a = tourney_ratings_cache[team_a]
        t_ratings_b = tourney_ratings_cache[team_b]

        # Compute keys-to-game once per pair (round-independent)
        keys_a = []
        keys_b = []
        score_a = None
        score_b = None

        f_ratings_a = full_ratings_cache.get(team_a)
        f_ratings_b = full_ratings_cache.get(team_b)
        if f_ratings_a and f_ratings_b:
            try:
                keys_a = compute_matchup_keys(
                    f_ratings_a, f_ratings_b,
                    num_keys=3,
                    team_history=history_cache.get(team_a),
                )
                keys_b = compute_matchup_keys(
                    f_ratings_b, f_ratings_a,
                    num_keys=3,
                    team_history=history_cache.get(team_b),
                )
            except Exception as e:
                if errors <= 5:
                    print(f"  Keys error for {team_a} vs {team_b}: {e}")

        keys_a_json = json.dumps(keys_a) if keys_a else None
        keys_b_json = json.dumps(keys_b) if keys_b else None

        for round_num in range(0, 7):
            try:
                # Compute features directly (avoid re-loading ratings from DB)
                features_a = predictor._compute_features(t_ratings_a, t_ratings_b, seed_a, seed_b, round_num)
                features_b = predictor._compute_features(t_ratings_b, t_ratings_a, seed_b, seed_a, round_num)

                X_a = pd.DataFrame([features_a])[predictor.feature_names].fillna(0.0)
                X_b = pd.DataFrame([features_b])[predictor.feature_names].fillna(0.0)

                prob_a = float(predictor.win_model.predict_proba(X_a)[0, 1])
                prob_b = float(predictor.win_model.predict_proba(X_b)[0, 1])
                total_prob = prob_a + prob_b
                prob_a /= total_prob
                prob_b /= total_prob

                margin_a = float(predictor.margin_model.predict(X_a)[0])
                margin_b = float(predictor.margin_model.predict(X_b)[0])
                avg_margin = round((margin_a - margin_b) / 2, 1)

                # Ensure margin direction agrees with win probability
                # If prob says team_a wins but margin says team_b (or vice versa),
                # flip to a minimum margin in the probability-favored direction
                if prob_a > prob_b and avg_margin <= 0:
                    avg_margin = max(1.0, abs(avg_margin))
                elif prob_b > prob_a and avg_margin >= 0:
                    avg_margin = -max(1.0, abs(avg_margin))

                # Compute predicted scores from efficiency + tempo
                tempo_a = float(f_ratings_a.get("kp_adjusted_tempo", 68)) if f_ratings_a else 68.0
                tempo_b = float(f_ratings_b.get("kp_adjusted_tempo", 68)) if f_ratings_b else 68.0
                off_a = float(f_ratings_a.get("kp_offensive_rating", 100)) if f_ratings_a else 100.0
                def_a = float(f_ratings_a.get("kp_defensive_rating", 100)) if f_ratings_a else 100.0
                off_b = float(f_ratings_b.get("kp_offensive_rating", 100)) if f_ratings_b else 100.0
                def_b = float(f_ratings_b.get("kp_defensive_rating", 100)) if f_ratings_b else 100.0
                score_a, score_b = estimate_scores(avg_margin, tempo_a, tempo_b, off_a, def_a, off_b, def_b)

                batch.append((
                    season, team_a, team_b, seed_a, seed_b, round_num,
                    prob_a, prob_b, avg_margin, score_a, score_b,
                    keys_a_json, keys_b_json,
                    str(predictor.metadata.get("version", "unknown")),
                ))
                count += 1

            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"  Error predicting {team_a} vs {team_b} round {round_num}: {e}")

            # Batch insert every 1000 rows
            if len(batch) >= 1000:
                _insert_batch(conn, batch)
                batch = []
                elapsed = time.time() - start
                pct = count / total * 100
                print(f"  {count}/{total} ({pct:.1f}%) - {elapsed:.1f}s elapsed")

    # Insert remaining
    if batch:
        _insert_batch(conn, batch)

    elapsed = time.time() - start
    print(f"\nDone! Inserted {count} predictions in {elapsed:.1f}s ({errors} errors)")
    conn.close()


def _insert_batch(conn, batch):
    cur = conn.cursor()
    args = ",".join(
        cur.mogrify(
            "(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            row,
        ).decode()
        for row in batch
    )
    cur.execute(
        f"""
        INSERT INTO bracket_predictions
            (season, team_a_key, team_b_key, seed_a, seed_b, round_number,
             prob_a, prob_b, predicted_margin, predicted_score_a, predicted_score_b,
             keys_a, keys_b, model_version)
        VALUES {args}
        ON CONFLICT (season, team_a_key, team_b_key, round_number)
        DO UPDATE SET
            prob_a = EXCLUDED.prob_a,
            prob_b = EXCLUDED.prob_b,
            predicted_margin = EXCLUDED.predicted_margin,
            predicted_score_a = EXCLUDED.predicted_score_a,
            predicted_score_b = EXCLUDED.predicted_score_b,
            keys_a = EXCLUDED.keys_a,
            keys_b = EXCLUDED.keys_b,
            model_version = EXCLUDED.model_version,
            seed_a = EXCLUDED.seed_a,
            seed_b = EXCLUDED.seed_b,
            created_at = NOW()
        """
    )
    conn.commit()


if __name__ == "__main__":
    main()
