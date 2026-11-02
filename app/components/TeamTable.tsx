'use client';

import TeamLogo from '@/components/TeamLogo';
import { type CompiledTeamData, computeAverageZScores, rerankColumns, sourceSystems } from '@/lib/shared';
import { seasonLabel } from '@/lib/season';
import { ArrowDown, ArrowUp, ExternalLink, Rows3, Table2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useCookie } from '../context/CookieContext';
import { useRankings } from '../context/RankingsContext';
import { allSources, p5Conferences } from './columns';
import ConferenceFilter from './ConferenceFilter';
import SourcesFilter from './SourcesFilter';
import {
	availableModels,
	chipStyle,
	formatValue,
	hasStat,
	lowerIsBetter,
	type Model,
	MODELS,
	modelInfo,
	rankOf,
	SOURCE_MODELS,
	sourceSplit,
	type Stat,
	statInfo,
	STATS,
	valueOf,
	type View
} from './models';

// Solid surface behind sticky cells: the card's white/2% fill over the page background
const SURFACE = '#0c0d14';
// Sticky header cells need an opaque background, so the source tint is layered over the surface
const solidTint = (color: string, alpha: string) => ({
	background: `linear-gradient(${color}${alpha}, ${color}${alpha}), ${SURFACE}`
});

const NET_QUADS = [
	{ label: 'Q1', key: 'net_q1_record' },
	{ label: 'Q2', key: 'net_q2_record' },
	{ label: 'Q3', key: 'net_q3_record' },
	{ label: 'Q4', key: 'net_q4_record' }
] as const;

// Track of the source ranks strip: #1 at the left, everything past #50 piles up at the right end
const STRIP_MAX = 50;
const stripX = (rank: number) => 3 + ((Math.min(rank, STRIP_MAX) - 1) / (STRIP_MAX - 1)) * 154;

type SplitSort = 'desc' | 'asc' | null;

function Chip({ rank, color, small }: { rank: number | null; color: string; small?: boolean }) {
	if (rank == null) return <span className="text-slate-600">—</span>;
	return (
		<span
			className={`inline-block text-center font-medium ${small ? 'min-w-6 rounded px-0.5 text-[10.5px]' : 'min-w-7 rounded-md px-1 text-[11px]'}`}
			style={chipStyle(color)}
		>
			{rank}
		</span>
	);
}

function SourceLink({ label, url }: { label: string; url: string }) {
	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			title={`Open ${label} in a new tab`}
			aria-label={`Open ${label} in a new tab`}
			className="grid place-items-center self-stretch rounded-md px-1 text-slate-600 hover:text-slate-200 hover:bg-white/10 transition-colors"
		>
			<ExternalLink className="size-[11px]" />
		</a>
	);
}

function SourceStrip({
	team,
	stat,
	model,
	sources
}: {
	team: CompiledTeamData;
	stat: Stat;
	model: Model;
	sources: typeof SOURCE_MODELS;
}) {
	const marks = sources.map(s => ({ ...s, rank: rankOf(team, s.key, stat) })).filter(
		(s): s is typeof s & { rank: number } => s.rank != null
	);
	const ranks = marks.map(m => m.rank);

	return (
		<svg viewBox="0 0 160 14" preserveAspectRatio="none" className="block w-[110px] lg:w-[150px] h-[14px]">
			<line x1="3" x2="157" y1="7" y2="7" stroke="rgba(255,255,255,0.07)" />
			{[10, 25].map(g => (
				<line key={g} x1={stripX(g)} x2={stripX(g)} y1="3" y2="11" stroke="rgba(255,255,255,0.08)" />
			))}
			{ranks.length > 1 && (
				<line
					x1={stripX(Math.min(...ranks))}
					x2={stripX(Math.max(...ranks))}
					y1="7"
					y2="7"
					stroke="rgba(255,255,255,0.28)"
					strokeWidth="3"
					strokeLinecap="round"
				/>
			)}
			{marks.map(s => {
				const on = model === 'comp' || model === 'net' || model === s.key;
				return (
					<rect
						key={s.key}
						x={stripX(s.rank) - 2}
						y={on ? 1.5 : 3.5}
						width="4"
						height={on ? 11 : 7}
						rx="1"
						fill={s.color}
						opacity={on ? 1 : 0.3}
					/>
				);
			})}
		</svg>
	);
}

