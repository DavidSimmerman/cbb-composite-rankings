// Everything the game page renders, assembled on the server as plain serializable data.
import { PostgresService } from '../database';
import { type Game, type GameTeam, type GameTeamStats, getGame } from '../espn/espn-game';
import { getAllTeamData, type TeamData } from '../espn/espn-team-data';
import type { EspnGameEnriched } from '../espn/schedule';
import type { FullRatings, ProfileRatingsHistory } from '../rankings/profile';
import { getTeamRanksMap, type RanksMap } from '../rankings/ranks-map';
import { getSeasonForDate } from '../season';
import { pickCompositeCombo } from '../shared';
import { matchupTones } from '../team-colors';
import { ats, teamLine, type GameLine } from './line-utils';
import { fetchModelPrediction, toStored } from './model';
import { SIMILAR_CATEGORIES, rankSimilar } from './similar';
import { getLines, getStoredPredictions, type KeyToGame, savePregamePrediction } from './store';

const db = PostgresService.getInstance();

export type Side = 'away' | 'home';
export type GamePhase = 'pre' | 'live' | 'final';

export interface TeamHeader {
	teamKey: string | null;
	name: string;
	abbr: string;
	color: string;
	ap: number | null;
	record: string | null;
	conference: string | null;
	comp: { rank: number | null; ork: number | null; drk: number | null } | null;
	score: number | null;
	periods: number[] | null;
}

export interface PagePrediction {
	homeWinProb: number;
	homeScore: number | null;
	awayScore: number | null;
	/** model's home spread: negative = home favored */
	spread: number | null;
	total: number | null;
	modelVersion: string | null;
	keys: { home: KeyToGame[]; away: KeyToGame[] } | null;
	/** true once the game has started: the prediction saved before tip-off */
	frozen: boolean;
}

export interface TapeRow {
	label: string;
	short?: string;
	away: string;
	home: string;
	better: Side | null;
}

export type ModelKey = 'comp' | 'kp' | 'em' | 'bt' | 'net';
export interface ModelCell {
	value: number | null;
	rank: number | null;
	ork: number | null;
	drk: number | null;
}
export interface ModelRow {
	key: ModelKey;
	away: ModelCell | null;
	home: ModelCell | null;
}

export interface PastGame {
	gameId: string;
	date: string;
	loc: 'vs' | '@' | 'N';
	oppKey: string;
	opp: string;
	oppRank: number | null;
	won: boolean;
	/** team score first */
	score: string;
	margin: number;
	/** team's own line (negative = favored) */
	line: number | null;
	ats: number | null;
}

export interface SimilarCategory {
	key: string;
	label: string;
	games: (PastGame & { match: number })[];
}

export interface BoxRow {
	label: string;
	away: string;
	home: string;
	awayVal: number;
	homeVal: number;
	lowerBetter?: boolean;
}

export interface AvgRow {
	label: string;
	pct: boolean;
	/** [this game, season average]; null when the season number isn't available */
	off: [number, number] | null;
	def: [number, number] | null;
	lowerBetter?: boolean;
	defLowerBetter?: boolean;
}

export interface DeltaCell {
	label: string;
	change: number;
	rank: number | null;
	rankChange: number;
	/** z-score change as a share of a 5-sigma range, for the tint strength */
	strength: number;
}

export interface CmpRow {
	label: string;
	off: { value: string; rank: number } | null;
	def: { value: string; rank: number } | null;
}

export interface GamePageData {
	gameId: string;
	phase: GamePhase;
	/** YYYY-MM-DD (Eastern) */
	date: string;
	dateLabel: string;
	timeLabel: string | null;
	clockLabel: string | null;
	broadcast: string | null;
	venue: string | null;
	neutral: boolean;
	away: TeamHeader;
	home: TeamHeader;
	line: { homeSpread: number | null; overUnder: number | null } | null;
	prediction: PagePrediction | null;
	tape: TapeRow[];
	tapeNote: string;
	models: ModelRow[];
	modelsAsOf: string | null;
	form: Record<Side, PastGame[]>;
	box: BoxRow[] | null;
	vsAvg: Record<Side, AvgRow[]> | null;
	deltas: Record<Side, Partial<Record<'comp' | 'kp' | 'em' | 'bt', DeltaCell[]>>> | null;
	matchup: { awayOff: CmpRow[]; homeOff: CmpRow[] } | null;
	similar: Record<Side, SimilarCategory[]> | null;
	jsonLd: Record<string, unknown>;
	title: { away: string; home: string };
}

