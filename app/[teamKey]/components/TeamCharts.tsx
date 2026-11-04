'use client';

import { allSources } from '@/app/components/columns';
import SourcesFilter from '@/app/components/SourcesFilter';
import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { pickCompositeCombo } from '@/lib/shared';
import { FoldVertical, UnfoldVertical } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import { twMerge } from 'tailwind-merge';
import { CARD, CardTitle, MODEL_COLORS, Seg } from './ui';

export default function TeamCharts({ className }: { className?: string }) {
	const [zoom, setZoom] = useCookie<boolean>('chart_zoom', false);
	const [dashedLines, setDashedLines] = useCookie<boolean>('dashed_lines', false);
	const [gameLines, setGameLines] = useCookie<boolean>('chart_game_lines', true);
	const [rank, setRank] = useCookie<boolean>('rank_view', false);
	const [sourcesFilter, setSourcesFilter] = useCookie<string[]>('sources_filter', [...allSources]);
	const [activeChart, setActiveChart] = useCookie<'rating' | 'offensive' | 'defensive'>('chart_active', 'rating');

	const [seasonRange, setSeasonRange] = useCookie<'season' | 'two'>('chart_season_range', 'season');

	const { ratings_history: history, season } = useTeamProfile();

	const sourcesKey = useMemo(() => {
		if (sourcesFilter.length) {
			return sourcesFilter
				.filter(s => s !== 'Composite')
				.map(s => s.replaceAll(/[a-z]+/g, '').toLocaleLowerCase())
				.sort((a, b) => sourceOrder.indexOf(a) - sourceOrder.indexOf(b))
				.join(',');
		} else {
			return sourceOrder.join(',');
		}
	}, [sourcesFilter]);

	type HistoryRow = (typeof history)[string];

	const compositeFor = (h: HistoryRow) => pickCompositeCombo(h.composite_combos, sourcesKey);

	const ratingPoint = (h: HistoryRow) => ({
		composite: rank ? -(compositeFor(h)?.avg_zscore_rank ?? NaN) : compositeFor(h)?.avg_zscore,
		kenpom: rank ? -h.kp_rating_rank : h.kp_rating_zscore,
		evanmiya: rank ? -h.em_rating_rank : h.em_rating_zscore,
		barttorvik: rank ? -h.bt_rating_rank : h.bt_rating_zscore,
		net: rank ? -h.net_rank : h.net_rank_zscore
	});

	const offensivePoint = (h: HistoryRow) => ({
		composite: rank ? -(compositeFor(h)?.avg_offensive_zscore_rank ?? NaN) : compositeFor(h)?.avg_offensive_zscore,
		kenpom: rank ? -h.kp_offensive_rating_rank : h.kp_offensive_zscore,
		evanmiya: rank ? -h.em_offensive_rating_rank : h.em_offensive_zscore,
		barttorvik: rank ? -h.bt_offensive_rating_rank : h.bt_offensive_zscore
	});

	const defensivePoint = (h: HistoryRow) => ({
		composite: rank ? -(compositeFor(h)?.avg_defensive_zscore_rank ?? NaN) : compositeFor(h)?.avg_defensive_zscore,
		kenpom: rank ? -h.kp_defensive_rating_rank : h.kp_defensive_zscore,
		evanmiya: rank ? -h.em_defensive_rating_rank : h.em_defensive_zscore,
		barttorvik: rank ? -h.bt_defensive_rating_rank : h.bt_defensive_zscore
	});

	// Last season's points go under *_prev keys (drawn faded), then a run of empty
	// "offseason" slots stands in for the summer before this season starts
	const buildData = (point: (h: HistoryRow) => Record<string, number | undefined>) => {
		const rows = Object.values(history).sort((a, b) => a.date.localeCompare(b.date));
		const current = rows
			.filter(h => h.season === season)
			.map(h => ({ date: h.date, ...point(h), full: h, comp: compositeFor(h) }));

		if (seasonRange !== 'two') return current;

		const previous = rows
			.filter(h => h.season === season - 1)
			.map(h => ({
				date: h.date,
				...Object.fromEntries(Object.entries(point(h)).map(([k, v]) => [`${k}_prev`, v])),
				full: h,
				comp: compositeFor(h)
			}));

		if (!previous.length) return current;

		const gapSize = Math.max(4, Math.round((previous.length + current.length) * 0.05));
		const gap = Array.from({ length: gapSize }, (_, i) => ({ date: `${OFFSEASON}${i}` }));

		return [...previous, ...gap, ...current];
	};

	const ratingData = buildData(ratingPoint);
	const offensiveData = buildData(offensivePoint);
	const defensiveData = buildData(defensivePoint);

	const range = useMemo<string[] | number[]>(() => {
		if (zoom) {
			return ['dataMin - 0.1', 'dataMax + 0.1'];
		} else if (rank) {
			return [-50, 0];
		} else {
			return [1, 3];
		}
	}, [zoom, rank]);

	const chartKey = activeChart === 'rating' ? 'rating' : activeChart === 'offensive' ? 'offensive' : 'defensive';
	const shownLines = LINES.filter(l => (sourcesFilter.length === 0 || sourcesFilter.includes(l.source)) && (chartKey === 'rating' || l.key !== 'net'));

	const iconToggle = (pressed: boolean, onChange: (v: boolean) => void, title: string, icon: React.ReactNode) => (
		<button
			onClick={() => onChange(!pressed)}
			title={title}
			aria-label={title}
			aria-pressed={pressed}
			className={`grid place-items-center shrink-0 size-[26px] rounded-lg border cursor-pointer transition-colors ${pressed ? 'border-white/20 bg-white/10 text-white' : 'border-white/10 bg-white/[0.02] text-slate-500 hover:text-slate-300'}`}
		>
			{icon}
		</button>
	);

	return (
		<div className={twMerge(`${CARD} p-3.5 lg:p-4 flex flex-col min-w-0`, className)}>
			<div className="flex items-center justify-between gap-2">
				<CardTitle>Rating history</CardTitle>
				<Seg
					small
					options={[
						{ key: 'rating', label: 'Rating' },
						{ key: 'offensive', label: 'Off' },
						{ key: 'defensive', label: 'Def' }
					]}
					value={activeChart}
					onChange={setActiveChart}
				/>
			</div>
			{/* One row of controls; swipes sideways on narrow screens rather than wrapping */}
			<div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto -mx-3.5 px-3.5 lg:mx-0 lg:px-0">
				<Seg
					small
					options={[
						{ key: 'season', label: 'Season', title: 'This season' },
						{ key: 'two', label: '2 seasons', title: 'Last 2 seasons' }
					]}
					value={seasonRange}
					onChange={setSeasonRange}
				/>
				<Seg
					small
					options={[
						{ key: 'z', label: 'Z-score' },
						{ key: 'rank', label: 'Rank' }
					]}
					value={rank ? 'rank' : 'z'}
					onChange={v => setRank(v === 'rank')}
				/>
				{iconToggle(
					zoom,
					setZoom,
					zoom ? 'Fixed scale' : 'Zoom to fit',
					zoom ? <FoldVertical className="size-3.5" /> : <UnfoldVertical className="size-3.5" />
				)}
				{iconToggle(
					dashedLines,
					setDashedLines,
					'Dashed lines',
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3.5">
						<path d="M3 8 C8 4, 14 14, 21 6" strokeDasharray={dashedLines ? '3 3' : undefined} />
						<path d="M3 18 C8 12, 14 20, 21 14" strokeDasharray={dashedLines ? '3 3' : undefined} />
					</svg>
				)}
				{iconToggle(
					gameLines,
					setGameLines,
					'Game lines: a line on each game day, green for a win and red for a loss',
					<svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" className="size-3.5">
						<line x1="6" y1="4" x2="6" y2="20" stroke="#4ade80" />
						<line x1="12" y1="4" x2="12" y2="20" stroke="#f87171" />
						<line x1="18" y1="4" x2="18" y2="20" stroke="#4ade80" />
					</svg>
				)}
				<SourcesFilter
					aurora
					compact
					sourcesFilter={sourcesFilter}
					onChange={setSourcesFilter}
					className="lg:hidden rounded-lg h-[26px] px-2 text-[11px]"
				/>
				<SourcesFilter
					aurora
					sourcesFilter={sourcesFilter}
					onChange={setSourcesFilter}
					className="hidden lg:flex rounded-lg h-[26px] px-2 text-[11px]"
				/>
			</div>
			<div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] mt-2.5 mb-1">
				{shownLines.map(l => (
					<span key={l.key} className="flex items-center gap-1.5 text-slate-400 whitespace-nowrap">
						<span className="w-3 h-0.5 rounded" style={{ background: l.color }} />
						{l.source}
					</span>
				))}
			</div>

			<ChartCard
				chartData={activeChart === 'rating' ? ratingData : activeChart === 'offensive' ? offensiveData : defensiveData}
				metric={activeChart === 'rating' ? 'rating' : activeChart === 'offensive' ? 'offensive_rating' : 'defensive_rating'}
				range={range}
				sources={sourcesFilter}
				dashed={dashedLines}
				gameLines={gameLines}
			/>
		</div>
	);
}

