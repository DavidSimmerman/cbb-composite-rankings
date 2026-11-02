import * as cheerio from 'cheerio';
import { CompiledTeamData } from '../shared';
import { getPartialGames, PartialGame } from './espn-game';
import { getCurrentSeason, seasonFullYear } from '../season';
import { ESPN_TEAM_IDS } from './espn-team-ids';
import { PostgresService } from '../database';

export interface LiveScore {
	teamScore: number;
	oppScore: number;
}

export interface EspnGame {
	game_id: string;
	date: string;
	homeAway: 'home' | 'away' | 'neutral';
	opp: string;
	won: boolean | undefined;
	score: string | undefined;
	time: string | undefined;
	is_live: boolean;
	live_score: LiveScore | undefined;
}

export interface EspnGameEnriched {
	game_id: string;
	date: string;
	homeAway: 'home' | 'away' | 'neutral';
	opp: string;
	won: boolean | undefined;
	score: string | undefined;
	time: string | undefined;
	is_live: boolean;
	live_score: LiveScore | undefined;
	game: PartialGame;
}

export type ParsedEspnGame = Omit<EspnGame, 'opp'> & { opp: CompiledTeamData; espn_id: string };

export async function getSchedule(teamKey: string, season = getCurrentSeason()) {
	const teamId = ESPN_TEAM_IDS[teamKey];

	const games = await fetchEspnSchedule(teamId, season);

	return games;
}

export async function getScheduleEnriched(teamKey: string, season = getCurrentSeason()) {
	console.log('getting enriched schedule');
	const start = performance.now();

	const teamId = ESPN_TEAM_IDS[teamKey];

	const games = await fetchEspnSchedule(teamId, season);
	const completedGames = games.filter(g => g.won !== undefined);
	const gameIds = completedGames.map(g => g.game_id);

	const gamesMap = await getPartialGames(gameIds);

	const enrichedGames: EspnGameEnriched[] = completedGames
		.filter(g => gamesMap.has(g.game_id))
		.map(g => ({ ...g, game: gamesMap.get(g.game_id)! }));

	console.log(`Getting enriched schedule took ${Math.round((performance.now() - start) / 100) / 10}s`);

	return enrichedGames;
}

async function fetchEspnSchedule(teamId: string, season: number): Promise<EspnGame[]> {
	let html: string;
	try {
		const res = await fetch(
			`https://www.espn.com/mens-college-basketball/team/schedule/_/id/${teamId}/season/${seasonFullYear(season)}`
		);
		if (!res.ok) throw new Error(`ESPN schedule ${res.status}`);
		html = await res.text();
	} catch (e) {
		// ESPN unreachable: fall back to the games we have stored (D1 opponents only)
		console.warn(`ESPN schedule failed for team ${teamId}, using stored games:`, e);
		return storedSchedule(teamId, season);
	}
	const $ = cheerio.load(html);

	const schedule = $('.Table__TR.Table__TR--sm')
		.toArray()
		.slice(2)
		.filter(r => $(r).find('.opponent-logo').length > 0)
		.map(r => {
			const $r = $(r);

			const gameId = $r
				.find('[href*="/gameId/"], [href*="gameId="]')
				.attr('href')
				?.match(/[?&/]gameId[/=](?<id>[^/&]+)/)?.groups?.id;

			const dateString = $r.find('[data-testid="date"]').text();
			// ESPN shows "Sat, Jan 3" with no year: Aug-Dec games are in the season's first calendar year
			const month = new Date(`${dateString}, 2000`).getMonth();
			const year = month >= 7 ? seasonFullYear(season) - 1 : seasonFullYear(season);
			const dateObj = new Date(`${dateString}, ${year}`);
			const date = dateObj.toISOString().split('T')[0];

			const opp =
				$r
					.find('.opponent-logo a')
					.attr('href')
					?.match(/\/id\/(?<id>[^/]+)/)?.groups?.id ?? $r.find('.opponent-logo span:last-of-type').text();

			const vsAt = $r.find('.opponent-logo .pr2').text().trim();

			const neutNode = $r.find('.opponent-logo span:last-of-type').contents().last().text();

			let homeAway;

			if (vsAt === '@') {
				homeAway = 'away';
			} else if (neutNode === '*') {
				homeAway = 'neutral';
			} else {
				homeAway = 'home';
			}

			const score = $r.find('.ml4').text().trim() || undefined;
			const winLoss = $r.find('[data-testid="symbol"], .fw-bold.clr-positive, .fw-bold.clr-negative').first().text().trim();

			let won;

			if (winLoss === 'W') {
				won = true;
			} else if (winLoss === 'L') {
				won = false;
			}

			const timeText = $r.find('[data-testid="time"]').text().trim();
			const isLive = timeText === 'LIVE';
			const time = !isLive ? timeText : undefined;

			return { game_id: gameId, date, homeAway, opp, won, score, time, is_live: isLive } as EspnGame;
		});

	return schedule;
}

/** The team's season from espn_games, in the same shape the ESPN schedule page parses to.
 *  espn_games has no neutral-site flag, so every game is home or away. */
async function storedSchedule(teamId: string, season: number): Promise<EspnGame[]> {
	const teamKey = Object.keys(ESPN_TEAM_IDS).find(k => ESPN_TEAM_IDS[k] === teamId);
	if (!teamKey) return [];
	const rows = await PostgresService.getInstance()
		.query<{
			game_id: string;
			date: string;
			status: string;
			clock: string | null;
			home_team_key: string;
			away_team_key: string;
			home_score: number | null;
			away_score: number | null;
		}>(
			`SELECT game_id, date, status, clock, home_team_key, away_team_key, home_score, away_score
			 FROM espn_games WHERE season = $1 AND (home_team_key = $2 OR away_team_key = $2) ORDER BY date`,
			[seasonFullYear(season), teamKey]
		)
		.catch(() => []);
	return rows.map(r => {
		const home = r.home_team_key === teamKey;
		const oppKey = home ? r.away_team_key : r.home_team_key;
		const final = r.status === 'final' && r.home_score != null && r.away_score != null;
		const us = (home ? r.home_score : r.away_score) ?? 0;
		const them = (home ? r.away_score : r.home_score) ?? 0;
		const live = r.status === 'in progress';
		return {
			game_id: r.game_id,
			date: r.date.slice(0, 10),
			homeAway: home ? 'home' : 'away',
			opp: ESPN_TEAM_IDS[oppKey] ?? oppKey,
			won: final ? us > them : undefined,
			score: final ? `${Math.max(us, them)}-${Math.min(us, them)}` : undefined,
			time: final || live ? undefined : (r.clock ?? undefined),
			is_live: live,
			live_score: live ? { teamScore: us, oppScore: them } : undefined
		} satisfies EspnGame;
	});
}
