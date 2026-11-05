import type { ParsedEspnGame } from '@/lib/espn/schedule';
import type { ProfileRatingsHistory } from '@/lib/rankings/profile';
import { type CompiledTeamData, type CompositeCombo, pickCompositeCombo } from '@/lib/shared';

export type RatingSource = 'composite' | 'kenpom' | 'evanmiya' | 'barttorvik';
export type RatingType = 'rating' | 'offensiveRating' | 'defensiveRating';

export const RATING_SOURCES: { key: RatingSource; label: string; short: string; color: string }[] = [
	{ key: 'composite', label: 'Composite', short: 'Comp', color: '#a78bfa' },
	{ key: 'kenpom', label: 'KenPom', short: 'KP', color: '#60a5fa' },
	{ key: 'evanmiya', label: 'EvanMiya', short: 'EM', color: '#34d399' },
	{ key: 'barttorvik', label: 'BartTorvik', short: 'BT', color: '#fb923c' }
];

// NCAA NET quadrants by game site and the opponent's NET rank
const QUAD_CUTS: Record<ParsedEspnGame['homeAway'], [number, number, number]> = {
	home: [30, 75, 160],
	neutral: [50, 100, 200],
	away: [75, 135, 240]
};

export function quadrant(game: ParsedEspnGame): 1 | 2 | 3 | 4 | null {
	const rank = game.opp.net_rank;
	const cuts = QUAD_CUTS[game.homeAway];
	if (rank == null || !Number.isFinite(rank) || !cuts) return null;
	if (rank <= cuts[0]) return 1;
	if (rank <= cuts[1]) return 2;
	if (rank <= cuts[2]) return 3;
	return 4;
}

export const QUAD_STYLE: Record<number, string> = {
	1: 'bg-emerald-500/15 text-emerald-300',
	2: 'bg-lime-500/10 text-lime-300',
	3: 'bg-amber-500/10 text-amber-300',
	4: 'bg-rose-500/10 text-rose-300'
};

export const locLabel = (g: { homeAway: string }) => (g.homeAway === 'home' ? 'vs' : g.homeAway === 'away' ? '@' : 'n');

export const shortDate = (date: string) =>
	new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// ESPN lists tip times in Eastern
