import { PostgresService } from '../database';
import { KenPomRanking } from './kenpom';
import { EvanMiyaRanking } from './evanmiya';
import { BartTorvikRanking } from './barttorvik';
import { NetRanking } from './net';
import { mapBaseTeams } from './utils';
import { computeAverageZScores, sourceSystems } from '../shared';

const db = PostgresService.getInstance();

export interface CompositeRankings {
	id: string;
	date: string;
	team_key: string;
	rating_zscore: number;
	rating_zscore_rank: number;
	offensive_zscore: number;
	offensive_zscore_rank: number;
	defensive_zscore: number;
	defensive_zscore_rank: number;
	created_at: string;
	updated_at: string;
}

export async function updateComposite() {
	function getQuery(table: string) {
		return `
			SELECT * FROM ${table}
			WHERE date = (SELECT MAX(date) FROM ${table})
			ORDER BY rank;
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

	const baseTeamData = mapBaseTeams(kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings);

	const compiledTeams = computeAverageZScores(baseTeamData);

	const COMP_QUERY = `
		INSERT INTO composite_rankings (
			team_key,
			rating_zscore, rating_zscore_rank,
			offensive_zscore, offensive_zscore_rank,
			defensive_zscore, defensive_zscore_rank
		) VALUES (
			$1,
			$2, $3,
			$4, $5,
			$6, $7
		)
		ON CONFLICT (team_key, date) DO UPDATE SET
			rating_zscore = EXCLUDED.rating_zscore, rating_zscore_rank = EXCLUDED.rating_zscore_rank,
			offensive_zscore = EXCLUDED.offensive_zscore, offensive_zscore_rank = EXCLUDED.offensive_zscore_rank,
			defensive_zscore = EXCLUDED.defensive_zscore, defensive_zscore_rank = EXCLUDED.defensive_zscore_rank
	`;

	await db.transaction(
		compiledTeams.map(t => ({
			query: COMP_QUERY,
			params: [
				t.team_key,
				t.avg_zscore,
				t.avg_zscore_rank,
				t.avg_offensive_zscore,
				t.avg_offensive_zscore_rank,
				t.avg_defensive_zscore,
				t.avg_defensive_zscore_rank
			]
		}))
	);

	console.log(`RANKINGS FETCH: Composite rankings successfully updated.`);
}