// ── helpers ──

const other = (s: Side): Side => (s === 'away' ? 'home' : 'away');
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const fmtDate = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });

function phaseOf(game: Game): GamePhase {
	return game.status === 'final' ? 'final' : game.status === 'in progress' ? 'live' : 'pre';
}

function ordinal(period: number) {
	if (period === 1) return '1st';
	if (period === 2) return '2nd';
	return period === 3 ? 'OT' : `${period - 2}OT`;
}

function latestRatings(team: GameTeam | undefined, season: number): FullRatings | null {
	const fr = team?.profile?.full_ratings;
	if (!fr) return null;
	return fr[season] ?? fr[Object.keys(fr).sort().at(-1)!] ?? null;
}

/** Last ratings_history entry before `date` (or the latest one when date is null). */
function historyBefore(history: ProfileRatingsHistory | undefined, date: string | null) {
	if (!history) return null;
	const dates = Object.keys(history).sort();
	const pick = date ? dates.filter(d => d < date).at(-1) : dates.at(-1);
	return pick ? { date: pick, row: history[pick] } : null;
}

async function kenpomContext(teamKey: string, season: number, onOrBefore: string) {
	try {
		const [row] = await db.query<{ conference: string | null; sos_net_rating_rank: number | null; adjusted_tempo: number | null; adjusted_tempo_rank: number | null }>(
			`SELECT conference, sos_net_rating_rank, adjusted_tempo, adjusted_tempo_rank
			FROM kenpom_rankings
			WHERE team_key = $1 AND season::int = $2 AND date <= $3::date
			ORDER BY date DESC LIMIT 1`,
			[teamKey, season, onOrBefore]
		);
		if (row) return row;
		// a game before the season's first snapshot: use the earliest one
		const [first] = await db.query<{ conference: string | null; sos_net_rating_rank: number | null; adjusted_tempo: number | null; adjusted_tempo_rank: number | null }>(
			`SELECT conference, sos_net_rating_rank, adjusted_tempo, adjusted_tempo_rank
			FROM kenpom_rankings WHERE team_key = $1 AND season::int = $2 ORDER BY date ASC LIMIT 1`,
			[teamKey, season]
		);
		return first ?? null;
	} catch (err) {
		console.error('[game] kenpom context failed:', err);
		return null;
	}
}

/** Composite rank of every team as of a date (last snapshot of that season on or before it). */
async function compositeRanksAsOf(season: number, iso: string): Promise<Map<string, number>> {
	try {
		const rows = await db.query<{ team_key: string; avg_zscore_rank: number }>(
			`SELECT DISTINCT ON (team_key) team_key, avg_zscore_rank
			FROM composite_rankings
			WHERE season::int = $1
				AND date = COALESCE(
					(SELECT MAX(date) FROM composite_rankings WHERE season::int = $1 AND date <= $2::date),
					(SELECT MIN(date) FROM composite_rankings WHERE season::int = $1))
			ORDER BY team_key, array_length(string_to_array(sources, ','), 1) DESC`,
			[season, iso]
		);
		return new Map(rows.map(r => [r.team_key, r.avg_zscore_rank]));
	} catch (err) {
		console.error('[game] composite ranks failed:', err);
		return new Map();
	}
}

// ── schedule → past games ──