export default function TeamTable() {
	const [conferenceFilter, setConferenceFilter] = useCookie<string[]>('conference_filter', []);
	const [relativeRankings, setOnRelativeRankings] = useCookie<boolean>('relative_rankings', true);
	const [modelPref, setModelPref] = useCookie<Model>('rankings_model', 'comp');
	const [statPref, setStatPref] = useCookie<Stat>('rankings_stat', 'r');
	const [viewPref, setViewPref] = useCookie<View>('rankings_view', 'focus');
	// Shared with the team page charts: which sources build the composite and show in the table
	const [sourcesFilter, setSourcesFilter] = useCookie<string[]>('sources_filter', [...allSources]);
	// Sort by how much the sources disagree instead of by rank; a second click flips to closest agreement
	const [splitSort, setSplitSort] = useState<SplitSort>(null);

	const rankings = useRankings();
	const router = useRouter();

	const included = (m: Model) =>
		m === 'comp' || sourcesFilter.length === 0 || sourcesFilter.includes(modelInfo(m).label);
	const shownModels = useMemo(
		() => MODELS.filter(m => m.key === 'comp' || sourcesFilter.length === 0 || sourcesFilter.includes(m.label)),
		[sourcesFilter]
	);
	const shownSources = useMemo(() => SOURCE_MODELS.filter(m => shownModels.includes(m)), [shownModels]);

	// Rebuild the composite from only the chosen sources (e.g. leave NET out)
	const data = useMemo(() => {
		const active = sourceSystems.filter(s => sourcesFilter.includes(s.key));
		if (active.length === sourceSystems.length || active.length === 0) return rankings;
		return computeAverageZScores(rankings, active);
	}, [rankings, sourcesFilter]);

	const available = useMemo(() => availableModels(data), [data]);

	// A saved choice can go stale (a source with no data yet, or an old cookie): fall back to Composite rating
	const model: Model =
		MODELS.some(m => m.key === modelPref) && available[modelPref] && included(modelPref) ? modelPref : 'comp';
	const stat: Stat = STATS.some(s => s.key === statPref) && hasStat(model, statPref) ? statPref : 'r';
	const view: View = viewPref === 'all' ? 'all' : 'focus';
	const split = view === 'focus' ? splitSort : null;

	const season = data[0]?.season;
	const color = modelInfo(model).color;

	const midMajorConferences = useMemo(() => {
		const conferences = Array.from(new Set(data.map(t => t.conference)));
		return conferences.filter(c => !p5Conferences.includes(c)).sort();
	}, [data]);

	const filteredData = useMemo(() => {
		if (conferenceFilter.length === 0 || conferenceFilter.length === 6) return data;
		return data.filter(
			team =>
				conferenceFilter.includes(team.conference) ||
				(conferenceFilter.includes('mid-major') && midMajorConferences.includes(team.conference))
		);
	}, [data, conferenceFilter, midMajorConferences]);

	const rerankedData = useMemo(() => {
		if (conferenceFilter.length === 6 || conferenceFilter.length === 0 || !relativeRankings) return filteredData;
		return rerankColumns(filteredData);
	}, [filteredData, conferenceFilter, relativeRankings]);

	const rows = useMemo(() => {
		const last = Number.MAX_SAFE_INTEGER;
		if (split) {
			return rerankedData.toSorted((a, b) => {
				const x = sourceSplit(a, stat, shownSources);
				const y = sourceSplit(b, stat, shownSources);
				if (!x || !y) return (x ? 0 : 1) - (y ? 0 : 1);
				const d = y.range - x.range || y.sd - x.sd;
				return split === 'asc' ? -d : d;
			});
		}
		return rerankedData.toSorted(
			(a, b) =>
				(rankOf(a, model, stat) ?? last) - (rankOf(b, model, stat) ?? last) ||
				a.avg_zscore_rank - b.avg_zscore_rank
		);
	}, [rerankedData, model, stat, split, shownSources]);

	// Bar length: share of the range shown, floored so the shortest bar still reads
	const barRange = useMemo(() => {
		const values = rerankedData.map(t => valueOf(t, model, stat)).filter((v): v is number => v != null);
		return values.length ? { lo: Math.min(...values), hi: Math.max(...values) } : null;
	}, [rerankedData, model, stat]);

	function barPct(v: number) {
		if (!barRange || barRange.hi === barRange.lo) return 100;
		const { lo, hi } = barRange;
		const better = lowerIsBetter(model, stat) ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo);
		return 30 + better * 70;
	}

	function selectModel(m: Model) {
		if (!available[m]) return;
		setModelPref(m);
		setSplitSort(null);
	}

	function selectStat(s: Stat) {
		setStatPref(s);
		setSplitSort(null);
	}

	function sortBy(m: Model, s: Stat) {
		setModelPref(m);
		setStatPref(s);
		setSplitSort(null);
	}

	function selectView(v: View) {
		setViewPref(v);
		setSplitSort(null);
	}

	function toggleSplit() {
		setSplitSort(s => (s === 'desc' ? 'asc' : 'desc'));
	}

	const statLabel = statInfo(stat).label.toLowerCase();
	const sortDescription = split
		? `Sorted by ${split === 'asc' ? 'closest agreement' : 'biggest disagreement'} between models (${statLabel} rank)`
		: `Sorted by ${modelInfo(model).label} ${model === 'net' ? 'rank' : statLabel}`;

	const netStatDisabled = (s: Stat) => !hasStat(model, s);
	const unavailableTitle = (label: string) => `${label} has no rankings yet this season`;

	const viewToggle = (compact: boolean) => (
		<div className={`flex shrink-0 border border-white/10 bg-white/[0.03] ${compact ? 'rounded-lg p-0.5' : 'rounded-xl p-1'}`}>
			{(
				[
					{ key: 'focus', label: 'Focused', Icon: Rows3 },
					{ key: 'all', label: 'All models', Icon: Table2 }
				] as const
			).map(({ key, label, Icon }) => (
				<button
					key={key}
					onClick={() => selectView(key)}
					aria-label={label}
					title={label}
					className={`flex items-center gap-1.5 cursor-pointer transition-colors ${compact ? 'px-2 py-1 rounded-md' : 'px-2.5 py-1.5 rounded-lg'} ${view === key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
				>
					<Icon className="size-3.5" />
					{!compact && label}
				</button>
			))}
		</div>
	);

	const statButtons = (compact: boolean) =>
		STATS.map(s => (
			<button
				key={s.key}
				onClick={() => selectStat(s.key)}
				disabled={netStatDisabled(s.key)}
				title={netStatDisabled(s.key) ? 'NET only publishes an overall rank' : undefined}
				className={`cursor-pointer transition-colors disabled:cursor-not-allowed disabled:text-slate-600 ${compact ? 'flex-1 py-1 rounded-md' : 'px-3 py-1.5 rounded-lg'} ${stat === s.key && !split ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
			>
				{s.label}
			</button>
		));

	const conferenceFilterEl = (className: string, compact = false) => (
		<ConferenceFilter
			conferenceFilter={conferenceFilter}
			onChange={setConferenceFilter}
			relativeRankings={relativeRankings}
			onRelRankChange={setOnRelativeRankings}
			className={className}
			compact={compact}
		/>
	);

	const sortArrow = (on: boolean, size = 'size-[11px]') => (on ? <ArrowDown className={size} /> : null);

	const thBase = 'sticky top-0 z-20 font-medium';
	const stickyTeam = 'sticky left-0 shadow-[1px_0_0_rgba(255,255,255,0.06)]';

	const teamCell = (team: CompiledTeamData) => (
		<td
			className={`${stickyTeam} z-10 pl-3 lg:pl-4 pr-3 lg:pr-5 border-b border-white/[0.05] bg-[#0c0d14] group-hover:bg-[#121320]`}
		>
			<div className="flex items-center gap-2 lg:gap-2.5">
				<span className="w-6 lg:w-9 shrink-0 text-[12px] lg:text-[14px] font-semibold text-slate-300">
					{rankOf(team, model, stat) ?? '—'}
				</span>
				<TeamLogo teamKey={team.team_key} size={50} className="size-[18px] lg:size-[22px] shrink-0 object-contain" />
				<span className="text-white font-medium text-[13px] truncate max-w-[118px] lg:max-w-none group-hover:underline">
					{team.team_name}
				</span>
				<span className="text-[10.5px] lg:text-[11px] text-slate-500">{team.conference}</span>
			</div>
		</td>
	);

	return (
		<div className="relative flex-1 min-h-0 flex flex-col">
			{/* Page header */}
			<div className="px-4 lg:px-6 pt-1 lg:pt-6 pb-0 lg:pb-4 flex items-end justify-between">
				<div>
					{season != null && (
						<div className="hidden lg:block text-[12px] text-violet-300/80 font-medium tracking-wide">
							{seasonLabel(season)}
						</div>
					)}
					<h1 className="sr-only lg:not-sr-only text-[30px] font-semibold tracking-tight text-white leading-tight lg:mt-1">
						<span className="sr-only">CBB Composite </span>Rankings
					</h1>
				</div>
			</div>

			{/* Desktop toolbar: two fixed rows, labels in a shared column so the groups line up */}
			<div className="hidden lg:block px-6 space-y-2 whitespace-nowrap text-[13px]">
				<div className="flex items-center gap-3 flex-nowrap">
					<span className="w-16 shrink-0 text-[11px] uppercase tracking-wider text-slate-500">Rank by</span>
					<div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
						{shownModels.map(m => (
							<div
								key={m.key}
								className={`flex items-center rounded-lg pr-1 transition-colors ${model === m.key && !split ? 'bg-white/10' : ''}`}
							>
								<button
									onClick={() => selectModel(m.key)}
									disabled={!available[m.key]}
									title={available[m.key] ? `Rank by ${m.label}` : unavailableTitle(m.label)}
									className={`flex items-center gap-1.5 pl-3 py-1.5 cursor-pointer disabled:cursor-not-allowed disabled:text-slate-600 ${m.url ? 'pr-1' : 'pr-2'} ${model === m.key && !split ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
								>
									<span
										className={`size-1.5 rounded-full ${available[m.key] ? '' : 'opacity-50'}`}
										style={{ background: m.color }}
									/>
									{m.label}
								</button>
								{m.url && <SourceLink label={m.label} url={m.url} />}
							</div>
						))}
					</div>
					<div className="ml-auto">{viewToggle(false)}</div>
				</div>
				<div className="flex items-center gap-3 flex-nowrap h-[42px]">
					<span className="w-16 shrink-0 text-[11px] uppercase tracking-wider text-slate-500">Sort</span>
					<div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">{statButtons(false)}</div>
					<div className="ml-auto flex gap-2">
						<SourcesFilter aurora sourcesFilter={sourcesFilter} onChange={setSourcesFilter} className="h-[42px]" />
						{conferenceFilterEl('h-[42px]')}
					</div>
				</div>
			</div>

			{/* Phone toolbar: the same controls, model chips swipe sideways */}
			<div className="lg:hidden px-4 pb-3 space-y-2">
				<div className="flex gap-1.5 text-[12px] overflow-x-auto -mx-4 px-4">
					{shownModels.map(m => (
						<div
							key={m.key}
							className={`shrink-0 flex items-center rounded-lg pr-0.5 ${model === m.key && !split ? 'bg-white/10 ring-1 ring-white/15' : 'border border-white/10'}`}
						>
							<button
								onClick={() => selectModel(m.key)}
								disabled={!available[m.key]}
								title={available[m.key] ? `Rank by ${m.label}` : unavailableTitle(m.label)}
								className={`flex items-center gap-1.5 pl-2.5 py-1.5 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:text-slate-600 ${m.url ? 'pr-1' : 'pr-2.5'} ${model === m.key && !split ? 'text-white' : 'text-slate-400'}`}
							>
								<span
									className={`size-1.5 rounded-full ${available[m.key] ? '' : 'opacity-50'}`}
									style={{ background: m.color }}
								/>
								{m.label}
							</button>
							{m.url && <SourceLink label={m.label} url={m.url} />}
						</div>
					))}
				</div>
				<div className="flex gap-2 text-[12px]">
					<div className="flex flex-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">{statButtons(true)}</div>
					{viewToggle(true)}
					<SourcesFilter aurora compact sourcesFilter={sourcesFilter} onChange={setSourcesFilter} className="rounded-lg px-2.5" />
					{conferenceFilterEl('rounded-lg px-2.5', true)}
				</div>
			</div>

			{/* Table card */}
			<div className="relative flex-1 min-h-0 flex flex-col lg:mx-6 lg:mt-4 lg:mb-6 lg:rounded-xl border-y lg:border border-white/10 bg-white/[0.02] overflow-hidden">
				<div className="flex-1 min-h-0 overflow-auto overscroll-none">
					<table className="w-full text-[12.5px] lg:text-[13px] tabular-nums whitespace-nowrap border-separate border-spacing-0">
						{view === 'focus' ? (
							<>
								<thead>
									<tr className="text-[10px] lg:text-[11px] text-slate-500 uppercase tracking-wider">
										<th
											className={`${thBase} ${stickyTeam} z-30 text-left pl-3 lg:pl-4 pr-3 py-3 border-b border-white/[0.06]`}
											style={{ background: SURFACE }}
										>
											<div className="flex items-center gap-2 lg:gap-2.5">
												<span className="w-6 lg:w-9 shrink-0">
													<span className="lg:hidden">#</span>
													<span className="hidden lg:inline">Rank</span>
												</span>
												Team
											</div>
										</th>
										{STATS.map(s => (
											<th
												key={s.key}
												className={`${thBase} text-center px-2.5 lg:px-3 border-b border-white/[0.06]`}
												style={solidTint(color, '0b')}
											>
												<button
													onClick={() => selectStat(s.key)}
													disabled={netStatDisabled(s.key)}
													className={`inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer disabled:cursor-default ${stat === s.key && !split ? 'font-semibold' : 'opacity-70 hover:opacity-100'}`}
													style={{ color }}
												>
													<span className="lg:hidden">{s.short}</span>
													<span className="hidden lg:inline">{s.label}</span>
													{sortArrow(stat === s.key && !split)}
												</button>
											</th>
										))}
										<th
											className={`${thBase} text-center px-2.5 lg:px-3 border-b border-white/[0.06]`}
											style={{ background: SURFACE }}
										>
											<button
												onClick={toggleSplit}
												title="Sort by how much the models disagree"
												className="uppercase tracking-wider cursor-pointer hover:text-slate-300"
											>
												Model ranks <span className="hidden lg:inline">· {statLabel}</span>
											</button>
											<div className="flex items-center justify-center gap-2.5 normal-case tracking-normal text-[10px] mt-0.5">
												{shownSources.map(s => (
													<span key={s.key} className="flex items-center gap-1">
														<span className="w-1 h-2.5 rounded-sm" style={{ background: s.color }} />
														{s.short}
													</span>
												))}
												<span className="text-slate-600">#1 → #50</span>
											</div>
										</th>
										<th
											className={`${thBase} text-center px-2 border-b border-white/[0.06]`}
											style={split ? solidTint('#ffffff', '0a') : { background: SURFACE }}
										>
											<button
												onClick={toggleSplit}
												title="Gap between a team's best and worst model rank. Click to sort by it."
												className={`inline-flex items-center gap-0.5 uppercase tracking-wider cursor-pointer ${split ? 'text-white font-semibold' : 'hover:text-slate-300'}`}
											>
												{split === 'asc' && <ArrowUp className="size-[11px]" />}
												{split === 'desc' && <ArrowDown className="size-[11px]" />}
												Gap
											</button>
										</th>
										{shownModels.map(m => (
											<th
												key={m.key}
												className={`${thBase} text-center px-2 border-b border-white/[0.06]`}
												style={{ background: SURFACE }}
											>
												<button
													onClick={() => selectModel(m.key)}
													disabled={!available[m.key]}
													title={
														available[m.key]
															? `Rank by ${m.label} ${m.key === 'net' ? 'rank' : statLabel}`
															: unavailableTitle(m.label)
													}
													className="inline-flex items-center gap-0.5 uppercase tracking-wider font-semibold cursor-pointer disabled:cursor-default disabled:opacity-60"
													style={{ color: m.color }}
												>
													{sortArrow(model === m.key && !split)}
													{m.short}
												</button>
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{rows.map(team => (
										<tr
											key={team.team_key}
											className="group h-[44px] lg:h-[46px] cursor-pointer"
											onClick={() => router.push(`/${team.team_key}`)}
										>
											{teamCell(team)}
											{STATS.map(s => {
												const on = s.key === stat && !split;
												const value = valueOf(team, model, s.key);
												const rank = rankOf(team, model, s.key);
												return (
													<td
														key={s.key}
														className="px-2.5 lg:px-3 border-b border-white/[0.05]"
														style={{ background: `${color}0b` }}
													>
														<div className="flex items-center justify-center gap-1.5">
															{(value != null || rank == null) && (
																<span
																	className={`min-w-[3.6em] text-right ${on ? 'text-white font-semibold' : 'text-slate-200'}`}
																>
																	{formatValue(model, s.key, value)}
																</span>
															)}
															{rank != null && <Chip rank={rank} color={color} />}
															{on && value != null && (
																<div className="h-2 w-14 lg:w-[88px] shrink-0 rounded-full bg-white/[0.06] overflow-hidden">
																	<div
																		className="h-full rounded-full transition-all"
																		style={{ width: `${barPct(value)}%`, background: color }}
																	/>
																</div>
															)}
														</div>
													</td>
												);
											})}
											<td className="px-2.5 lg:px-3 border-b border-white/[0.05]">
												<div className="flex justify-center">
													<SourceStrip team={team} stat={stat} model={model} sources={shownSources} />
												</div>
											</td>
											<td
												className={`text-center px-2 border-b border-white/[0.05] ${split ? 'text-white font-semibold' : 'text-slate-400'}`}
												style={split ? { background: 'rgba(255,255,255,0.04)' } : undefined}
											>
												{sourceSplit(team, stat, shownSources)?.range ?? '—'}
											</td>
											{shownModels.map(m => (
												<td
													key={m.key}
													className="text-center px-2 border-b border-white/[0.05]"
													style={{ background: `${m.color}${model === m.key && !split ? '1f' : '0b'}` }}
												>
													<Chip rank={rankOf(team, m.key, m.key === 'net' ? 'r' : stat)} color={m.color} />
												</td>
											))}
										</tr>
									))}
								</tbody>
							</>
						) : (
							<>
								{/* All models: every source's rating, offense and defense side by side */}
								<thead>
									<tr className="text-[10.5px] lg:text-[11px] text-slate-400">
										<th
											className={`${thBase} ${stickyTeam} z-30 h-8`}
											style={{ background: SURFACE }}
										/>
										{shownModels.map(m => (
											<th
												key={m.key}
												colSpan={m.key === 'net' ? (available.net ? 1 + NET_QUADS.length : 1) : 3}
												className={`${thBase} h-8 text-center font-semibold pt-2 border-l border-white/[0.06]`}
												style={{ ...solidTint(m.color, '0d'), color: m.color }}
											>
												{m.label}
											</th>
										))}
									</tr>
									<tr className="text-[10px] lg:text-[10.5px] text-slate-500 uppercase tracking-wider">
										<th
											className={`sticky top-8 z-30 left-0 shadow-[1px_0_0_rgba(255,255,255,0.06)] font-medium text-left pl-3 lg:pl-4 pr-3 py-2 border-b border-white/[0.06]`}
											style={{ background: SURFACE }}
										>
											<div className="flex items-center gap-2 lg:gap-2.5">
												<span className="w-6 lg:w-9 shrink-0">#</span>
												Team
											</div>
										</th>
										{shownModels.filter(m => m.key !== 'net').map(m =>
											STATS.map((s, k) => {
												const active = model === m.key && stat === s.key;
												return (
													<th
														key={`${m.key}-${s.key}`}
														className={`sticky top-8 z-20 font-medium text-center border-b border-white/[0.06] ${k === 0 ? 'pl-4 pr-2.5 lg:pr-3 border-l' : 'px-2.5 lg:px-3'}`}
														style={solidTint(m.color, active ? '24' : '0d')}
													>
														<button
															onClick={() => sortBy(m.key, s.key)}
															disabled={!available[m.key]}
															className={`inline-flex items-center gap-0.5 uppercase cursor-pointer disabled:cursor-default ${active ? 'font-semibold' : 'opacity-60 hover:opacity-100'}`}
															style={{ color: m.color }}
														>
															{sortArrow(active, 'size-[10px]')}
															{s.short}
														</button>
													</th>
												);
											})
										)}
										{available.net ? (
											<>
												<th
													className="sticky top-8 z-20 font-medium text-center pl-4 pr-2.5 lg:pr-3 border-l border-b border-white/[0.06]"
													style={solidTint(modelInfo('net').color, model === 'net' ? '24' : '0d')}
												>
													<button
														onClick={() => sortBy('net', 'r')}
														className={`inline-flex items-center gap-0.5 uppercase cursor-pointer ${model === 'net' ? 'font-semibold' : 'opacity-60 hover:opacity-100'}`}
														style={{ color: modelInfo('net').color }}
													>
														{sortArrow(model === 'net', 'size-[10px]')}
														Rank
													</button>
												</th>
												{NET_QUADS.map(q => (
													<th
														key={q.key}
														className="sticky top-8 z-20 font-medium text-center px-2.5 lg:px-3 border-b border-white/[0.06]"
														style={{ ...solidTint(modelInfo('net').color, '0d'), color: `${modelInfo('net').color}99` }}
													>
														{q.label}
													</th>
												))}
											</>
										) : (
											<th
												className="sticky top-8 z-20 font-medium text-center px-3 border-l border-b border-white/[0.06] normal-case tracking-normal"
												style={{ ...solidTint(modelInfo('net').color, '0d'), color: `${modelInfo('net').color}99` }}
											>
												starts Dec
											</th>
										)}
									</tr>
								</thead>
								<tbody>
									{rows.map(team => (
										<tr
											key={team.team_key}
											className="group h-[42px] cursor-pointer"
											onClick={() => router.push(`/${team.team_key}`)}
										>
											{teamCell(team)}
											{shownModels.filter(m => m.key !== 'net').map(m =>
												STATS.map((s, k) => {
													const active = model === m.key && stat === s.key;
													return (
														<td
															key={`${m.key}-${s.key}`}
															className={`border-b border-white/[0.05] ${k === 0 ? 'pl-4 pr-2.5 lg:pr-3 border-l border-l-white/[0.06]' : 'px-2.5 lg:px-3'}`}
															style={{ background: `${m.color}${active ? '24' : '0b'}` }}
														>
															<div className="flex items-center justify-center gap-1 lg:gap-1.5">
																<span
																	className={`min-w-[3.6em] text-right ${active ? 'text-white font-semibold' : 'text-slate-200'}`}
																>
																	{formatValue(m.key, s.key, valueOf(team, m.key, s.key))}
																</span>
																{rankOf(team, m.key, s.key) != null && (
																	<Chip rank={rankOf(team, m.key, s.key)} color={m.color} small />
																)}
															</div>
														</td>
													);
												})
											)}
											{available.net ? (
												<>
													<td
														className="text-center pl-4 pr-2.5 lg:pr-3 border-b border-white/[0.05] border-l border-l-white/[0.06]"
														style={{ background: `${modelInfo('net').color}${model === 'net' ? '24' : '0b'}` }}
													>
														<Chip rank={team.net_rank ?? null} color={modelInfo('net').color} small />
													</td>
													{NET_QUADS.map(q => (
														<td
															key={q.key}
															className="text-center px-2.5 lg:px-3 border-b border-white/[0.05] text-slate-200"
															style={{ background: `${modelInfo('net').color}0b` }}
														>
															{team[q.key] ?? '—'}
														</td>
													))}
												</>
											) : (
												<td
													className="text-center px-3 border-b border-white/[0.05] border-l border-l-white/[0.06] text-slate-600"
													style={{ background: `${modelInfo('net').color}0b` }}
													title={unavailableTitle('NET')}
												>
													—
												</td>
											)}
										</tr>
									))}
								</tbody>
							</>
						)}
					</table>
					{rows.length === 0 && <div className="my-20 text-center text-slate-500">No teams match this filter.</div>}
				</div>

				{/* Phones: fade on the right edge hints that the table swipes */}
				<div className="lg:hidden pointer-events-none absolute top-0 bottom-10 right-0 w-8 bg-gradient-to-l from-[#07080f] to-transparent" />

				<div className="flex items-center gap-2 px-4 h-10 shrink-0 border-t border-white/[0.06] text-[11px] lg:text-[12px] text-slate-500 whitespace-nowrap overflow-hidden">
					<span className="lg:hidden">Swipe for more columns</span>
					<span className="hidden lg:inline">{sortDescription}</span>
					<span className="ml-auto lg:ml-0">
						<span className="hidden lg:inline">· </span>
						{season != null && <span className="lg:hidden">{seasonLabel(season)} · </span>}
						{rows.length} teams
					</span>
				</div>
			</div>
		</div>
	);
}
