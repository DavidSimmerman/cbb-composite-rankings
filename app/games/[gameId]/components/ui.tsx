'use client';

import TeamLogo from '@/components/TeamLogo';
import type { Side } from '@/lib/games/game-page';
import { tierChipStyle } from '@/lib/rank-tier';

export const WIN = '#6ee7b7';
export const LOSS = '#fda4af';

/** Sized logo wrapper (TeamLogo is an <img>; size via a box so it never stretches). */
export function LogoBox({ teamKey, size, className = '' }: { teamKey: string | null; size: number; className?: string }) {
	return (
		<span className={`shrink-0 inline-grid place-items-center ${className}`} style={{ width: size, height: size }}>
			{teamKey ? (
				<TeamLogo teamKey={teamKey} size={size > 40 ? 160 : 60} className="max-w-full max-h-full object-contain" />
			) : (
				<span className="size-full rounded-full bg-white/[0.06]" />
			)}
		</span>
	);
}

export function RankChip({ rank, small = false }: { rank: number | null | undefined; small?: boolean }) {
	if (rank == null) return <span className="text-slate-600 text-[11px]">—</span>;
	return (
		<span
			className={`inline-block text-center font-medium tabular-nums ${small ? 'min-w-6 rounded px-0.5 text-[10px]' : 'min-w-8 rounded-md px-1 text-[11px]'}`}
			style={tierChipStyle(rank)}
		>
			{rank}
		</span>
	);
}

export function Card({
	title,
	sub,
	right,
	children,
	className = ''
}: {
	title: string;
	sub?: string;
	right?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`rounded-xl border border-white/10 bg-white/[0.02] p-4 min-w-0 ${className}`}>
			<div className="flex items-start justify-between gap-2 flex-wrap mb-3">
				<div className="min-w-0">
					<h3 className="text-[15px] font-semibold text-white">{title}</h3>
					{sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
				</div>
				{right}
			</div>
			{children}
		</div>
	);
}

export function Seg<T extends string>({
	options,
	value,
	onChange,
	small = false
}: {
	options: { value: T; label: string }[];
	value: T;
	onChange: (v: T) => void;
	small?: boolean;
}) {
	return (
		<div className={`inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 ${small ? 'text-[10.5px]' : 'text-[11.5px]'}`}>
			{options.map(o => (
				<button
					key={o.value}
					onClick={() => onChange(o.value)}
					className={`px-2 py-1 rounded-md whitespace-nowrap cursor-pointer ${value === o.value ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

/** Away / home switch with each team's colour dot (phones show one side at a time). */
export function SideSeg({
	value,
	onChange,
	label,
	colors,
	className = ''
}: {
	value: Side;
	onChange: (s: Side) => void;
	label: (s: Side) => string;
	colors: Record<Side, string>;
	className?: string;
}) {
	return (
		<div className={`inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5 text-[11.5px] ${className}`}>
			{(['away', 'home'] as const).map(s => (
				<button
					key={s}
					onClick={() => onChange(s)}
					className={`flex items-center gap-1.5 px-2 py-1 rounded-md whitespace-nowrap cursor-pointer ${value === s ? 'bg-white/10 text-white' : 'text-slate-500'}`}
				>
					<span className="size-1.5 rounded-full" style={{ background: colors[s] }} />
					{label(s)}
				</button>
			))}
		</div>
	);
}

export function Dot({ color, size = 6 }: { color: string; size?: number }) {
	return <span className="rounded-full shrink-0 inline-block" style={{ background: color, width: size, height: size }} />;
}

/** Column header for the mirrored "away | label | home" tables. */
export function SidesHeader({ away, home, colors, mid = '' }: { away: string; home: string; colors: Record<Side, string>; mid?: string }) {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] items-center text-[10.5px] text-slate-500 pb-1.5 gap-3">
			<span className="flex items-center gap-1.5 min-w-0">
				<Dot color={colors.away} />
				<span className="truncate">{away}</span>
			</span>
			<span>{mid}</span>
			<span className="flex items-center gap-1.5 justify-end min-w-0">
				<span className="truncate">{home}</span>
				<Dot color={colors.home} />
			</span>
		</div>
	);
}

export const fmtShortDate = (iso: string) =>
	new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function AtsValue({ v }: { v: number | null }) {
	if (v == null) return <span className="text-slate-600 text-[12px]">—</span>;
	return (
		<span className="tabular-nums text-[12px] font-medium" style={{ color: v > 0 ? WIN : v < 0 ? LOSS : '#94a3b8' }}>
			{v === 0 ? 'Push' : v > 0 ? `+${v}` : v}
		</span>
	);
}
