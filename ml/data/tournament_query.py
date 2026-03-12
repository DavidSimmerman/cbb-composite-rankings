"""
Pulls tournament-specific training data from PostgreSQL.
Each tournament game becomes 2 rows (one per team's perspective).
Ratings are joined using the most recent pre-tournament snapshot.
"""

import pandas as pd
import psycopg2

from ml.config import DATABASE_URL


def _q(col: str) -> str:
    return f'"{col}"'


def load_tournament_data() -> pd.DataFrame:
    """
    Load all tournament games (2002-2025) with pre-tournament ratings.
    Returns a DataFrame with team_a/team_b ratings, seeds, and round info.
    """
    query = """
    WITH game_data AS (
        SELECT
            tg.season, tg.round, tg.region,
            tg.team_a_key, tg.team_b_key,
            tg.team_a_seed, tg.team_b_seed,
            eg.home_team_key, eg.away_team_key,
            eg.home_score, eg.away_score,
            CASE WHEN eg.home_team_key = tg.team_a_key
                 THEN eg.home_score > eg.away_score
                 ELSE eg.away_score > eg.home_score
            END AS team_a_won,
            CASE WHEN eg.home_team_key = tg.team_a_key
                 THEN eg.home_score - eg.away_score
                 ELSE eg.away_score - eg.home_score
            END AS team_a_margin,
            CASE
                WHEN tg.round = 'Round of 64' THEN 1
                WHEN tg.round = 'Round of 32' THEN 2
                WHEN tg.round = 'Sweet 16' THEN 3
                WHEN tg.round = 'Elite 8' THEN 4
                WHEN tg.round = 'Final Four' THEN 5
                WHEN tg.round = 'Championship' THEN 6
                ELSE 0
            END AS round_number
        FROM tournament_games tg
        JOIN espn_games eg ON eg.game_id = tg.game_id
        WHERE tg.season >= 2010
          AND tg.round != 'First Four'
          AND tg.team_a_key IS NOT NULL
          AND tg.team_b_key IS NOT NULL
          AND eg.home_score IS NOT NULL
          AND eg.away_score IS NOT NULL
    )
    SELECT
        g.*,
        -- Team A KenPom
        kp_a.net_rating AS kp_a_net_rating,
        kp_a.offensive_rating AS kp_a_off_rating,
        kp_a.defensive_rating AS kp_a_def_rating,
        kp_a.adjusted_tempo AS kp_a_tempo,
        kp_a.sos_net_rating AS kp_a_sos,
        kp_a.rank AS kp_a_rank,
        kp_a.luck AS kp_a_luck,
        -- Team B KenPom
        kp_b.net_rating AS kp_b_net_rating,
        kp_b.offensive_rating AS kp_b_off_rating,
        kp_b.defensive_rating AS kp_b_def_rating,
        kp_b.adjusted_tempo AS kp_b_tempo,
        kp_b.sos_net_rating AS kp_b_sos,
        kp_b.rank AS kp_b_rank,
        kp_b.luck AS kp_b_luck,
        -- Team A BartTorvik
        bt_a.barthag AS bt_a_barthag,
        bt_a."3p_pct" AS bt_a_3p_pct,
        bt_a."3p_pct_d" AS bt_a_3p_pct_d,
        bt_a."2p_pct" AS bt_a_2p_pct,
        bt_a.efg_pct AS bt_a_efg_pct,
        bt_a.tor AS bt_a_tor,
        bt_a.tord AS bt_a_tord,
        bt_a.orb AS bt_a_orb,
        bt_a.ftr AS bt_a_ftr,
        bt_a."3pr" AS bt_a_3pr,
        -- Team B BartTorvik
        bt_b.barthag AS bt_b_barthag,
        bt_b."3p_pct" AS bt_b_3p_pct,
        bt_b."3p_pct_d" AS bt_b_3p_pct_d,
        bt_b."2p_pct" AS bt_b_2p_pct,
        bt_b.efg_pct AS bt_b_efg_pct,
        bt_b.tor AS bt_b_tor,
        bt_b.tord AS bt_b_tord,
        bt_b.orb AS bt_b_orb,
        bt_b.ftr AS bt_b_ftr,
        bt_b."3pr" AS bt_b_3pr,
        -- Team A Composite
        comp_a.avg_zscore AS comp_a_zscore,
        comp_a.avg_offensive_zscore AS comp_a_off_zscore,
        comp_a.avg_defensive_zscore AS comp_a_def_zscore,
        -- Team B Composite
        comp_b.avg_zscore AS comp_b_zscore,
        comp_b.avg_offensive_zscore AS comp_b_off_zscore,
        comp_b.avg_defensive_zscore AS comp_b_def_zscore
    FROM game_data g
    -- Team A ratings (pre-tournament)
    LEFT JOIN LATERAL (
        SELECT net_rating, offensive_rating, defensive_rating, adjusted_tempo, sos_net_rating, rank, luck
        FROM kenpom_rankings
        WHERE team_key = g.team_a_key AND season = g.season - 2000
        ORDER BY date DESC LIMIT 1
    ) kp_a ON TRUE
    LEFT JOIN LATERAL (
        SELECT barthag, "3p_pct", "3p_pct_d", "2p_pct", efg_pct, tor, tord, orb, ftr, "3pr"
        FROM barttorvik_rankings
        WHERE team_key = g.team_a_key AND season = g.season - 2000
        ORDER BY date DESC LIMIT 1
    ) bt_a ON TRUE
    LEFT JOIN LATERAL (
        SELECT avg_zscore, avg_offensive_zscore, avg_defensive_zscore
        FROM composite_rankings
        WHERE team_key = g.team_a_key AND season = g.season - 2000
          AND sources = 'kp,em,bt'
        ORDER BY date DESC LIMIT 1
    ) comp_a ON TRUE
    -- Team B ratings (pre-tournament)
    LEFT JOIN LATERAL (
        SELECT net_rating, offensive_rating, defensive_rating, adjusted_tempo, sos_net_rating, rank, luck
        FROM kenpom_rankings
        WHERE team_key = g.team_b_key AND season = g.season - 2000
        ORDER BY date DESC LIMIT 1
    ) kp_b ON TRUE
    LEFT JOIN LATERAL (
        SELECT barthag, "3p_pct", "3p_pct_d", "2p_pct", efg_pct, tor, tord, orb, ftr, "3pr"
        FROM barttorvik_rankings
        WHERE team_key = g.team_b_key AND season = g.season - 2000
        ORDER BY date DESC LIMIT 1
    ) bt_b ON TRUE
    LEFT JOIN LATERAL (
        SELECT avg_zscore, avg_offensive_zscore, avg_defensive_zscore
        FROM composite_rankings
        WHERE team_key = g.team_b_key AND season = g.season - 2000
          AND sources = 'kp,em,bt'
        ORDER BY date DESC LIMIT 1
    ) comp_b ON TRUE
    ORDER BY g.season, g.round_number
    """

    with psycopg2.connect(DATABASE_URL) as conn:
        df = pd.read_sql(query, conn)

    print(f"Loaded {len(df)} tournament games from database")
    return df


