import { NextResponse } from 'next/server';
import { PostgresService } from '@/lib/database';
import { KenPomRanking } from '@/lib/rankings/kenpom';
import { EvanMiyaRanking } from '@/lib/rankings/evanmiya';
import { BartTorvikRanking } from '@/lib/rankings/barttorvik';
import { NetRanking } from '@/lib/rankings/net';
import { mapBaseTeams } from '@/lib/rankings/utils';
import { computeAverageZScores, SourceSystem, sourceSystems } from '@/lib/shared';

const db = PostgresService.getInstance();

function groupByDate<T extends { date: string }>(rows: T[]): Record<string, T[]> {
	const map: Record<string, T[]> = {};
	for (const row of rows) {
		(map[row.date] ??= []).push(row);
	}
	return map;
}

function getAllSourceCombos() {
	let output: SourceSystem[][] = [[]];

	for (const s of sourceSystems) {
		output = [...output, ...output.map(combo => [...combo, s])];
	}

	return output.filter(combo => combo.length > 0);
}

export async function GET() {
	try {
		const [allKp, allEm, allBt, allNet]: [KenPomRanking[], EvanMiyaRanking[], BartTorvikRanking[], NetRanking[]] =
			await Promise.all([
				db.query(`SELECT * FROM kenpom_rankings ORDER BY date`),
				db.query(`SELECT * FROM evanmiya_rankings ORDER BY date`),
				db.query(`SELECT * FROM barttorvik_rankings ORDER BY date`),
				db.query(`SELECT * FROM net_rankings ORDER BY date`)
			]);

		const kpByDate = groupByDate(allKp);
		const emByDate = groupByDate(allEm);
		const btByDate = groupByDate(allBt);
		const netByDate = groupByDate(allNet);

		const dates = Object.keys(kpByDate).filter(d => emByDate[d] && btByDate[d] && netByDate[d]);
		const sourceCombos = getAllSourceCombos();

		const allQueries: { query: string; params: any[] }[] = [];

		for (const date of dates) {
			const baseTeams = mapBaseTeams(kpByDate[date], emByDate[date], btByDate[date], netByDate[date]);

			for (const sourceList of sourceCombos) {
				const compiled = computeAverageZScores(baseTeams, sourceList);

				for (const t of compiled) {
					allQueries.push({
						query: `
							INSERT INTO composite_rankings (
								team_key, date,
								avg_zscore, avg_zscore_rank,
								avg_offensive_zscore, avg_offensive_zscore_rank,
								avg_defensive_zscore, avg_defensive_zscore_rank,
								sources
							) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
							ON CONFLICT (date, team_key, sources) DO UPDATE SET
								avg_zscore = EXCLUDED.avg_zscore, avg_zscore_rank = EXCLUDED.avg_zscore_rank,
								avg_offensive_zscore = EXCLUDED.avg_offensive_zscore, avg_offensive_zscore_rank = EXCLUDED.avg_offensive_zscore_rank,
								avg_defensive_zscore = EXCLUDED.avg_defensive_zscore, avg_defensive_zscore_rank = EXCLUDED.avg_defensive_zscore_rank
						`,
						params: [
							t.team_key,
							date,
							t.avg_zscore,
							t.avg_zscore_rank,
							t.avg_offensive_zscore,
							t.avg_offensive_zscore_rank,
							t.avg_defensive_zscore,
							t.avg_defensive_zscore_rank,
							sourceList.map(s => s.key.replaceAll(/[a-z]+/g, '').toLocaleLowerCase()).join(',')
						]
					});
				}
			}
		}

		await db.transaction(allQueries);

		return NextResponse.json({ msg: `Successfully backfilled composite rankings for ${dates.length} dates across ${sourceCombos.length} source combos.` });
	} catch (err: any) {
		console.error('BACKFILL ERROR:', err);
		return NextResponse.json({ error: err.toString() }, { status: 500 });
	}
}