function pastGames(
	team: GameTeam | undefined,
	beforeDate: string,
	currentGameId: string,
	lines: Map<string, GameLine>,
	teamData: Record<string, TeamData>,
	ranks: Map<string, number>
): PastGame[] {
	const sched = (team?.profile?.schedule ?? []) as unknown as EspnGameEnriched[];
	const out: PastGame[] = [];
	for (const g of sched) {
		if (!g.game || g.game_id === currentGameId || g.date >= beforeDate) continue;
		const teams = Object.entries(g.game.teams ?? {});
		const mine = teams.find(([, t]) => t.team_key === team!.team_key);
		const opp = teams.find(([, t]) => t.team_key !== team!.team_key);
		if (!mine || !opp || g.game.status !== 'final') continue;
		const [side, me] = mine;
		const [, them] = opp;
		const margin = (me.score ?? 0) - (them.score ?? 0);
		const l = lines.get(g.game_id)?.homeSpread;
		const line = l == null ? null : teamLine(l, side as Side);
		const meta = teamData[them.team_key];
		out.push({
			gameId: g.game_id,
			date: g.date,
			loc: g.homeAway === 'neutral' ? 'N' : g.homeAway === 'away' ? '@' : 'vs',
			oppKey: them.team_key,
			opp: meta?.short_name || meta?.school || them.name || them.team_key,
			oppRank: ranks.get(them.team_key) ?? null,
			won: margin > 0,
			score: `${me.score}-${them.score}`,
			margin,
			line,
			ats: line == null ? null : ats(margin, line)
		});
	}
	return out.sort((a, b) => b.date.localeCompare(a.date));
}

const record = (gs: { won: boolean }[]) => `${gs.filter(g => g.won).length}-${gs.filter(g => !g.won).length}`;
const winPct = (gs: { won: boolean }[]) => (gs.length ? gs.filter(g => g.won).length / gs.length : null);

function atsRecord(gs: PastGame[]) {
	const withLine = gs.filter(g => g.ats != null);
	const c = withLine.filter(g => g.ats! > 0).length;
	const l = withLine.filter(g => g.ats! < 0).length;
	const p = withLine.length - c - l;
	return { text: withLine.length ? `${c}-${l}${p ? `-${p}` : ''}` : '—', pct: withLine.length ? c / withLine.length : null };
}

function better(a: number | null, h: number | null, lower = false): Side | null {
	if (a == null || h == null || a === h) return null;
	return (lower ? a < h : a > h) ? 'away' : 'home';
}

// ── box score, season averages, rating changes, matchup ──

const BOX: { label: string; keys: string[]; fmt: 'ma' | 'n' | 'pct'; lowerBetter?: boolean }[] = [
	{ label: 'FG%', keys: ['field_goal_pct'], fmt: 'pct' },
	{ label: '3-pointers', keys: ['three_point_field_goals_made', 'three_point_field_goals_attempted'], fmt: 'ma' },
	{ label: 'Free throws', keys: ['free_throws_made', 'free_throws_attempted'], fmt: 'ma' },
	{ label: 'Rebounds', keys: ['total_rebounds'], fmt: 'n' },
	{ label: 'Off. rebounds', keys: ['offensive_rebounds'], fmt: 'n' },
	{ label: 'Assists', keys: ['assists'], fmt: 'n' },
	{ label: 'Steals', keys: ['steals'], fmt: 'n' },
	{ label: 'Blocks', keys: ['blocks'], fmt: 'n' },
	{ label: 'Turnovers', keys: ['total_turnovers'], fmt: 'n', lowerBetter: true },
	{ label: 'Fouls', keys: ['fouls'], fmt: 'n', lowerBetter: true },
	{ label: 'Points in paint', keys: ['points_in_paint'], fmt: 'n' },
	{ label: 'Fast break pts', keys: ['fast_break_points'], fmt: 'n' }
];

function boxScore(away: GameTeamStats | undefined, home: GameTeamStats | undefined): BoxRow[] | null {
	const a = away as unknown as Record<string, number> | undefined;
	const h = home as unknown as Record<string, number> | undefined;
	if (!a || !h || a.field_goals_attempted == null || h.field_goals_attempted == null) return null;
	return BOX.map(r => {
		const av = num(a[r.keys[0]]) ?? 0;
		const hv = num(h[r.keys[0]]) ?? 0;
		const show = (s: Record<string, number>, v: number) =>
			r.fmt === 'ma' ? `${v}-${num(s[r.keys[1]]) ?? 0}` : r.fmt === 'pct' ? `${v}%` : String(v);
		// made-attempted rows compare by makes
		return { label: r.label, away: show(a, av), home: show(h, hv), awayVal: av, homeVal: hv, lowerBetter: r.lowerBetter };
	});
}

