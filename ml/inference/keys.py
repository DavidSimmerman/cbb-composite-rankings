"""
Keys to the game — 3 questions per team.

For each team, answers:
1. Best Matchup: Where is their biggest advantage? What's their path to winning?
   Combines: team strength + opponent weakness + history of big wins in this area.
2. Biggest Threat: What's their biggest vulnerability? What could cost them the game?
   Combines: opponent strength + team weakness + history of losses in this area.
3. X-Factor: What's the most interesting wrinkle that could swing the game?
   Tempo mismatch, a dimension where history defies the rankings, etc.

The system finds the 6 best insights across both teams, assigns each to the
team it's most relevant for, and frames it from that team's perspective.
"""

NUM_TEAMS = 364
MIN_GAMES = 4
THRESHOLDS = [25, 50, 75]

# ---------------------------------------------------------------------------
# Dimensions
# ---------------------------------------------------------------------------

DIMENSIONS = [
    {
        "key": "three_point",
        "label": "Shoot the Three",  # team has advantage
        "limit_label": "Limit Their Threes",  # opponent has advantage
        "off_key": "bt_3p_pct",
        "off_rank_key": "bt_3p_pct_rank",
        "def_key": "bt_3p_pct_d",
        "def_rank_key": "bt_3p_pct_d_rank",
        "off_noun": "3pt shooting",
        "def_noun": "perimeter defense",
        "off_phrase": "shoots {val:.1f}% from three",
        "def_phrase": "allows {val:.1f}% from three",
        "history_def_rank": "bt_3p_pct_d_rank",
        "history_off_rank": "bt_3p_pct_rank",
        "history_def_ctx": "strong perimeter defenses",
        "history_off_ctx": "good 3pt shooting teams",
    },
    {
        "key": "two_point",
        "label": "Attack the Paint",
        "limit_label": "Protect the Paint",
        "off_key": "bt_2p_pct",
        "off_rank_key": "bt_2p_pct_rank",
        "def_key": "bt_2p_pct_d",
        "def_rank_key": "bt_2p_pct_d_rank",
        "off_noun": "interior scoring",
        "def_noun": "interior defense",
        "off_phrase": "shoots {val:.1f}% inside the arc",
        "def_phrase": "allows {val:.1f}% inside the arc",
        "history_def_rank": "bt_2p_pct_d_rank",
        "history_off_rank": "bt_2p_pct_rank",
        "history_def_ctx": "strong interior defenses",
        "history_off_ctx": "good interior scoring teams",
    },
    {
        "key": "rebounding",
        "label": "Crash the Boards",
        "limit_label": "Box Out",
        "off_key": "bt_orb",
        "off_rank_key": "bt_orb_rank",
        "def_key": "bt_drb",
        "def_rank_key": "bt_drb_rank",
        "off_noun": "offensive rebounding",
        "def_noun": "defensive rebounding",
        "off_phrase": "grabs {val:.1f}% of offensive boards",
        "def_phrase": "allows {val:.1f}% offensive rebounding",
        "history_def_rank": "bt_drb_rank",
        "history_off_rank": "bt_orb_rank",
        "history_def_ctx": "strong rebounding defenses",
        "history_off_ctx": "good offensive rebounding teams",
    },
    {
        "key": "turnovers",
        "label": "Force Turnovers",
        "limit_label": "Take Care of the Ball",
        "off_key": "bt_tor",
        "off_rank_key": "bt_tor_rank",
        "def_key": "bt_tord",
        "def_rank_key": "bt_tord_rank",
        "off_noun": "ball security",
        "def_noun": "forcing turnovers",
        "off_phrase": "turns it over {val:.1f}% of possessions",
        "def_phrase": "forces turnovers {val:.1f}% of the time",
        "history_def_rank": "bt_tord_rank",
        "history_off_rank": "bt_tor_rank",
        "history_def_ctx": "turnover-forcing teams",
        "history_off_ctx": "ball-secure teams",
        "off_inverted": True,  # lower TO rate = better offense
    },
    {
        "key": "free_throws",
        "label": "Get to the Line",
        "limit_label": "Stay Disciplined",
        "off_key": "bt_ftr",
        "off_rank_key": "bt_ftr_rank",
        "def_key": "bt_ftrd",
        "def_rank_key": "bt_ftrd_rank",
        "off_noun": "getting to the line",
        "def_noun": "foul prevention",
        "off_phrase": "free throw rate of {val:.1f}%",
        "def_phrase": "allows {val:.1f}% free throw rate",
        "history_def_rank": "bt_ftrd_rank",
        "history_off_rank": "bt_ftr_rank",
        "history_def_ctx": "disciplined defenses",
        "history_off_ctx": "line-attacking teams",
    },
    {
        "key": "three_point_volume",
        "label": "Get Open Threes",
        "limit_label": "Take Away the Three",
        "off_key": "bt_3pr",
        "off_rank_key": "bt_3pr_rank",
        "def_key": "bt_3prd",
        "def_rank_key": "bt_3prd_rank",
        "off_noun": "3pt volume",
        "def_noun": "3pt prevention",
        "off_phrase": "takes {val:.1f}% of shots from three",
        "def_phrase": "allows {val:.1f}% of shots from three",
        "history_def_rank": "bt_3prd_rank",
        "history_off_rank": "bt_3pr_rank",
        "history_def_ctx": "3pt-limiting defenses",
        "history_off_ctx": "3pt-heavy teams",
    },
    {
        "key": "ball_movement",
        "label": "Move the Ball",
        "limit_label": "Disrupt Their Passing",
        "off_key": "espn_off_assist_percentage",
        "off_rank_key": "espn_off_assist_percentage_rank",
        "def_key": "espn_opp_off_assist_percentage",
        "def_rank_key": "espn_opp_off_assist_percentage_rank",
        "off_noun": "ball movement",
        "def_noun": "disrupting passes",
        "off_phrase": "{val:.1f}% of baskets assisted",
        "def_phrase": "allows {val:.1f}% assisted baskets",
    },
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _game_weight(game: dict) -> float:
    """Weight games by how informative they are."""
    expected_won = game["expected_margin"] > 3
    expected_lost = game["expected_margin"] < -3
    actual_won = game["won"]

    if (expected_lost and actual_won) or (expected_won and not actual_won):
        return 2.0

    if abs(game["margin"]) <= 5:
        return 1.5

    if abs(game["margin"] - game["expected_margin"]) >= 12:
        return 1.5

    if abs(game["expected_margin"]) >= 12 and abs(game["margin"]) >= 10:
        if abs(game["margin"] - game["expected_margin"]) < 8:
            return 0.3

    return 1.0


def _analyze(history, rank_col):
    """Analyze performance vs opponents ranked top-N, trying multiple thresholds."""
    best = None
    best_signal = -1.0

    for threshold in THRESHOLDS:
        qual = []
        other = []
        for game in history:
            rank = game["opp_ranks"].get(rank_col)
            if rank is None:
                continue
            w = _game_weight(game)
            if rank <= threshold:
                qual.append((game, w))
            else:
                other.append((game, w))

        if len(qual) < MIN_GAMES:
            continue

        total_losses = sum(1 for g in history if not g["won"])
        wins = sum(1 for g, _ in qual if g["won"])
        losses = len(qual) - wins
        tw = sum(w for _, w in qual)
        avg_m = sum(g["margin"] * w for g, w in qual) / tw
        delta = sum((g["margin"] - g["expected_margin"]) * w for g, w in qual) / tw

        base_delta = 0.0
        if other:
            ow = sum(w for _, w in other)
            base_delta = (
                sum((g["margin"] - g["expected_margin"]) * w for g, w in other) / ow
            )

        lc = losses / total_losses if total_losses > 0 else 0.0
        dd = delta - base_delta

        # Dampen concentration when total losses is very small
        lc_adj = lc * min(total_losses / 4, 1.0) if total_losses > 0 else 0.0

        signal = lc_adj * 2.0 + abs(dd) / 10.0 + abs(wins / len(qual) - 0.5)
        if signal > best_signal:
            best_signal = signal
            best = {
                "threshold": threshold,
                "wins": wins,
                "losses": losses,
                "total": len(qual),
                "win_rate": wins / len(qual),
                "avg_margin": avg_m,
                "delta_diff": dd,
                "loss_concentration": lc,
                "losses_in_profile": losses,
                "total_losses": total_losses,
            }

    return best


# ---------------------------------------------------------------------------
# Step 1: Find best matchup (team's path to winning)
# ---------------------------------------------------------------------------


def _find_best_matchup(team_ratings, opp_ratings, team_history):
    """
    Find the dimension where the team has the biggest edge.

    Looks for: team is strong + opponent is weak, especially if the team
    has a history of big wins against this profile.
    """
    candidates = []

    for dim in DIMENSIONS:
        inv = dim.get("off_inverted", False)

        # Team offense vs opponent defense
        t_off_r = team_ratings.get(dim["off_rank_key"])
        o_def_r = opp_ratings.get(dim["def_rank_key"])
        o_def_v = opp_ratings.get(dim["def_key"])

        if t_off_r is not None and o_def_r is not None and o_def_v is not None:
            t_off_r = int(t_off_r)
            o_def_r = int(o_def_r)

            # Team is good at this offensively?
            team_good = t_off_r >= 200 if inv else t_off_r <= 100
            # Opponent is bad at defending it?
            if team_good:
                # Score: how big is the mismatch?
                # Better team rank = more points. Worse opp D = more points.
                t_score = t_off_r / NUM_TEAMS if inv else 1 - t_off_r / NUM_TEAMS
                o_score = o_def_r / NUM_TEAMS
                mismatch = t_score + o_score  # 0-2 range

                # History bonus: how do they do vs this defensive profile?
                hist_col = dim.get("history_def_rank")
                analysis = None
                if hist_col and team_history:
                    analysis = _analyze(team_history, hist_col)

                hist_bonus = 0.0
                hist_desc = ""
                if analysis:
                    dd = analysis["delta_diff"]
                    if dd > 3:
                        hist_bonus = min(dd / 10, 0.5)
                        hist_desc = (
                            f"Overperforms by {dd:+.1f} pts vs "
                            f"top-{analysis['threshold']} "
                            f"{dim.get('history_def_ctx', 'defenses')} "
                            f"({analysis['wins']}-{analysis['losses']})"
                        )
                    elif analysis["win_rate"] >= 0.80 and analysis["total"] >= 5:
                        hist_bonus = 0.2
                        hist_desc = (
                            f"{analysis['wins']}-{analysis['losses']} "
                            f"(avg {analysis['avg_margin']:+.1f}) vs "
                            f"top-{analysis['threshold']} "
                            f"{dim.get('history_def_ctx', 'defenses')}"
                        )

                score = mismatch + hist_bonus

                # Build description
                off_desc = dim["off_phrase"].format(
                    val=float(opp_ratings.get(dim["off_key"], 0)), rank=t_off_r
                )
                def_desc = dim["def_phrase"].format(val=float(o_def_v), rank=o_def_r)
                desc = f"#{t_off_r} in {dim['off_noun']} — opponent {def_desc} (#{o_def_r})"
                if hist_desc:
                    desc += f". {hist_desc}"

                candidates.append(
                    {
                        "dim_key": dim["key"],
                        "label": dim["label"],
                        "description": desc,
                        "score": score,
                        "advantage": "team",
                        "t_rank": t_off_r,
                        "o_rank": o_def_r,
                    }
                )

        # Team defense vs opponent offense (team's D is strong, opp O is weak)
        t_def_r = team_ratings.get(dim["def_rank_key"])
        o_off_r = opp_ratings.get(dim["off_rank_key"])
        o_off_v = opp_ratings.get(dim["off_key"])

        if t_def_r is not None and o_off_r is not None and o_off_v is not None:
            t_def_r = int(t_def_r)
            o_off_r = int(o_off_r)

            team_good = t_def_r <= 75
            opp_weak = o_off_r <= 100 if inv else o_off_r >= 150

            if team_good:
                t_score = 1 - t_def_r / NUM_TEAMS
                o_score = 1 - o_off_r / NUM_TEAMS if inv else o_off_r / NUM_TEAMS
                mismatch = t_score + o_score

                hist_col = dim.get("history_off_rank")
                analysis = None
                if hist_col and team_history:
                    analysis = _analyze(team_history, hist_col)

                hist_bonus = 0.0
                hist_desc = ""
                if analysis:
                    dd = analysis["delta_diff"]
                    if dd > 3:
                        hist_bonus = min(dd / 10, 0.5)
                        hist_desc = (
                            f"Overperforms by {dd:+.1f} pts vs "
                            f"top-{analysis['threshold']} "
                            f"{dim.get('history_off_ctx', 'offenses')} "
                            f"({analysis['wins']}-{analysis['losses']})"
                        )

                score = mismatch + hist_bonus

                off_desc = dim["off_phrase"].format(val=float(o_off_v), rank=o_off_r)
                desc = f"#{t_def_r} in {dim['def_noun']} — opponent {off_desc} (#{o_off_r})"
                if hist_desc:
                    desc += f". {hist_desc}"

                candidates.append(
                    {
                        "dim_key": dim["key"],
                        "label": dim["limit_label"],
                        "description": desc,
                        "score": score,
                        "advantage": "team",
                        "t_rank": t_def_r,
                        "o_rank": o_off_r,
                    }
                )

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates


# ---------------------------------------------------------------------------
# Step 2: Find biggest threat (how they could lose)
# ---------------------------------------------------------------------------


def _find_biggest_threat(team_ratings, opp_ratings, team_history):
    """
    Find the dimension where the team is most vulnerable.

    Looks for: opponent is strong + team is weak OR losses concentrate
    against this opponent profile.
    """
    candidates = []

    for dim in DIMENSIONS:
        inv = dim.get("off_inverted", False)

        # Opponent offense vs team defense (they attack, we defend)
        o_off_r = opp_ratings.get(dim["off_rank_key"])
        o_off_v = opp_ratings.get(dim["off_key"])
        t_def_r = team_ratings.get(dim["def_rank_key"])

        if o_off_r is not None and t_def_r is not None and o_off_v is not None:
            o_off_r = int(o_off_r)
            t_def_r = int(t_def_r)

            opp_good = o_off_r >= 250 if inv else o_off_r <= 75
            team_weak = t_def_r >= 150

            # History: do losses cluster when facing this offensive profile?
            hist_col = dim.get("history_off_rank")
            analysis = None
            if hist_col and team_history:
                analysis = _analyze(team_history, hist_col)

            # Score the threat
            threat_score = 0.0

            # Rank mismatch
            if opp_good:
                o_score = o_off_r / NUM_TEAMS if inv else 1 - o_off_r / NUM_TEAMS
                t_score = t_def_r / NUM_TEAMS
                threat_score = o_score + t_score

            # Loss concentration — dampen when few total losses
            hist_desc = ""
            if analysis:
                lc = analysis["loss_concentration"]
                losses_here = analysis["losses_in_profile"]
                total_losses = analysis["total_losses"]
                # Dampen when total losses is very small
                lc_adj = lc * min(total_losses / 4, 1.0)

                if lc_adj >= 0.35 and losses_here >= 2:
                    threat_score += lc_adj * 1.5
                    record = f"{analysis['wins']}-{analysis['losses']}"
                    hist_desc = (
                        f"{losses_here} of {total_losses} losses came vs "
                        f"top-{analysis['threshold']} "
                        f"{dim.get('history_off_ctx', 'offenses')} "
                        f"({record}, avg {analysis['avg_margin']:+.1f})"
                    )
                elif analysis["delta_diff"] < -3:
                    dd = analysis["delta_diff"]
                    threat_score += abs(dd) / 10
                    hist_desc = (
                        f"Underperforms by {dd:+.1f} pts vs "
                        f"top-{analysis['threshold']} "
                        f"{dim.get('history_off_ctx', 'offenses')} "
                        f"({analysis['wins']}-{analysis['losses']})"
                    )

            # Only include if there's a real signal
            if threat_score < 0.5:
                continue

            # Does the opponent actually fit the threat profile?
            opp_matches = opp_good
            if analysis and not opp_matches:
                # Check if opponent rank is within the analysis threshold
                if o_off_r <= analysis["threshold"]:
                    opp_matches = True

            if not opp_matches:
                continue

            off_desc = dim["off_phrase"].format(val=float(o_off_v), rank=o_off_r)
            desc = f"Opponent {off_desc} (#{o_off_r}) — #{t_def_r} in {dim['def_noun']}"
            if hist_desc:
                desc += f". {hist_desc}"

            candidates.append(
                {
                    "dim_key": dim["key"],
                    "label": dim["limit_label"],
                    "description": desc,
                    "score": threat_score,
                    "advantage": "opponent",
                }
            )

        # Team offense vs opponent defense (they defend well, we're weak here)
        t_off_r = team_ratings.get(dim["off_rank_key"])
        o_def_r = opp_ratings.get(dim["def_rank_key"])
        o_def_v = opp_ratings.get(dim["def_key"])

        if t_off_r is not None and o_def_r is not None and o_def_v is not None:
            t_off_r = int(t_off_r)
            o_def_r = int(o_def_r)

            team_weak = t_off_r <= 100 if inv else t_off_r >= 150
            opp_good = o_def_r <= 50

            hist_col = dim.get("history_def_rank")
            analysis = None
            if hist_col and team_history:
                analysis = _analyze(team_history, hist_col)

            threat_score = 0.0

            if team_weak and opp_good:
                t_score = 1 - t_off_r / NUM_TEAMS if inv else t_off_r / NUM_TEAMS
                o_score = 1 - o_def_r / NUM_TEAMS
                threat_score = t_score + o_score

            hist_desc = ""
            if analysis:
                lc = analysis["loss_concentration"]
                losses_here = analysis["losses_in_profile"]
                total_losses = analysis["total_losses"]
                lc_adj = lc * min(total_losses / 4, 1.0)

                if lc_adj >= 0.4 and losses_here >= 2:
                    threat_score += lc_adj * 1.5
                    record = f"{analysis['wins']}-{analysis['losses']}"
                    hist_desc = (
                        f"{losses_here} of {total_losses} losses came vs "
                        f"top-{analysis['threshold']} "
                        f"{dim.get('history_def_ctx', 'defenses')} "
                        f"({record}, avg {analysis['avg_margin']:+.1f})"
                    )
                elif analysis["delta_diff"] < -3:
                    dd = analysis["delta_diff"]
                    threat_score += abs(dd) / 10
                    hist_desc = (
                        f"Underperforms by {dd:+.1f} pts vs "
                        f"top-{analysis['threshold']} "
                        f"{dim.get('history_def_ctx', 'defenses')} "
                        f"({analysis['wins']}-{analysis['losses']})"
                    )

            if threat_score < 0.5:
                continue

            opp_matches = opp_good
            if analysis and not opp_matches:
                if o_def_r <= analysis["threshold"]:
                    opp_matches = True

            if not opp_matches:
                continue

            def_desc = dim["def_phrase"].format(val=float(o_def_v), rank=o_def_r)
            desc = (
                f"#{t_off_r} in {dim['off_noun']} — "
                f"opponent {def_desc} (#{o_def_r})"
            )
            if hist_desc:
                desc += f". {hist_desc}"

            candidates.append(
                {
                    "dim_key": dim["key"],
                    "label": dim["label"],
                    "description": desc,
                    "score": threat_score,
                    "advantage": "opponent",
                }
            )

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates


# ---------------------------------------------------------------------------
# Step 3: Find X-factor
# ---------------------------------------------------------------------------


def _find_xfactor(team_ratings, opp_ratings, team_history, used_dims):
    """
    Find the most interesting wrinkle not covered by matchup/threat.

    Candidates: tempo mismatch, history-defying dimension, a vulnerability
    that won't be tested, etc.
    """
    candidates = []

    # Tempo mismatch
    tempo = _tempo_xfactor(team_ratings, opp_ratings, team_history)
    if tempo and tempo["dim_key"] not in used_dims:
        candidates.append(tempo)

    # Dimensions where history tells a surprising story
    for dim in DIMENSIONS:
        if dim["key"] in used_dims:
            continue

        inv = dim.get("off_inverted", False)

        # Check for "weakness not tested" — team has a vulnerability
        # but this opponent doesn't match the profile
        hist_col = dim.get("history_off_rank")
        if hist_col and team_history:
            analysis = _analyze(team_history, hist_col)
            if analysis and analysis["loss_concentration"] >= 0.5:
                o_off_r = opp_ratings.get(dim["off_rank_key"])
                if o_off_r is not None:
                    o_off_r = int(o_off_r)
                    # For inverted stats (turnovers): low rank = good
                    # (ball-secure). We want opp NOT in the threat profile.
                    # history_off_rank tracks opp rank; top-N threshold.
                    # If opp IS within threshold, the threat IS present.
                    opp_doesnt_match = o_off_r > analysis["threshold"]
                    if opp_doesnt_match:
                        losses = analysis["losses_in_profile"]
                        total = analysis["total_losses"]
                        record = f"{analysis['wins']}-{analysis['losses']}"
                        desc = (
                            f"{losses} of {total} losses came vs "
                            f"top-{analysis['threshold']} "
                            f"{dim.get('history_off_ctx', 'offenses')} "
                            f"({record}) — but opponent is #{o_off_r} "
                            f"in {dim['off_noun']}, so this weakness "
                            f"likely won't be exposed"
                        )
                        candidates.append(
                            {
                                "dim_key": dim["key"],
                                "label": dim["limit_label"],
                                "description": desc,
                                "score": analysis["loss_concentration"],
                                "advantage": "team",
                            }
                        )

        # Check for history-defying performance (team is mediocre at something
        # but historically crushes it)
        hist_col = dim.get("history_def_rank")
        if hist_col and team_history:
            analysis = _analyze(team_history, hist_col)
            if analysis and analysis["delta_diff"] > 8:
                t_off_r = team_ratings.get(dim["off_rank_key"])
                o_def_r = opp_ratings.get(dim["def_rank_key"])
                o_def_v = opp_ratings.get(dim["def_key"])
                if t_off_r is not None and o_def_r is not None and o_def_v is not None:
                    t_off_r = int(t_off_r)
                    o_def_r = int(o_def_r)
                    # Team isn't elite but overperforms
                    team_mediocre = t_off_r < 200 if inv else t_off_r > 50
                    if team_mediocre:
                        dd = analysis["delta_diff"]
                        opp_elite = o_def_r <= 25
                        if opp_elite:
                            desc = (
                                f"#{t_off_r} in {dim['off_noun']}, "
                                f"but has thrived vs elite "
                                f"{dim.get('history_def_ctx', 'defenses')} "
                                f"({analysis['wins']}-{analysis['losses']}, "
                                f"{dd:+.1f} pts vs expected). "
                                f"Opponent is #{o_def_r} — "
                                f"history says they can handle it"
                            )
                        else:
                            desc = (
                                f"#{t_off_r} in {dim['off_noun']}, "
                                f"but overperforms by {dd:+.1f} pts vs "
                                f"top-{analysis['threshold']} "
                                f"{dim.get('history_def_ctx', 'defenses')} "
                                f"({analysis['wins']}-{analysis['losses']}). "
                                f"Opponent is #{o_def_r}"
                            )
                        candidates.append(
                            {
                                "dim_key": dim["key"],
                                "label": dim["label"],
                                "description": desc,
                                "score": dd / 10,
                                "advantage": "neutral",
                            }
                        )

    candidates.sort(key=lambda c: c["score"], reverse=True)
    return candidates


def _tempo_xfactor(team_ratings, opp_ratings, team_history):
    """Tempo mismatch as x-factor."""
    t_tempo = team_ratings.get("kp_adjusted_tempo")
    o_tempo = opp_ratings.get("kp_adjusted_tempo")
    t_rank = team_ratings.get("kp_adjusted_tempo_rank")
    o_rank = opp_ratings.get("kp_adjusted_tempo_rank")

    if not all(v is not None for v in [t_tempo, o_tempo, t_rank, o_rank]):
        return None

    t_tempo, o_tempo = float(t_tempo), float(o_tempo)
    t_rank, o_rank = int(t_rank), int(o_rank)
    diff = abs(t_tempo - o_tempo)

    if diff < 3:
        return None

    if t_tempo > o_tempo:
        label = "Push the Pace"
        desc = (
            f"Plays fast ({t_tempo:.1f} tempo, #{t_rank}) "
            f"— opponent prefers to slow it down ({o_tempo:.1f}, #{o_rank})"
        )
    else:
        label = "Control the Tempo"
        desc = (
            f"Plays slow ({t_tempo:.1f} tempo, #{t_rank}) "
            f"— opponent wants to run ({o_tempo:.1f}, #{o_rank})"
        )

    # Add history
    if team_history:
        if o_tempo > t_tempo:
            analysis = _analyze(team_history, "kp_adjusted_tempo_rank")
            if analysis:
                record = f"{analysis['wins']}-{analysis['losses']}"
                desc += (
                    f". {record} (avg {analysis['avg_margin']:+.1f}) "
                    f"vs top-{analysis['threshold']} fast-paced teams"
                )

    return {
        "dim_key": "tempo",
        "label": label,
        "description": desc,
        "score": min(diff / 8, 1.0),
        "advantage": "neutral",
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def compute_matchup_keys(
    team_ratings: dict,
    opp_ratings: dict,
    num_keys: int = 3,
    team_history: list[dict] | None = None,
) -> list[dict]:
    """
    Compute 3 keys to the game for one team.

    Returns:
    1. Best Matchup — their path to winning (advantage: "team")
    2. Biggest Threat — what could beat them (advantage: "opponent")
    3. X-Factor — the wild card (advantage: varies)
    """
    keys = []
    used_dims = set()

    # 1. Best matchup
    matchups = _find_best_matchup(team_ratings, opp_ratings, team_history)
    if matchups:
        best = matchups[0]
        keys.append(
            {
                "label": best["label"],
                "description": best["description"],
                "impact": round(min(best["score"] / 2.5, 1.0), 4),
                "advantage": "team",
            }
        )
        used_dims.add(best["dim_key"])

    # 2. Biggest threat
    threats = _find_biggest_threat(team_ratings, opp_ratings, team_history)
    for threat in threats:
        if threat["dim_key"] not in used_dims:
            keys.append(
                {
                    "label": threat["label"],
                    "description": threat["description"],
                    "impact": round(min(threat["score"] / 3.0, 1.0), 4),
                    "advantage": "opponent",
                }
            )
            used_dims.add(threat["dim_key"])
            break

    # 3. X-factor
    xfactors = _find_xfactor(team_ratings, opp_ratings, team_history, used_dims)
    if xfactors:
        xf = xfactors[0]
        keys.append(
            {
                "label": xf["label"],
                "description": xf["description"],
                "impact": round(min(xf["score"], 1.0), 4),
                "advantage": xf["advantage"],
            }
        )
        used_dims.add(xf["dim_key"])

    # Fallbacks if we don't have 3
    if len(keys) < num_keys:
        # Try more matchups
        for m in matchups[1:]:
            if m["dim_key"] not in used_dims:
                keys.append(
                    {
                        "label": m["label"],
                        "description": m["description"],
                        "impact": round(min(m["score"] / 2.5, 1.0), 4),
                        "advantage": "team",
                    }
                )
                used_dims.add(m["dim_key"])
                if len(keys) >= num_keys:
                    break

    if len(keys) < num_keys:
        # Try more threats
        for t in threats:
            if t["dim_key"] not in used_dims:
                keys.append(
                    {
                        "label": t["label"],
                        "description": t["description"],
                        "impact": round(min(t["score"] / 3.0, 1.0), 4),
                        "advantage": "opponent",
                    }
                )
                used_dims.add(t["dim_key"])
                if len(keys) >= num_keys:
                    break

    return keys[:num_keys]
