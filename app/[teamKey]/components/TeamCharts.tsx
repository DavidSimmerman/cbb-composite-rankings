'use client';

import { allSources } from '@/app/components/columns';
import SourcesFilter from '@/app/components/SourcesFilter';
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
import { useMemo, useState } from 'react';
import { PiChartLineBold } from 'react-icons/pi';
import { RiCollapseVerticalLine, RiExpandVerticalLine } from 'react-icons/ri';
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { twMerge } from 'tailwind-merge';

export default function TeamCharts({ className }: { className: string }) {
	const [zoom, setZoom] = useState<boolean>(false);
	const [dashedLines, setDashedLines] = useState<boolean>(false);
	const [rank, setRank] = useState<boolean>(false);
	const [sourcesFilter, setSourcesFilter] = useState<string[]>([...allSources]);

	const { ratings_history: history } = useTeamProfile();

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

	const ratingData = Object.values(history).map(h => ({
		date: h.date,
		composite: rank ? -h.compositeCombos[sourcesKey]?.avg_zscore_rank : h.compositeCombos[sourcesKey]?.avg_zscore,
		kenpom: rank ? -h.kp_rating_rank : h.kp_rating_zscore,
		evanmiya: rank ? -h.em_rating_rank : h.em_rating_zscore,
		barttorvik: rank ? -h.bt_rating_rank : h.bt_rating_zscore,
		net: rank ? -h.net_rank : h.net_rank_zscore,
		full: h
	}));

	const offensiveData = Object.values(history).map(h => ({
		date: h.date,
		composite: rank
			? -h.compositeCombos[sourcesKey]?.avg_offensive_zscore_rank
			: h.compositeCombos[sourcesKey]?.avg_offensive_zscore,
		kenpom: rank ? -h.kp_offensive_rating_rank : h.kp_offensive_zscore,
		evanmiya: rank ? -h.em_offensive_rating_rank : h.em_offensive_zscore,
		barttorvik: rank ? -h.bt_offensive_rating_rank : h.bt_offensive_zscore,
		full: h
	}));

	const defensiveData = Object.values(history).map(h => ({
		date: h.date,
		composite: rank
			? -h.compositeCombos[sourcesKey]?.avg_defensive_zscore_rank
			: h.compositeCombos[sourcesKey]?.avg_defensive_zscore,
		kenpom: rank ? -h.kp_defensive_rating_rank : h.kp_defensive_zscore,
		evanmiya: rank ? -h.em_defensive_rating_rank : h.em_defensive_zscore,
		barttorvik: rank ? -h.bt_defensive_rating_rank : h.bt_defensive_zscore,
		full: h
	}));

	const range = useMemo(() => {
		if (zoom) {
			return ['dataMin - 0.2', 'dataMax + 0.2'];
		} else if (rank) {
			return [-50, 0];
		} else {
			return [0, 3];
		}
	}, [zoom, rank]);

	return (
		<div className={twMerge(`flex flex-col w-full gap-4 border border-neutral-800 rounded-lg p-4`, className)}>
			<div className="ml-auto mr-0 flex gap-2 z-1">
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

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="cursor-pointer" variant="outline">
							<PiChartLineBold />
							{rank ? 'Rank' : 'Z-Score'}
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

			<div className="flex flex-col md:flex-row gap-8 -mt-8">
				<div className="w-full flex flex-col gap-1">
					<div className="text-muted-foreground ml-3">Rating</div>

					<ChartCard
						chartData={ratingData}
						metric="rating"
						range={range}
						sources={sourcesFilter}
						dashed={dashedLines}
					/>
				</div>
				<div className="w-full flex flex-col gap-1">
					<div className="text-muted-foreground ml-3">Offensive Rating</div>
					<ChartCard
						chartData={offensiveData}
						metric="offensive_rating"
						range={range}
						sources={sourcesFilter}
						dashed={dashedLines}
					/>
				</div>
				<div className="w-full flex flex-col gap-1">
					<div className="text-muted-foreground ml-3">Defensive Rating</div>
					<ChartCard
						chartData={defensiveData}
						metric="defensive_rating"
						range={range}
						sources={sourcesFilter}
						dashed={dashedLines}
					/>
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
	dashed
}: {
	chartData: Record<string, any>[];
	metric: string;
	range: any[2];
	sources: string[];
	dashed: boolean;
}) {
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
	const gameLines = schedule.filter(g => g.score && chartDates.has(g.date));

	const show = (source: string) => sources.includes(source) || sources.length === 0;

	return (
		<Card className="w-full p-3">
			<ChartContainer config={chartConfig}>
				<LineChart data={chartData} margin={{ left: 12, right: 12 }}>
					<CartesianGrid vertical={false} />
					{gameLines.map(g => (
						<ReferenceLine
							key={g.date}
							x={g.date}
							stroke={g.won ? 'var(--color-green-500)' : 'var(--color-red-500)'}
							strokeOpacity={0.9}
						/>
					))}
					<XAxis
						dataKey="date"
						tickLine={false}
						axisLine={false}
						tickMargin={8}
						tickFormatter={value => value.replace(/^\d{4}-/, '')}
					/>
					<YAxis domain={range} hide />
					<ChartTooltip
						cursor={false}
						content={({ active, payload, label }) => {
							if (!active || !payload?.length) return null;

							const visible = payload
								.filter(item => show(nameToSource[item.dataKey as string]))
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
								<div className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
									<div className="font-medium">{label}</div>
									<div className="grid gap-1.5">
										{game && (
											<div className="flex w-full mb-2">
												<div className="text-right text-xs text-white/70 pr-1">{homeAway}</div>
												<TeamLogo teamKey={game.opp.team_key} className="h-lh" />
												<span className="truncate ">{game.opp.team_name}</span>
												<span className="mx-1">
													{game.won ? (
														<span className="font-bold text-green-500">W</span>
													) : (
														<span className="font-bold text-red-500">L</span>
													)}
												</span>
												<span className="w-fit">{game.score}</span>
											</div>
										)}

										{visible.map(item => {
											const name = item.dataKey as string;
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
												<div key={name} className="flex w-full items-center gap-2">
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

					<Line
						dataKey="composite"
						type="monotone"
						stroke="var(--color-purple-500)"
						strokeWidth={3}
						dot={false}
						strokeOpacity={show('Composite') ? 1 : 0}
						activeDot={show('Composite')}
					/>
					<Line
						dataKey="kenpom"
						type="monotone"
						stroke="var(--color-blue-500)"
						strokeWidth={3}
						strokeDasharray={dashed ? '5 15' : undefined}
						strokeDashoffset={dashed ? 0 : undefined}
						dot={false}
						strokeOpacity={show('KenPom') ? 1 : 0}
						activeDot={show('KenPom')}
					/>
					<Line
						dataKey="evanmiya"
						type="monotone"
						stroke="var(--color-green-500)"
						strokeWidth={3}
						strokeDasharray={dashed ? '5 15' : undefined}
						strokeDashoffset={dashed ? -5 : undefined}
						dot={false}
						strokeOpacity={show('EvanMiya') ? 1 : 0}
						activeDot={show('EvanMiya')}
					/>
					<Line
						dataKey="barttorvik"
						type="monotone"
						stroke="var(--color-yellow-500)"
						strokeWidth={3}
						strokeDasharray={dashed ? '5 15' : undefined}
						strokeDashoffset={dashed ? -10 : undefined}
						dot={false}
						strokeOpacity={show('BartTorvik') ? 1 : 0}
						activeDot={show('BartTorvik')}
					/>
					<Line
						dataKey="net"
						type="monotone"
						stroke="var(--color-red-500)"
						strokeWidth={3}
						strokeDasharray={dashed ? '5 15' : undefined}
						strokeDashoffset={dashed ? -15 : undefined}
						dot={false}
						strokeOpacity={show('NET') ? 1 : 0}
						activeDot={show('NET')}
					/>
				</LineChart>
			</ChartContainer>
		</Card>
	);
}
