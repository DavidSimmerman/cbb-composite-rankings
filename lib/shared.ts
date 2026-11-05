import { TeamData } from './espn/espn-team-data';
import { CompositeRanking } from './rankings/composite';

/** One composite variant (a set of models) as sent to the browser: just the numbers it shows. */
export type CompositeCombo = Pick<
	CompositeRanking,
	| 'sources'
	| 'avg_zscore'
	| 'avg_zscore_rank'
	| 'avg_offensive_zscore'
	| 'avg_offensive_zscore_rank'
	| 'avg_defensive_zscore'
	| 'avg_defensive_zscore_rank'
	| 'per70_offensive_rating'
	| 'per70_defensive_rating'
> & { rating_score: number | null }; // 0-100, worked out when read (lib/rankings/rating-scale.ts)

export type BaseTeamData = {
	team_key: string;
	team_name: string;
	conference: string;
	record: string;
	season: string;
	kp_rating: number;
	kp_rating_rank: number;
	kp_offensive_rating: number;
	kp_offensive_rating_rank: number;
	kp_defensive_rating: number;
	kp_defensive_rating_rank: number;
	em_rating: number;
	em_rating_rank: number;
	em_offensive_rating: number;
	em_offensive_rating_rank: number;
	em_defensive_rating: number;
	em_defensive_rating_rank: number;
	bt_rating: number;
	bt_rating_rank: number;
	bt_offensive_rating: number;
	bt_offensive_rating_rank: number;
	bt_defensive_rating: number;
	bt_defensive_rating_rank: number;
	net_rank: number;
	net_q1_record: string;
	net_q2_record: string;
	net_q3_record: string;
	net_q4_record: string;
	net_q1_wins: number;
	net_q2_wins: number;
	net_q3_wins: number;
	net_q4_wins: number;
	kp_rating_zscore: number;
	kp_offensive_rating_zscore: number;
	kp_defensive_rating_zscore: number;
	em_rating_zscore: number;
	em_offensive_rating_zscore: number;
	em_defensive_rating_zscore: number;
	bt_rating_zscore: number;
	bt_offensive_rating_zscore: number;
	bt_defensive_rating_zscore: number;
	net_rank_zscore: number;
	ap_rank: number | undefined;
};

export type CompiledTeamData = BaseTeamData & {
	avg_zscore: number;
	avg_zscore_rank: number;
	avg_offensive_zscore: number;
	avg_offensive_zscore_rank: number;
	avg_defensive_zscore: number;
	avg_defensive_zscore_rank: number;
	rating_score: number | null;
	per70_offensive_rating: number | null;
	per70_defensive_rating: number | null;
	composite_combos: Record<string, CompositeCombo>;
	metadata: TeamData;
};

export const sourceSystems = [
	{
		key: 'KenPom',
		overall: 'kp_rating_zscore',
		offensive: 'kp_offensive_rating_zscore',
		defensive: 'kp_defensive_rating_zscore'
	},
	{
		key: 'EvanMiya',
		overall: 'em_rating_zscore',
		offensive: 'em_offensive_rating_zscore',
		defensive: 'em_defensive_rating_zscore'
	},
	{
		key: 'BartTorvik',
		overall: 'bt_rating_zscore',
		offensive: 'bt_offensive_rating_zscore',
		defensive: 'bt_defensive_rating_zscore'
	},
	{ key: 'NET', overall: 'net_rank_zscore', offensive: null, defensive: null }
] as const;

export type SourceSystem = (typeof sourceSystems)[number];

export function computeAverageZScores(
	baseTeams: BaseTeamData[],
	sources: readonly SourceSystem[] = sourceSystems
): CompiledTeamData[] {
	const teams = structuredClone(baseTeams) as CompiledTeamData[];

	const overallKeys = sources.map(s => s.overall);
	const offensiveKeys = sources.map(s => s.offensive).filter(k => k !== null);
	const defensiveKeys = sources.map(s => s.defensive).filter(k => k !== null);

	// Sources that haven't published this season are null; average only the ones present
	function average(team: CompiledTeamData, keys: readonly string[]) {
		const values = keys.map(k => team[k as keyof CompiledTeamData]).filter((v): v is number => typeof v === 'number');
		return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
	}

	teams.forEach(team => {
		team.avg_zscore = average(team, overallKeys);
		team.avg_offensive_zscore = average(team, offensiveKeys);
		team.avg_defensive_zscore = average(team, defensiveKeys);
	});

	const scale = kenPomScale(teams);
	teams.forEach(team => Object.assign(team, toPer70(team, scale)));

	teams.toSorted((a, b) => b.avg_zscore - a.avg_zscore).forEach((t, i) => (t.avg_zscore_rank = i + 1));
	teams
		.toSorted((a, b) => b.avg_offensive_zscore - a.avg_offensive_zscore)
		.forEach((t, i) => (t.avg_offensive_zscore_rank = i + 1));
	teams
		.toSorted((a, b) => b.avg_defensive_zscore - a.avg_defensive_zscore)
		.forEach((t, i) => (t.avg_defensive_zscore_rank = i + 1));

	return teams;
}

