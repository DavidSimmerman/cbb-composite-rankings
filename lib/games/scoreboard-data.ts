// Everything the scoreboard page renders, as plain serializable data.
import { PostgresService } from '../database';
import { getAllTeamData, type TeamData } from '../espn/espn-team-data';
import { getScoreboard, saveScoreboardLines, type ScoreboardGame, type ScoreboardTeam } from '../espn/scoreboard';
import { getRankings } from '../rankings/rankings';
import { getLatestSeason } from '../rankings/snapshot';
import { getSeasonForDate } from '../season';
import { matchupTones } from '../team-colors';
import { getLines, getStoredPredictions } from './store';

const db = PostgresService.getInstance();

export type GameState = 'pre' | 'in' | 'post';

export interface CardTeam {
	teamKey: string | null;
	name: string;
	abbr: string;
	/** Composite rank (as of the slate's date for past seasons) */
	rank: number | null;
	ap: number | null;
	record: string;
	score: number | null;
	color: string;
}

export interface CardPrediction {
	homeWinProb: number;
	/** model's home spread: negative = home favored */
	spread: number | null;
}

export interface ScoreboardCard {
	id: string;
	state: GameState;
	start: string;
	/** "7:00 PM ET", "2nd · 3:12", "Half", "Final/OT" */
	status: string;
	period: number;
	clock: string;
	broadcast: string;
	conference: string;
	away: CardTeam;
	home: CardTeam;
	line: { homeSpread: number | null; overUnder: number | null } | null;
	prediction: CardPrediction | null;
}

export interface DayCount {
	date: string;
	count: number | null;
}

export interface ScoreboardData {
	date: string;
	games: ScoreboardCard[];
	days: DayCount[];
}

function ordinal(period: number) {
	if (period === 1) return '1st';
	if (period === 2) return '2nd';
	return period === 3 ? 'OT' : `${period - 2}OT`;
}

export function statusLabel(g: ScoreboardGame): string {
	const short = g.status.shortDetail || '';
	if (g.status.state === 'post') return /final/i.test(short) ? short : 'Final';
	if (g.status.state === 'in') {
		if (/half/i.test(short) || /half/i.test(g.status.detail)) return 'Half';
		if (/^end/i.test(short)) return short;
		return `${ordinal(g.status.period)} · ${g.status.displayClock}`;
	}
	if (/tbd/i.test(short) || /tbd/i.test(g.status.detail)) return 'TBD';
	if (/postponed|canceled|cancelled|delayed/i.test(g.status.detail)) return g.status.detail;
	const t = new Date(g.startDate).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'America/New_York'
	});
	return `${t} ET`;
}

export const toDateParam = (d: Date) =>
	`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
export const fromDateParam = (p: string) => new Date(Date.UTC(+p.slice(0, 4), +p.slice(4, 6) - 1, +p.slice(6, 8)));

/** Composite ranks for the slate: the live rankings for the current season, else the last
 *  composite of that season on or before the date (widest set of models per team). */
async function getCompositeRanks(dateParam: string): Promise<Map<string, number>> {
	const d = fromDateParam(dateParam);
	const iso = d.toISOString().slice(0, 10);
	const season = getSeasonForDate(iso);
	const latest = await getLatestSeason();
	if (season >= latest) {
		const rankings = await getRankings();
		return new Map(rankings.filter(t => t.avg_zscore_rank != null).map(t => [t.team_key, t.avg_zscore_rank]));
	}
	const rows = await db.query<{ team_key: string; avg_zscore_rank: number }>(
		`SELECT DISTINCT ON (team_key) team_key, avg_zscore_rank
		FROM composite_rankings
		WHERE season::int = $1
			AND date = (SELECT MAX(date) FROM composite_rankings WHERE season::int = $1 AND date <= $2::date)
		ORDER BY team_key, array_length(string_to_array(sources, ','), 1) DESC`,
		[season, iso]
	);
	return new Map(rows.map(r => [r.team_key, r.avg_zscore_rank]));
}

async function countGames(date: string): Promise<number | null> {
	try {
		const url = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=50&tz=America%2FNew_York&region=us&lang=en`;
		const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
		if (!res.ok) return null;
		const data = await res.json();
		return Array.isArray(data.events) ? data.events.length : null;
	} catch {
		return null;
	}
}

function toTeam(t: ScoreboardTeam, ranks: Map<string, number>, meta: TeamData | undefined, color: string): CardTeam {
	return {
		teamKey: t.teamKey ?? null,
		name: t.name,
		abbr: meta?.abbreviation ?? t.abbreviation,
		rank: t.teamKey ? (ranks.get(t.teamKey) ?? null) : null,
		ap: t.curatedRank ?? null,
		record: t.record,
		score: t.score ?? null,
		color
	};
}

export async function getScoreboardData(dateParam: string): Promise<ScoreboardData> {
	const center = fromDateParam(dateParam);
	const dayParams = [-3, -2, -1, 0, 1, 2, 3].map(o => toDateParam(new Date(center.getTime() + o * 86_400_000)));

	const [games, ranks, teamData, counts] = await Promise.all([
		getScoreboard(dateParam),
		getCompositeRanks(dateParam).catch(err => {
			console.error('[scoreboard] composite ranks failed:', err);
			return new Map<string, number>();
		}),
		getAllTeamData().catch(() => ({}) as Record<string, TeamData>),
		Promise.all(dayParams.map(d => (d === dateParam ? Promise.resolve(null) : countGames(d))))
	]);

	// Keep the stored current line fresh for games that haven't tipped
	saveScoreboardLines(games).catch(err => console.error('[scoreboard] saving lines failed:', err));

	const ids = games.map(g => g.id);
	const [lines, predictions] = await Promise.all([getLines(ids), getStoredPredictions(ids)]);

	const cards: ScoreboardCard[] = games.map(g => {
		const awayMeta = g.awayTeam.teamKey ? teamData[g.awayTeam.teamKey] : undefined;
		const homeMeta = g.homeTeam.teamKey ? teamData[g.homeTeam.teamKey] : undefined;
		const [ac, hc] = matchupTones(
			awayMeta ?? { color: g.awayTeam.color, secondary_color: null },
			homeMeta ?? { color: g.homeTeam.color, secondary_color: null }
		);
		// ESPN's live line is the freshest before tip; after that the stored (closing) line
		const stored = lines.get(g.id);
		const live = g.status.state === 'pre' && g.line ? { homeSpread: g.line.homeSpread, overUnder: g.line.overUnder } : null;
		const line = live ?? (stored ? { homeSpread: stored.homeSpread, overUnder: stored.overUnder } : null);
		const p = predictions.get(g.id);
		return {
			id: g.id,
			state: g.status.state,
			start: g.startDate,
			status: statusLabel(g),
			period: g.status.period,
			clock: g.status.displayClock,
			broadcast: g.broadcast,
			conference: g.conference.shortName,
			away: toTeam(g.awayTeam, ranks, awayMeta, ac),
			home: toTeam(g.homeTeam, ranks, homeMeta, hc),
			line,
			prediction: p ? { homeWinProb: p.homeWinProb, spread: p.spread } : null
		};
	});

	return {
		date: dateParam,
		games: cards,
		days: dayParams.map((d, i) => ({ date: d, count: d === dateParam ? games.length : counts[i] }))
	};
}
