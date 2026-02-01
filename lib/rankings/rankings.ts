import { chromium } from 'playwright';
import { BartTorvikRanking, updateBartTorvik } from './barttorvik';
import { CompositeRankings, updateComposite } from './composite';
import { EvanMiyaRanking, updateEvanMiya } from './evanmiya';
import { KenPomRanking, updateKenPom } from './kenpom';
import { NetRanking, updateNet } from './net';
import { PostgresService } from '../database';
import { calculateZScores, mapBaseTeams } from './utils';
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
		rankings.map(
			r =>
				new Promise(async (res, rej) => {
					try {
						await rankingsMap[r](browser);
					} catch (e: any) {
						console.log(`RANKINGS FETCH: Error fetching ${r} rankings: ${e.toString()}`);
					}
				})
		)
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
