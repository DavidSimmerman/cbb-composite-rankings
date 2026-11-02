'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import PredBar from '@/components/PredBar';
import TeamLogo from '@/components/TeamLogo';
import type { StatSide } from '@/lib/grades';
import type { ParsedEspnGame } from '@/lib/espn/schedule';
import { matchupTones } from '@/lib/team-colors';
import { TrendingDown, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { locLabel, localTime } from './schedule';
import { CARD, CardTitle, RankChip, Seg, tier, tierText } from './ui';
import { useTeamView } from './useTeamView';
import { useWinChances } from './useWinChances';

// Recharts: client only (its generated ids differ between server and client)
const TeamCharts = dynamic(() => import('./TeamCharts'), {
	ssr: false,
	loading: () => <div className={`${CARD} h-[400px]`} />
});

type Side = 'off' | 'def';
type Pick = { label: string; side: string; stat: StatSide };

// The old page's six gauges per side: [stat id, side, label]
const GAUGES: Record<Side, [string, Side, string][]> = {
	off: [
		['tempo', 'off', 'Tempo'],
		['3p', 'off', '3pt%'],
		['3pr', 'off', '3pt rate'],
		['2p', 'off', '2pt%'],
		['ft', 'off', 'FT%'],
		['ftr', 'off', 'FT rate']
	],
	def: [
		['fouls', 'def', 'Fouls / G'],
		['fg', 'def', 'Opp FG%'],
		['3p', 'def', 'Opp 3pt%'],
		['tov', 'def', 'Opp TO / G'],
		['stl', 'def', 'Steals / G'],
		['blk', 'def', 'Blocks / G']
	]
};

export default function OverviewTab() {
	const profile = useTeamProfile();
	const [side, setSide] = useState<Side>('off');

	const { rows, picks } = useMemo(() => {
		const rows = new Map(profile.stat_sections.flatMap(s => s.rows.map(r => [r.id, { ...r, style: r.style }])));
		// Strengths and weaknesses: graded stats only, schedule/roster left out (they aren't how a team plays)
		const picks: Pick[] = profile.stat_sections
			.filter(s => s.key !== 'team')
			.flatMap(s => s.rows.filter(r => !r.style))
			.flatMap(r => [
				...(r.off ? [{ label: r.offLabel ?? r.name, side: 'Offense', stat: r.off }] : []),
				...(r.def ? [{ label: r.defLabel ?? r.name, side: 'Defense', stat: r.def }] : [])
			]);
		return { rows, picks };
	}, [profile.stat_sections]);

	const strengths = [...picks].sort((a, b) => b.stat.pct - a.stat.pct).slice(0, 5);
	const weaknesses = [...picks].sort((a, b) => a.stat.pct - b.stat.pct).slice(0, 5);
	const played = profile.schedule.filter(g => g.score);
	const next = profile.season === profile.latest_season ? profile.schedule.find(g => !g.score) : undefined;

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-3">
				<div className="space-y-3 min-w-0">
					{next && <NextGame game={next} />}
					<div className={`${CARD} p-3.5 lg:p-4`}>
						<div className="flex items-center justify-between mb-3">
							<CardTitle>Style</CardTitle>
							<Seg
								small
								options={[
									{ key: 'off', label: 'Offense' },
									{ key: 'def', label: 'Defense' }
								]}
								value={side}
								onChange={setSide}
							/>
						</div>
						<div className="grid grid-cols-3 gap-y-3">
							{GAUGES[side].map(([id, s, label]) => {
								const row = rows.get(id);
								return <Gauge key={id + s} label={label} stat={row?.[s] ?? null} style={!!row?.style} />;
							})}
						</div>
					</div>
					<div className="hidden lg:block">
						<Results games={played} label={next || profile.season === profile.latest_season ? 'Results so far' : 'Results'} />
					</div>
				</div>
				<div className="space-y-3 min-w-0">
					<PickList title="Strengths" picks={strengths} good />
					<PickList title="Weaknesses" picks={weaknesses} good={false} />
					<div className="lg:hidden">
						<Results games={played} label={next || profile.season === profile.latest_season ? 'Results so far' : 'Results'} />
					</div>
				</div>
			</div>
			<TeamCharts />
		</div>
	);
}

