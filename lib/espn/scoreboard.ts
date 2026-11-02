/* eslint-disable @typescript-eslint/no-explicit-any -- parses untyped ESPN API JSON */
import { pickEspnOdds } from '../games/line-utils';
import { fetchModelPrediction, mapLimit, toStored } from '../games/model';
import { getStoredPredictions, saveLines, savePregamePrediction } from '../games/store';
import { getPartialGames } from './espn-game';
import { ESPN_TEAM_IDS } from './espn-team-ids';

// Build reverse map: ESPN ID -> team_key
const ESPN_ID_TO_TEAM_KEY: Record<string, string> = {};
for (const [teamKey, espnId] of Object.entries(ESPN_TEAM_IDS)) {
	ESPN_ID_TO_TEAM_KEY[espnId] = teamKey;
}

export interface ScoreboardTeam {
	espnId: string;
	name: string;
	shortName: string;
	abbreviation: string;
	logo: string;
	conferenceId: string;
	color: string;
	score: number | undefined;
	record: string;
	curatedRank: number | undefined;
	teamKey: string | undefined;
	/** Points per period, once the game has started */
	periods: number[];
}

export interface ScoreboardGame {
	id: string;
	shortName: string;
	date: string;
	startDate: string;
	status: {
		state: 'pre' | 'in' | 'post';
		detail: string;
		shortDetail: string;
		displayClock: string;
		period: number;
	};
	homeTeam: ScoreboardTeam;
	awayTeam: ScoreboardTeam;
	conference: {
		id: string;
		name: string;
		shortName: string;
	};
	broadcast: string;
	odds: { spread: string; overUnder: string } | undefined;
	/** Parsed line: home spread (negative = home favored) and total */
	line: { homeSpread: number | null; overUnder: number | null; provider: string | null } | null;
	neutralSite: boolean;
}

export interface ScoreboardGameEnriched extends ScoreboardGame {
	homeTeamRating: number | undefined;
	awayTeamRating: number | undefined;
	highestRating: number;
	averageRating: number;
	spread: number;
}

function parseCompetitor(competitor: any): ScoreboardTeam {
	const team = competitor.team;
	const record = competitor.records?.find((r: any) => r.type === 'total')?.summary ?? '';
	const curatedRank = competitor.curatedRank?.current;
	return {
		espnId: team.id,
		name: team.shortDisplayName || team.location,
		shortName: team.abbreviation,
		abbreviation: team.abbreviation,
		logo: team.logo,
		conferenceId: team.conferenceId || '',
		color: team.color || '333333',
		score: competitor.score ? parseInt(competitor.score, 10) : undefined,
		record,
		curatedRank: curatedRank && curatedRank <= 25 ? curatedRank : undefined,
		teamKey: ESPN_ID_TO_TEAM_KEY[team.id],
		periods: (competitor.linescores ?? [])
			.map((l: any) => Number(l.value ?? l.displayValue))
			.filter((v: number) => Number.isFinite(v))
	};
}

function parseEvent(event: any): ScoreboardGame {
	const competition = event.competitions[0];
	const status = event.status || competition.status;
	const homeCompetitor = competition.competitors.find((c: any) => c.homeAway === 'home') || competition.competitors[0];
	const awayCompetitor = competition.competitors.find((c: any) => c.homeAway === 'away') || competition.competitors[1];

	const groups = competition.groups || {};
	const odds = competition.odds?.[0];
	let parsedOdds: ScoreboardGame['odds'];
	if (odds) {
		parsedOdds = {
			spread: odds.pointSpread?.home?.close?.line || odds.details || '',
			overUnder: odds.overUnder?.close?.line || odds.overUnder?.toString() || ''
		};
	}

	return {
		id: event.id,
		shortName: event.shortName,
		date: event.date,
		startDate: competition.startDate || event.date,
		status: {
			state: status.type.state,
			detail: status.type.detail,
			shortDetail: status.type.shortDetail,
			displayClock: status.displayClock,
			period: status.period
		},
		homeTeam: parseCompetitor(homeCompetitor),
		awayTeam: parseCompetitor(awayCompetitor),
		conference: {
			id: groups.id || '',
			name: groups.name || '',
			shortName: groups.shortName || ''
		},
		broadcast: competition.broadcast || competition.broadcasts?.[0]?.names?.[0] || '',
		odds: parsedOdds,
		line: pickEspnOdds(competition.odds, homeCompetitor.team?.abbreviation, awayCompetitor.team?.abbreviation),
		neutralSite: !!competition.neutralSite
	};
}

export async function getScoreboard(date: string): Promise<ScoreboardGame[]> {
	const url = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=50&tz=America%2FNew_York&region=us&lang=en`;
	const res = await fetch(url, { next: { revalidate: 30 } });
	if (!res.ok) {
		throw new Error(`Failed to fetch scoreboard: ${res.status}`);
	}
	const data = await res.json();
	return (data.events || []).map(parseEvent);
}

/** Stores the current line of every game that hasn't tipped yet (closing lines come from the
 *  game summary once a game is final, see espn-game.ts). */
export async function saveScoreboardLines(games: ScoreboardGame[]): Promise<void> {
	await saveLines(
		games
			.filter(g => g.status.state === 'pre' && g.line)
			.map(g => ({
				gameId: g.id,
				homeSpread: g.line!.homeSpread,
				overUnder: g.line!.overUnder,
				source: `${g.line!.provider ?? 'ESPN'} current`
			}))
	);
}

/** Model predictions for games that haven't tipped, stored so they can be shown after the game.
 *  Skips games predicted within the last `freshMinutes`. */
export async function savePregamePredictions(games: ScoreboardGame[], freshMinutes = 90): Promise<number> {
	const pre = games.filter(g => g.status.state === 'pre' && g.homeTeam.teamKey && g.awayTeam.teamKey);
	if (pre.length === 0) return 0;
	const stored = await getStoredPredictions(pre.map(g => g.id));
	const cutoff = Date.now() - freshMinutes * 60_000;
	const todo = pre.filter(g => {
		const s = stored.get(g.id);
		return !s?.createdAt || new Date(s.createdAt).getTime() < cutoff;
	});
	let saved = 0;
	await mapLimit(todo, 4, async g => {
		const p = await fetchModelPrediction(g.homeTeam.teamKey!, g.awayTeam.teamKey!);
		if (!p) return;
		await savePregamePrediction(toStored(g.id, p));
		saved++;
	});
	return saved;
}

/** Cron: current lines and fresh pre-game predictions for one day's slate. */
export async function refreshSlate(date: string): Promise<void> {
	try {
		const games = await getScoreboard(date);
		await saveScoreboardLines(games);
		const saved = await savePregamePredictions(games);
		console.log(`[refreshSlate] ${date}: ${games.length} games, ${saved} predictions saved`);
	} catch (err) {
		console.error(`[refreshSlate] ${date} failed:`, err);
	}
}

export async function saveScoreboardGames(date: string): Promise<void> {
	console.log(`[saveScoreboardGames] Fetching scoreboard for ${date}`);
	const games = await getScoreboard(date);
	const gameIds = games.map(g => g.id);
	console.log(`[saveScoreboardGames] Found ${gameIds.length} games, saving to DB...`);
	await getPartialGames(gameIds);
	console.log(`[saveScoreboardGames] Done saving games for ${date}`);
}
