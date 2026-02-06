import { chromium } from 'playwright';
import { BartTorvikRanking, updateBartTorvik } from './barttorvik';
import { CompositeRanking, updateComposite } from './composite';
import { EvanMiyaRanking, updateEvanMiya } from './evanmiya';
import { KenPomRanking, updateKenPom } from './kenpom';
import { NetRanking, updateNet } from './net';
import { PostgresService } from '../database';
import { mapBaseTeams } from './utils';
import { computeAverageZScores } from '../shared';

const db = PostgresService.getInstance();

const rankingsMap = {
	kenpom: updateKenPom,
	evanmiya: updateEvanMiya,
	barttorvik: updateBartTorvik,
	net: updateNet
};

type Ranking = keyof typeof rankingsMap;

export async function updateRankings(rankings: Ranking[]) {
	console.log(`RANKINGS FETCH: Starting fetching rankings for ${rankings.join(',')}.`);

	const browser = await chromium.launch();

	await Promise.all(
		rankings.map(async r => {
			try {
				await rankingsMap[r](browser);
			} catch (e: any) {
				console.log(`RANKINGS FETCH: Error fetching ${r} rankings: ${e.toString()}`);
			}
		})
	);

	await browser.close();

	await updateComposite();

	console.log(`RANKINGS FETCH: Finished fetching rankings.`);
}

export async function getRankings() {
	function getQuery(table: string) {
		return `
			SELECT * FROM ${table}
			WHERE date = (SELECT MAX(date) FROM ${table})
			ORDER BY team_key;
		`;
	}

	const [kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings]: [
		KenPomRanking[],
		EvanMiyaRanking[],
		BartTorvikRanking[],
		NetRanking[]
	] = await Promise.all([
		db.query(getQuery('kenpom_rankings')),
		db.query(getQuery('evanmiya_rankings')),
		db.query(getQuery('barttorvik_rankings')),
		db.query(getQuery('net_rankings'))
	]);

	const baseTeams = mapBaseTeams(kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings);

	const teams = computeAverageZScores(baseTeams);

	return teams;
}

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
}

type TeamProfileData = KenPomProfileRow & EvanMiyaProfileRow & BartTorvikProfileRow & NetProfileRow & CompositeProfileRow;

export type ProfileRatingsHistory = Record<string, TeamProfileData>;

export interface TeamProfile {
	team_key: string;
	team_name: string;
	ratings_history: ProfileRatingsHistory;
}

export async function getTeamProfile(teamKey: string): Promise<TeamProfile> {
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
				AND date >= NOW() - INTERVAL '14 days'
				AND team_key = $1
			ORDER BY date ASC
		`;

		return query;
	}

	const [kenpomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, compositeRankings]: [
		KenPomProfileRow[],
		EvanMiyaProfileRow[],
		BartTorvikProfileRow[],
		NetProfileRow[],
		CompositeProfileRow[]
	] = await Promise.all([
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
				avg_defensive_zscore_rank: 'avg_defensive_zscore_rank'
			}),
			[teamKey]
		)
	]);

	const teamName = evanMiyaRankings[0].team_name!;
	evanMiyaRankings.forEach(r => delete r['team_name']);

	const ratings_history = kenpomRankings.reduce<Record<string, TeamProfileData>>((map, kp) => {
		const date = kp.date;

		map[date] = {
			...kp,
			...evanMiyaRankings.find(r => r.date === date),
			...bartTorvikRankings.find(r => r.date === date),
			...netRankings.find(r => r.date === date),
			...compositeRankings.find(r => r.date === date)
		} as TeamProfileData;
		return map;
	}, {});

	return { team_key: teamKey, team_name: teamName, ratings_history };
}
