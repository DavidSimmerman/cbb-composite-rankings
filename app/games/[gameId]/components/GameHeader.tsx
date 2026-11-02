'use client';

import { formatLine } from '@/lib/games/line-utils';
import type { GamePageData, Side } from '@/lib/games/game-page';
import { MapPin, Tv } from 'lucide-react';
import Link from 'next/link';
import { LogoBox } from './ui';

function TeamBlock({ data, side, winner }: { data: GamePageData; side: Side; winner: Side | null }) {
	const t = data[side];
	const dim = winner !== null && winner !== side;
	const home = side === 'home';
	const inner = (
		<div
			className={`flex flex-col items-center text-center gap-1.5 md:flex-row md:gap-4 md:text-left ${home ? 'md:flex-row-reverse md:text-right' : ''} min-w-0 ${dim ? 'opacity-60' : ''}`}
		>
			<LogoBox teamKey={t.teamKey} size={46} className="md:hidden" />
			<LogoBox teamKey={t.teamKey} size={64} className="hidden md:inline-grid" />
			<div className="min-w-0">
				<div className="text-[17px] md:text-[26px] font-semibold text-white tracking-tight leading-tight group-hover:underline decoration-white/30 underline-offset-4">
					{t.ap && <span className="text-slate-500 font-normal text-[12px] md:text-[15px] mr-1">{t.ap}</span>}
					<span className="md:hidden">{t.abbr}</span>
					<span className="hidden md:inline">{t.name}</span>
				</div>
				{(t.record || t.conference) && (
					<div className="text-[11.5px] text-slate-400 mt-0.5">{[t.record, t.conference].filter(Boolean).join(' · ')}</div>
				)}
				{t.comp?.rank != null && (
					<div className={`flex items-center gap-1 mt-1 justify-center ${home ? 'md:justify-end' : 'md:justify-start'}`}>
						<span className="text-[10.5px] rounded px-1.5 py-0.5 font-medium" style={{ background: '#a78bfa26', color: '#a78bfa' }}>
							CMP #{t.comp.rank}
						</span>
						{t.comp.ork != null && t.comp.drk != null && (
							<span className="hidden md:inline text-[10.5px] text-slate-500">
								O #{t.comp.ork} · D #{t.comp.drk}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
	return t.teamKey ? (
		<Link href={`/${t.teamKey}`} className="group block min-w-0">
			{inner}
		</Link>
	) : (
		inner
	);
}

export default function GameHeader({ data }: { data: GamePageData }) {
	const started = data.phase !== 'pre';
	const winner: Side | null =
		data.phase === 'final' && data.away.score != null && data.home.score != null
			? data.away.score > data.home.score
				? 'away'
				: 'home'
			: null;
	const line = formatLine(data.line?.homeSpread, data.home.abbr, data.away.abbr);
	const ou = data.line?.overUnder;
	const periods =
		data.away.periods && data.home.periods && data.away.periods.length === data.home.periods.length ? data.away.periods.map((a, i) => [a, data.home.periods![i]]) : null;
	const periodName = (i: number) => (i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? 'OT' : `${i - 1}OT`);

	return (
		<div className="px-1 md:px-0 pt-3 md:pt-7">
			<div className="flex items-center justify-between gap-1 md:gap-6">
				<div className="flex-1 min-w-0">
					<TeamBlock data={data} side="away" winner={winner} />
				</div>
				<div className="text-center shrink-0 w-[118px] md:w-[260px]">
					{started ? (
						<>
							<div className="text-[34px] md:text-[52px] font-semibold text-white tabular-nums leading-none tracking-tight">
								<span className={winner === 'home' ? 'text-slate-500' : ''}>{data.away.score ?? 0}</span>
								<span className="text-slate-600 mx-1.5">-</span>
								<span className={winner === 'away' ? 'text-slate-500' : ''}>{data.home.score ?? 0}</span>
							</div>
							{data.phase === 'live' ? (
								<div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-rose-300 font-medium">
									<span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
									{data.clockLabel}
								</div>
							) : (
								<div className="mt-2 text-[12px] text-slate-400 font-medium">
									Final{periods && periods.length > 2 ? (periods.length === 3 ? '/OT' : `/${periods.length - 2}OT`) : ''}
								</div>
							)}
							{periods && (
								<div className="mt-1.5 text-[10.5px] text-slate-500 tabular-nums">
									{periods.map(([a, h], i) => `${periodName(i)} ${a}-${h}`).join(' · ')}
								</div>
							)}
							<div className="mt-1 text-[10.5px] text-slate-600">{data.dateLabel}</div>
						</>
					) : (
						<>
							<div className="text-[11px] uppercase tracking-wider text-slate-500">{data.dateLabel}</div>
							<div className="text-[22px] md:text-[30px] font-semibold text-white leading-tight">{data.timeLabel ?? 'TBD'}</div>
							{data.broadcast && (
								<div className="flex items-center justify-center gap-1 text-[11.5px] text-slate-400 mt-1">
									<Tv className="size-3" />
									{data.broadcast}
								</div>
							)}
							{data.venue && (
								<div className="hidden md:flex items-center justify-center gap-1 text-[11px] text-slate-500 mt-1">
									<MapPin className="size-[11px] shrink-0" />
									<span className="truncate">{data.venue}</span>
								</div>
							)}
						</>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<TeamBlock data={data} side="home" winner={winner} />
				</div>
			</div>
			{!started && data.venue && (
				<div className="md:hidden flex items-center justify-center gap-1 text-[11px] text-slate-500 mt-3">
					<MapPin className="size-[11px] shrink-0" />
					{data.venue}
				</div>
			)}
			<div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-500">
				{line || ou != null ? (
					<>
						{line && (
							<span>
								{data.phase === 'final' ? 'Closing line' : 'Line'} <span className="text-slate-300">{line}</span>
							</span>
						)}
						{ou != null && (
							<span>
								O/U <span className="text-slate-300">{ou}</span>
							</span>
						)}
						{data.neutral && <span>Neutral site</span>}
					</>
				) : (
					<span>{data.neutral ? 'Neutral site · ' : ''}No betting line saved</span>
				)}
			</div>
		</div>
	);
}