function ChartCard({
	chartData,
	metric,
	range,
	sources,
	dashed,
	gameLines: showGameLines
}: {
	chartData: ({ date: string } & Record<string, unknown>)[];
	metric: string;
	range: string[] | number[];
	sources: string[];
	dashed: boolean;
	gameLines: boolean;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
		}
	}, []);

	const chartConfig = {
		composite: { label: 'Composite', color: MODEL_COLORS.composite },
		kenpom: { label: 'KenPom', color: MODEL_COLORS.kenpom },
		evanmiya: { label: 'EvanMiya', color: MODEL_COLORS.evanmiya },
		barttorvik: { label: 'BartTorvik', color: MODEL_COLORS.barttorvik },
		net: { label: 'NET', color: MODEL_COLORS.net }
	};

	const nameToSource: Record<string, string> = {
		composite: 'Composite',
		kenpom: 'KenPom',
		evanmiya: 'EvanMiya',
		barttorvik: 'BartTorvik',
		net: 'NET'
	};

	const { schedule } = useTeamProfile();
	const chartDates = new Set(chartData.map(d => d.date));
	const offseason = chartData.map(d => d.date).filter(isOffseason);
	const games = schedule.filter(g => g.score && chartDates.has(g.date));

	const gameByDate: Record<string, (typeof schedule)[0]> = {};
	games.forEach(g => (gameByDate[g.date] = g));

	const show = (source: string) => sources.includes(source) || sources.length === 0;

	if (!chartData.length) {
		return (
			<div className="h-60 lg:h-72 grid place-items-center rounded-lg border border-dashed border-white/10 text-[13px] text-slate-500">
				Rating history for this season starts November 1.
			</div>
		);
	}

	return (
		<div ref={scrollRef} className="w-full h-64 lg:h-72 overflow-x-auto overflow-y-hidden select-none -mx-1">
			<ChartContainer config={chartConfig} className="aspect-auto h-full w-[150dvw] lg:w-full">
				<LineChart data={chartData} margin={{ left: 12, right: 12 }}>
					<CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
					{showGameLines &&
						games.map(g => (
							<ReferenceLine
								key={g.date}
								x={g.date}
								xAxisId="dates"
								stroke={g.won ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.35)'}
							/>
						))}
					<XAxis
						xAxisId="logos"
						dataKey="date"
						orientation="top"
						tickLine={false}
						axisLine={false}
						tickMargin={22}
						interval={0}
						hide={!showGameLines}
						tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
							const game = gameByDate[payload.value];
							if (!game) return <g />;
							const logoSize = 16;
							return (
								<foreignObject x={x - logoSize / 2} y={y} width={logoSize} height={logoSize}>
									<TeamLogo teamKey={game.opp.team_key} size={40} className="size-full" />
								</foreignObject>
							);
						}}
					/>
					<XAxis
						xAxisId="dates"
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						minTickGap={20}
						tick={{ fill: '#64748b', fontSize: 11 }}
						tickFormatter={(value: string) => (isOffseason(value) ? '' : value.replace(/^\d{4}-/, ''))}
					/>
					<YAxis domain={range} hide />
					<ChartTooltip
						cursor={false}
						content={({ active, payload, label }) => {
							if (!active || !payload?.length || isOffseason(String(label))) return null;

							const visible = payload
								.filter(item => item.value != null && show(nameToSource[baseKey(item.dataKey as string)]))
								.sort((a, b) => (b.value as number) - (a.value as number));

							if (!visible.length) return null;

							const game = schedule.find(g => g.date === label);

							let homeAway;
							if (game?.homeAway === 'home') {
								homeAway = 'vs.';
							} else if (game?.homeAway === 'away') {
								homeAway = '@';
							} else if (game?.homeAway) {
								homeAway = 'n.';
							}

							return (
								<div className="font-grotesk grid min-w-40 items-start gap-1.5 rounded-lg border border-white/10 bg-[#0d0f18]/95 px-2.5 py-1.5 text-xs text-slate-300 shadow-xl">
									<div className="font-medium text-white">{label}</div>
									<div className="grid gap-1.5">
										{game && (
											<div className="flex w-full mb-2">
												<div className="text-right text-xs text-white/70 pr-1">{homeAway}</div>
												<TeamLogo teamKey={game.opp.team_key} className="h-lh" />
												<span className="truncate ">{game.opp.team_name}</span>
												<span className="mx-1">
													{typeof game.won === 'boolean' &&
														(game.won ? (
															<span className="font-bold text-emerald-300">W</span>
														) : (
															<span className="font-bold text-rose-300">L</span>
														))}
												</span>
												<span className="w-fit">{game.score}</span>
											</div>
										)}

										{visible.map(item => {
											const name = baseKey(item.dataKey as string);
											let key = '';
											let rankKey = '';

											if (name === 'composite') {
												// Shown per 70 possessions; ranked by the z-score
												key = `per70_${metric}`;
												rankKey = `avg_${metric.replace('rating', 'zscore')}_rank`;
											} else if (name === 'kenpom') {
												key = `kp_${metric}`;
											} else if (name === 'evanmiya') {
												key = `em_${metric}`;
											} else if (name === 'barttorvik') {
												key = `bt_${metric}`;
											} else if (name === 'net') {
												key = `net_rank`;
											}

											// The composite line is the combo for the selected sources, not the row's default
											const src = name === 'composite' ? (item.payload.comp ?? {}) : item.payload.full;

											return (
												<div key={item.dataKey as string} className="flex w-full items-center gap-2">
													<div
														className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
														style={{ '--color-bg': `var(--color-${name})` } as React.CSSProperties}
													/>
													{chartConfig[name as keyof typeof chartConfig]?.label || name}
													<div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
														{Math.round(src[key] * 100) / 100}
														<span className="text-muted-foreground font-normal ml-0.5">
															{name === 'net' || src[rankKey || key + '_rank']}
														</span>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							);
						}}
					/>

					{offseason.length > 0 && (
						<ReferenceArea
							xAxisId="dates"
							x1={offseason[0]}
							x2={offseason.at(-1)}
							fill="url(#offseason-hatch)"
							stroke="rgba(255,255,255,0.12)"
							strokeDasharray="3 3"
							ifOverflow="visible"
							label={{ value: 'OFFSEASON', position: 'insideTop', fill: '#64748b', fontSize: 10 }}
						/>
					)}
					<defs>
						<pattern id="offseason-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
							<line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
						</pattern>
					</defs>

					{LINES.flatMap(line =>
						['', '_prev'].map(suffix => (
							<Line
								key={line.key + suffix}
								xAxisId="dates"
								dataKey={line.key + suffix}
								type="monotone"
								stroke={line.color}
								strokeWidth={suffix ? 1.5 : line.key === 'composite' ? 3 : 2}
								strokeDasharray={dashed && line.dashOffset !== null ? '5 15' : undefined}
								strokeDashoffset={dashed && line.dashOffset !== null ? line.dashOffset : undefined}
								dot={false}
								strokeOpacity={show(line.source) ? (suffix ? 0.45 : 1) : 0}
								activeDot={show(line.source)}
								isAnimationActive={!suffix}
							/>
						))
					)}
				</LineChart>
			</ChartContainer>
		</div>
	);
}

const sourceOrder = ['kp', 'em', 'bt', 'net'];
const OFFSEASON = 'offseason-';
const isOffseason = (date: string) => date.startsWith(OFFSEASON);
const baseKey = (dataKey: string) => dataKey.replace(/_prev$/, '');

const LINES = [
	{ key: 'composite', source: 'Composite', color: MODEL_COLORS.composite, dashOffset: null },
	{ key: 'kenpom', source: 'KenPom', color: MODEL_COLORS.kenpom, dashOffset: 0 },
	{ key: 'evanmiya', source: 'EvanMiya', color: MODEL_COLORS.evanmiya, dashOffset: -5 },
	{ key: 'barttorvik', source: 'BartTorvik', color: MODEL_COLORS.barttorvik, dashOffset: -10 },
	{ key: 'net', source: 'NET', color: MODEL_COLORS.net, dashOffset: -15 }
] as const;
