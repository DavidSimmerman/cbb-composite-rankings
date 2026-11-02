// Similar-opponent matching (moved from the old app/games/[gameId]/components/SimilarGames.tsx).
// A past opponent's match score is 100 minus the weighted, square-rooted rank distance to
// tonight's opponent over the category's fields; anything under 60 is dropped.
import type { RanksMap, TeamRanks } from '../rankings/ranks-map';

const MAX_RANK = 363;
export const MIN_MATCH = 60;

interface FieldWeight {
	field: keyof TeamRanks;
	weight: number;
}

export interface SimilarCategoryDef {
	key: string;
	label: string;
	fieldWeights: FieldWeight[];
}

export const SIMILAR_CATEGORIES: SimilarCategoryDef[] = [
	{
		key: 'rating',
		label: 'Similarly rated',
		fieldWeights: [
			{ field: 'offRating', weight: 40 },
			{ field: 'defRating', weight: 40 },
			{ field: 'offDefDiff', weight: 20 }
		]
	},
	{
		key: 'overall',
		label: 'Overall',
		fieldWeights: [
			{ field: 'offRating', weight: 22.5 },
			{ field: 'defRating', weight: 27.5 },
			{ field: 'tempo', weight: 15 },
			{ field: 'offDefDiff', weight: 10 },
			{ field: 'off3ptRate', weight: 5 },
			{ field: 'off3ptPct', weight: 5 },
			{ field: 'offEfgPct', weight: 5 },
			{ field: 'offRebRate', weight: 5 },
			{ field: 'defRebRate', weight: 5 }
		]
	},
	{
		key: 'offense',
		label: 'Offense',
		fieldWeights: [
			{ field: 'offRating', weight: 20 },
			{ field: 'tempo', weight: 15 },
			{ field: 'off3ptRate', weight: 15 },
			{ field: 'off3ptPct', weight: 15 },
			{ field: 'offEfgPct', weight: 10 },
			{ field: 'offFtRate', weight: 10 },
			{ field: 'offAstPct', weight: 5 },
			{ field: 'offToPct', weight: 5 },
			{ field: 'offKillshots', weight: 5 }
		]
	},
	{
		key: 'defense',
		label: 'Defense',
		fieldWeights: [
			{ field: 'defRating', weight: 20 },
			{ field: 'def3ptRate', weight: 15 },
			{ field: 'def3ptPct', weight: 15 },
			{ field: 'defEfgPct', weight: 15 },
			{ field: 'defFtRate', weight: 10 },
			{ field: 'defAstPct', weight: 10 },
			{ field: 'defToPct', weight: 10 },
			{ field: 'defKillshots', weight: 5 }
		]
	},
	{
		key: 'reb',
		label: 'Rebounding',
		fieldWeights: [
			{ field: 'offRebRate', weight: 50 },
			{ field: 'defRebRate', weight: 50 }
		]
	}
];

/** Match score (0-100) of a past opponent against tonight's opponent, or null if a field is missing. */
export function matchScore(target: TeamRanks, opp: TeamRanks, fieldWeights: FieldWeight[]): number | null {
	const total = fieldWeights.reduce((s, fw) => s + fw.weight, 0);
	let diff = 0;
	for (const { field, weight } of fieldWeights) {
		const t = target[field];
		const o = opp[field];
		if (t == null || o == null || Number.isNaN(t) || Number.isNaN(o)) return null;
		const nd = field === 'offDefDiff' ? Math.abs(t - o) / (2 * MAX_RANK) : Math.abs(t - o) / MAX_RANK;
		diff += Math.sqrt(nd) * (weight / total);
	}
	return Math.round(100 * (1 - diff));
}

export function rankSimilar<T extends { oppKey: string }>(
	games: T[],
	target: TeamRanks,
	ranksMap: RanksMap,
	def: SimilarCategoryDef
): (T & { match: number })[] {
	const out: (T & { match: number })[] = [];
	for (const g of games) {
		const opp = ranksMap[g.oppKey];
		if (!opp) continue;
		const m = matchScore(target, opp, def.fieldWeights);
		if (m == null || m < MIN_MATCH) continue;
		out.push({ ...g, match: m });
	}
	return out.sort((a, b) => b.match - a.match);
}