const AVG: { label: string; game: string; avg: string; defAvg: string; pct: boolean; lowerBetter?: boolean; defLowerBetter?: boolean }[] = [
	{ label: 'Efficiency', game: 'points_per_possession', avg: 'kp_offensive_rating', defAvg: 'kp_defensive_rating', pct: false, defLowerBetter: true },
	{ label: 'FG%', game: 'field_goal_pct', avg: 'espn_off_field_goal_pct', defAvg: 'espn_opp_off_field_goal_pct', pct: true, defLowerBetter: true },
	{ label: '3PT%', game: 'three_point_field_goal_pct', avg: 'espn_off_three_point_field_goal_pct', defAvg: 'espn_opp_off_three_point_field_goal_pct', pct: true, defLowerBetter: true },
	{ label: '3PT rate', game: 'three_point_rate', avg: 'bt_3pr', defAvg: 'bt_3prd', pct: true, defLowerBetter: true },
	{ label: 'FT%', game: 'free_throw_pct', avg: 'espn_off_free_throw_pct', defAvg: 'espn_opp_off_free_throw_pct', pct: true, defLowerBetter: true },
	{ label: 'FT rate', game: 'free_throw_rate', avg: 'bt_ftr', defAvg: 'bt_ftrd', pct: true, defLowerBetter: true },
	{ label: 'Assist %', game: 'assist_percentage', avg: 'espn_off_assist_percentage', defAvg: 'espn_opp_off_assist_percentage', pct: true, defLowerBetter: true },
	{ label: 'Turnover %', game: 'turnover_percentage', avg: 'bt_tor', defAvg: 'bt_tord', pct: true, lowerBetter: true, defLowerBetter: false },
	{ label: 'Def rebound rate', game: 'defensive_rebound_rate', avg: 'bt_drb', defAvg: 'bt_orb', pct: true, defLowerBetter: true },
	{ label: 'Off rebound rate', game: 'offensive_rebound_rate', avg: 'bt_orb', defAvg: 'bt_drb', pct: true, defLowerBetter: true }
];

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Same numbers as the old GameStatsComparison: offense = this team's game vs its season average;
 *  defense = what the opponent did vs this team's season defensive average. */
function vsAverage(team: GameTeam, opp: GameTeam, ratings: FullRatings | null): AvgRow[] {
	const R = (ratings ?? {}) as unknown as Record<string, number>;
	const gameVal = (t: GameTeam, key: string) => {
		let v = num((t.stats as unknown as Record<string, number>)?.[key]);
		if (v == null) return null;
		if (key === 'points_per_possession' || key.includes('rebound_rate')) v = r1(v * 100);
		return v;
	};
	// BartTorvik orb = offensive rebound %, drb = offensive rebound % allowed. A defensive rebound
	// rate is 100 minus the other side's offensive rate.
	const avgVal = (key: string, mode: 'off' | 'def') => {
		let v = num(R[key]);
		if (v == null) return null;
		if ((mode === 'off' && key === 'bt_drb') || (mode === 'def' && key === 'bt_orb')) v = 100 - v;
		return r1(v);
	};
	return AVG.map(row => {
		const og = gameVal(team, row.game), oa = avgVal(row.avg, 'off');
		const dg = gameVal(opp, row.game), da = avgVal(row.defAvg, 'def');
		return {
			label: row.label,
			pct: row.pct,
			off: og != null && oa != null ? [og, oa] : null,
			def: dg != null && da != null ? [dg, da] : null,
			lowerBetter: row.lowerBetter,
			defLowerBetter: row.defLowerBetter
		};
	});
}

const DELTA_KEYS = {
	comp: { r: 'avg_zscore', o: 'avg_offensive_zscore', d: 'avg_defensive_zscore' },
	kp: { r: 'kp_rating', o: 'kp_offensive_rating', d: 'kp_defensive_rating' },
	em: { r: 'em_rating', o: 'em_offensive_rating', d: 'em_defensive_rating' },
	bt: { r: 'bt_rating', o: 'bt_offensive_rating', d: 'bt_defensive_rating' }
} as const;
const DELTA_Z = {
	kp: { r: 'kp_rating_zscore', o: 'kp_offensive_zscore', d: 'kp_defensive_zscore' },
	em: { r: 'em_rating_zscore', o: 'em_offensive_zscore', d: 'em_defensive_zscore' },
	bt: { r: 'bt_rating_zscore', o: 'bt_offensive_zscore', d: 'bt_defensive_zscore' }
} as const;
const FLIPPED = new Set(['kp_defensive_rating', 'bt_defensive_rating']);

