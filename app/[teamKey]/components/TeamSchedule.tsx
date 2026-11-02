'use client';

import { allSources } from '@/app/components/columns';
import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { ParsedEspnGame } from '@/lib/espn/schedule';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
	compositeKeyFor,
	locLabel,
	localTime,
	QUAD_STYLE,
	quadrant,
	RATING_SOURCES,
	type RatingSource,
	type RatingType,
	ratingCell,
	shortDate
} from './schedule';
import { CARD, CardTitle, RankChip, Seg, TIER_LEGEND, tierChip } from './ui';
import { useWinChances } from './useWinChances';

const STICKY = 'sticky left-0 z-10 bg-[#0b0c14] shadow-[1px_0_0_rgba(255,255,255,0.06)]';
const COLS: { type: RatingType; label: string; delta: string }[] = [
	{ type: 'rating', label: 'Rating', delta: 'Δ Rtg' },
	{ type: 'offensiveRating', label: 'Off', delta: 'Δ Off' },
	{ type: 'defensiveRating', label: 'Def', delta: 'Δ Def' }
];

export default function TeamSchedule() {
	const profile = useTeamProfile();
	const { schedule, ratings_history: history } = profile;
	const router = useRouter();
	const [sourcePref, setRatingSource] = useCookie<string>('schedule_rating_source', 'composite');
	const [viewMode, setViewMode] = useCookie<string>('schedule_view_mode', 'opponent');
	const [sourcesFilter] = useCookie<string[]>('sources_filter', [...allSources]);
	const compositeKey = useMemo(() => compositeKeyFor(sourcesFilter), [sourcesFilter]);

	const source = (RATING_SOURCES.some(s => s.key === sourcePref) ? sourcePref : 'composite') as RatingSource;
	const sourceInfo = RATING_SOURCES.find(s => s.key === source)!;
	const delta = viewMode === 'game_delta';

	const upcoming = useMemo(() => schedule.filter(g => !g.score && !g.is_live), [schedule]);
	const chances = useWinChances(profile.team_key, upcoming, profile.season === profile.latest_season);

	if (!schedule.length) {
		return <div className={`${CARD} p-6 text-center text-[13px] text-slate-500`}>No schedule yet for this season.</div>;
	}

	return (
		<div className={`${CARD} rounded-none border-x-0 lg:rounded-xl lg:border-x py-3.5 lg:p-4`}>
			<div className="flex items-center gap-2 px-3.5 lg:px-0 mb-3">
				<CardTitle className="mr-auto">Schedule</CardTitle>
				<Seg
					small
					options={[
						{ key: 'opponent', label: 'Opponent' },
						{ key: 'game_delta', label: 'Game delta', title: "How each game moved the team's own rating" }
					]}
					value={delta ? 'game_delta' : 'opponent'}
					onChange={setViewMode}
				/>
				<Seg
					small
					className="hidden lg:flex"
					options={RATING_SOURCES.map(s => ({
						key: s.key,
						label: (
							<>
								<span className="size-1.5 rounded-full" style={{ background: s.color }} />
								{s.label}
							</>
						)
					}))}
					value={source}
					onChange={setRatingSource}
				/>
				<DropdownMenu>
					<DropdownMenuTrigger
						suppressHydrationWarning
						className="lg:hidden flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1 text-[11px] text-slate-300 whitespace-nowrap cursor-pointer"
					>
						<span className="size-1.5 rounded-full" style={{ background: sourceInfo.color }} />
						{sourceInfo.short}
						<ChevronDown className="size-3 text-slate-500" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="font-grotesk">
						{RATING_SOURCES.map(s => (
							<DropdownMenuCheckboxItem
								key={s.key}
								checked={s.key === source}
								onCheckedChange={() => setRatingSource(s.key)}
								className="cursor-pointer gap-2"
							>
								<span className="size-1.5 rounded-full" style={{ background: s.color }} />
								{s.label}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="relative">
				<div className="overflow-x-auto overscroll-x-none">
					<table className="w-full text-[12.5px] tabular-nums whitespace-nowrap border-separate border-spacing-0">
						<thead>
							<tr className="text-[10px] text-slate-500 uppercase tracking-wider">
								<th className={`${STICKY} lg:static lg:bg-transparent lg:shadow-none text-left font-medium py-1.5 pl-3.5 lg:pl-1`}>
									Opponent
								</th>
								{COLS.map(c => (
									<th key={c.type} className="text-center font-medium px-2" style={{ color: sourceInfo.color }}>
										{delta ? c.delta : c.label}
									</th>
								))}
								<th className="text-center font-medium px-2">Quad</th>
								<th className="text-right font-medium px-3">Result</th>
							</tr>
						</thead>
						<tbody>
							{schedule.map(g => (
								<tr
									key={g.game_id ?? g.date}
									className="group h-11 cursor-pointer"
									onClick={() => g.game_id && router.push(`/games/${g.game_id}`)}
								>
									<td
										className={`${STICKY} lg:static lg:bg-transparent lg:shadow-none group-hover:bg-[#11121c] lg:group-hover:bg-white/[0.02] pl-3.5 lg:pl-1 pr-2 border-t border-white/[0.05]`}
									>
										<OpponentCell game={g} />
									</td>
									{COLS.map(c => (
										<td
											key={c.type}
											className="text-center px-2 border-t border-white/[0.05] group-hover:bg-white/[0.02]"
										>
											<Rating cell={ratingCell(g, c.type, viewMode, source, history, compositeKey)} />
										</td>
									))}
									<td className="text-center px-2 border-t border-white/[0.05] group-hover:bg-white/[0.02]">
										<Quad game={g} />
									</td>
									<td className="text-right px-3 border-t border-white/[0.05] group-hover:bg-white/[0.02]">
										<Result game={g} chance={chances[g.game_id]} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="lg:hidden pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#0a0b12] to-transparent" />
			</div>

			<div className="mt-3 px-3.5 lg:px-0 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
				{delta ? (
					<span>
						Game delta: change in {profile.team_name}&apos;s own {sourceInfo.label} rating and rank from the day before
						the game to the day after.
					</span>
				) : (
					<>
						Opponent {sourceInfo.label} rank
						{TIER_LEGEND.map(([r, label]) => (
							<span key={label} className="rounded px-1.5 py-0.5" style={tierChip(r)}>
								{label}
							</span>
						))}
					</>
				)}
			</div>
		</div>
	);
}

function OpponentCell({ game: g }: { game: ParsedEspnGame }) {
	const name = g.opp.team_name ?? g.espn_id;
	return (
		<div className="flex items-center gap-2 w-[200px] lg:w-auto">
			<span className="w-11 shrink-0 text-[11px] text-slate-500">{shortDate(g.date)}</span>
			<span className="w-4 shrink-0 text-[11px] text-slate-500">{locLabel(g)}</span>
			{g.opp.team_key ? (
				<TeamLogo teamKey={g.opp.team_key} size={40} className="size-[18px] shrink-0 object-contain" />
			) : (
				<span className="size-[18px] shrink-0" />
			)}
			<div className="min-w-0 flex flex-col lg:flex-row lg:items-baseline lg:gap-2 leading-tight">
				<span className="truncate">
					{g.opp.ap_rank && <span className="text-[10px] text-slate-500 mr-1">{g.opp.ap_rank}</span>}
					{g.opp.team_key ? (
						<Link
							href={`/${g.opp.team_key}`}
							onClick={e => e.stopPropagation()}
							className="text-white hover:underline"
						>
							{name}
						</Link>
					) : (
						<span className="text-slate-300">{name}</span>
					)}
				</span>
				{g.opp.record && <span className="text-[10.5px] lg:text-[11px] text-slate-500">{g.opp.record}</span>}
			</div>
		</div>
	);
}

function Rating({ cell }: { cell: ReturnType<typeof ratingCell> }) {
	if (cell.kind === 'none') return <span className="text-slate-700">—</span>;
	if (cell.kind === 'opponent') {
		return (
			<span className="inline-flex items-center gap-1.5">
				<span className="text-slate-300">{(Math.round(cell.value * 100) / 100).toFixed(2)}</span>
				<RankChip rank={cell.rank} small />
			</span>
		);
	}
	const tone = (v: number) => (v > 0 ? 'text-emerald-300' : v < 0 ? 'text-rose-300' : 'text-slate-400');
	const bg = Math.min(0.22, Math.abs(cell.zPct) * 0.1);
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5"
			style={{ background: cell.zPct > 0 ? `rgba(52,211,153,${bg})` : cell.zPct < 0 ? `rgba(248,113,113,${bg})` : undefined }}
		>
			<span className={tone(cell.delta)}>{cell.delta >= 0 ? `+${cell.delta}` : cell.delta}</span>
			<span className={`text-[10.5px] ${tone(cell.rankDelta)} opacity-80`}>
				{Number.isFinite(cell.rankDelta) ? (cell.rankDelta >= 0 ? `+${cell.rankDelta}` : cell.rankDelta) : ''}
			</span>
		</span>
	);
}

function Quad({ game }: { game: ParsedEspnGame }) {
	const q = quadrant(game);
	if (!q) return <span className="text-slate-700">—</span>;
	return <span className={`inline-block rounded-md px-1.5 text-[10.5px] font-semibold ${QUAD_STYLE[q]}`}>Q{q}</span>;
}

function Result({ game: g, chance }: { game: ParsedEspnGame; chance: number | null | undefined }) {
	if (g.is_live && g.live_score) {
		const diff = g.live_score.teamScore - g.live_score.oppScore;
		return (
			<span className="inline-flex items-center gap-1.5">
				<span className="rounded px-1 text-[9.5px] font-semibold bg-rose-500/20 text-rose-300">LIVE</span>
				<span className={diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-rose-300' : 'text-slate-300'}>
					{g.live_score.teamScore}-{g.live_score.oppScore}
				</span>
			</span>
		);
	}
	if (g.score) {
		return (
			<span>
				<span className={`font-semibold ${g.won ? 'text-emerald-300' : 'text-rose-300'}`}>{g.won ? 'W' : 'L'}</span>{' '}
				<span className="text-slate-300">{g.score}</span>
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5" suppressHydrationWarning>
			<span className="text-slate-400" suppressHydrationWarning>
				{localTime(g.time)}
			</span>
			{chance != null && (
				<span className="text-[11px] text-violet-300" title="Model win chance">
					{Math.round(chance * 100)}%
				</span>
			)}
		</span>
	);
}
