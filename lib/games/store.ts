// Storage for betting lines (game_lines) and frozen pre-game predictions (game_predictions).
// Both tables come from scripts/migrations/2026-11-game-lines-predictions.sql. Until that has been
// run every read returns nothing and every write is skipped, so the pages keep working.
import { PostgresService } from '../database';
import type { GameLine } from './line-utils';

const db = PostgresService.getInstance();

const warned = new Set<string>();

/** Postgres "relation does not exist": the migration hasn't been run yet. */
function isMissingTable(err: unknown, table: string): boolean {
	const e = err as { code?: string };
	if (e?.code !== '42P01') return false;
	if (!warned.has(table)) {
		warned.add(table);
		console.warn(`[games] table ${table} is missing; run scripts/migrations/2026-11-game-lines-predictions.sql`);
	}
	return true;
}

async function safe<T>(table: string, fallback: T, run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (err) {
		if (isMissingTable(err, table)) return fallback;
		console.error(`[games] ${table} query failed:`, err);
		return fallback;
	}
}

// ── Lines ──

export async function getLines(gameIds: string[]): Promise<Map<string, GameLine>> {
	const ids = [...new Set(gameIds.filter(Boolean))];
	if (ids.length === 0) return new Map();
	return safe('game_lines', new Map<string, GameLine>(), async () => {
		const rows = await db.query<{ game_id: string; home_spread: number | null; over_under: number | null; source: string | null }>(
			'SELECT game_id, home_spread, over_under, source FROM game_lines WHERE game_id = ANY($1)',
			[ids]
		);
		return new Map(
			rows.map(r => [
				r.game_id,
				{
					homeSpread: r.home_spread == null ? null : Number(r.home_spread),
					overUnder: r.over_under == null ? null : Number(r.over_under),
					source: r.source
				}
			])
		);
	});
}

export interface LineWrite {
	gameId: string;
	homeSpread: number | null;
	overUnder: number | null;
	source: string;
}

/** Upserts lines. A null spread or total never wipes a value already stored. */
export async function saveLines(lines: LineWrite[]): Promise<void> {
	// one row per game: a repeated id in one INSERT ... ON CONFLICT is an error
	const byId = new Map(lines.filter(l => l.gameId && (l.homeSpread != null || l.overUnder != null)).map(l => [l.gameId, l]));
	const rows = [...byId.values()];
	if (rows.length === 0) return;
	await safe('game_lines', undefined, async () => {
		await db.query(
			`INSERT INTO game_lines (game_id, home_spread, over_under, source, updated_at)
			SELECT * , now() FROM unnest($1::text[], $2::numeric[], $3::numeric[], $4::text[])
			ON CONFLICT (game_id) DO UPDATE SET
				home_spread = COALESCE(EXCLUDED.home_spread, game_lines.home_spread),
				over_under = COALESCE(EXCLUDED.over_under, game_lines.over_under),
				source = EXCLUDED.source,
				updated_at = now()`,
			[rows.map(r => r.gameId), rows.map(r => r.homeSpread), rows.map(r => r.overUnder), rows.map(r => r.source)]
		);
	});
}

// ── Predictions ──

export interface KeyToGame {
	label: string;
	description: string;
	impact: number;
	advantage: 'team' | 'opponent' | 'neutral';
}

export interface StoredPrediction {
	gameId: string;
	homeWinProb: number;
	homeScore: number | null;
	awayScore: number | null;
	/** Model's home spread, line convention: negative = home favored */
	spread: number | null;
	total: number | null;
	modelVersion: string | null;
	keys: { home: KeyToGame[]; away: KeyToGame[] } | null;
	createdAt: string | null;
}

interface PredictionRow {
	game_id: string;
	home_win_prob: number;
	home_score: number | null;
	away_score: number | null;
	spread: number | null;
	total: number | null;
	model_version: string | null;
	keys: { home: KeyToGame[]; away: KeyToGame[] } | null;
	created_at: Date | string | null;
}

const n = (v: unknown) => (v == null ? null : Number(v));

function rowToPrediction(r: PredictionRow): StoredPrediction {
	return {
		gameId: r.game_id,
		homeWinProb: Number(r.home_win_prob),
		homeScore: n(r.home_score),
		awayScore: n(r.away_score),
		spread: n(r.spread),
		total: n(r.total),
		modelVersion: r.model_version,
		keys: r.keys ?? null,
		createdAt: r.created_at == null ? null : new Date(r.created_at).toISOString()
	};
}

export async function getStoredPredictions(gameIds: string[]): Promise<Map<string, StoredPrediction>> {
	const ids = [...new Set(gameIds.filter(Boolean))];
	if (ids.length === 0) return new Map();
	return safe('game_predictions', new Map<string, StoredPrediction>(), async () => {
		const rows = await db.query<PredictionRow>('SELECT * FROM game_predictions WHERE game_id = ANY($1)', [ids]);
		return new Map(rows.map(r => [r.game_id, rowToPrediction(r)]));
	});
}

/**
 * Saves the model's prediction for a game that has not started. Called again before tip it
 * refreshes the row (ratings and the model move during the day), so the row that survives is the
 * last one made before tip-off. Callers must only call this for games that have not started.
 */
export async function savePregamePrediction(p: Omit<StoredPrediction, 'createdAt'>): Promise<void> {
	await safe('game_predictions', undefined, async () => {
		await db.query(
			`INSERT INTO game_predictions (game_id, home_win_prob, home_score, away_score, spread, total, model_version, keys, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
			ON CONFLICT (game_id) DO UPDATE SET
				home_win_prob = EXCLUDED.home_win_prob, home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score,
				spread = EXCLUDED.spread, total = EXCLUDED.total, model_version = EXCLUDED.model_version,
				keys = EXCLUDED.keys, created_at = now()`,
			[p.gameId, p.homeWinProb, p.homeScore, p.awayScore, p.spread, p.total, p.modelVersion, p.keys ? JSON.stringify(p.keys) : null]
		);
	});
}