/** Old GameDeltas: rating the day before the game vs the first day after, per model. */
function ratingChanges(history: ProfileRatingsHistory | undefined, gameDate: string) {
	if (!history) return null;
	const dates = Object.keys(history).sort();
	const before = dates.filter(d => d < gameDate).at(-1);
	const after = dates.find(d => d > gameDate);
	if (!before || !after) return null;
	const b = history[before], a = history[after];
	const out: Partial<Record<keyof typeof DELTA_KEYS, DeltaCell[]>> = {};
	for (const m of Object.keys(DELTA_KEYS) as (keyof typeof DELTA_KEYS)[]) {
		const cells: DeltaCell[] = [];
		for (const s of ['r', 'o', 'd'] as const) {
			const key = DELTA_KEYS[m][s];
			let bv: number | null, av: number | null, br: number | null, ar: number | null, bz: number | null, az: number | null;
			if (m === 'comp') {
				const bc = pickCompositeCombo(b.composite_combos, 'kp,em,bt,net') as unknown as Record<string, number> | undefined;
				const ac = pickCompositeCombo(a.composite_combos, 'kp,em,bt,net') as unknown as Record<string, number> | undefined;
				bv = num(bc?.[key]); av = num(ac?.[key]); br = num(bc?.[`${key}_rank`]); ar = num(ac?.[`${key}_rank`]);
				bz = bv; az = av;
			} else {
				const B = b as unknown as Record<string, number>, A = a as unknown as Record<string, number>;
				bv = num(B[key]); av = num(A[key]); br = num(B[`${key}_rank`]); ar = num(A[`${key}_rank`]);
				bz = num(B[DELTA_Z[m][s]]); az = num(A[DELTA_Z[m][s]]);
			}
			if (bv == null || av == null) continue;
			let change = Math.round((av - bv) * 100) / 100;
			if (FLIPPED.has(key)) change *= -1;
			cells.push({
				label: s === 'r' ? 'Rating' : s === 'o' ? 'Offense' : 'Defense',
				change,
				rank: ar,
				rankChange: br != null && ar != null ? br - ar : 0,
				strength: bz != null && az != null ? Math.min(1, Math.abs(az - bz) / 0.3) : Math.min(1, Math.abs(change) * 5)
			});
		}
		if (cells.length) out[m] = cells;
	}
	return Object.keys(out).length ? out : null;
}

const MATCHUP: { label: string; off: string; def: string; offRank?: string; defRank?: string; fmt: 'eff' | 'pct' | 'dec' }[] = [
	// value: KenPom adjusted efficiency; rank: composite offense / defense rank (as the old page ranked it)
	{ label: 'Overall efficiency', off: 'kp_offensive_rating', def: 'kp_defensive_rating', offRank: 'comp_avg_offensive_zscore_rank', defRank: 'comp_avg_defensive_zscore_rank', fmt: 'eff' },
	{ label: 'Effective FG%', off: 'bt_efg_pct', def: 'bt_efgd_pct', fmt: 'pct' },
	{ label: '2pt shooting', off: 'bt_2p_pct', def: 'bt_2p_pct_d', fmt: 'pct' },
	{ label: '3pt shooting', off: 'bt_3p_pct', def: 'bt_3p_pct_d', fmt: 'pct' },
	{ label: '3pt rate', off: 'bt_3pr', def: 'bt_3prd', fmt: 'pct' },
	{ label: 'Free throw rate', off: 'bt_ftr', def: 'bt_ftrd', fmt: 'pct' },
	{ label: 'Assist %', off: 'espn_off_assist_percentage', def: 'espn_opp_off_assist_percentage', fmt: 'pct' },
	{ label: 'Turnover rate', off: 'bt_tor', def: 'bt_tord', fmt: 'pct' },
	{ label: 'Off. rebound rate', off: 'bt_orb', def: 'bt_drb', fmt: 'pct' },
	{ label: 'Killshots / game', off: 'em_kill_shots_per_game', def: 'em_kill_shots_conceded_per_game', fmt: 'dec' }
];

