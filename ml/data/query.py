"""
Pulls training data from PostgreSQL.
Each completed game becomes 2 rows (one per team's perspective).
Ratings are joined using the most recent snapshot before the game date.
"""

import pandas as pd
import psycopg2

from ml.config import DATABASE_URL, TABLE_MAP


def _q(col: str) -> str:
    """Quote a column name for PostgreSQL (needed for columns starting with numbers like 3p_pct)."""
    return f'"{col}"'


def _build_lateral_join(alias: str, table: str, team_col: str, cols: list[str]) -> str:
    """Build a LATERAL join that gets the most recent rating row before the game date."""
    select_cols = ", ".join(f'{alias}.{_q(c)} AS "{alias}_{c}"' for c in cols)

    if table == "espn_stats":
        return f"""
        LEFT JOIN LATERAL (
            SELECT {', '.join(_q(c) for c in cols)}
            FROM {table}
            WHERE team_key = g.{team_col} AND season = g.season
            LIMIT 1
        ) {alias} ON TRUE""", select_cols
    elif table == "composite_rankings":
        return f"""
        LEFT JOIN LATERAL (
            SELECT {', '.join(_q(c) for c in cols)}
            FROM {table}
            WHERE team_key = g.{team_col}
              AND date <= g.date::date
              AND sources = 'kp,em,bt,net'
            ORDER BY date DESC
            LIMIT 1
        ) {alias} ON TRUE""", select_cols
    else:
        return f"""
        LEFT JOIN LATERAL (
            SELECT {', '.join(_q(c) for c in cols)}
            FROM {table}
            WHERE team_key = g.{team_col}
              AND date <= g.date::date
            ORDER BY date DESC
            LIMIT 1
        ) {alias} ON TRUE""", select_cols


# Columns to pull from each rating table
KENPOM_COLS = [
    "net_rating", "offensive_rating", "defensive_rating",
    "adjusted_tempo", "luck", "sos_net_rating", "pythag",
]
BARTTORVIK_COLS = [
    "barthag", "adjoe", "adjde",
    "efg_pct", "efgd_pct", "3p_pct", "3p_pct_d", "2p_pct", "2p_pct_d",
    "3pr", "3prd", "tor", "tord", "orb", "drb", "ftr", "ftrd",
]
EVANMIYA_COLS = [
    "relative_rating", "o_rate", "d_rate", "true_tempo",
    "kill_shots_per_game", "kill_shots_conceded_per_game",
]
NET_COLS = ["rank", "q1_wins"]
COMPOSITE_COLS = ["avg_zscore"]
ESPN_STATS_COLS = ["off_scoring_efficiency", "assist_turnover_ratio"]

# Additional ESPN columns needed for matchup keys (loaded during inference only)
ESPN_KEYS_COLS = [
    "off_assist_percentage", "off_assist_percentage_rank",
    "opp_off_assist_percentage", "opp_off_assist_percentage_rank",
]

# For rank lookups during inference (to build human-readable descriptions)
KENPOM_RANK_COLS = [
    "offensive_rating_rank", "defensive_rating_rank",
    "adjusted_tempo_rank", "sos_net_rating_rank",
]
BARTTORVIK_RANK_COLS = [
    "barthag_rank", "adjoe_rank", "adjde_rank",
    "efg_pct_rank", "efgd_pct_rank", "3p_pct_rank", "3p_pct_d_rank",
    "2p_pct_rank", "2p_pct_d_rank", "3pr_rank", "3prd_rank",
    "tor_rank", "tord_rank", "orb_rank", "drb_rank", "ftr_rank", "ftrd_rank",
]
EVANMIYA_RANK_COLS = [
    "off_rank", "def_rank", "tempo_rank",
    "kill_shots_per_game_rank", "kill_shots_conceded_per_game_rank",
]


