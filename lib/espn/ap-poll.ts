import * as cheerio from 'cheerio';
import { PostgresService } from '../database';
import { ESPN_TO_TEAM_KEY } from './espn-team-ids';

const db = PostgresService.getInstance();

export interface ApPollTeam {
	rank: number;
	team_key: string;
}

export async function fetchApPoll() {
	const res = await fetch('https://www.espn.com/mens-college-basketball/rankings');
	const html = await res.text();
	const $ = cheerio.load(html);

	const rankingsMap: Record<string, string | undefined> = {};
	$('.InnerLayout__child.rankings__table:nth-child(1) tbody tr').each((_, tr) => {
		const rank = parseInt($(tr).find('.Table__TD').first().text());
		const href = $(tr).find('a[href*="id"]').attr('href');
		rankingsMap[rank] = ESPN_TO_TEAM_KEY[href?.match(/\/id\/(?<id>[^/]+)/)?.groups?.id as string];
	});

	return rankingsMap;
}

const AP_QUERY = `
	INSERT INTO ap_rankings (team_key, rank)
	VALUES ($1, $2)
	ON CONFLICT (rank, date) DO UPDATE SET
		rank = EXCLUDED.rank,
		team_key = EXCLUDED.team_key;
`;

export async function updateApPollRankings() {
	try {
		const rankingsMap = await fetchApPoll();

		await db.transaction(
			Object.entries(rankingsMap).map(([rank, teamKey]) => ({
				query: AP_QUERY,
				params: [teamKey, parseInt(rank)]
			}))
		);

		console.log(`RANKINGS FETCH: AP Poll rankings successfully updated.`);
	} catch (err: any) {
		console.log(`AP POLL RANKINGS: Error while updating AP Poll rankings: ${err.toString()}`);
	}
}

export async function getApPollRankings() {
	const rankings: ApPollTeam[] = await db.query(`SELECT * FROM ap_rankings WHERE date = (SELECT MAX(date) FROM ap_rankings)`);
	return rankings;
}