function matchupRows(offense: FullRatings | null, defense: FullRatings | null): CmpRow[] {
	const O = (offense ?? {}) as unknown as Record<string, number>;
	const D = (defense ?? {}) as unknown as Record<string, number>;
	const show = (v: number, f: 'eff' | 'pct' | 'dec') => (f === 'pct' ? `${r1(v).toFixed(1)}%` : f === 'eff' ? r1(v).toFixed(1) : v.toFixed(1));
	const cell = (src: Record<string, number>, key: string, rankKey: string, f: 'eff' | 'pct' | 'dec') => {
		const v = num(src[key]), rk = num(src[rankKey]);
		return v != null && rk != null ? { value: show(v, f), rank: rk } : null;
	};
	return MATCHUP.map(r => ({
		label: r.label,
		off: cell(O, r.off, r.offRank ?? `${r.off}_rank`, r.fmt),
		def: cell(D, r.def, r.defRank ?? `${r.def}_rank`, r.fmt)
	}));
}

// ── models card ──

function modelCells(history: ProfileRatingsHistory | undefined, date: string | null): { cells: Partial<Record<ModelKey, ModelCell>>; asOf: string | null } {
	const h = historyBefore(history, date);
	if (!h) return { cells: {}, asOf: null };
	const R = h.row as unknown as Record<string, number>;
	const comp = pickCompositeCombo(h.row.composite_combos, 'kp,em,bt,net') as unknown as Record<string, number> | undefined;
	const cell = (src: Record<string, number> | undefined, v: string, rk: string, o: string | null, d: string | null): ModelCell | null => {
		const rank = num(src?.[rk]);
		if (rank == null) return null;
		return { value: num(src?.[v]), rank, ork: o ? num(src?.[o]) : null, drk: d ? num(src?.[d]) : null };
	};
	const cells: Partial<Record<ModelKey, ModelCell>> = {};
	const c = cell(comp, 'avg_zscore', 'avg_zscore_rank', 'avg_offensive_zscore_rank', 'avg_defensive_zscore_rank');
	if (c) cells.comp = c;
	for (const m of ['kp', 'em', 'bt'] as const) {
		const x = cell(R, `${m}_rating`, `${m}_rating_rank`, `${m}_offensive_rating_rank`, `${m}_defensive_rating_rank`);
		if (x) cells[m] = x;
	}
	const net = cell(R, 'net_rank', 'net_rank', null, null);
	if (net) cells.net = { ...net, value: null };
	return { cells, asOf: h.date };
}

// ── main ──

