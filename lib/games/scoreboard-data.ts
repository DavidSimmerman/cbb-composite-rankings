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

// ── Stored games ──
// The live ESPN scoreboard is the main source. Games saved in espn_games for the date are merged
// in (same ids in production), and carry the page on their own if ESPN can't be reached.

interface StoredGameRow {
	game_id: string;
	date: string;
	status: string;
	broadcast: string | null;
	is_halftime: boolean;
	half: number;
	clock: string;
	home_team_key: string;
	away_team_key: string;
	home_score: number;
	away_score: number;
}

/** "7:00 PM EST" on a YYYY-MM-DD date -> ISO time */
export function storedStart(date: string, clock: string): string {
	const m = clock?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*(EST|EDT)?/i);
	if (!m) return `${date}T17:00:00.000Z`;
	let h = parseInt(m[1]) % 12;
	if (m[3].toUpperCase() === 'PM') h += 12;
	const offset = (m[4] ?? 'EST').toUpperCase() === 'EDT' ? '-04:00' : '-05:00';
	return new Date(`${date}T${String(h).padStart(2, '0')}:${m[2]}:00${offset}`).toISOString();
}

async function getStoredScoreboard(dateParam: string, teamData: Record<string, TeamData>): Promise<ScoreboardGame[]> {
	const iso = fromDateParam(dateParam).toISOString().slice(0, 10);
	const season = getSeasonForDate(iso);
	const rows = await db.query<StoredGameRow>(
		`SELECT game_id, date, status, broadcast, is_halftime, half, clock, home_team_key, away_team_key, home_score, away_score
		FROM espn_games WHERE date = $1`,
		[iso]
	);
	if (rows.length === 0) return [];
	const keys = [...new Set(rows.flatMap(r => [r.home_team_key, r.away_team_key]))];
	const [records, ap, confs] = await Promise.all([
		db.query<{ team: string; w: number; l: number }>(
			`WITH g AS (SELECT * FROM espn_games WHERE season::int IN ($1, $2) AND status = 'final' AND date < $3)
			SELECT team, SUM(w)::int AS w, SUM(l)::int AS l FROM (
				SELECT home_team_key AS team, (home_score > away_score)::int AS w, (home_score < away_score)::int AS l FROM g
				UNION ALL SELECT away_team_key, (away_score > home_score)::int, (away_score < home_score)::int FROM g
			) x WHERE team = ANY($4) GROUP BY team`,
			[season, 2000 + season, iso, keys]
		),
		db.query<{ team_key: string; rank: number }>(
			`SELECT team_key, rank FROM ap_rankings WHERE date = (SELECT MAX(date) FROM ap_rankings WHERE date <= $1::date)`,
			[iso]
		),
		db.query<{ team_key: string; conference: string }>(
			`SELECT DISTINCT ON (team_key) team_key, conference FROM kenpom_rankings
			WHERE team_key = ANY($1) AND season::int = $2 ORDER BY team_key, date DESC`,
			[keys, season]
		)
	]);
	const rec = new Map(records.map(r => [r.team, r]));
	const apRank = new Map(ap.map(r => [r.team_key, r.rank]));
	const conf = new Map(confs.map(r => [r.team_key, r.conference]));

	return rows.map(r => {
		const state: 'pre' | 'in' | 'post' = r.status === 'final' ? 'post' : r.status === 'in progress' ? 'in' : 'pre';
		const team = (key: string, score: number, won: boolean): ScoreboardTeam => {
			const meta = teamData[key];
			const base = rec.get(key) ?? { w: 0, l: 0 };
			const w = base.w + (state === 'post' && won ? 1 : 0);
			const l = base.l + (state === 'post' && !won ? 1 : 0);
			const rank = apRank.get(key);
			return {
				espnId: String(meta?.espn_id ?? ''),
				name: meta?.short_name || meta?.school || key,
				shortName: meta?.abbreviation ?? key,
				abbreviation: meta?.abbreviation ?? key,
				logo: '',
				conferenceId: '',
				color: meta?.color ?? '333333',
				score: state === 'pre' ? undefined : score,
				record: `${w}-${l}`,
				curatedRank: rank && rank <= 25 ? rank : undefined,
				teamKey: key,
				periods: []
			};
		};
		const hc = conf.get(r.home_team_key), ac = conf.get(r.away_team_key);
		const homeWon = r.home_score > r.away_score;
		const period = r.half || 0;
		return {
			id: r.game_id,
			shortName: `${r.away_team_key} @ ${r.home_team_key}`,
			date: r.date,
			startDate: storedStart(r.date.slice(0, 10), r.clock),
			status: {
				state,
				detail: state === 'post' ? (period > 2 ? `Final/${period === 3 ? '' : period - 2}OT` : 'Final') : r.is_halftime ? 'Halftime' : r.clock,
				shortDetail: state === 'post' ? (period > 2 ? `Final/${period === 3 ? '' : period - 2}OT` : 'Final') : r.is_halftime ? 'Halftime' : r.clock,
				displayClock: r.clock,
				period
			},
			homeTeam: team(r.home_team_key, r.home_score, homeWon),
			awayTeam: team(r.away_team_key, r.away_score, !homeWon),
			conference: { id: '', name: '', shortName: hc && hc === ac ? hc : '' },
			broadcast: r.broadcast ?? '',
			odds: undefined,
			line: null,
			neutralSite: false
		};
	});
}

async function storedCount(dateParam: string): Promise<number | null> {
	try {
		const [row] = await db.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM espn_games WHERE date = $1', [
			fromDateParam(dateParam).toISOString().slice(0, 10)
		]);
		return row?.n || null;
	} catch {
		return null;
	}
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

	const [espnGames, ranks, teamData, counts, stored] = await Promise.all([
		getScoreboard(dateParam).catch(err => {
			console.error('[scoreboard] ESPN scoreboard failed, using stored games:', err);
			return [] as ScoreboardGame[];
		}),
		getCompositeRanks(dateParam).catch(err => {
			console.error('[scoreboard] composite ranks failed:', err);
			return new Map<string, number>();
		}),
		getAllTeamData().catch(() => ({}) as Record<string, TeamData>),
		Promise.all(
			dayParams.map(async d => {
				if (d === dateParam) return null;
				const [espn, db] = await Promise.all([countGames(d), storedCount(d)]);
				return espn == null && db == null ? null : Math.max(espn ?? 0, db ?? 0);
			})
		),
		getAllTeamData()
			.then(td => getStoredScoreboard(dateParam, td))
			.catch(err => {
				console.error('[scoreboard] stored games failed:', err);
				return [] as ScoreboardGame[];
			})
	]);
	const espnIds = new Set(espnGames.map(g => g.id));
	const games = [...espnGames, ...stored.filter(g => !espnIds.has(g.id))];

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
