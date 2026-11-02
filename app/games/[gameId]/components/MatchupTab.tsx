'use client';

import type { CmpRow, GamePageData, Side } from '@/lib/games/game-page';
import { useState } from 'react';
import { Card, Dot, RankChip, SideSeg } from './ui';

/** Old TeamComparison.getAdvantage: -1..1, negative = the offense has the edge. Scaled down when
 *  both sides rank poorly (an edge between #250 and #300 matters less than #5 vs #55). */
function advantage(offRank: number, defRank: number) {
	const ceiling = Math.min(offRank, defRank);
	return Math.max(-1, Math.min(1, (offRank - defRank) / 150)) * (Math.abs(365 - ceiling) / 364);
}

function Rows({ data, rows, offSide }: { data: GamePageData; rows: CmpRow[]; offSide: Side }) {
	const defSide: Side = offSide === 'away' ? 'home' : 'away';
	const col = { away: data.away.color, home: data.home.color };
	return (
		<div>
			<div className="flex justify-between text-[10.5px] uppercase tracking-wider text-slate-500 mb-1 px-0.5">
				<span className="flex items-center gap-1.5">
					<Dot color={col[offSide]} />
					{data[offSide].abbr} offense
				</span>
				<span className="flex items-center gap-1.5">
					{data[defSide].abbr} defense
					<Dot color={col[defSide]} />
				</span>
			</div>
			{rows.filter(r => r.off || r.def).map(r => {
				const a = r.off && r.def ? advantage(r.off.rank, r.def.rank) : 0;
				const offEdge = a < 0;
				const w = Math.abs(a) * 50;
				const c = col[offEdge ? offSide : defSide];
				return (
					<div key={r.label} className="py-2 border-t border-white/[0.05]">
						<div className="text-center text-[11px] text-slate-500 mb-1.5">{r.label}</div>
						<div className="flex items-center gap-2 md:gap-3">
							<div className="flex items-center gap-1.5 justify-end w-[76px] md:w-24 shrink-0">
								<span className={`text-[12.5px] tabular-nums ${offEdge && w > 1 ? 'text-white font-medium' : 'text-slate-400'}`}>{r.off?.value ?? '—'}</span>
								{r.off && <RankChip rank={r.off.rank} small />}
							</div>
							<div className="flex-1 h-2.5 rounded-full bg-white/[0.05] relative">
								<div className="absolute left-1/2 -top-0.5 -bottom-0.5 w-px bg-white/20" />
								{w > 0.5 && (
									<div
										className={`absolute top-0 bottom-0 ${offEdge ? 'rounded-l-full' : 'rounded-r-full'}`}
										style={{
											...(offEdge ? { right: '50%' } : { left: '50%' }),
											width: `${w}%`,
											background: `linear-gradient(${offEdge ? 270 : 90}deg, ${c}99, ${c})`,
											boxShadow: `0 0 10px -2px ${c}80`
										}}
									/>
								)}
							</div>
							<div className="flex items-center gap-1.5 w-[76px] md:w-24 shrink-0">
								{r.def && <RankChip rank={r.def.rank} small />}
								<span className={`text-[12.5px] tabular-nums ${!offEdge && w > 1 ? 'text-white font-medium' : 'text-slate-400'}`}>{r.def?.value ?? '—'}</span>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default function MatchupTab({ data }: { data: GamePageData }) {
	const [side, setSide] = useState<Side>('away');
	const colors = { away: data.away.color, home: data.home.color };
	if (!data.matchup) {
		return (
			<Card title="Matchup">
				<p className="text-[13px] text-slate-500">No ratings for one or both teams this season yet.</p>
			</Card>
		);
	}
	const all = [...data.matchup.awayOff, ...data.matchup.homeOff];
	const missing = all.length > 0 && all.filter(r => !r.off && !r.def).length >= all.length / 2;
	return (
		<Card
			title="Matchup"
			sub="Value and national rank. The bar grows toward the side with the edge; longer means a bigger edge. Overall efficiency shows KenPom points per 100 possessions with the composite rank"
			right={<SideSeg value={side} onChange={setSide} label={s => `${data[s].abbr} has ball`} colors={colors} className="md:hidden" />}
		>
			{missing && (
				<p className="text-[12px] text-slate-500 mb-3">
					Shooting, turnover and rebounding numbers come from BartTorvik and ESPN, which haven&apos;t published this season&apos;s numbers yet.
				</p>
			)}
			<div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-6">
				<div className={side === 'away' ? '' : 'hidden md:block'}>
					<div className="hidden md:block text-[13px] font-semibold text-slate-300 mb-2">
						{data.away.name} offense vs. {data.home.name} defense
					</div>
					<Rows data={data} rows={data.matchup.awayOff} offSide="away" />
				</div>
				<div className="hidden md:block bg-white/[0.06]" />
				<div className={side === 'home' ? '' : 'hidden md:block'}>
					<div className="hidden md:block text-[13px] font-semibold text-slate-300 mb-2">
						{data.home.name} offense vs. {data.away.name} defense
					</div>
					<Rows data={data} rows={data.matchup.homeOff} offSide="home" />
				</div>
			</div>
		</Card>
	);
}
