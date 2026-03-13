import { PostgresService } from '@/lib/database';
import { NextRequest, NextResponse } from 'next/server';

const db = PostgresService.getInstance();

export async function GET(request: NextRequest) {
	const teams = request.nextUrl.searchParams.get('teams');
	if (!teams) {
		return NextResponse.json({ error: 'Missing teams param' }, { status: 400 });
	}

	const teamKeys = teams.split(',').slice(0, 10); // cap at 10

	try {
		const rows = await db.query<any>(
			`SELECT
				k.team_key,
				k.rank AS kp_rank,
				k.offensive_rating AS kp_offensive_rating,
				k.defensive_rating AS kp_defensive_rating,
				c.avg_zscore_rank AS comp_avg_zscore_rank,
				c.avg_offensive_zscore_rank AS comp_avg_offensive_zscore_rank,
				c.avg_defensive_zscore_rank AS comp_avg_defensive_zscore_rank,
				b.efg_pct AS bt_efg_pct, b.efg_pct_rank AS bt_efg_pct_rank,
				b.efgd_pct AS bt_efgd_pct, b.efgd_pct_rank AS bt_efgd_pct_rank,
				b."2p_pct" AS bt_2p_pct, b."2p_pct_rank" AS bt_2p_pct_rank,
				b."2p_pct_d" AS bt_2p_pct_d, b."2p_pct_d_rank" AS bt_2p_pct_d_rank,
				b."3p_pct" AS bt_3p_pct, b."3p_pct_rank" AS bt_3p_pct_rank,
				b."3p_pct_d" AS bt_3p_pct_d, b."3p_pct_d_rank" AS bt_3p_pct_d_rank,
				b."3pr" AS bt_3pr, b."3pr_rank" AS bt_3pr_rank,
				b."3prd" AS bt_3prd, b."3prd_rank" AS bt_3prd_rank,
				b.ftr AS bt_ftr, b.ftr_rank AS bt_ftr_rank,
				b.ftrd AS bt_ftrd, b.ftrd_rank AS bt_ftrd_rank,
				b.tor AS bt_tor, b.tor_rank AS bt_tor_rank,
				b.tord AS bt_tord, b.tord_rank AS bt_tord_rank,
				b.orb AS bt_orb, b.orb_rank AS bt_orb_rank,
				b.drb AS bt_drb, b.drb_rank AS bt_drb_rank,
				e.off_assist_percentage AS espn_off_assist_percentage,
				e.off_assist_percentage_rank AS espn_off_assist_percentage_rank,
				e.opp_off_assist_percentage AS espn_opp_off_assist_percentage,
				e.opp_off_assist_percentage_rank AS espn_opp_off_assist_percentage_rank,
				em.kill_shots_per_game AS em_kill_shots_per_game,
				em.kill_shots_per_game_rank AS em_kill_shots_per_game_rank,
				em.kill_shots_conceded_per_game AS em_kill_shots_conceded_per_game,
				em.kill_shots_conceded_per_game_rank AS em_kill_shots_conceded_per_game_rank
			FROM kenpom_rankings k
			LEFT JOIN composite_rankings c ON c.team_key = k.team_key
				AND c.sources = 'kp,em,bt'
				AND c.date = (SELECT MAX(date) FROM composite_rankings WHERE sources = 'kp,em,bt')
				AND c.season = (SELECT MAX(season) FROM composite_rankings WHERE sources = 'kp,em,bt')
			LEFT JOIN barttorvik_rankings b ON b.team_key = k.team_key
				AND b.date = (SELECT MAX(date) FROM barttorvik_rankings)
				AND b.season = (SELECT MAX(season) FROM barttorvik_rankings)
			LEFT JOIN espn_stats e ON e.team_key = k.team_key
				AND e.season = (SELECT MAX(season) FROM espn_stats)
			LEFT JOIN evanmiya_rankings em ON em.team_key = k.team_key
				AND em.date = (SELECT MAX(date) FROM evanmiya_rankings)
				AND em.season = (SELECT MAX(season) FROM evanmiya_rankings)
			WHERE k.team_key = ANY($1)
				AND k.date = (SELECT MAX(date) FROM kenpom_rankings)
				AND k.season = (SELECT MAX(season) FROM kenpom_rankings)`,
			[teamKeys]
		);

		const result: Record<string, any> = {};
		for (const row of rows) {
			result[row.team_key] = row;
		}

		return NextResponse.json(result);
	} catch (err) {
		console.error('Team ratings error:', err);
		return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
	}
}
