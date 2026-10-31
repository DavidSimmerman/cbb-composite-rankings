import { PostgresService } from '../database';
import { seasonChartWindow } from '../season';
import { BartTorvikRanking } from './barttorvik';
import { EvanMiyaRanking } from './evanmiya';
import { KenPomRanking } from './kenpom';
import { NetRanking } from './net';

const db = PostgresService.getInstance();

// Latest season KenPom has data for. Every other source is read for this same season, so a
// source that hasn't started the new season yet shows as missing instead of last season's numbers.
export async function getLatestSeason(): Promise<number> {
	const [row] = await db.query<{ season: number }>(`SELECT MAX(season::int) AS season FROM kenpom_rankings`);
	return row.season;
}

export interface SeasonSnapshot {
	season: number;
	kenPom: KenPomRanking[];
	evanMiya: EvanMiyaRanking[];
	bartTorvik: BartTorvikRanking[];
	net: NetRanking[];
}

export async function getSeasonSnapshot(season?: number): Promise<SeasonSnapshot> {
	const s = season ?? (await getLatestSeason());

	function latestForSeason(table: string) {
		return db.query(
			`SELECT * FROM ${table}
			WHERE season::int = $1
				AND date = (SELECT MAX(date) FROM ${table} WHERE season::int = $1)
			ORDER BY team_key`,
			[s]
		);
	}

	// NET has no season column; its first release is in December, so anything earlier is last season's list
	const netStart = `20${String(s - 1).padStart(2, '0')}-11-15`;
	const netEnd = seasonChartWindow(s).end;

	const [kenPom, evanMiya, bartTorvik, net] = await Promise.all([
		latestForSeason('kenpom_rankings'),
		latestForSeason('evanmiya_rankings'),
		latestForSeason('barttorvik_rankings'),
		db.query(
			`SELECT * FROM net_rankings
			WHERE date = (SELECT MAX(date) FROM net_rankings WHERE date BETWEEN $1 AND $2)
			ORDER BY team_key`,
			[netStart, netEnd]
		)
	]);

	return { season: s, kenPom, evanMiya, bartTorvik, net };
}