def build_training_query(include_ranks: bool = False) -> str:
    """Build the full SQL query to pull training data."""
    kp_cols = KENPOM_COLS + (KENPOM_RANK_COLS if include_ranks else [])
    bt_cols = BARTTORVIK_COLS + (BARTTORVIK_RANK_COLS if include_ranks else [])
    em_cols = EVANMIYA_COLS + (EVANMIYA_RANK_COLS if include_ranks else [])
    net_cols = NET_COLS

    joins = []
    select_parts = []

    table_col_map = [
        ("kp_h", TABLE_MAP["kenpom"], "home_team_key", kp_cols),
        ("kp_a", TABLE_MAP["kenpom"], "away_team_key", kp_cols),
        ("bt_h", TABLE_MAP["barttorvik"], "home_team_key", bt_cols),
        ("bt_a", TABLE_MAP["barttorvik"], "away_team_key", bt_cols),
        ("em_h", TABLE_MAP["evanmiya"], "home_team_key", em_cols),
        ("em_a", TABLE_MAP["evanmiya"], "away_team_key", em_cols),
        ("net_h", TABLE_MAP["net"], "home_team_key", net_cols),
        ("net_a", TABLE_MAP["net"], "away_team_key", net_cols),
        ("comp_h", TABLE_MAP["composite"], "home_team_key", COMPOSITE_COLS),
        ("comp_a", TABLE_MAP["composite"], "away_team_key", COMPOSITE_COLS),
        ("espn_h", TABLE_MAP["espn_stats"], "home_team_key", ESPN_STATS_COLS),
        ("espn_a", TABLE_MAP["espn_stats"], "away_team_key", ESPN_STATS_COLS),
    ]

    for alias, table, team_col, cols in table_col_map:
        join_sql, select_sql = _build_lateral_join(alias, table, team_col, cols)
        joins.append(join_sql)
        select_parts.append(select_sql)

    query = f"""
    SELECT
        g.game_id,
        g.date,
        g.season,
        g.home_team_key,
        g.away_team_key,
        g.home_score,
        g.away_score,
        g.home_won,
        {', '.join(select_parts)}
    FROM espn_games g
    {' '.join(joins)}
    WHERE g.status = 'final'
      AND g.home_score IS NOT NULL
      AND g.away_score IS NOT NULL
    ORDER BY g.date
    """
    return query


def load_training_data(include_ranks: bool = False) -> pd.DataFrame:
    """Load raw training data from the database."""
    query = build_training_query(include_ranks=include_ranks)
    conn = psycopg2.connect(DATABASE_URL)
    try:
        df = pd.read_sql(query, conn)
    finally:
        conn.close()
    return df


def load_team_ratings(team_key: str) -> dict:
    """Load the latest ratings for a single team (used for inference)."""
    # Each entry: (prefix, table_key, columns, extra_where, order_col)
    rating_sources = [
        ("kp", "kenpom", KENPOM_COLS + KENPOM_RANK_COLS, "", "date"),
        ("bt", "barttorvik", BARTTORVIK_COLS + BARTTORVIK_RANK_COLS, "", "date"),
        ("em", "evanmiya", EVANMIYA_COLS + EVANMIYA_RANK_COLS, "", "date"),
        ("net", "net", NET_COLS, "", "date"),
        ("comp", "composite", COMPOSITE_COLS, "AND sources = 'kp,em,bt,net'", "date"),
        ("espn", "espn_stats", ESPN_STATS_COLS + ESPN_KEYS_COLS, "", "season"),
    ]

    conn = psycopg2.connect(DATABASE_URL)
    try:
        ratings = {}
        cur = conn.cursor()

        for prefix, table_key, cols, extra_where, order_col in rating_sources:
            cur.execute(
                f"SELECT {', '.join(_q(c) for c in cols)} FROM {TABLE_MAP[table_key]} "
                f"WHERE team_key = %s {extra_where} ORDER BY {order_col} DESC LIMIT 1",
                (team_key,),
            )
            row = cur.fetchone()
            if row:
                for i, col in enumerate(cols):
                    ratings[f"{prefix}_{col}"] = row[i]

        cur.close()
    finally:
        conn.close()

    return ratings


