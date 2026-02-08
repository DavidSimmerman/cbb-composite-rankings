import { PostgresService } from '../database';
import { KenPomRanking } from './kenpom';
import { EvanMiyaRanking } from './evanmiya';
import { BartTorvikRanking } from './barttorvik';
import { NetRanking } from './net';
import { mapBaseTeams } from './utils';
import { computeAverageZScores, SourceSystem, sourceSystems } from '../shared';

const db = PostgresService.getInstance();

export interface CompositeRanking {
	id: string;
	date: string;
	team_key: string;
	avg_zscore: number;
	avg_zscore_rank: number;
	avg_offensive_zscore: number;
	avg_offensive_zscore_rank: number;
	avg_defensive_zscore: number;
	avg_defensive_zscore_rank: number;
	sources: string;
	created_at: string;
	updated_at: string;
}

export async function updateComposite() {
	function getQuery(table: string) {
		return `
			SELECT * FROM ${table}
			WHERE date = (SELECT MAX(date) FROM ${table});
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

	const COMP_QUERY = `
		INSERT INTO composite_rankings (
			team_key,
			avg_zscore, avg_zscore_rank,
			avg_offensive_zscore, avg_offensive_zscore_rank,
			avg_defensive_zscore, avg_defensive_zscore_rank,
			sources
		) VALUES (
			$1,
			$2, $3,
			$4, $5,
			$6, $7,
			$8
		)
		ON CONFLICT (date, team_key, sources) DO UPDATE SET
			avg_zscore = EXCLUDED.avg_zscore, avg_zscore_rank = EXCLUDED.avg_zscore_rank,
			avg_offensive_zscore = EXCLUDED.avg_offensive_zscore, avg_offensive_zscore_rank = EXCLUDED.avg_offensive_zscore_rank,
			avg_defensive_zscore = EXCLUDED.avg_defensive_zscore, avg_defensive_zscore_rank = EXCLUDED.avg_defensive_zscore_rank,
			sources = EXCLUDED.sources
	`;

	const allQueries = getAllSourceCombos().flatMap(sourceList => {
		const compiledTeams = computeAverageZScores(baseTeamData, sourceList);
		return compiledTeams.map(t => ({
			query: COMP_QUERY,
			params: [
				t.team_key,
				t.avg_zscore,
				t.avg_zscore_rank,
				t.avg_offensive_zscore,
				t.avg_offensive_zscore_rank,
				t.avg_defensive_zscore,
				t.avg_defensive_zscore_rank,
				sourceList.map(s => s.key.replaceAll(/[a-z]+/g, '').toLocaleLowerCase()).join(',')
			]
		}));
	});

	await db.transaction(allQueries);

	console.log(`RANKINGS FETCH: Composite rankings successfully updated.`);
}

function getAllSourceCombos() {
	let output: SourceSystem[][] = [[]];

	for (const s of sourceSystems) {
		output = [...output, ...output.map(combo => [...combo, s])];
	}

	return output.filter(combo => combo.length > 0);
}
