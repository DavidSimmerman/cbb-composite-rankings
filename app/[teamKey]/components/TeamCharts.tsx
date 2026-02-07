'use client';

import { allSources } from '@/app/components/columns';
import SourcesFilter from '@/app/components/SourcesFilter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import { ProfileRatingsHistory } from '@/lib/rankings/rankings';
import { useMemo, useState } from 'react';
import { PiChartLineBold } from 'react-icons/pi';
import { RiCollapseVerticalLine, RiExpandVerticalLine, RiZoomInFill, RiZoomInLine } from 'react-icons/ri';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

export default function TeamCharts({ history }: { history: ProfileRatingsHistory }) {
	const [zoom, setZoom] = useState<boolean>(false);
	const [rank, setRank] = useState<boolean>(false);
	const [sourcesFilter, setSourcesFilter] = useState<string[]>([...allSources]);

	const ratingData = Object.values(history).map(h => ({
		date: h.date,
		composite: rank ? -h.avg_zscore_rank : h.avg_zscore,
		kenpom: rank ? -h.kp_rating_rank : h.kp_rating_zscore,
		evanmiya: rank ? -h.em_rating_rank : h.em_rating_zscore,
		barttorvik: rank ? -h.bt_rating_rank : h.bt_rating_zscore,
		net: rank ? -h.net_rank : h.net_rank_zscore,
		full: h
	}));

	const offensiveData = Object.values(history).map(h => ({
		date: h.date,
		composite: rank ? -h.avg_offensive_zscore_rank : h.avg_offensive_zscore,
		kenpom: rank ? -h.kp_offensive_rating_rank : h.kp_offensive_zscore,
		evanmiya: rank ? -h.em_offensive_rating_rank : h.em_offensive_zscore,
		barttorvik: rank ? -h.bt_offensive_rating_rank : h.bt_offensive_zscore,
		full: h
	}));

	const defensiveData = Object.values(history).map(h => ({
		date: h.date,
		composite: rank ? -h.avg_defensive_zscore_rank : h.avg_defensive_zscore,
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
		<div className="flex flex-col w-full gap-4 border border-neutral-800 rounded-lg p-4">
			<div className="ml-auto mr-0 flex gap-2 z-1">
				<Toggle className={`cursor-pointer [&_svg]:transition-transform [&_svg]:duration-200 ${zoom ? 'hover:[&_svg]:scale-75' : 'hover:[&_svg]:scale-125'}`} pressed={zoom} onPressedChange={setZoom}>
					{zoom ? <RiCollapseVerticalLine /> : <RiExpandVerticalLine />}
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

					<ChartCard chartData={ratingData} metric="rating" range={range} sources={sourcesFilter} />
				</div>
				<div className="w-full flex flex-col gap-1">
					<div className="text-muted-foreground ml-3">Offensive Rating</div>
					<ChartCard chartData={offensiveData} metric="offensive_rating" range={range} sources={sourcesFilter} />
				</div>
				<div className="w-full flex flex-col gap-1">
					<div className="text-muted-foreground ml-3">Defensive Rating</div>
					<ChartCard chartData={defensiveData} metric="defensive_rating" range={range} sources={sourcesFilter} />
				</div>
			</div>
		</div>
	);
}

function ChartCard({
	chartData,
	metric,
	range,
	sources
}: {
	chartData: Record<string, any>[];
	metric: string;
	range: any[2];
	sources: string[];
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

	return (
		<Card className="w-full p-3">
			<ChartContainer config={chartConfig}>
				<LineChart data={chartData} margin={{ left: 12, right: 12 }}>
					<CartesianGrid vertical={false} />
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
						content={
							<ChartTooltipContent
								className="w-[180px]"
								formatter={(value, name, item, index) => {
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
										<>
											<div
												className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-(--color-bg)"
												style={
													{
														'--color-bg': `var(--color-${name})`
													} as React.CSSProperties
												}
											/>
											{chartConfig[name as keyof typeof chartConfig]?.label || name}
											<div className="text-foreground ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums">
												{Math.round(item.payload.full[key] * 100) / 100}
												<span className="text-muted-foreground font-normal ml-0.5">
													{name === 'net' || item.payload.full[key + '_rank']}
												</span>
											</div>
										</>
									);
								}}
							/>
						}
					/>

					{(sources.includes('Composite') || sources.length === 0) && (
						<Line dataKey="composite" type="monotone" stroke="var(--color-purple-500)" strokeWidth={2} dot={false} />
					)}
					{(sources.includes('KenPom') || sources.length === 0) && (
						<Line dataKey="kenpom" type="monotone" stroke="var(--color-blue-500)" strokeWidth={2} dot={false} />
					)}
					{(sources.includes('EvanMiya') || sources.length === 0) && (
						<Line dataKey="evanmiya" type="monotone" stroke="var(--color-green-500)" strokeWidth={2} dot={false} />
					)}
					{(sources.includes('BartTorvik') || sources.length === 0) && (
						<Line dataKey="barttorvik" type="monotone" stroke="var(--color-yellow-500)" strokeWidth={2} dot={false} />
					)}
					{(sources.includes('NET') || sources.length === 0) && (
						<Line dataKey="net" type="monotone" stroke="var(--color-red-500)" strokeWidth={2} dot={false} />
					)}
				</LineChart>
			</ChartContainer>
		</Card>
	);
}
