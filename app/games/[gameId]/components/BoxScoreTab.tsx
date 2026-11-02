'use client';

import { useCookie } from '@/app/context/CookieContext';
import type { GamePageData, Side } from '@/lib/games/game-page';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { Card, Dot, Seg, SideSeg, SidesHeader } from './ui';

type DeltaModel = 'comp' | 'kp' | 'em' | 'bt';
const DELTA_MODELS: { value: DeltaModel; label: string; short: string }[] = [
	{ value: 'comp', label: 'Composite', short: 'CMP' },
	{ value: 'kp', label: 'KenPom', short: 'KP' },
	{ value: 'em', label: 'EvanMiya', short: 'EM' },
	{ value: 'bt', label: 'BartTorvik', short: 'BT' }
];

function RatingChanges({ data }: { data: GamePageData }) {
	const [model, setModel] = useCookie<DeltaModel>('game_delta_model', 'comp');
	const deltas = data.deltas!;
	const seg = (
		<>
			<span className="md:hidden">
				<Seg small options={DELTA_MODELS.map(m => ({ value: m.value, label: m.short }))} value={model} onChange={setModel} />
			</span>
			<span className="hidden md:inline">
				<Seg small options={DELTA_MODELS.map(m => ({ value: m.value, label: m.label }))} value={model} onChange={setModel} />
			</span>
		</>
	);
	return (
		<Card title="Rating changes" right={seg}>
			<div className="grid grid-cols-2 gap-3">
				{(['away', 'home'] as const).map(s => {
					const cells = deltas[s][model];
					return (
						<div key={s} className="min-w-0">
							<div className="flex items-center gap-1.5 text-[12px] text-slate-300 mb-1.5">
								<Dot color={data[s].color} size={8} />
								<span className="md:hidden">{data[s].abbr}</span>
								<span className="hidden md:inline truncate">{data[s].name}</span>
							</div>
							{!cells ? (
								<p className="text-[12px] text-slate-500">No ratings from this model around the game.</p>
							) : (
								<div className="grid grid-cols-3 gap-1.5">
									{cells.map(d => {
										const up = d.change >= 0;
										const a = 0.05 + d.strength * 0.2;
										return (
											<div
												key={d.label}
												className="rounded-lg px-1 md:px-2 py-2 text-center"
												style={{ background: d.change === 0 ? 'rgba(255,255,255,0.04)' : up ? `rgba(74,222,128,${a})` : `rgba(248,113,113,${a})` }}
											>
												<div className="text-[9.5px] uppercase tracking-wider text-slate-400">{d.label}</div>
												<div className="text-[14px] md:text-[15px] font-semibold tabular-nums" style={{ color: d.change === 0 ? '#94a3b8' : up ? '#4ade80' : '#f87171' }}>
													{d.change > 0 ? '+' : ''}
													{d.change.toFixed(2)}
												</div>
												<div className="text-[10.5px] tabular-nums text-slate-400 flex items-center justify-center gap-0.5">
													{d.rank != null && <span>#{d.rank}</span>}
													{d.rankChange > 0 ? (
														<span className="flex items-center text-green-400">
															<ArrowUp className="size-2.5" />
															{d.rankChange}
														</span>
													) : d.rankChange < 0 ? (
														<span className="flex items-center text-red-400">
															<ArrowDown className="size-2.5" />
															{-d.rankChange}
														</span>
													) : (
														<span className="text-slate-600">±0</span>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</div>
			<p className="text-[11px] text-slate-500 mt-2.5">Rating the day before the game vs. the day after, in the selected model. Arrows are the change in national rank.</p>
		</Card>
	);
}

function BoxCard({ data }: { data: GamePageData }) {
	const colors = { away: data.away.color, home: data.home.color };
	return (
		<Card title="Box score" sub={data.phase === 'live' ? 'Updates live' : undefined}>
			<SidesHeader away={data.away.abbr} home={data.home.abbr} colors={colors} />
			{data.box!.map(r => {
				const tie = r.awayVal === r.homeVal;
				const awayBetter = r.lowerBetter ? r.awayVal < r.homeVal : r.awayVal > r.homeVal;
				return (
					<div key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 h-8 border-t border-white/[0.05] text-[12.5px] tabular-nums">
						<span className={!tie && awayBetter ? 'text-white font-semibold' : 'text-slate-400'}>{r.away}</span>
						<span className="text-[11px] text-slate-500 text-center w-24 md:w-36">{r.label}</span>
						<span className={`text-right ${!tie && !awayBetter ? 'text-white font-semibold' : 'text-slate-400'}`}>{r.home}</span>
					</div>
				);
			})}
		</Card>
	);
}

function VsAverage({ data }: { data: GamePageData }) {
	const [mode, setMode] = useState<'off' | 'def'>('off');
	const [side, setSide] = useState<Side>('away');
	const colors = { away: data.away.color, home: data.home.color };
	const live = data.phase === 'live';
	const fmt = (v: number, pct: boolean) => (pct ? v.toFixed(1) : String(Math.round(v)));
	return (
		<Card
			title={live ? 'So far vs. season average' : 'Game vs. season average'}
			sub={mode === 'def' ? "What the opponent did against this team's usual defense" : "Each team's numbers in this game against its season average"}
			right={
				<div className="flex gap-1.5 flex-wrap">
					<Seg
						options={[
							{ value: 'off', label: 'Offense' },
							{ value: 'def', label: 'Defense' }
						]}
						value={mode}
						onChange={setMode}
					/>
					<SideSeg value={side} onChange={setSide} label={s => data[s].abbr} colors={colors} className="md:hidden" />
				</div>
			}
		>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{(['away', 'home'] as const).map(s => {
					const opp: Side = s === 'away' ? 'home' : 'away';
					return (
						<div key={s} className={side === s ? '' : 'hidden md:block'}>
							<div className="hidden md:flex items-center gap-1.5 text-[12px] font-medium text-slate-300 mb-1">
								<Dot color={colors[s]} size={8} />
								{data[s].name}
								{mode === 'def' ? ' defense' : ''}
							</div>
							<div className="grid grid-cols-[1fr_62px_52px_56px] text-[10.5px] text-slate-500 h-6 items-center">
								<span>Stat</span>
								<span className="text-right whitespace-nowrap">
									{mode === 'def' ? `${data[opp].abbr} ${live ? 'now' : 'game'}` : live ? 'Now' : 'Game'}
								</span>
								<span className="text-right">Avg</span>
								<span className="text-right">Diff</span>
							</div>
							{data.vsAvg![s].map(r => {
								const pair = mode === 'def' ? r.def : r.off;
								if (!pair) return null;
								const [g, avg] = pair;
								const d = Math.round((g - avg) * 10) / 10;
								const lower = mode === 'def' ? r.defLowerBetter : r.lowerBetter;
								const good = lower ? d < 0 : d > 0;
								const flat = Math.abs(d) < 0.1;
								return (
									<div key={r.label} className="grid grid-cols-[1fr_62px_52px_56px] h-7 items-center text-[12px] tabular-nums border-t border-white/[0.05]">
										<span className="text-slate-400 truncate">{r.label}</span>
										<span className="text-right text-white">{fmt(g, r.pct)}</span>
										<span className="text-right text-slate-500">{fmt(avg, r.pct)}</span>
										<span className="text-right font-medium" style={{ color: flat ? '#94a3b8' : good ? '#4ade80' : '#f87171' }}>
											{flat ? '-' : `${d > 0 ? '+' : ''}${r.pct ? d.toFixed(1) : Math.round(d)}`}
										</span>
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</Card>
	);
}

export default function BoxScoreTab({ data }: { data: GamePageData }) {
	return (
		<div className="space-y-3 md:space-y-4">
			{data.phase === 'final' && data.deltas && <RatingChanges data={data} />}
			{data.box ? (
				<div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-3 md:gap-4 items-start">
					<BoxCard data={data} />
					{data.vsAvg && <VsAverage data={data} />}
				</div>
			) : (
				<Card title="Box score">
					<p className="text-[13px] text-slate-500">No box score from ESPN for this game yet.</p>
				</Card>
			)}
		</div>
	);
}