export function localTime(time: string | undefined) {
	if (!time) return '';
	if (time === 'TBD') return 'TBD';
	const date = new Date(`${new Date().toDateString()} ${time} GMT-0500`);
	if (Number.isNaN(date.getTime())) return time;
	return date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

const keyMap: Record<RatingType, Record<RatingSource, keyof CompiledTeamData>> = {
	rating: { composite: 'rating_score', kenpom: 'kp_rating', evanmiya: 'em_rating', barttorvik: 'bt_rating' },
	offensiveRating: {
		composite: 'per70_offensive_rating',
		kenpom: 'kp_offensive_rating',
		evanmiya: 'em_offensive_rating',
		barttorvik: 'bt_offensive_rating'
	},
	defensiveRating: {
		composite: 'per70_defensive_rating',
		kenpom: 'kp_defensive_rating',
		evanmiya: 'em_defensive_rating',
		barttorvik: 'bt_defensive_rating'
	}
};

const zscoreKeyMap: Record<RatingType, Record<RatingSource, string>> = {
	rating: { composite: 'avg_zscore', kenpom: 'kp_rating_zscore', evanmiya: 'em_rating_zscore', barttorvik: 'bt_rating_zscore' },
	offensiveRating: {
		composite: 'avg_offensive_zscore',
		kenpom: 'kp_offensive_zscore',
		evanmiya: 'em_offensive_zscore',
		barttorvik: 'bt_offensive_zscore'
	},
	defensiveRating: {
		composite: 'avg_defensive_zscore',
		kenpom: 'kp_defensive_zscore',
		evanmiya: 'em_defensive_zscore',
		barttorvik: 'bt_defensive_zscore'
	}
};

export type CellValue =
	| { kind: 'opponent'; value: number; rank: number | null }
	| { kind: 'delta'; delta: number; rankDelta: number; zPct: number }
	| { kind: 'none' };

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The opponent's rating (Opponent view) or how this game moved the team's own rating (Game delta view) */
export function ratingCell(
	game: ParsedEspnGame,
	ratingType: RatingType,
	viewMode: string,
	source: RatingSource,
	history: ProfileRatingsHistory,
	compositeKey: string
): CellValue {
	const ratingKey = keyMap[ratingType][source];
	// The composite shows its 0-100 rating / per-70 values but ranks by its z-score
	const isComposite = source === 'composite';
	const rankKey = isComposite ? `${zscoreKeyMap[ratingType].composite}_rank` : `${ratingKey}_rank`;

	if (viewMode !== 'game_delta') {
		let value = Number(game.opp[ratingKey]);
		let rank: number | null = Number(game.opp[rankKey as keyof CompiledTeamData]);
		if (isComposite && game.opp.team_key) {
			const combo = pickCompositeCombo(game.opp.composite_combos, compositeKey);
			value = Number(combo?.[ratingKey as keyof CompositeCombo]);
			rank = Number(combo?.[rankKey as keyof CompositeCombo]);
		}
		if (!finite(value)) return { kind: 'none' };
		return { kind: 'opponent', value, rank: finite(rank) ? rank : null };
	}

	// Game delta: the team's rating the day after the game minus the day before
	const { prev, next } = surroundingDays(game.date);
	const before = history[prev];
	const after = history[next];
	if (!before || !after) return { kind: 'none' };

	let beforeValue: number, afterValue: number, beforeRank: number, afterRank: number, beforeZ: number, afterZ: number;
	if (isComposite) {
		const b = pickCompositeCombo(before.composite_combos, compositeKey) as unknown as Record<string, number> | undefined;
		const a = pickCompositeCombo(after.composite_combos, compositeKey) as unknown as Record<string, number> | undefined;
		const zKey = zscoreKeyMap[ratingType].composite;
		beforeValue = b?.[ratingKey] ?? NaN;
		afterValue = a?.[ratingKey] ?? NaN;
		beforeZ = b?.[zKey] ?? NaN;
		afterZ = a?.[zKey] ?? NaN;
		beforeRank = b?.[rankKey] ?? NaN;
		afterRank = a?.[rankKey] ?? NaN;
	} else {
		const b = before as unknown as Record<string, number>;
		const a = after as unknown as Record<string, number>;
		const zKey = zscoreKeyMap[ratingType][source];
		beforeValue = b[ratingKey];
		afterValue = a[ratingKey];
		beforeRank = b[`${ratingKey}_rank`];
		afterRank = a[`${ratingKey}_rank`];
		beforeZ = b[zKey];
		afterZ = a[zKey];
	}

	let delta = Math.round((afterValue - beforeValue) * 100) / 100;
	// KenPom, BartTorvik and composite defense are points allowed: going down is good
	if (['kp_defensive_rating', 'bt_defensive_rating', 'per70_defensive_rating'].includes(ratingKey)) delta *= -1;
	if (!finite(delta)) return { kind: 'none' };
	return { kind: 'delta', delta, rankDelta: beforeRank - afterRank, zPct: ((afterZ - beforeZ) / 5) * 100 };
}

function surroundingDays(date: string) {
	const d = new Date(`${date}T00:00:00`);
	const prev = new Date(d);
	prev.setDate(d.getDate() - 1);
	const next = new Date(d);
	next.setDate(d.getDate() + 1);
	return { prev: prev.toISOString().split('T')[0], next: next.toISOString().split('T')[0] };
}

/** Composite combo key ('kp,em,bt,net') from the models filter cookie */
export function compositeKeyFor(sourcesFilter: string[]) {
	const order = ['kp', 'em', 'bt', 'net'];
	const selected = sourcesFilter.map(s => s.replaceAll(/[a-z]+/g, '').toLowerCase());
	return selected.length ? order.filter(s => selected.includes(s)).join(',') : order.join(',');
}