def load_team_game_history(team_key: str) -> list[dict]:
    """
    Load a team's game results with opponent rank data at game time.

    Returns a list of dicts, each with:
      - won: bool
      - margin: int (score differential from team's perspective)
      - expected_margin: float (KenPom net rating diff, ~neutral-court expected margin)
      - opp_ranks: dict mapping rank column names to values
    """
    # Opponent rank columns we need for each matchup dimension + tempo
    BT_OPP_RANK_COLS = [
        "3p_pct_rank", "3p_pct_d_rank",
        "2p_pct_rank", "2p_pct_d_rank",
        "orb_rank", "drb_rank",
        "tor_rank", "tord_rank",
        "ftr_rank", "ftrd_rank",
        "3pr_rank", "3prd_rank",
    ]
    EM_OPP_RANK_COLS = [
        "kill_shots_per_game_rank", "kill_shots_conceded_per_game_rank",
    ]
    KP_OPP_RANK_COLS = [
        "adjusted_tempo_rank",
        "offensive_rating_rank", "defensive_rating_rank",
    ]

    conn = psycopg2.connect(DATABASE_URL)
    try:
        bt_select = ", ".join(f'bt_opp.{_q(c)} AS "bt_{c}"' for c in BT_OPP_RANK_COLS)
        em_select = ", ".join(f'em_opp.{_q(c)} AS "em_{c}"' for c in EM_OPP_RANK_COLS)
        kp_select = ", ".join(f'kp_opp.{_q(c)} AS "kp_{c}"' for c in KP_OPP_RANK_COLS)

        bt_cols_sql = ", ".join(_q(c) for c in BT_OPP_RANK_COLS)
        em_cols_sql = ", ".join(_q(c) for c in EM_OPP_RANK_COLS)
        kp_cols_sql = ", ".join(_q(c) for c in KP_OPP_RANK_COLS)

        query = f"""
        WITH team_games AS (
            SELECT
                g.date,
                g.season,
                CASE WHEN g.home_team_key = %s THEN g.home_won ELSE g.away_won END AS won,
                CASE WHEN g.home_team_key = %s THEN g.away_team_key ELSE g.home_team_key END AS opp_key,
                CASE WHEN g.home_team_key = %s
                     THEN g.home_score - g.away_score
                     ELSE g.away_score - g.home_score END AS margin
            FROM espn_games g
            WHERE g.status = 'final'
              AND (g.home_team_key = %s OR g.away_team_key = %s)
              AND g.home_score IS NOT NULL
            ORDER BY g.date DESC
            LIMIT 40
        )
        SELECT
            tg.won,
            tg.margin,
            kp_team.net_rating AS team_net_rating,
            kp_opp_overall.net_rating AS opp_net_rating,
            {bt_select},
            {em_select},
            {kp_select}
        FROM team_games tg
        LEFT JOIN LATERAL (
            SELECT net_rating
            FROM {TABLE_MAP['kenpom']}
            WHERE team_key = %s AND date <= tg.date::date
            ORDER BY date DESC LIMIT 1
        ) kp_team ON TRUE
        LEFT JOIN LATERAL (
            SELECT net_rating
            FROM {TABLE_MAP['kenpom']}
            WHERE team_key = tg.opp_key AND date <= tg.date::date
            ORDER BY date DESC LIMIT 1
        ) kp_opp_overall ON TRUE
        LEFT JOIN LATERAL (
            SELECT {bt_cols_sql}
            FROM {TABLE_MAP['barttorvik']}
            WHERE team_key = tg.opp_key AND date <= tg.date::date
            ORDER BY date DESC LIMIT 1
        ) bt_opp ON TRUE
        LEFT JOIN LATERAL (
            SELECT {em_cols_sql}
            FROM {TABLE_MAP['evanmiya']}
            WHERE team_key = tg.opp_key AND date <= tg.date::date
            ORDER BY date DESC LIMIT 1
        ) em_opp ON TRUE
        LEFT JOIN LATERAL (
            SELECT {kp_cols_sql}
            FROM {TABLE_MAP['kenpom']}
            WHERE team_key = tg.opp_key AND date <= tg.date::date
            ORDER BY date DESC LIMIT 1
        ) kp_opp ON TRUE
        """

        cur = conn.cursor()
        cur.execute(query, (team_key, team_key, team_key, team_key, team_key, team_key))
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
        cur.close()

        results = []
        for row in rows:
            d = dict(zip(columns, row))
            won = d.pop("won")
            margin = d.pop("margin") or 0
            team_nr = d.pop("team_net_rating")
            opp_nr = d.pop("opp_net_rating")
            expected_margin = (float(team_nr) - float(opp_nr)) if (team_nr and opp_nr) else 0.0
            results.append({
                "won": bool(won),
                "margin": int(margin),
                "expected_margin": expected_margin,
                "opp_ranks": d,
            })
        return results
    finally:
        conn.close()


if __name__ == "__main__":
    print("Loading training data...")
    df = load_training_data()
    print(f"Loaded {len(df)} games")
    print(f"Columns: {list(df.columns)}")
    print(f"Seasons: {sorted(df['season'].unique())}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"\nSample row:\n{df.iloc[0].to_dict()}")