# Tournament-specific feature definitions
TOURNAMENT_FEATURE_NAMES = [
    # Seed features
    "seed_a", "seed_b", "seed_diff", "seed_product",
    # Round context
    "round_number",
    # Rating differentials
    "kp_net_diff", "bt_barthag_diff", "comp_zscore_diff",
    # Efficiency matchups
    "kp_off_vs_def", "bt_efg_matchup", "bt_3p_matchup", "bt_2p_matchup",
    # Style matchups
    "bt_turnover_matchup", "bt_rebound_matchup", "bt_ftr_matchup", "bt_3pr_diff",
    # Context features
    "kp_tempo_diff", "kp_sos_diff", "kp_luck_diff",
    # Raw ratings for seed-relative strength
    "kp_a_rank", "kp_b_rank",
]


def compute_tournament_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute tournament-specific features from raw data.
    Returns 2 rows per game (team A perspective + team B perspective).
    """
    rows = []

    for _, game in df.iterrows():
        for perspective in ["a", "b"]:
            team = perspective
            opp = "b" if perspective == "a" else "a"

            features = {}

            # Seed features
            features["seed_a"] = game[f"team_{team}_seed"]
            features["seed_b"] = game[f"team_{opp}_seed"]
            features["seed_diff"] = features["seed_a"] - features["seed_b"]
            features["seed_product"] = features["seed_a"] * features["seed_b"]

            # Round
            features["round_number"] = game["round_number"]

            # Rating differentials
            features["kp_net_diff"] = _safe_diff(game, f"kp_{team}_net_rating", f"kp_{opp}_net_rating")
            features["bt_barthag_diff"] = _safe_diff(game, f"bt_{team}_barthag", f"bt_{opp}_barthag")
            features["comp_zscore_diff"] = _safe_diff(game, f"comp_{team}_zscore", f"comp_{opp}_zscore")

            # Efficiency matchups (team offense vs opp defense)
            features["kp_off_vs_def"] = _safe_diff(game, f"kp_{team}_off_rating", f"kp_{opp}_def_rating")
            features["bt_efg_matchup"] = _safe_diff(game, f"bt_{team}_efg_pct", f"bt_{opp}_efg_pct")  # Simplified — own EFG vs opp EFG
            features["bt_3p_matchup"] = _safe_diff(game, f"bt_{team}_3p_pct", f"bt_{opp}_3p_pct_d")
            features["bt_2p_matchup"] = _safe_diff(game, f"bt_{team}_2p_pct", f"bt_{opp}_2p_pct")

            # Style matchups
            features["bt_turnover_matchup"] = _safe_diff(game, f"bt_{opp}_tor", f"bt_{team}_tor")  # Opponent turnovers minus ours
            features["bt_rebound_matchup"] = _safe_diff(game, f"bt_{team}_orb", f"bt_{opp}_orb")
            features["bt_ftr_matchup"] = _safe_diff(game, f"bt_{team}_ftr", f"bt_{opp}_ftr")
            features["bt_3pr_diff"] = _safe_diff(game, f"bt_{team}_3pr", f"bt_{opp}_3pr")

            # Context
            features["kp_tempo_diff"] = _safe_diff(game, f"kp_{team}_tempo", f"kp_{opp}_tempo")
            features["kp_sos_diff"] = _safe_diff(game, f"kp_{team}_sos", f"kp_{opp}_sos")
            features["kp_luck_diff"] = _safe_diff(game, f"kp_{team}_luck", f"kp_{opp}_luck")

            # Raw ranks (for seed-relative strength)
            features["kp_a_rank"] = _safe_val(game, f"kp_{team}_rank")
            features["kp_b_rank"] = _safe_val(game, f"kp_{opp}_rank")

            # Labels
            if perspective == "a":
                features["won"] = 1 if game["team_a_won"] else 0
                features["score_margin"] = game.get("team_a_margin", 0)
            else:
                features["won"] = 0 if game["team_a_won"] else 1
                features["score_margin"] = -game.get("team_a_margin", 0) if pd.notna(game.get("team_a_margin")) else 0

            features["team_key"] = game[f"team_{team}_key"]
            features["opp_key"] = game[f"team_{opp}_key"]
            features["season"] = game["season"]

            rows.append(features)

    result = pd.DataFrame(rows)
    print(f"Built {len(result)} feature rows from {len(df)} games")
    return result


def _safe_diff(game, col_a, col_b):
    a = game.get(col_a)
    b = game.get(col_b)
    if pd.notna(a) and pd.notna(b):
        return float(a) - float(b)
    return 0.0


def _safe_val(game, col):
    v = game.get(col)
    return float(v) if pd.notna(v) else 0.0
