import { chromium } from 'playwright';
import { PostgresService } from '../database';
import { ApPollTeam, getApPollRankings } from '../espn/ap-poll';
import { getAllTeamData, TeamData } from '../espn/espn-team-data';
import { CompiledTeamData, computeAverageZScores } from '../shared';
import { updateBartTorvik } from './barttorvik';
import { CompositeRanking, updateComposite } from './composite';
import { updateEvanMiya } from './evanmiya';
import { updateKenPom } from './kenpom';
import { updateNet } from './net';
import { getSeasonSnapshot, SeasonSnapshot } from './snapshot';
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

/** Every team's compiled ratings for a season (default: the latest). For a past season the AP
 *  poll is left out, since the stored poll is the current one. */
export async function getRankings(season?: number): Promise<CompiledTeamData[]> {
	const start = performance.now();

	const [snapshot, apRankings, teamData]: [SeasonSnapshot, ApPollTeam[], Record<string, TeamData>] = await Promise.all([
		getSeasonSnapshot(season),
		season === undefined ? getApPollRankings() : Promise.resolve([]),
		getAllTeamData()
	]);

	const compositeRankings: CompositeRanking[] = await db.query(
		`SELECT * FROM composite_rankings
		WHERE season::int = $1
			AND date = (SELECT MAX(date) FROM composite_rankings WHERE season::int = $1)
		ORDER BY team_key`,
		[snapshot.season]
	);

	const baseTeams = mapBaseTeams(snapshot.kenPom, snapshot.evanMiya, snapshot.bartTorvik, snapshot.net, apRankings);

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
