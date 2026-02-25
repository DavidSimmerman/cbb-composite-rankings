import { PostgresService } from '../database';
import { ApPollTeam } from '../espn/ap-poll';
import { getPartialGame } from '../espn/espn-game';
import { EspnStats } from '../espn/espn-stats';
import { EspnGame, getSchedule, getScheduleEnriched, ParsedEspnGame } from '../espn/schedule';
import { BartTorvikRanking } from './barttorvik';
import { CompositeRanking } from './composite';
import { EvanMiyaRanking } from './evanmiya';
import { KenPomRanking } from './kenpom';
import { NetRanking } from './net';

const db = PostgresService.getInstance();

type Prefix<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}_${K}` : never]: T[K];
};

type SystemFields = 'id' | 'date' | 'created_at' | 'updated_at' | 'team_key';

export type FullRatings = Prefix<Omit<KenPomRanking, SystemFields>, 'kp'> &
	Prefix<Omit<EvanMiyaRanking, SystemFields>, 'em'> &
	Prefix<Omit<BartTorvikRanking, SystemFields>, 'bt'> &
	Prefix<Omit<NetRanking, SystemFields>, 'net'> &
	Prefix<Omit<ApPollTeam, SystemFields>, 'ap'> &
	Prefix<Omit<CompositeRanking, SystemFields>, 'comp'> &
	Prefix<Omit<EspnStats, SystemFields>, 'espn'> & { ap_rank: number | undefined };

interface TeamProfileRow {
	team_key: string;
	date: string;
}

interface KenPomProfileRow extends TeamProfileRow {
	kp_rating: number;
	kp_rating_zscore: number;
	kp_rating_rank: number;
	kp_offensive_rating: number;
	kp_offensive_zscore: number;
	kp_offensive_rating_rank: number;
	kp_defensive_rating: number;
	kp_defensive_zscore: number;
	kp_defensive_rating_rank: number;
}

interface EvanMiyaProfileRow extends TeamProfileRow {
	team_name?: string;
	em_rating: number;
	em_rating_zscore: number;
	em_rating_rank: number;
	em_offensive_rating: number;
	em_offensive_zscore: number;
	em_offensive_rating_rank: number;
	em_defensive_rating: number;
	em_defensive_zscore: number;
	em_defensive_rating_rank: number;
}

interface BartTorvikProfileRow extends TeamProfileRow {
	bt_rating: number;
	bt_rating_zscore: number;
	bt_rating_rank: number;
	bt_offensive_rating: number;
	bt_offensive_zscore: number;
	bt_offensive_rating_rank: number;
	bt_defensive_rating: number;
	bt_defensive_zscore: number;
	bt_defensive_rating_rank: number;
}

interface NetProfileRow extends TeamProfileRow {
	net_rank: number;
	net_rank_zscore: number;
}

interface CompositeProfileRow extends TeamProfileRow {
	avg_zscore: number;
	avg_zscore_rank: number;
	avg_offensive_zscore: number;
	avg_offensive_zscore_rank: number;
	avg_defensive_zscore: number;
	avg_defensive_zscore_rank: number;
	sources: string;
}

type TeamProfileData = KenPomProfileRow &
	EvanMiyaProfileRow &
	BartTorvikProfileRow &
	NetProfileRow &
	CompositeProfileRow & { composite_combos: Record<string, CompositeProfileRow> };

export type ProfileRatingsHistory = Record<string, TeamProfileData>;

export type ParsedTeamProfile = Omit<TeamProfile, 'schedule'> & { schedule: ParsedEspnGame[] };

export interface TeamProfile {
	team_key: string;
	team_name: string;
	ratings_history: ProfileRatingsHistory;
	full_ratings: Record<string, FullRatings>;
	schedule: EspnGame[];
}

async function getFullRatings(teamKey: string) {
	function getQuery(table: string, columns: string) {
		return `SELECT ${columns} FROM ${table}
            WHERE team_key = $1
            	AND date = (SELECT MAX(date) FROM ${table})
			ORDER BY season DESC`;
	}

	const [kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, compositeRankings, apRankings, espnStats] = await Promise.all([
		db.query(
			getQuery(
				'kenpom_rankings',
				`season, win_loss, offensive_rating, defensive_rating,
				adjusted_tempo, adjusted_tempo_rank,
				sos_offensive_rating, sos_offensive_rating_rank,
				sos_defensive_rating, sos_defensive_rating_rank`
			),
			[teamKey]
		),
		db.query(
			getQuery(
				'evanmiya_rankings',
				`kill_shots_per_game, kill_shots_per_game_rank,
				kill_shots_conceded_per_game, kill_shots_conceded_per_game_rank`
			),
			[teamKey]
		),
		db.query(
			getQuery(
				'barttorvik_rankings',
				`efg_pct, efg_pct_rank, efgd_pct, efgd_pct_rank,
				tor, tor_rank, tord, tord_rank,
				orb, orb_rank, drb, drb_rank,
				ftr, ftr_rank, ftrd, ftrd_rank,
				"2p_pct", "2p_pct_rank", "2p_pct_d", "2p_pct_d_rank",
				"3p_pct", "3p_pct_rank", "3p_pct_d", "3p_pct_d_rank",
				"3pr", "3pr_rank", "3prd", "3prd_rank"`
			),
			[teamKey]
		),
		db.query(getQuery('net_rankings', 'conf'), [teamKey]),
		db.query(
			getQuery('composite_rankings', 'avg_offensive_zscore_rank, avg_defensive_zscore_rank'),
			[teamKey]
		),
		db.query(getQuery('ap_rankings', 'rank'), [teamKey]),
		db.query(
			`SELECT season,
				off_field_goal_pct, off_three_point_field_goal_pct,
				off_free_throw_pct, off_free_throw_pct_rank,
				off_assist_percentage, off_assist_percentage_rank,
				off_scoring_efficiency, off_scoring_efficiency_rank,
				avg_fouls, avg_fouls_rank,
				opp_avg_fouls, opp_avg_fouls_rank,
				opp_off_field_goal_pct, opp_off_field_goal_pct_rank,
				opp_off_three_point_field_goal_pct, opp_off_free_throw_pct,
				opp_off_assist_percentage, opp_off_assist_percentage_rank,
				opp_off_avg_turnovers, opp_off_avg_turnovers_rank,
				opp_off_scoring_efficiency, opp_off_scoring_efficiency_rank,
				opp_off_avg_points, opp_off_avg_points_rank,
				def_avg_steals, def_avg_steals_rank,
				def_avg_blocks, def_avg_blocks_rank,
				assist_turnover_ratio, assist_turnover_ratio_rank
			FROM espn_stats WHERE team_key = $1 ORDER BY season DESC`,
			[teamKey]
		)
	]);

	const fullRatings: Record<string, FullRatings> = {};

	kenPomRankings.map((kpValues, i) => {
		const fullSeason: Record<string, any> = {};

		Object.entries(kpValues).forEach(([key, value]) => (fullSeason['kp_' + key] = value));
		Object.entries(evanMiyaRankings[i]).forEach(([key, value]) => (fullSeason['em_' + key] = value));
		Object.entries(bartTorvikRankings[i]).forEach(([key, value]) => (fullSeason['bt_' + key] = value));
		Object.entries(compositeRankings[i]).forEach(([key, value]) => (fullSeason['comp_' + key] = value));
		Object.entries(espnStats[i]).forEach(([key, value]) => (fullSeason['espn_' + key] = value));
		if (netRankings[i]) {
			Object.entries(netRankings[i]).forEach(([key, value]) => (fullSeason['net_' + key] = value));
		}
		if (apRankings[i]) {
			Object.entries(apRankings[i]).forEach(([key, value]) => (fullSeason['ap_' + key] = value));
		}

		fullRatings[kpValues.season] = fullSeason as FullRatings;
	});

	return fullRatings;
}

export async function getTeamProfile(teamKey: string, options?: { enrichedSchedule?: boolean }): Promise<TeamProfile> {
	const start = performance.now();
	function getQuery(
		table: string,
		keys: Partial<
			Record<
				keyof KenPomRanking | keyof EvanMiyaRanking | keyof BartTorvikRanking | keyof NetRanking | keyof CompositeRanking,
				string
			>
		>
	) {
		const query = `
			SELECT
				team_key,
				date,
				${Object.entries(keys)
					.map(([k, v]) => `${k} as ${v}`)
					.join(',\n')}
			FROM ${table}
			WHERE team_key = $1
				AND date >= NOW() - INTERVAL '30 days'
				AND team_key = $1
			ORDER BY date ASC
		`;

		return query;
	}

	const [fullRankings, kenpomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, compositeRankings, schedule]: [
		Record<string, FullRatings>,
		KenPomProfileRow[],
		EvanMiyaProfileRow[],
		BartTorvikProfileRow[],
		NetProfileRow[],
		CompositeProfileRow[],
		EspnGame[]
	] = await Promise.all([
		getFullRatings(teamKey),
		db.query<KenPomProfileRow>(
			getQuery('kenpom_rankings', {
				net_rating: 'kp_rating',
				net_rating_zscore: 'kp_rating_zscore',
				rank: 'kp_rating_rank',
				offensive_rating: 'kp_offensive_rating',
				offensive_rating_zscore: 'kp_offensive_zscore',
				offensive_rating_rank: 'kp_offensive_rating_rank',
				defensive_rating: 'kp_defensive_rating',
				defensive_rating_zscore: 'kp_defensive_zscore',
				defensive_rating_rank: 'kp_defensive_rating_rank'
			}),
			[teamKey]
		),
		db.query<EvanMiyaProfileRow>(
			getQuery('evanmiya_rankings', {
				team: 'team_name',
				relative_rating: 'em_rating',
				relative_rating_zscore: 'em_rating_zscore',
				relative_ranking: 'em_rating_rank',
				o_rate: 'em_offensive_rating',
				o_rate_zscore: 'em_offensive_zscore',
				off_rank: 'em_offensive_rating_rank',
				d_rate: 'em_defensive_rating',
				d_rate_zscore: 'em_defensive_zscore',
				def_rank: 'em_defensive_rating_rank'
			}),
			[teamKey]
		),
		db.query<BartTorvikProfileRow>(
			getQuery('barttorvik_rankings', {
				barthag: 'bt_rating',
				barthag_zscore: 'bt_rating_zscore',
				barthag_rank: 'bt_rating_rank',
				adjoe: 'bt_offensive_rating',
				adjoe_zscore: 'bt_offensive_zscore',
				adjoe_rank: 'bt_offensive_rating_rank',
				adjde: 'bt_defensive_rating',
				adjde_zscore: 'bt_defensive_zscore',
				adjde_rank: 'bt_defensive_rating_rank'
			}),
			[teamKey]
		),
		db.query<NetProfileRow>(
			getQuery('net_rankings', {
				rank: 'net_rank',
				rank_zscore: 'net_rank_zscore'
			}),
			[teamKey]
		),
		db.query<CompositeProfileRow>(
			getQuery('composite_rankings', {
				avg_zscore: 'avg_zscore',
				avg_zscore_rank: 'avg_zscore_rank',
				avg_offensive_zscore: 'avg_offensive_zscore',
				avg_offensive_zscore_rank: 'avg_offensive_zscore_rank',
				avg_defensive_zscore: 'avg_defensive_zscore',
				avg_defensive_zscore_rank: 'avg_defensive_zscore_rank',
				sources: 'sources'
			}),
			[teamKey]
		),
		options?.enrichedSchedule ? getScheduleEnriched(teamKey) : getSchedule(teamKey)
	]);

	const teamName = evanMiyaRankings[0].team_name!;
	evanMiyaRankings.forEach(r => delete r['team_name']);

	const ratings_history = kenpomRankings.reduce<Record<string, TeamProfileData>>((map, kp) => {
		const date = kp.date;

		const compositeMap: Record<string, CompositeProfileRow> = {};

		compositeRankings.forEach(r => {
			if (r.date !== date) {
				return;
			}

			compositeMap[r.sources] = r;
		});

		map[date] = {
			...kp,
			...evanMiyaRankings.find(r => r.date === date),
			...bartTorvikRankings.find(r => r.date === date),
			...netRankings.find(r => r.date === date),
			...compositeMap['kp,em,bt,net'],
			composite_combos: compositeMap
		} as TeamProfileData;
		return map;
	}, {});

	if (!options?.enrichedSchedule) {
		await Promise.all(
			schedule
				.filter(g => g.is_live)
				.map(async g => {
					const game = await getPartialGame(g.game_id);
					const teamSide = Object.values(game.teams).find(t => t.team_key === teamKey);
					const oppSide = Object.values(game.teams).find(t => t.team_key !== teamKey);
					g.live_score = {
						teamScore: teamSide?.score ?? 0,
						oppScore: oppSide?.score ?? 0
					};
				})
		);
	}

	console.log(`getTeamProfile(${teamKey}) took ${Math.round(performance.now() - start)}ms`);
	return { team_key: teamKey, team_name: teamName, full_ratings: fullRankings, ratings_history, schedule };
}