export async function getGamePageData(gameId: string): Promise<GamePageData> {
	const game = await getGame(gameId);
	const phase = phaseOf(game);
	const date = game.date.slice(0, 10);
	const season = getSeasonForDate(date);
	const away = game.teams.away;
	const home = game.teams.home;

	const scheduleIds = [away, home].flatMap(t => ((t?.profile?.schedule ?? []) as unknown as EspnGameEnriched[]).map(g => g.game_id));

	const [teamData, lines, stored, ranks, ranksMap, awayKp, homeKp] = await Promise.all([
		getAllTeamData().catch(() => ({}) as Record<string, TeamData>),
		getLines([gameId, ...scheduleIds]),
		getStoredPredictions([gameId]),
		compositeRanksAsOf(season, date),
		getTeamRanksMap(season).catch(err => {
			console.error('[game] ranks map failed:', err);
			return {} as RanksMap;
		}),
		away?.team_key ? kenpomContext(away.team_key, season, date) : Promise.resolve(null),
		home?.team_key ? kenpomContext(home.team_key, season, date) : Promise.resolve(null)
	]);

	const [ac, hc] = matchupTones(away?.metadata, home?.metadata);
	const ratings = { away: latestRatings(away, season), home: latestRatings(home, season) };

	// ── prediction ──
	let prediction: PagePrediction | null = null;
	const savedRow = stored.get(gameId);
	if (phase === 'pre' && away?.team_key && home?.team_key) {
		const p = await fetchModelPrediction(home.team_key, away.team_key);
		if (p) {
			const s = toStored(gameId, p);
			const tipped = game.start ? Date.parse(game.start) <= Date.now() : false;
			if (!tipped) await savePregamePrediction(s);
			prediction = { ...s, frozen: false };
		} else if (savedRow) {
			prediction = { ...savedRow, frozen: false };
		}
	} else if (savedRow) {
		prediction = { ...savedRow, frozen: true };
	}

	// ── past games (entering this game) ──
	const form: Record<Side, PastGame[]> = { away: [], home: [] };
	const past: Record<Side, PastGame[]> = { away: [], home: [] };
	for (const s of ['away', 'home'] as const) {
		past[s] = pastGames(game.teams[s], date, gameId, lines, teamData, ranks);
		form[s] = past[s].slice(0, 5);
	}

	// ── header ──
	const header = (s: Side, color: string, kp: Awaited<ReturnType<typeof kenpomContext>>): TeamHeader => {
		const t = game.teams[s];
		const meta = t?.metadata;
		const fr = ratings[s] as unknown as Record<string, number> | null;
		// record after this game once it's final, else entering it
		const games = past[s];
		const won = phase === 'final' ? [{ won: !!t?.won }] : [];
		const rec = games.length || won.length ? record([...games, ...won]) : null;
		const periods = (t?.stats as GameTeamStats | undefined)?.periods ?? null;
		const compH = historyBefore(t?.profile?.ratings_history, phase === 'pre' ? null : date);
		const combo = compH ? (pickCompositeCombo(compH.row.composite_combos, 'kp,em,bt,net') as unknown as Record<string, number> | undefined) : undefined;
		return {
			teamKey: t?.team_key ?? null,
			name: meta?.short_name || t?.profile?.team_name || t?.name || 'TBD',
			abbr: meta?.abbreviation || t?.name || 'TBD',
			color,
			ap: num(fr?.ap_rank),
			record: rec,
			conference: kp?.conference ?? ((fr as unknown as Record<string, string> | null)?.net_conf || null),
			comp: combo
				? { rank: num(combo.avg_zscore_rank), ork: num(combo.avg_offensive_zscore_rank), drk: num(combo.avg_defensive_zscore_rank) }
				: fr
					? { rank: null, ork: num(fr.comp_avg_offensive_zscore_rank), drk: num(fr.comp_avg_defensive_zscore_rank) }
					: null,
			score: phase === 'pre' ? null : (t?.score ?? null),
			periods: periods && periods.length ? periods : null
		};
	};

	// ── tale of the tape ──
	const tapeFor = (s: Side) => {
		const g = past[s];
		const kp = s === 'away' ? awayKp : homeKp;
		const fr = ratings[s] as unknown as Record<string, string | number> | null;
		const venue = game.neutral_site ? 'neutral' : s === 'away' ? 'away' : 'home';
		const at = g.filter(x => (venue === 'neutral' ? x.loc === 'N' : venue === 'away' ? x.loc === '@' : x.loc === 'vs'));
		const close = g.filter(x => Math.abs(x.margin) <= 5);
		const q1 = typeof fr?.net_quad_1 === 'string' ? fr.net_quad_1 : null;
		const atsR = atsRecord(g);
		const avgMargin = g.length ? g.reduce((t, x) => t + x.margin, 0) / g.length : null;
		return {
			record: g.length ? record(g) : '0-0',
			recPct: winPct(g),
			venue: `${record(at)} ${venue}`,
			q1,
			q1Wins: q1 ? parseInt(q1.split('-')[0]) : null,
			ats: atsR.text,
			atsPct: atsR.pct,
			sos: kp?.sos_net_rating_rank ?? null,
			tempo: kp?.adjusted_tempo != null ? `${Number(kp.adjusted_tempo).toFixed(1)}${kp.adjusted_tempo_rank ? ` (#${kp.adjusted_tempo_rank})` : ''}` : '—',
			margin: avgMargin,
			close: record(close)
		};
	};
	const ta = tapeFor('away'), th = tapeFor('home');
	const signed = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}`);
	const tape: TapeRow[] = [
		{ label: 'Record', away: ta.record, home: th.record, better: better(ta.recPct, th.recPct) },
		{ label: game.neutral_site ? 'Neutral site' : 'Away / home', away: ta.venue, home: th.venue, better: null },
		{ label: 'Quad 1', away: ta.q1 ?? '—', home: th.q1 ?? '—', better: better(ta.q1Wins, th.q1Wins) },
		{ label: 'Against the spread', short: 'Vs. spread', away: ta.ats, home: th.ats, better: better(ta.atsPct, th.atsPct) },
		{ label: 'Strength of schedule', short: 'Schedule rank', away: ta.sos ? `#${ta.sos}` : '—', home: th.sos ? `#${th.sos}` : '—', better: better(ta.sos, th.sos, true) },
		{ label: 'Tempo', away: ta.tempo, home: th.tempo, better: null },
		{ label: 'Avg margin', away: signed(ta.margin), home: signed(th.margin), better: better(ta.margin, th.margin) },
		{ label: 'Close games (5 pts)', short: 'Close games', away: ta.close, home: th.close, better: null }
	];

	// ── models ──
	const modelDate = phase === 'pre' ? null : date;
	const am = modelCells(away?.profile?.ratings_history, modelDate);
	const hm = modelCells(home?.profile?.ratings_history, modelDate);
	const models: ModelRow[] = (['comp', 'kp', 'em', 'bt', 'net'] as const)
		.map(k => ({ key: k, away: am.cells[k] ?? null, home: hm.cells[k] ?? null }))
		.filter(r => r.away || r.home);

	// ── similar opponents ──
	let similar: Record<Side, SimilarCategory[]> | null = null;
	if (away?.team_key && home?.team_key && ranksMap[away.team_key] && ranksMap[home.team_key]) {
		similar = { away: [], home: [] };
		for (const s of ['away', 'home'] as const) {
			const target = ranksMap[game.teams[other(s)].team_key];
			similar[s] = SIMILAR_CATEGORIES.map(def => ({
				key: def.key,
				label: def.label,
				games: rankSimilar(past[s], target, ranksMap, def).slice(0, 10)
			}));
		}
	}

	const started = phase !== 'pre';
	const box = started ? boxScore(away?.stats, home?.stats) : null;
	const deltas =
		phase === 'final'
			? (() => {
					const a = ratingChanges(away?.profile?.ratings_history, date);
					const h = ratingChanges(home?.profile?.ratings_history, date);
					return a || h ? { away: a ?? {}, home: h ?? {} } : null;
				})()
			: null;

	const lineRow = lines.get(gameId);
	const awayName = away?.metadata?.name || away?.profile?.team_name || away?.name || 'Away';
	const homeName = home?.metadata?.name || home?.profile?.team_name || home?.name || 'Home';

	return {
		gameId,
		phase,
		date,
		dateLabel: fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
		timeLabel:
			phase === 'pre'
				? game.start
					? `${new Date(game.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET`
					: game.clock || null
				: null,
		clockLabel: phase === 'live' ? (game.is_halftime ? 'Half' : `${ordinal(game.half || 1)} · ${game.clock}`) : null,
		broadcast: game.broadcast ?? null,
		venue: game.venue ?? null,
		neutral: !!game.neutral_site,
		away: header('away', ac, awayKp),
		home: header('home', hc, homeKp),
		line: lineRow ? { homeSpread: lineRow.homeSpread, overUnder: lineRow.overUnder } : null,
		prediction,
		tape,
		tapeNote: phase === 'pre' ? 'This season so far' : 'Entering this game',
		models,
		modelsAsOf: am.asOf ?? hm.asOf,
		form,
		box,
		vsAvg: started && box && away && home ? { away: vsAverage(away, home, ratings.away), home: vsAverage(home, away, ratings.home) } : null,
		deltas,
		matchup: ratings.away || ratings.home ? { awayOff: matchupRows(ratings.away, ratings.home), homeOff: matchupRows(ratings.home, ratings.away) } : null,
		similar,
		title: { away: awayName, home: homeName },
		jsonLd: {
			'@context': 'https://schema.org',
			'@type': 'SportsEvent',
			name: `${awayName} vs ${homeName}`,
			url: `https://cbbcomposite.com/games/${gameId}`,
			startDate: game.start ?? date,
			homeTeam: { '@type': 'SportsTeam', name: homeName },
			awayTeam: { '@type': 'SportsTeam', name: awayName },
			sport: 'Basketball',
			eventStatus: 'https://schema.org/EventScheduled'
		}
	};
}
