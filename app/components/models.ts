import { type CompiledTeamData } from '@/lib/shared';

export type Model = 'comp' | 'kp' | 'em' | 'bt' | 'net';
export type Stat = 'r' | 'o' | 'd';
export type View = 'focus' | 'all';

// Model colours are the brand: every column, header, chip and bar for a source uses its colour
export const MODELS: { key: Model; label: string; short: string; color: string }[] = [
	{ key: 'comp', label: 'Composite', short: 'CMP', color: '#a78bfa' },
	{ key: 'kp', label: 'KenPom', short: 'KP', color: '#60a5fa' },
	{ key: 'em', label: 'EvanMiya', short: 'EM', color: '#34d399' },
	{ key: 'bt', label: 'BartTorvik', short: 'BT', color: '#fb923c' },
	{ key: 'net', label: 'NET', short: 'NET', color: '#f87171' }
];

// The three rating models the "Model ranks" strip and Gap compare
export const SOURCE_MODELS = MODELS.filter(m => m.key === 'kp' || m.key === 'em' || m.key === 'bt');

export const STATS: { key: Stat; label: string; short: string }[] = [
	{ key: 'r', label: 'Rating', short: 'Rtg' },
	{ key: 'o', label: 'Offense', short: 'Off' },
	{ key: 'd', label: 'Defense', short: 'Def' }
];

export const modelInfo = (m: Model) => MODELS.find(x => x.key === m)!;
export const statInfo = (s: Stat) => STATS.find(x => x.key === s)!;

type Field = { value: keyof CompiledTeamData | null; rank: keyof CompiledTeamData } | null;

// NET only publishes a single rank: no rating value and no offense/defense split
const FIELDS: Record<Model, Record<Stat, Field>> = {
	comp: {
		r: { value: 'rating_score', rank: 'avg_zscore_rank' },
		o: { value: 'per70_offensive_rating', rank: 'avg_offensive_zscore_rank' },
		d: { value: 'per70_defensive_rating', rank: 'avg_defensive_zscore_rank' }
	},
	kp: {
		r: { value: 'kp_rating', rank: 'kp_rating_rank' },
		o: { value: 'kp_offensive_rating', rank: 'kp_offensive_rating_rank' },
		d: { value: 'kp_defensive_rating', rank: 'kp_defensive_rating_rank' }
	},
	em: {
		r: { value: 'em_rating', rank: 'em_rating_rank' },
		o: { value: 'em_offensive_rating', rank: 'em_offensive_rating_rank' },
		d: { value: 'em_defensive_rating', rank: 'em_defensive_rating_rank' }
	},
	bt: {
		r: { value: 'bt_rating', rank: 'bt_rating_rank' },
		o: { value: 'bt_offensive_rating', rank: 'bt_offensive_rating_rank' },
		d: { value: 'bt_defensive_rating', rank: 'bt_defensive_rating_rank' }
	},
	net: {
		r: { value: null, rank: 'net_rank' },
		o: null,
		d: null
	}
};

export const hasStat = (m: Model, s: Stat) => FIELDS[m][s] != null;

function num(v: unknown): number | null {
	return typeof v === 'number' && !isNaN(v) ? v : null;
}

export function valueOf(team: CompiledTeamData, m: Model, s: Stat): number | null {
	const f = FIELDS[m][s];
	return f?.value ? num(team[f.value]) : null;
}

export function rankOf(team: CompiledTeamData, m: Model, s: Stat): number | null {
	const f = FIELDS[m][s];
	return f ? num(team[f.rank]) : null;
}

export function formatValue(m: Model, s: Stat, v: number | null): string {
	if (v == null) return '—';
	if (m === 'bt' && s === 'r') return v.toFixed(4);
	if (m === 'comp') return v.toFixed(1);
	if (m === 'kp') return v.toFixed(2);
	return v.toFixed(1);
}

// KenPom and BartTorvik defense are points allowed per 100 possessions, the composite's per 70
export const lowerIsBetter = (m: Model, s: Stat) => s === 'd' && (m === 'comp' || m === 'kp' || m === 'bt');

// A source that hasn't published this season (NET before December) has nothing to rank by
export function availableModels(data: CompiledTeamData[]): Record<Model, boolean> {
	const has = (m: Model) => data.some(t => rankOf(t, m, 'r') != null);
	return { comp: true, kp: has('kp'), em: has('em'), bt: has('bt'), net: has('net') };
}

// How much the sources disagree: gap between a team's best and worst source rank, std dev breaks ties
export function sourceSplit(
	team: CompiledTeamData,
	s: Stat,
	sources = SOURCE_MODELS
): { range: number; sd: number } | null {
	const ranks = sources.map(m => rankOf(team, m.key, s)).filter((r): r is number => r != null);
	if (ranks.length < 2) return null;
	const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
	return {
		range: Math.max(...ranks) - Math.min(...ranks),
		sd: Math.sqrt(ranks.reduce((a, b) => a + (b - mean) ** 2, 0) / ranks.length)
	};
}

// Tinted fill of the source colour with the number in the source colour
export const chipStyle = (color: string) => ({ background: `${color}26`, color });
