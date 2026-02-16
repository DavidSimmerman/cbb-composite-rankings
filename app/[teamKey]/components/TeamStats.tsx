'use client';

import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { ChartContainer } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useMemo, useState } from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';
import { twMerge } from 'tailwind-merge';

export default function TeamStats({ className }: { className: string }) {
	const profile = useTeamProfile();
	const [viewMode, setViewMode] = useState<string>('offense');
	const [pieValueType, setPieValueType] = useCookie('pie_chart_value_type', 'stat');

	const fullRatings = useMemo(() => {
		const season = Object.keys(profile.full_ratings).sort().at(-1)!;
		return profile.full_ratings[season];
	}, [profile]);

	return (
		<div className={twMerge('border border-neutral-800 rounded-lg p-3 md:p-4 overflow-auto flex flex-col', className)}>
			<div className="text-2xl font-bold text-neutral-600 align-top mb-4">Team Profile</div>

			<ToggleGroup
				variant="outline"
				type="single"
				value={viewMode}
				onValueChange={v => v && setViewMode(v)}
				className="w-full"
			>
				<ToggleGroupItem value="offense" className="cursor-pointer w-1/2">
					Offense
				</ToggleGroupItem>
				<ToggleGroupItem value="defense" className="cursor-pointer w-1/2">
					Defense
				</ToggleGroupItem>
			</ToggleGroup>

			<div className="grid grid-cols-3 gap-0 auto-rows-min">
				{viewMode === 'offense' ? (
					<>
						<RadialRating
							metric="Tempo"
							value={fullRatings.kp_adjusted_tempo}
							rank={fullRatings.kp_adjusted_tempo_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="3pt %"
							value={fullRatings.bt_3p_pct + '%'}
							rank={fullRatings.bt_3p_pct_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="3pt Rate"
							value={fullRatings.bt_3pr + '%'}
							rank={fullRatings.bt_3pr_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="2pt %"
							value={fullRatings.bt_2p_pct + '%'}
							rank={fullRatings.bt_2p_pct_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="FT %"
							value={Math.round(fullRatings.espn_off_free_throw_pct * 10) / 10 + '%'}
							rank={fullRatings.espn_off_free_throw_pct_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="FT Rate"
							value={fullRatings.bt_ftr + '%'}
							rank={fullRatings.bt_ftr_rank}
							valueType={pieValueType}
						/>
					</>
				) : (
					<>
						<RadialRating
							metric="Fouls/G"
							value={Math.round(fullRatings.espn_avg_fouls * 10) / 10}
							rank={fullRatings.espn_avg_fouls_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="Opp FG %"
							value={Math.round(fullRatings.espn_opp_off_field_goal_pct * 10) / 10 + '%'}
							rank={fullRatings.espn_opp_off_field_goal_pct_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="Opp 3pt %"
							value={fullRatings.bt_3p_pct_d + '%'}
							rank={fullRatings.bt_3p_pct_d_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="Opp TO/G"
							value={Math.round(fullRatings.espn_opp_off_avg_turnovers * 10) / 10}
							rank={fullRatings.espn_opp_off_avg_turnovers_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="Seals/G"
							value={Math.round(fullRatings.espn_def_avg_steals * 10) / 10}
							rank={fullRatings.espn_def_avg_steals_rank}
							valueType={pieValueType}
						/>
						<RadialRating
							metric="Blocks/G"
							value={Math.round(fullRatings.espn_def_avg_blocks * 10) / 10}
							rank={fullRatings.espn_def_avg_blocks_rank}
							valueType={pieValueType}
						/>
					</>
				)}
			</div>
			<ToggleGroup
				type="single"
				value={pieValueType}
				onValueChange={v => v && setPieValueType(v)}
				className="w-1/3 mt-4 ml-auto mr-4"
			>
				<ToggleGroupItem value="stat" className="cursor-pointer w-1/2 h-[1.5lh]">
					Stat
				</ToggleGroupItem>
				<ToggleGroupItem value="rank" className="cursor-pointer w-1/2 h-[1.5lh]">
					Rank
				</ToggleGroupItem>
			</ToggleGroup>

			<div className="flex-1 mt-2 px-1">
				{viewMode === 'offense' ? (
					<>
						<StatGroup
							header="GENERAL"
							rows={[
								{
									label: 'Opponent Defensive SOS',
									value: fullRatings.kp_sos_defensive_rating,
									rank: fullRatings.kp_sos_defensive_rating_rank
								},
								{
									label: 'Killshots / G',
									value: fullRatings.em_kill_shots_per_game,
									rank: fullRatings.em_kill_shots_per_game_rank
								},
								{
									label: 'Fouls Drawn / G',
									value: Math.round(fullRatings.espn_opp_avg_fouls * 10) / 10,
									rank: fullRatings.espn_opp_avg_fouls_rank
								},
								{
									label: 'Tempo',
									value: fullRatings.kp_adjusted_tempo,
									rank: fullRatings.kp_adjusted_tempo_rank
								}
							]}
						/>

						<StatGroup
							header="CONTROL"
							rows={[
								{
									label: 'Assist:Turnover',
									value: Math.round(fullRatings.espn_assist_turnover_ratio * 100) / 100,
									rank: fullRatings.espn_assist_turnover_ratio_rank
								},
								{
									label: 'Assist %',
									value: Math.round(fullRatings.espn_off_assist_percentage * 10) / 10,
									rank: fullRatings.espn_off_assist_percentage_rank
								},
								{ label: 'Turnover Rate', value: fullRatings.bt_tor, rank: fullRatings.bt_tor_rank },
								{ label: 'Offensive Rebound %', value: fullRatings.bt_orb, rank: fullRatings.bt_orb_rank }
							]}
						/>

						<StatGroup
							header="EFFICIENCY"
							rows={[
								{
									label: 'Points Per Possession',
									value: Math.round(fullRatings.espn_off_scoring_efficiency * 100) / 100,
									rank: fullRatings.espn_off_scoring_efficiency_rank
								},
								{ label: 'Effective FG%', value: fullRatings.bt_efg_pct, rank: fullRatings.bt_efg_pct_rank },
								{ label: '2pt%', value: fullRatings.bt_2p_pct, rank: fullRatings.bt_2p_pct_rank },
								{ label: '3pt%', value: fullRatings.bt_3p_pct, rank: fullRatings.bt_3p_pct_rank },
								{ label: '3pt Rate', value: fullRatings.bt_3pr, rank: fullRatings.bt_3pr_rank },
								{
									label: 'FT%',
									value: Math.round(fullRatings.espn_off_free_throw_pct * 10) / 10,
									rank: fullRatings.espn_off_free_throw_pct_rank
								},
								{ label: 'FT Rate', value: fullRatings.bt_ftr, rank: fullRatings.bt_ftr_rank }
							]}
						/>
					</>
				) : (
					<>
						<StatGroup
							header="GENERAL"
							rows={[
								{
									label: 'Opponent Offense SOS',
									value: fullRatings.kp_sos_offensive_rating,
									rank: fullRatings.kp_sos_offensive_rating_rank
								},
								{
									label: 'Killshots Conceded / G',
									value: fullRatings.em_kill_shots_conceded_per_game,
									rank: fullRatings.em_kill_shots_conceded_per_game_rank
								},
								{
									label: 'Fouls / G',
									value: Math.round(fullRatings.espn_avg_fouls * 10) / 10,
									rank: fullRatings.espn_avg_fouls_rank
								}
							]}
						/>
						<StatGroup
							header="CONTROL"
							rows={[
								{ label: 'Rebound Rate', value: 100 - fullRatings.bt_drb + '%', rank: fullRatings.bt_drb_rank },
								{
									label: 'Forced Turnover Rate',
									value: fullRatings.bt_tord + '%',
									rank: fullRatings.bt_tord_rank
								},
								{
									label: 'Steals/G',
									value: Math.round(fullRatings.espn_def_avg_steals * 10) / 10,
									rank: fullRatings.espn_def_avg_steals_rank
								},
								{
									label: 'Blocks/G',
									value: Math.round(fullRatings.espn_def_avg_blocks * 10) / 10,
									rank: fullRatings.espn_def_avg_blocks_rank
								}
							]}
						/>

						<StatGroup
							header="EFFICIENCY"
							rows={[
								{
									label: 'Points Per Possession',
									value: Math.round(fullRatings.espn_opp_off_scoring_efficiency * 100) / 100,
									rank: fullRatings.espn_opp_off_scoring_efficiency_rank
								},
								{
									label: 'Avg. PPG',
									value: Math.round(fullRatings.espn_opp_off_avg_points * 10) / 10,
									rank: fullRatings.espn_opp_off_avg_points_rank
								},
								{ label: 'Effective FG%', value: fullRatings.bt_efgd_pct, rank: fullRatings.bt_efgd_pct_rank },
								{ label: '2pt%', value: fullRatings.bt_2p_pct_d, rank: fullRatings.bt_2p_pct_d_rank },
								{ label: '3pt%', value: fullRatings.bt_3p_pct_d, rank: fullRatings.bt_3p_pct_d_rank },
								{ label: '3pt Rate', value: fullRatings.bt_3prd, rank: fullRatings.bt_3prd_rank },
								{ label: 'FT Rate', value: fullRatings.bt_ftrd, rank: fullRatings.bt_ftrd_rank }
							]}
						/>
					</>
				)}
			</div>
		</div>
	);
}

const offense = {
	// general

	// something

	espn_opp_def_avg_blocks: 2.74
};

function getRankColor(rank: number): string {
	if (isNaN(rank) || !rank) return 'oklch(0.4 0 0)';
	if (rank <= 36) return 'oklch(0.70 0.22 145)';
	if (rank <= 73) return 'oklch(0.65 0.19 135)';
	if (rank <= 109) return 'oklch(0.62 0.17 120)';
	if (rank <= 146) return 'oklch(0.60 0.16 100)';
	if (rank <= 182) return 'oklch(0.58 0.15 85)';
	if (rank <= 219) return 'oklch(0.58 0.16 70)';
	if (rank <= 256) return 'oklch(0.60 0.17 55)';
	if (rank <= 292) return 'oklch(0.62 0.19 40)';
	if (rank <= 329) return 'oklch(0.65 0.20 30)';
	return 'oklch(0.70 0.22 20)';
}

function RadialRating({
	metric,
	value,
	rank,
	valueType
}: {
	metric: string;
	value: string | number;
	rank: number;
	valueType: string;
}) {
	const chartData = [
		{ name: 'value', value: 365 - rank },
		{ name: 'remainder', value: rank - 1 }
	];
	const chartConfig = {
		value: { label: metric }
	};

	return (
		<ChartContainer config={chartConfig} className="h-26 w-full">
			<PieChart>
				<Pie
					data={chartData}
					dataKey="value"
					startAngle={180}
					endAngle={0}
					innerRadius="80%"
					outerRadius="100%"
					cx="50%"
					cy="80%"
					cornerRadius={5}
					strokeWidth={0}
				>
					<Cell fill={getRankColor(rank)} />
					<Cell fill="var(--color-neutral-800)" />
					<Label
						content={({ viewBox }) => {
							if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
								return (
									<text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
										<tspan x={viewBox.cx} y={viewBox.cy || 0} className="fill-foreground text-lg font-bold">
											{valueType === 'stat' ? value : '#' + rank}
										</tspan>
										<tspan
											x={viewBox.cx}
											y={(viewBox.cy || 0) + 20}
											className="fill-muted-foreground text-sm"
										>
											{metric}
										</tspan>
									</text>
								);
							}
						}}
					/>
				</Pie>
			</PieChart>
		</ChartContainer>
	);
}

function StatGroup({ header, rows }: { header: string; rows: { label: string; value: string | number; rank: number }[] }) {
	return (
		<div>
			<div className="text-xs font-bold text-neutral-500 uppercase tracking-wider pt-4 pb-1">{header}</div>
			{rows.map(row => (
				<div key={row.label} className="flex items-center justify-between py-1.5 border-b border-neutral-800">
					<span className="text-sm text-neutral-300">{row.label}</span>
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-white tabular-nums">{row.value}</span>
						<span
							className="text-xs font-medium tabular-nums w-8 text-center"
							style={{ color: getRankColor(row.rank) }}
						>
							{row.rank}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}
