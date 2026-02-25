import { PostgresService } from '../database';

const db = PostgresService.getInstance();

export interface TeamRanks {
	offRating: number;
	defRating: number;
	offDefDiff: number;
	off3ptPct: number;
	off3ptRate: number;
	offEfgPct: number;
	def3ptPct: number;
	def3ptRate: number;
	defEfgPct: number;
	offFtRate: number;
	defFtRate: number;
	offAstPct: number;
	defAstPct: number;
	offToPct: number;
	defToPct: number;
	offRebRate: number;
	defRebRate: number;
	offKillshots: number;
	defKillshots: number;
	tempo: number;
}

export type RanksMap = Record<string, TeamRanks>;

export async function getTeamRanksMap(): Promise<RanksMap> {
	const [btRows, compRows, espnRows, emRows, kpRows] = await Promise.all([
		db.query<{
			team_key: string;
			'3p_pct_rank': number;
			'3pr_rank': number;
			'3p_pct_d_rank': number;
			'3prd_rank': number;
			ftr_rank: number;
			ftrd_rank: number;
			tor_rank: number;
			tord_rank: number;
			orb_rank: number;
			drb_rank: number;
			efg_pct_rank: number;
			efgd_pct_rank: number;
		}>(
			`SELECT team_key,
				"3p_pct_rank", "3pr_rank", "3p_pct_d_rank", "3prd_rank",
				ftr_rank, ftrd_rank, tor_rank, tord_rank, orb_rank, drb_rank,
				efg_pct_rank, efgd_pct_rank
			FROM barttorvik_rankings
			WHERE date = (SELECT MAX(date) FROM barttorvik_rankings)`
		),
		db.query<{
			team_key: string;
			avg_offensive_zscore_rank: number;
			avg_defensive_zscore_rank: number;
		}>(
			`SELECT team_key, avg_offensive_zscore_rank, avg_defensive_zscore_rank
			FROM composite_rankings
			WHERE date = (SELECT MAX(date) FROM composite_rankings)
				AND sources = 'kp,em,bt,net'`
		),
		db.query<{
			team_key: string;
			off_assist_percentage_rank: number;
			opp_off_assist_percentage_rank: number;
		}>(
			`SELECT team_key, off_assist_percentage_rank, opp_off_assist_percentage_rank
			FROM espn_stats
			WHERE season = (SELECT MAX(season) FROM espn_stats)`
		),
		db.query<{
			team_key: string;
			kill_shots_per_game_rank: number;
			kill_shots_conceded_per_game_rank: number;
		}>(
			`SELECT team_key, kill_shots_per_game_rank, kill_shots_conceded_per_game_rank
			FROM evanmiya_rankings
			WHERE date = (SELECT MAX(date) FROM evanmiya_rankings)`
		),
		db.query<{
			team_key: string;
			adjusted_tempo_rank: number;
		}>(
			`SELECT team_key, adjusted_tempo_rank
			FROM kenpom_rankings
			WHERE date = (SELECT MAX(date) FROM kenpom_rankings)`
		)
	]);

	const map: RanksMap = {};

	for (const bt of btRows) {
		map[bt.team_key] = {
			offRating: 0,
			defRating: 0,
			offDefDiff: 0,
			off3ptPct: bt['3p_pct_rank'],
			off3ptRate: bt['3pr_rank'],
			offEfgPct: bt.efg_pct_rank,
			def3ptPct: bt['3p_pct_d_rank'],
			def3ptRate: bt['3prd_rank'],
			defEfgPct: bt.efgd_pct_rank,
			offFtRate: bt.ftr_rank,
			defFtRate: bt.ftrd_rank,
			offAstPct: 0,
			defAstPct: 0,
			offToPct: bt.tor_rank,
			defToPct: bt.tord_rank,
			offRebRate: bt.orb_rank,
			defRebRate: bt.drb_rank,
			offKillshots: 0,
			defKillshots: 0,
			tempo: 0
		};
	}

	for (const comp of compRows) {
		if (map[comp.team_key]) {
			map[comp.team_key].offRating = comp.avg_offensive_zscore_rank;
			map[comp.team_key].defRating = comp.avg_defensive_zscore_rank;
			map[comp.team_key].offDefDiff = comp.avg_offensive_zscore_rank - comp.avg_defensive_zscore_rank;
		}
	}

	for (const espn of espnRows) {
		if (map[espn.team_key]) {
			map[espn.team_key].offAstPct = espn.off_assist_percentage_rank;
			map[espn.team_key].defAstPct = espn.opp_off_assist_percentage_rank;
		}
	}

	for (const em of emRows) {
		if (map[em.team_key]) {
			map[em.team_key].offKillshots = em.kill_shots_per_game_rank;
			map[em.team_key].defKillshots = em.kill_shots_conceded_per_game_rank;
		}
	}

	for (const kp of kpRows) {
		if (map[kp.team_key]) {
			map[kp.team_key].tempo = kp.adjusted_tempo_rank;
		}
	}

	return map;
}
