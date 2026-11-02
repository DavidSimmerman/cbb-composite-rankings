'use client';

// Small Aurora pieces shared by the team page tabs
import { gradeColor } from '@/lib/grades';
import { twMerge } from 'tailwind-merge';

// Rank tiers (CLAUDE.md): top 10, 11-25, 26-100, 101-200, 200+
export const tier = (rk: number) =>
	rk <= 10 ? '#16a34a' : rk <= 25 ? '#86efac' : rk <= 100 ? '#fbbf24' : rk <= 200 ? '#f97316' : '#ef4444';
// Tier text colours, brightened so they read on the dark chips
export const tierText = (rk: number) =>
	rk <= 10 ? '#4ade80' : rk <= 25 ? '#bbf7d0' : rk <= 100 ? '#fcd34d' : rk <= 200 ? '#fb923c' : '#f87171';
export const tierChip = (rk: number): React.CSSProperties =>
	rk <= 10 ? { background: '#16a34acc', color: '#fff' } : { background: `${tier(rk)}29`, color: tierText(rk) };

export const TIER_LEGEND: [number, string][] = [
	[1, 'Top 10'],
	[11, '11-25'],
	[26, '26-100'],
	[101, '101-200'],
	[201, '200+']
];

// Model colours (same as the rankings page)
export const MODEL_COLORS = {
	composite: '#a78bfa',
	kenpom: '#60a5fa',
	evanmiya: '#34d399',
	barttorvik: '#fb923c',
	net: '#f87171'
} as const;

export const CARD = 'rounded-xl border border-white/10 bg-white/[0.02]';

export function RankChip({ rank, small, neutral }: { rank: number | null | undefined; small?: boolean; neutral?: boolean }) {
	if (rank == null || Number.isNaN(rank)) return <span className="text-slate-600">—</span>;
	return (
		<span
			className={twMerge(
				'inline-block text-center font-medium tabular-nums',
				small ? 'min-w-6 rounded px-0.5 text-[10px]' : 'min-w-8 rounded-md px-1 text-[11px]',
				neutral && 'bg-white/[0.06] text-slate-400'
			)}
			style={neutral ? undefined : tierChip(rank)}
		>
			{rank}
		</span>
	);
}

/** Segmented control: one row, never wraps */
export function Seg<T extends string>({
	options,
	value,
	onChange,
	small,
	className
}: {
	options: { key: T; label: React.ReactNode; title?: string }[];
	value: T;
	onChange: (v: T) => void;
	small?: boolean;
	className?: string;
}) {
	return (
		<span
			className={twMerge(
				'flex shrink-0 rounded-lg border border-white/10 bg-white/[0.02] p-0.5 whitespace-nowrap',
				small ? 'text-[11px]' : 'text-[12px]',
				className
			)}
		>
			{options.map(o => (
				<button
					key={o.key}
					onClick={() => onChange(o.key)}
					title={o.title}
					className={`flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-colors ${value === o.key ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
				>
					{o.label}
				</button>
			))}
		</span>
	);
}

export function GradeBadge({ letter, size }: { letter: string | undefined; size: 'lg' | 'sm' }) {
	if (!letter) {
		return (
			<span
				className={`inline-grid place-items-center rounded-md text-slate-500 ${size === 'lg' ? 'h-11 px-2.5 text-[11px] border border-white/10' : 'h-6 px-1.5 text-[10.5px]'}`}
			>
				{size === 'lg' ? 'style' : '—'}
			</span>
		);
	}
	const c = gradeColor(letter);
	return (
		<span
			className={`inline-grid place-items-center font-bold ${size === 'lg' ? 'min-w-11 h-11 text-[20px] rounded-lg' : 'min-w-7 h-6 text-[12px] rounded-md'}`}
			style={{ background: `${c}1f`, color: c, boxShadow: `inset 0 0 0 1px ${c}40` }}
		>
			{letter}
		</span>
	);
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
	return <h2 className={twMerge('text-[15px] font-semibold text-white whitespace-nowrap', className)}>{children}</h2>;
}

export const ordinal = (n: number) => {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
