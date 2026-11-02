// Server-side calls to the ML prediction service, with a short in-memory cache so a busy
// scoreboard doesn't ask for the same matchup over and over.
import type { KeyToGame, StoredPrediction } from './store';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8100';
const TTL = 20 * 60 * 1000;

interface MlTeam {
	team_key: string;
	win_probability: number;
	predicted_score: number;
	keys_to_game: KeyToGame[];
}

export interface MlPrediction {
	home: MlTeam;
	away: MlTeam;
	/** predicted home margin: positive = home wins by that much */
	predicted_spread: number;
	predicted_total: number;
	model_version: string;
}

const cache = new Map<string, { at: number; value: MlPrediction | null }>();

export async function fetchModelPrediction(homeKey: string, awayKey: string): Promise<MlPrediction | null> {
	if (!homeKey || !awayKey) return null;
	const key = `${homeKey}|${awayKey}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL) return hit.value;

	let value: MlPrediction | null = null;
	try {
		const res = await fetch(`${ML_API_URL}/predict`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ home_team_key: homeKey, away_team_key: awayKey }),
			signal: AbortSignal.timeout(10000),
			cache: 'no-store'
		});
		if (res.ok) {
			const data = await res.json();
			if (data?.home && data?.away) value = data as MlPrediction;
		}
	} catch {
		value = null;
	}
	// failures are cached briefly too, so a down service doesn't stall every request
	cache.set(key, { at: value ? Date.now() : Date.now() - TTL + 60_000, value });
	if (cache.size > 2000) cache.delete(cache.keys().next().value!);
	return value;
}

/** ML response -> the stored shape (home spread in line convention: negative = home favored). */
export function toStored(gameId: string, p: MlPrediction): Omit<StoredPrediction, 'createdAt'> {
	return {
		gameId,
		homeWinProb: p.home.win_probability,
		homeScore: p.home.predicted_score,
		awayScore: p.away.predicted_score,
		spread: Math.round(-p.predicted_spread * 10) / 10,
		total: p.predicted_total,
		modelVersion: p.model_version,
		keys: { home: p.home.keys_to_game ?? [], away: p.away.keys_to_game ?? [] }
	};
}

/** Runs fn over items with at most `limit` in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) {
				const i = next++;
				out[i] = await fn(items[i]);
			}
		})
	);
	return out;
}
