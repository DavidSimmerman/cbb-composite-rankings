'use client';

import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ProfileRatingsHistory } from '@/lib/rankings/rankings';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

export default function TeamCharts({ history }: { history: ProfileRatingsHistory }) {
	console.log(history);

	const ratingData = Object.values(history).map(h => ({
		date: h.date,
		composite: h.avg_zscore,
		kenpom: h.kp_rating_zscore,
		evanmiya: h.em_rating_zscore,
		barttorvik: h.bt_rating_zscore,
		net: h.net_rank_zscore,
		full: h
	}));

	const offensiveData = Object.values(history).map(h => ({
		date: h.date,
		composite: h.avg_offensive_zscore,
		kenpom: h.kp_offensive_zscore,
		evanmiya: h.em_offensive_zscore,
		barttorvik: h.bt_offensive_zscore,
		full: h
	}));

	const defensiveData = Object.values(history).map(h => ({
		date: h.date,
		composite: h.avg_defensive_zscore,
		kenpom: h.kp_defensive_zscore,
		evanmiya: h.em_defensive_zscore,
		barttorvik: h.bt_defensive_zscore,
		full: h
	}));

	return (
		<div className="flex flex-col md:flex-row w-full gap-4">
			<div className="w-full flex flex-col gap-2">
				<div className="text-muted-foreground ml-3">Rating</div>
				<ChartCard chartData={ratingData} metric="rating" />
			</div>
			<div className="w-full flex flex-col gap-2">
				<div className="text-muted-foreground ml-3">Offensive Rating</div>
				<ChartCard chartData={offensiveData} metric="offensive_rating" />
			</div>
			<div className="w-full flex flex-col gap-2">
				<div className="text-muted-foreground ml-3">Defensive Rating</div>
				<ChartCard chartData={defensiveData} metric="defensive_rating" />
			</div>
		</div>
	);
}

function ChartCard({ chartData, metric }: { chartData: Record<string, any>[]; metric: string }) {
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
					<YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} hide />
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								className="w-[180px]"
								formatter={(value, name, item, index) => {
									let key;

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
					<Line dataKey="composite" type="monotone" stroke="var(--color-purple-500)" strokeWidth={2} dot={false} />
					<Line dataKey="kenpom" type="monotone" stroke="var(--color-blue-500)" strokeWidth={2} dot={false} />
					<Line dataKey="evanmiya" type="monotone" stroke="var(--color-green-500)" strokeWidth={2} dot={false} />
					<Line dataKey="barttorvik" type="monotone" stroke="var(--color-yellow-500)" strokeWidth={2} dot={false} />
					<Line dataKey="net" type="monotone" stroke="var(--color-red-500)" strokeWidth={2} dot={false} />
				</LineChart>
			</ChartContainer>
		</Card>
	);
}