function NextGame({ game: g }: { game: ParsedEspnGame }) {
	const profile = useTeamProfile();
	const view = useTeamView();
	const chances = useWinChances(profile.team_key, g.is_live ? [] : [g]);
	const p = chances[g.game_id];
	const [us, them] = matchupTones(view.meta, g.opp.metadata);
	const oppName = g.opp.team_name ?? g.espn_id;
	const date = new Date(`${g.date}T12:00:00Z`).toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});

	const body = (
		<>
			<div className="text-[11px] uppercase tracking-wider text-violet-300/80 whitespace-nowrap truncate" suppressHydrationWarning>
				{g.is_live ? 'Live now' : 'Next game'} · {date}
				{!g.is_live && g.time && ` · ${localTime(g.time)}`}
			</div>
			<div className="flex items-center gap-2.5 lg:gap-3 mt-2">
				<TeamLogo teamKey={profile.team_key} size={80} className="size-[30px] shrink-0 object-contain" />
				<span className="text-slate-500 text-[13px]">{locLabel(g)}</span>
				{g.opp.team_key && <TeamLogo teamKey={g.opp.team_key} size={80} className="size-[30px] shrink-0 object-contain" />}
				<div className="min-w-0">
					<div className="text-white font-semibold truncate">
						{g.opp.ap_rank && <span className="text-slate-500 font-normal mr-1">{g.opp.ap_rank}</span>}
						{oppName}
					</div>
					{g.opp.avg_zscore_rank != null && (
						<div className="text-[11.5px] text-slate-400">Composite #{g.opp.avg_zscore_rank}</div>
					)}
				</div>
				<div className="ml-auto text-right shrink-0">
					{g.is_live && g.live_score ? (
						<>
							<div className="text-[22px] font-semibold text-white leading-none tabular-nums">
								{g.live_score.teamScore}-{g.live_score.oppScore}
							</div>
							<div className="text-[11px] text-rose-300">live</div>
						</>
					) : (
						<>
							<div className="text-[22px] font-semibold text-white leading-none tabular-nums">
								{p != null ? `${Math.round(p * 100)}%` : p === null ? '—' : '…'}
							</div>
							<div className="text-[11px] text-slate-500 whitespace-nowrap">
								{p === null ? 'no model prediction' : 'model win chance'}
							</div>
						</>
					)}
				</div>
			</div>
			{p != null && !g.is_live && (
				<>
					<PredBar pAway={p} colors={[us, them]} className="mt-3" />
					<div className="flex justify-between gap-2 mt-1.5 text-[10.5px] tabular-nums text-slate-400">
						<span className="flex items-center gap-1.5 min-w-0">
							<span className="size-2 shrink-0 rounded-full" style={{ background: us }} />
							<span className="truncate">{profile.team_name}</span> {Math.round(p * 100)}%
						</span>
						<span className="flex items-center gap-1.5 min-w-0">
							<span className="truncate">{oppName}</span> {100 - Math.round(p * 100)}%
							<span className="size-2 shrink-0 rounded-full" style={{ background: them }} />
						</span>
					</div>
				</>
			)}
		</>
	);

	const cls = 'block rounded-xl border border-violet-400/20 bg-violet-500/[0.06] p-3.5 lg:p-4';
	return g.game_id ? (
		<Link href={`/games/${g.game_id}`} className={`${cls} hover:bg-violet-500/[0.09] transition-colors`}>
			{body}
		</Link>
	) : (
		<div className={cls}>{body}</div>
	);
}

function Gauge({ label, stat, style }: { label: string; stat: StatSide | null; style: boolean }) {
	const p = stat ? Math.max(0.03, stat.pct) : 0;
	const c = 2 * Math.PI * 26;
	const color = !stat ? 'transparent' : style ? '#a78bfa' : tier(stat.rank);
	return (
		<div className="flex flex-col items-center">
			<svg viewBox="0 0 64 52" className="w-[88px] lg:w-[96px]" role="img" aria-label={label}>
				<circle cx="32" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * 0.75} ${c}`} transform="rotate(135 32 30)" />
				<circle cx="32" cy="30" r="26" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * 0.75 * p} ${c}`} transform="rotate(135 32 30)" />
				<text x="32" y="33" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">
					{stat?.display ?? '—'}
				</text>
				{stat && (
					<text x="32" y="50" textAnchor="middle" fill={style ? '#94a3b8' : tierText(stat.rank)} fontSize="8.5">
						#{stat.rank}
					</text>
				)}
			</svg>
			<div className="text-[11px] text-slate-400 mt-1">{label}</div>
		</div>
	);
}

function PickList({ title, picks, good }: { title: string; picks: Pick[]; good: boolean }) {
	return (
		<div className={`${CARD} p-3.5 lg:p-4`}>
			<div className={`flex items-center gap-2 mb-2 text-[14px] font-semibold ${good ? 'text-emerald-300' : 'text-rose-300'}`}>
				{good ? <TrendingUp className="size-[15px]" /> : <TrendingDown className="size-[15px]" />}
				{title}
			</div>
			{picks.length === 0 && <div className="text-[12.5px] text-slate-500">No stats yet this season.</div>}
			{picks.map(s => (
				<div key={s.label + s.side} className="flex items-center gap-2 h-8 text-[12.5px] border-t border-white/[0.05] first-of-type:border-0">
					<span className="flex-1 text-slate-300 truncate">{s.label}</span>
					<span className="text-[10.5px] text-slate-500">{s.side}</span>
					<span className="w-14 text-right text-white tabular-nums">{s.stat.display}</span>
					<RankChip rank={s.stat.rank} small />
				</div>
			))}
		</div>
	);
}

function Results({ games, label = 'Results so far' }: { games: ParsedEspnGame[]; label?: string }) {
	return (
		<div className={`${CARD} p-3.5 lg:p-4`}>
			<CardTitle className="text-[14px] mb-2">{label}</CardTitle>
			{games.length === 0 ? (
				<div className="text-[12.5px] text-slate-500">No games played yet.</div>
			) : (
				<div className="flex gap-1.5 overflow-x-auto">
					{games.map(g => (
						<Link
							key={g.game_id ?? g.date}
							href={g.game_id ? `/games/${g.game_id}` : '#'}
							title={`${locLabel(g)} ${g.opp.team_name ?? g.espn_id}`}
							className={`flex-1 min-w-[64px] rounded-lg border px-1.5 py-2 text-center ${g.won ? 'border-emerald-400/25 bg-emerald-500/[0.06]' : 'border-rose-400/25 bg-rose-500/[0.07]'}`}
						>
							<div className="flex justify-center">
								{g.opp.team_key ? (
									<TeamLogo teamKey={g.opp.team_key} size={40} className="size-5 object-contain" />
								) : (
									<span className="size-5" />
								)}
							</div>
							<div className={`text-[11px] font-semibold mt-1 whitespace-nowrap ${g.won ? 'text-emerald-300' : 'text-rose-300'}`}>
								{g.won ? 'W' : 'L'} {g.score}
							</div>
							<div className="mt-1">
								<RankChip rank={g.opp.avg_zscore_rank} small />
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