type Spread = { mean: number; sd: number };
export type KenPomScale = { offensive: Spread; defensive: Spread };

function spread(values: number[]): Spread | null {
	if (!values.length) return null;
	const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
	return { mean, sd: Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length) };
}

/** KenPom's average and spread across every team, for putting composite z-scores on its scale. */
export function kenPomScale(teams: BaseTeamData[]): KenPomScale | null {
	const values = (k: 'kp_offensive_rating' | 'kp_defensive_rating') =>
		teams.map(t => t[k]).filter((v): v is number => typeof v === 'number');
	const offensive = spread(values('kp_offensive_rating'));
	const defensive = spread(values('kp_defensive_rating'));
	return offensive && defensive ? { offensive, defensive } : null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Composite offense and defense read like KenPom's efficiencies, per 70 possessions instead of 100:
 * the averaged z-score is put back on KenPom's scale that day, then scaled by 0.7. Offense is points
 * scored, defense points allowed (lower is better; a positive defensive z-score is a good defense).
 * scripts/migrations/2026-11-composite-per70.sql does the same for stored rows.
 */
export function toPer70(
	z: Pick<CompiledTeamData, 'avg_offensive_zscore' | 'avg_defensive_zscore'>,
	scale: KenPomScale | null
): Pick<CompiledTeamData, 'per70_offensive_rating' | 'per70_defensive_rating'> {
	if (!scale) return { per70_offensive_rating: null, per70_defensive_rating: null };
	const { offensive: o, defensive: d } = scale;
	return {
		per70_offensive_rating: round2((o.mean + z.avg_offensive_zscore * o.sd) * 0.7),
		per70_defensive_rating: round2((d.mean - z.avg_defensive_zscore * d.sd) * 0.7)
	};
}

/** Lowest and highest final composite z-score of any completed season (lib/rankings/rating-scale.ts) */
export type RatingScale = { min: number; max: number };

/** The composite rating on a 0-100 scale: 0 is the worst team on record, 100 the best. This season's
 *  teams can land outside it. */
export function ratingScore(z: unknown, scale: RatingScale | null): number | null {
	if (!scale || typeof z !== 'number' || !Number.isFinite(z)) return null;
	return Math.round(((z - scale.min) / (scale.max - scale.min)) * 1000) / 10;
}

export function rerankColumns(teams: CompiledTeamData[]): CompiledTeamData[] {
	const FLIPPED_COLUMNS = ['kp_defensive_rating', 'bt_defensive_rating'];

	teams = structuredClone(teams);

	const columns = Object.keys(teams[0]).filter(k => k.endsWith('rank') && !k.startsWith('net'));

	columns.forEach(rankCol => {
		const metricCol = rankCol.replace(/_rank$/, '') as keyof CompiledTeamData;
		teams
			.toSorted(
				(a, b) =>
					((b[metricCol] as number) - (a[metricCol] as number)) *
					(FLIPPED_COLUMNS.includes(metricCol as string) ? -1 : 1)
			)
			.forEach((t, i) => ((t as Record<string, unknown>)[rankCol] = i + 1));
	});

	return teams;
}

// Composite combos are only stored for sources that had data that day (early season has no
// BartTorvik or NET). Look up the requested combo, else the requested sources that were available.
export function pickCompositeCombo<T>(combos: Record<string, T> | undefined, requestedKey: string): T | undefined {
	if (!combos) return undefined;
	if (combos[requestedKey]) return combos[requestedKey];

	const widest = Object.keys(combos).sort((a, b) => b.length - a.length)[0];
	if (!widest) return undefined;

	const available = widest.split(',');
	return combos[requestedKey.split(',').filter(src => available.includes(src)).join(',')];
}
