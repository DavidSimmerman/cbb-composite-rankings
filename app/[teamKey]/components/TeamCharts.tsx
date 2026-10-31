'use client';

import { allSources } from '@/app/components/columns';
import { pickCompositeCombo } from '@/lib/shared';
import SourcesFilter from '@/app/components/SourcesFilter';
import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useEffect, useMemo, useRef } from 'react';
import { PiChartLineBold } from 'react-icons/pi';
import { RiCollapseVerticalLine, RiExpandVerticalLine } from 'react-icons/ri';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts';
import { twMerge } from 'tailwind-merge';

export default function TeamCharts({ className }: { className: string }) {
	const [zoom, setZoom] = useCookie<boolean>('chart_zoom', false);
	const [dashedLines, setDashedLines] = useCookie<boolean>('dashed_lines', false);
	const [gameLines, setGameLines] = useCookie<boolean>('chart_game_lines', true);
	const [rank, setRank] = useCookie<boolean>('rank_view', false);
	const [sourcesFilter, setSourcesFilter] = useCookie<string[]>('sources_filter', [...allSources]);
	const [activeChart, setActiveChart] = useCookie<'rating' | 'offensive' | 'defensive'>('chart_active', 'rating');

	const [seasonRange, setSeasonRange] = useCookie<'season' | 'two'>('chart_season_range', 'season');

	const { ratings_history: history, season } = useTeamProfile();

	const sourceOrder = ['kp', 'em', 'bt', 'net'];
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
		const current = rows.filter(h => h.season === season).map(h => ({ date: h.date, ...point(h), full: h }));

		if (seasonRange !== 'two') return current;

		const previous = rows
			.filter(h => h.season === season - 1)
			.map(h => ({
				date: h.date,
				...Object.fromEntries(Object.entries(point(h)).map(([k, v]) => [`${k}_prev`, v])),
				full: h
			}));

		if (!previous.length) return current;

		const gapSize = Math.max(4, Math.round((previous.length + current.length) * 0.05));
		const gap = Array.from({ length: gapSize }, (_, i) => ({ date: `${OFFSEASON}${i}` }));

		return [...previous, ...gap, ...current];
	};

	const ratingData = buildData(ratingPoint);
	const offensiveData = buildData(offensivePoint);
	const defensiveData = buildData(defensivePoint);

	const range = useMemo(() => {
		if (zoom) {
			return ['dataMin - 0.1', 'dataMax + 0.1'];
		} else if (rank) {
			return [-50, 0];
		} else {
			return [1, 3];
		}
	}, [zoom, rank]);

	return (
		<div className={twMerge(`flex flex-col w-full min-h-0 border border-neutral-800 rounded-lg p-3 md:p-4`, className)}>
			<div className="flex flex-col md:flex-row">
				<div className="text-2xl font-bold text-neutral-600 h-full align-top mb-2 md:mb-0">Rating History</div>

				<div className="ml-auto mr-0 flex gap-2 z-1">
					<div className="flex rounded-md border border-input text-xs md:text-sm shrink-0">
						{(
							[
								{ key: 'season', label: 'This season', short: 'Season' },
								{ key: 'two', label: 'Last 2 seasons', short: '2 seasons' }
							] as const
						).map(opt => (
							<button
								key={opt.key}
								onClick={() => setSeasonRange(opt.key)}
								className={`px-2 md:px-2.5 cursor-pointer first:rounded-l-md last:rounded-r-md transition-colors ${
									seasonRange === opt.key ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<span className="hidden md:inline">{opt.label}</span>
								<span className="md:hidden">{opt.short}</span>
							</button>
						))}
					</div>
					<Toggle
						className={`cursor-pointer [&_svg]:transition-transform [&_svg]:duration-200 ${zoom ? 'hover:[&_svg]:scale-75' : 'hover:[&_svg]:scale-125'}`}
						pressed={zoom}
						onPressedChange={setZoom}
					>
						{zoom ? <RiCollapseVerticalLine /> : <RiExpandVerticalLine />}
					</Toggle>
					<Toggle className="cursor-pointer group/dash" pressed={dashedLines} onPressedChange={setDashedLines}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth={2.5}
							strokeLinecap="round"
							className="size-4"
						>
							<path
								d="M3 8 C8 4, 14 14, 21 6"
								strokeDasharray={dashedLines ? '3 3' : '100'}
								className={
									dashedLines
										? 'group-hover/dash:[stroke-dasharray:100]'
										: 'group-hover/dash:[stroke-dasharray:3_3]'
								}
							/>
							<path
								d="M3 18 C8 12, 14 20, 21 14"
								strokeDasharray={dashedLines ? '3 3' : '100'}
								className={
									dashedLines
										? 'group-hover/dash:[stroke-dasharray:100]'
										: 'group-hover/dash:[stroke-dasharray:3_3]'
								}
							/>
						</svg>
					</Toggle>
					<Toggle className="cursor-pointer group/wl" pressed={gameLines} onPressedChange={setGameLines}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							className="size-4"
						>
							<line
								x1="6"
								y1="4"
								x2="6"
								y2="20"
								className="stroke-white group-hover/wl:stroke-green-500 transition-colors"
							/>
							<line
								x1="12"
								y1="4"
								x2="12"
								y2="20"
								className="stroke-white group-hover/wl:stroke-red-500 transition-colors"
							/>
							<line
								x1="18"
								y1="4"
								x2="18"
								y2="20"
								className="stroke-white group-hover/wl:stroke-green-500 transition-colors"
							/>
						</svg>
					</Toggle>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="cursor-pointer" variant="outline">
								<PiChartLineBold />
								<span className="hidden md:inline">{rank ? 'Rank' : 'Z-Score'}</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="">
							<DropdownMenuGroup>
								<DropdownMenuCheckboxItem
									checked={!rank}
									onCheckedChange={() => setRank(false)}
									className="px-6 flex gap-0 justify-center cursor-pointer capitalize"
								>
									Z-Score
								</DropdownMenuCheckboxItem>
								<DropdownMenuCheckboxItem
									checked={rank}
									onCheckedChange={() => setRank(true)}
									className="px-6 flex gap-0 justify-center cursor-pointer capitalize"
								>
									Rank
								</DropdownMenuCheckboxItem>
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
					<SourcesFilter sourcesFilter={sourcesFilter} onChange={setSourcesFilter} />
				</div>
			</div>

			<div className="flex flex-col md:flex-row mt-3 flex-1 min-h-0">
				<div className="hidden md:flex flex-col -mr-px z-10">
					{(
						[
							{ key: 'rating', label: 'Rating' },
							{ key: 'offensive', label: 'Off' },
							{ key: 'defensive', label: 'Def' }
						] as const
					).map(tab => (
						<button
							key={tab.key}
							onClick={() => setActiveChart(tab.key)}
							className={`flex-1 px-1.5 py-3 text-md font-bold cursor-pointer border border-border border-l-0 first:rounded-br-xl last:rounded-tr-xl transition-colors [writing-mode:vertical-lr] rotate-180 ${
								activeChart === tab.key
									? 'bg-card text-foreground border-r-transparent'
									: 'bg-transparent text-muted-foreground hover:text-foreground border-r-border'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
				<div className="w-full min-w-0 h-full">
					<ChartCard
						chartData={
							activeChart === 'rating' ? ratingData : activeChart === 'offensive' ? offensiveData : defensiveData
						}
						metric={
							activeChart === 'rating'
								? 'rating'
								: activeChart === 'offensive'
									? 'offensive_rating'
									: 'defensive_rating'
						}
						range={range}
						sources={sourcesFilter}
						dashed={dashedLines}
						gameLines={gameLines}
					/>
				</div>
				<div className="flex md:hidden -mt-px z-10">
					{(
						[
							{ key: 'rating', label: 'Rating' },
							{ key: 'offensive', label: 'Off' },
							{ key: 'defensive', label: 'Def' }
						] as const
					).map(tab => (
						<button
							key={tab.key}
							onClick={() => setActiveChart(tab.key)}
							className={`flex-1 px-3 py-1.5 text-md font-bold cursor-pointer border border-border border-t-0 first:rounded-bl-xl last:rounded-br-xl transition-colors ${
								activeChart === tab.key
									? 'bg-card text-foreground border-t-transparent'
									: 'bg-transparent text-muted-foreground hover:text-foreground border-t-border'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>
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
	chartData: Record<string, any>[];
	metric: string;
	range: any[2];
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
		composite: {
			label: 'Composite',
			color: 'var(--color-purple-500)'
		},
		kenpom: {
			label: 'KenPom',
			color: 'var(--color-blue-500)'
		},
		evanmiya: {
			label: 'EvanMiya',
			color: 'var(--color-green-500)'
		},
		barttorvik: {
			label: 'BartTorvik',
			color: 'var(--color-yellow-500)'
		},
		net: {
			label: 'NET',
			color: 'var(--color-red-500)'
		}
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
			<Card className="w-full h-76 md:h-full p-3 rounded-b-none md:rounded-br-xl md:rounded-tl-none flex items-center justify-center text-sm text-muted-foreground">
				Rating history for this season starts November 1.
			</Card>
		);
	}

	return (
		<Card ref={scrollRef} className="w-full h-76 md:h-full overflow-auto p-3 rounded-b-none md:rounded-br-xl md:rounded-tl-none md:border-l-none select-none">
			<ChartContainer config={chartConfig} className="aspect-auto h-full w-[150dvw] md:w-full">
				<LineChart data={chartData} margin={{ left: 12, right: 12 }}>
					<CartesianGrid vertical={false} />
					{showGameLines &&
						games.map(g => (
							<ReferenceLine
								key={g.date}
								x={g.date}
								xAxisId="dates"
								stroke={g.won ? 'var(--color-green-800)' : 'var(--color-red-800)'}
								strokeOpacity={0.9}
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
								<div className="border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
									<div className="font-medium">{label}</div>
									<div className="grid gap-1.5">
										{game && (
											<div className="flex w-full mb-2">
												<div className="text-right text-xs text-white/70 pr-1">{homeAway}</div>
												<TeamLogo teamKey={game.opp.team_key} className="h-lh" />
												<span className="truncate ">{game.opp.team_name}</span>
												<span className="mx-1">
													{typeof game.won === 'boolean' &&
														(game.won ? (
															<span className="font-bold text-green-500">W</span>
														) : (
															<span className="font-bold text-red-500">L</span>
														))}
												</span>
												<span className="w-fit">{game.score}</span>
											</div>
										)}

										{visible.map(item => {
											const name = baseKey(item.dataKey as string);
											let key = '';

											if (name === 'composite') {
												key = `avg_${metric.replace('rating', 'zscore')}`;
											} else if (name === 'kenpom') {
												key = `kp_${metric}`;
											} else if (name === 'evanmiya') {
												key = `em_${metric}`;
											} else if (name === 'barttorvik') {
												key = `bt_${metric}`;
											} else if (name === 'net') {
												key = `net_rank`;
											}

											return (
												<div key={item.dataKey as string} className="flex w-full items-center gap-2">
													<div
														className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
														style={{ '--color-bg': `var(--color-${name})` } as React.CSSProperties}
													/>
													{chartConfig[name as keyof typeof chartConfig]?.label || name}
													<div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
														{Math.round(item.payload.full[key] * 100) / 100}
														<span className="text-muted-foreground font-normal ml-0.5">
															{name === 'net' || item.payload.full[key + '_rank']}
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
							stroke="var(--color-neutral-700)"
							strokeDasharray="3 3"
							ifOverflow="visible"
							label={{ value: 'OFFSEASON', position: 'insideTop', fill: 'var(--color-neutral-500)', fontSize: 10 }}
						/>
					)}
					<defs>
						<pattern id="offseason-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
							<line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-neutral-800)" strokeWidth="2" />
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
								strokeWidth={suffix ? 2 : 3}
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
		</Card>
	);
}

const OFFSEASON = 'offseason-';
const isOffseason = (date: string) => date.startsWith(OFFSEASON);
const baseKey = (dataKey: string) => dataKey.replace(/_prev$/, '');

const LINES = [
	{ key: 'composite', source: 'Composite', color: 'var(--color-purple-500)', dashOffset: null },
	{ key: 'kenpom', source: 'KenPom', color: 'var(--color-blue-500)', dashOffset: 0 },
	{ key: 'evanmiya', source: 'EvanMiya', color: 'var(--color-green-500)', dashOffset: -5 },
	{ key: 'barttorvik', source: 'BartTorvik', color: 'var(--color-yellow-500)', dashOffset: -10 },
	{ key: 'net', source: 'NET', color: 'var(--color-red-500)', dashOffset: -15 }
] as const;
