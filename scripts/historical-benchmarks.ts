/**
 * Shared historical benchmark data for bracket simulation scripts.
 * Computed from NCAA tournament database (2002-2025, excluding 2020).
 */

/** Average upsets per round [mean, stddev]. */
export const HISTORICAL_UPSETS: Record<number, [number, number]> = {
	1: [8.4, 2.3], 2: [5.8, 1.5], 3: [2.8, 1.2], 4: [1.7, 0.7], 5: [0.8, 0.5], 6: [0.3, 0.3],
};

/** Average double-digit seed (10+) winners per round [mean, stddev]. */
export const HISTORICAL_DD: Record<number, [number, number]> = {
	1: [5.5, 1.8], 2: [2.4, 1.3], 3: [0.8, 0.7], 4: [0.3, 0.4],
};

/** Average deepest round won by each seed (derived from unconditional win rates). */
export const HISTORICAL_DEPTH: Record<number, number> = {
	1: 4.3, 2: 3.2, 3: 2.9, 4: 2.5, 5: 2.1, 6: 1.8, 7: 1.9, 8: 1.7,
	9: 1.1, 10: 1.5, 11: 1.6, 12: 1.5, 13: 1.2, 14: 1.1, 15: 1.1, 16: 1.0,
};
