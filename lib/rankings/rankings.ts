import { chromium } from 'playwright';
import { PostgresService } from '../database';
import { ApPollTeam, getApPollRankings } from '../espn/ap-poll';
import { getAllTeamData, TeamData } from '../espn/espn-team-data';
import { CompiledTeamData, computeAverageZScores } from '../shared';
import { BartTorvikRanking, updateBartTorvik } from './barttorvik';
import { CompositeRanking, updateComposite } from './composite';
import { EvanMiyaRanking, updateEvanMiya } from './evanmiya';
import { KenPomRanking, updateKenPom } from './kenpom';
import { NetRanking, updateNet } from './net';
import { mapBaseTeams } from './utils';

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
	const context = await browser.newContext({
		userAgent:
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
	});
	await context.addInitScript(() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => false });
		Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
		Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
		(window as any).chrome = { runtime: {} };
	});

	await Promise.all(
		rankings.map(async r => {
			try {
				await rankingsMap[r](context);
			} catch (e: any) {
				console.log(`RANKINGS FETCH: Error fetching ${r} rankings: ${e.toString()}`);
			}
		})
	);

	await context.close();
	await browser.close();

	try {
		await updateComposite();
	} catch (e: any) {
		console.log(`RANKINGS FETCH: Error updating composite rankings: ${e.toString()}`);
	}

	console.log(`RANKINGS FETCH: Finished fetching rankings.`);
}

export async function getRankings(): Promise<CompiledTeamData[]> {
	const start = performance.now();
	function getQuery(table: string) {
		return `
			SELECT * FROM ${table}
			WHERE date = (SELECT MAX(date) FROM ${table})
			ORDER BY team_key;
		`;
	}

	const [kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, compositeRankings, apRankings, teamData]: [
		KenPomRanking[],
		EvanMiyaRanking[],
		BartTorvikRanking[],
		NetRanking[],
		CompositeRanking[],
		ApPollTeam[],
		Record<string, TeamData>
	] = await Promise.all([
		db.query(getQuery('kenpom_rankings')),
		db.query(getQuery('evanmiya_rankings')),
		db.query(getQuery('barttorvik_rankings')),
		db.query(getQuery('net_rankings')),
		db.query(getQuery('composite_rankings')),
		getApPollRankings(),
		getAllTeamData()
	]);

	const baseTeams = mapBaseTeams(kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, apRankings);

	let teams = computeAverageZScores(baseTeams);

	const compositeMap = compositeRankings.reduce<Record<string, Record<string, CompositeRanking>>>(
		(groups, curr) => ({
			...groups,
			[curr.team_key]: { ...groups[curr.team_key], [curr.sources]: curr }
		}),
		{}
	);

	teams = teams.map(t => ({ ...t, composite_combos: compositeMap[t.team_key], metadata: teamData[t.team_key] }));

	console.log(`getRankings took ${Math.round(performance.now() - start)}ms`);
	return teams;
}
