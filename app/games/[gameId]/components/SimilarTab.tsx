'use client';

import type { GamePageData, Side, SimilarCategory } from '@/lib/games/game-page';
import { formatTeamLine } from '@/lib/games/line-utils';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { OppCell, ResultCell } from './PreviewTab';
import { AtsValue, Card, fmtShortDate, LOSS, LogoBox, SideSeg, WIN } from './ui';

const COLS = 'grid-cols-[34px_minmax(0,1fr)_58px_34px_38px_30px] md:grid-cols-[46px_minmax(0,1fr)_70px_48px_46px_44px]';

function Stat({ value, label, short, color }: { value: string; label: string; short?: string; color?: string }) {
	return (
		<div className="rounded-lg bg-white/[0.03] px-2.5 md:px-3 py-2 min-w-0">
			<div className="text-[18px] md:text-[20px] font-semibold tabular-nums leading-none" style={{ color: color ?? '#fff' }}>
				{value}
			</div>
			<div className="text-[10.5px] text-slate-500 mt-1 truncate">
				<span className="md:hidden">{short ?? label}</span>
				<span className="hidden md:inline">{label}</span>
			</div>
		</div>
	);
}

function Panel({ data, side, cat, right }: { data: GamePageData; side: Side; cat: SimilarCategory; right?: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const t = data[side];
	const other = data[side === 'away' ? 'home' : 'away'];
	const games = cat.games;
	const wins = games.filter(g => g.won).length;
	const withLine = games.filter(g => g.ats != null);
	const cov = withLine.filter(g => g.ats! > 0).length;
	const lost = withLine.filter(g => g.ats! < 0).length;
	const push = withLine.length - cov - lost;
	const avgAts = withLine.length ? withLine.reduce((s, g) => s + g.ats!, 0) / withLine.length : null;
	const shown = open ? games : games.slice(0, 5);

	return (
		<div className="rounded-xl border border-white/10 bg-white/[0.02] min-w-0 overflow-hidden">
			<div className="px-3 md:px-4 pt-4 pb-3" style={{ background: `linear-gradient(180deg, ${t.color}14, transparent)` }}>
				<div className="flex items-center gap-2 flex-wrap">
					<LogoBox teamKey={t.teamKey} size={22} />
					<div className="min-w-0">
						<div className="text-[14px] font-semibold text-white leading-tight">{t.name}</div>
						<div className="text-[11px] text-slate-500">vs. teams like {other.name}</div>
					</div>
					{right && <div className="ml-auto">{right}</div>}
				</div>
				<div className="grid grid-cols-3 gap-2 mt-3">
					<Stat value={`${wins}-${games.length - wins}`} label="Record" />
					<Stat value={withLine.length ? `${cov}-${lost}${push ? `-${push}` : ''}` : '—'} label="Against the spread" short="Vs. spread" />
					<Stat
						value={avgAts == null ? '—' : `${avgAts >= 0 ? '+' : ''}${avgAts.toFixed(1)}`}
						label={avgAts == null ? 'No lines saved' : avgAts >= 0 ? 'Beat the line by' : 'Missed the line by'}
						short={avgAts == null ? 'No lines' : avgAts >= 0 ? 'Beat line by' : 'Missed by'}
						color={avgAts == null ? undefined : avgAts >= 0 ? WIN : LOSS}
					/>
				</div>
			</div>
			<div className="px-3 md:px-4">
				{games.length === 0 ? (
					<p className="text-[12px] text-slate-500 py-4">No past games against a close enough match in this category.</p>
				) : (
					<>
						<div className={`grid ${COLS} gap-1.5 md:gap-2 text-[10px] uppercase tracking-wider text-slate-600 h-6 items-center`}>
							<span>Date</span>
							<span>Opponent</span>
							<span className="text-right">Result</span>
							<span className="text-right">Line</span>
							<span className="text-right">ATS</span>
							<span className="text-right" title="How closely this opponent matches tonight's">
								Match
							</span>
						</div>
						{shown.map(g => (
							<a
								key={g.gameId}
								href={`/games/${g.gameId}`}
								className={`grid ${COLS} items-center gap-1.5 md:gap-2 h-10 border-t border-white/[0.05] text-[12px] md:text-[12.5px] hover:bg-white/[0.02]`}
							>
								<span className="text-[10.5px] md:text-[11px] text-slate-500 tabular-nums">{fmtShortDate(g.date)}</span>
								<OppCell g={g} compact />
								<ResultCell g={g} />
								<span className="text-right tabular-nums text-[11.5px] md:text-[12px] text-slate-400">{g.line == null ? '—' : formatTeamLine(g.line)}</span>
								<span className="text-right">
									<AtsValue v={g.ats} />
								</span>
								<span className="text-right text-[10.5px] md:text-[11px] tabular-nums text-slate-500" title="How closely this opponent matches tonight's">
									{g.match}%
								</span>
							</a>
						))}
						{games.length > 5 && (
							<button
								onClick={() => setOpen(!open)}
								className="w-full h-9 border-t border-white/[0.05] text-[11.5px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
							>
								{open ? 'Show fewer' : `Show ${games.length - 5} more`}
								<ChevronDown className={`size-3 ${open ? 'rotate-180' : ''}`} />
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}

export default function SimilarTab({ data }: { data: GamePageData }) {
	const [cat, setCat] = useState(0);
	const [side, setSide] = useState<Side>('away');
	const colors = { away: data.away.color, home: data.home.color };
	if (!data.similar) {
		return (
			<Card title="Similar opponents">
				<p className="text-[13px] text-slate-500">Not enough ratings this season to match opponents yet.</p>
			</Card>
		);
	}
	const cats = data.similar.away;
	const seg = <SideSeg value={side} onChange={setSide} label={s => data[s].abbr} colors={colors} className="md:hidden" />;
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-3 flex-wrap">
				<div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 max-w-full">
					{cats.map((c, i) => (
						<button
							key={c.key}
							onClick={() => setCat(i)}
							className={`shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] cursor-pointer ${cat === i ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}
						>
							{c.label}
						</button>
					))}
				</div>
				<span className="text-[11.5px] text-slate-500">
					Past games against teams most like this opponent, closest match first. ATS: points they beat (+) or missed (-) the line by
				</span>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
				{(['away', 'home'] as const).map(s => (
					<div key={s} className={side === s ? '' : 'hidden md:block'}>
						<Panel data={data} side={s} cat={data.similar![s][cat]} right={seg} />
					</div>
				))}
			</div>
		</div>
	);
}
