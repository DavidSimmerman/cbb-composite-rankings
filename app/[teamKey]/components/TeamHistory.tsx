'use client';

import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SeasonSnapshot } from '@/lib/rankings/profile';
import dynamic from 'next/dynamic';
import { useCallback, useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

const RechartsImports = dynamic(
	() =>
		import('recharts').then(mod => {
			const { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } = mod;
			const { useState, useCallback } = require('react');

			return {
				default: ({
					barData,
					showRank,
					maxRank,
					scrollRef,
				}: {
					barData: { season: string; rank: number; statValue: number; value: number; displayLabel: string }[];
					showRank: boolean;
					maxRank: number;
					scrollRef: (node: HTMLDivElement | null) => void;
				}) => {
					const [containerWidth, setContainerWidth] = useState(0);
					const measuredRef = useCallback(
						(node: HTMLDivElement | null) => {
							if (node) {
								setContainerWidth(node.clientWidth);
								scrollRef(node);
							}
						},
						[scrollRef]
					);

					return (
						<div className="overflow-x-auto" ref={measuredRef}>
							<BarChart
								data={barData}
								width={Math.max(barData.length * 56, containerWidth || 400)}
								height={260}
								margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
							>
								<CartesianGrid vertical={false} stroke="#333" />
								<XAxis
									dataKey="season"
									tickLine={false}
									axisLine={false}
									tick={{ fill: '#a3a3a3', fontSize: 12 }}
								/>
								<YAxis domain={showRank ? [0, maxRank * 1.05] : [0, 1.15]} hide />
								<Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
									<LabelList
										dataKey="displayLabel"
										position="top"
										style={{ fill: '#e5e5e5', fontSize: 12, fontWeight: 600 }}
									/>
									{barData.map((entry, i) => (
										<Cell key={i} fill={getRankColor(entry.rank)} fillOpacity={0.8} />
									))}
								</Bar>
							</BarChart>
						</div>
					);
				},
			};
		}),
	{ ssr: false }
);

interface StatDef {
	label: string;
	key: keyof SeasonSnapshot;
	rankKey: keyof SeasonSnapshot;
	suffix?: string;
	lowerBetter?: boolean; // for stat mode: lower raw value = better (def rating, TO rate, etc.)
}

const STAT_GROUPS: { label: string; stats: StatDef[] }[] = [
	{
		label: 'Rankings',
		stats: [
			{ label: 'Overall', key: 'comp_score', rankKey: 'comp_rank' },
			{ label: 'Off. Rating', key: 'comp_off_score', rankKey: 'comp_off_rank' },
			{ label: 'Def. Rating', key: 'comp_def_score', rankKey: 'comp_def_rank', lowerBetter: true },
		],
	},
	{
		label: 'Efficiency',
		stats: [
			{ label: 'Adj. OE', key: 'kp_offensive_rating', rankKey: 'kp_offensive_rating_rank' },
			{ label: 'Adj. DE', key: 'kp_defensive_rating', rankKey: 'kp_defensive_rating_rank', lowerBetter: true },
			{ label: 'FG%', key: 'espn_fg_pct', rankKey: 'espn_fg_pct_rank', suffix: '%' },
			{ label: 'Opp FG%', key: 'espn_opp_fg_pct', rankKey: 'espn_opp_fg_pct_rank', suffix: '%', lowerBetter: true },
		],
	},
	{
		label: 'Shooting',
		stats: [
			{ label: '3pt %', key: 'espn_3p_pct', rankKey: 'espn_3p_pct_rank', suffix: '%' },
			{ label: 'Opp 3pt %', key: 'espn_opp_3p_pct', rankKey: 'espn_opp_3p_pct_rank', suffix: '%', lowerBetter: true },
			{ label: '3pt Rate', key: 'bt_3pr', rankKey: 'bt_3pr_rank', suffix: '%' },
			{ label: '2pt %', key: 'bt_2p_pct', rankKey: 'bt_2p_pct_rank', suffix: '%' },
			{ label: 'FT %', key: 'espn_ft_pct', rankKey: 'espn_ft_pct_rank', suffix: '%' },
		],
	},
	{
		label: 'Other',
		stats: [
			{ label: 'Tempo', key: 'kp_adjusted_tempo', rankKey: 'kp_adjusted_tempo_rank' },
			{ label: 'Turnovers', key: 'espn_avg_turnovers', rankKey: 'espn_avg_turnovers_rank', lowerBetter: true },
			{ label: 'Opp Turnovers', key: 'espn_opp_avg_turnovers', rankKey: 'espn_opp_avg_turnovers_rank' },
			{ label: 'Off. Reb', key: 'espn_avg_orb', rankKey: 'espn_avg_orb_rank' },
			{ label: 'Def. Reb', key: 'espn_avg_drb', rankKey: 'espn_avg_drb_rank' },
		],
	},
];

const ALL_STATS = STAT_GROUPS.flatMap(g => g.stats);

function formatSeason(season: string): string {
	const s = parseInt(season);
	const start = String(s - 1).slice(-2).padStart(2, '0');
	const end = String(s).slice(-2).padStart(2, '0');
	return `'${start}-'${end}`;
}

function getRankColor(rank: number): string {
	if (rank <= 10) return '#16a34a';
	if (rank <= 25) return '#86efac';
	if (rank <= 100) return '#fbbf24';
	if (rank <= 200) return '#f97316';
	return '#ef4444';
}

export default function TeamHistory({ className }: { className?: string }) {
	const { season_snapshots } = useTeamProfile();
	const [selectedStat, setSelectedStat] = useCookie<string>('history_stat', 'kp_net_rating');
	const [viewMode, setViewMode] = useCookie<'stat' | 'rank'>('history_view', 'rank');

	const stat = useMemo(() => ALL_STATS.find(s => s.key === selectedStat) ?? ALL_STATS[0], [selectedStat]);
	const showRank = viewMode === 'rank';

	const chartData = useMemo(() => {
		return season_snapshots
			.filter(s => s[stat.rankKey] != null && s[stat.key] != null)
			.map(s => ({
				season: formatSeason(s.season),
				rank: Number(s[stat.rankKey]),
				statValue: Number(s[stat.key]),
			}));
	}, [season_snapshots, stat]);

	if (season_snapshots.length < 2) return null;

	// Blend absolute scale (how good is this rank overall?) with relative scale
	// (how does this season compare to their other seasons?)
	// 50/50 blend: absolute position gives the baseline, relative spread gives differentiation
	const maxRank = 363;
	const BLEND = 0.5; // 0 = fully absolute, 1 = fully relative

	const barData = useMemo(() => {
		if (showRank) {
			const ranks = chartData.map(d => d.rank);
			const worstRank = Math.max(...ranks);
			const bestRank = Math.min(...ranks);
			const rankSpread = worstRank - bestRank || 1;

			return chartData.map(d => {
				// Absolute: where this rank sits on 0-363 scale
				const absolute = (maxRank - d.rank) / maxRank;
				// Relative: where this rank sits among their seasons (1 = best, 0 = worst)
				const relative = (worstRank - d.rank) / rankSpread;
				const blended = absolute * (1 - BLEND) + relative * BLEND;
				return {
					...d,
					value: blended * maxRank,
					displayLabel: `#${d.rank}`,
				};
			});
		}
		const statValues = chartData.map(d => d.statValue);
		const minStat = Math.min(...statValues);
		const maxStat = Math.max(...statValues);
		const statSpread = maxStat - minStat || 1;

		return chartData.map(d => {
			// Relative position normalized 0-1, then shift up so worst season still has ~40% height
			// For lowerBetter stats, flip so lower value = taller bar
			const relative = stat.lowerBetter
				? (maxStat - d.statValue) / statSpread
				: (d.statValue - minStat) / statSpread;
			return {
				...d,
				value: 0.4 + relative * 0.6,
				displayLabel: `${Number.isInteger(d.statValue) ? d.statValue : Math.round(d.statValue * 10) / 10}${stat.suffix ?? ''}`,
			};
		});
	}, [chartData, showRank, stat.suffix]);

	const scrollRef = useCallback((node: HTMLDivElement | null) => {
		if (node) {
			node.scrollLeft = node.scrollWidth;
		}
	}, []);

	return (
		<div className={twMerge('border border-neutral-800 rounded-lg p-3 md:p-4 flex flex-col', className)}>
			<div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
				<div className="text-2xl font-bold text-neutral-600">Season History</div>
				<div className="flex items-center gap-2 ml-auto">
					<ToggleGroup
						type="single"
						value={viewMode}
						onValueChange={v => v && setViewMode(v as 'stat' | 'rank')}
						className="h-8"
					>
						<ToggleGroupItem value="rank" className="h-8 px-2.5 text-xs cursor-pointer">
							Rank
						</ToggleGroupItem>
						<ToggleGroupItem value="stat" className="h-8 px-2.5 text-xs cursor-pointer">
							Stat
						</ToggleGroupItem>
					</ToggleGroup>
					<select
						value={selectedStat}
						onChange={e => setSelectedStat(e.target.value)}
						className="bg-neutral-900 border border-neutral-700 rounded-md px-2 py-1 text-sm text-neutral-200 cursor-pointer"
					>
						{STAT_GROUPS.map(group => (
							<optgroup key={group.label} label={group.label}>
								{group.stats.map(s => (
									<option key={s.key} value={s.key}>
										{s.label}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>
			</div>

			<RechartsImports barData={barData} showRank={showRank} maxRank={maxRank} scrollRef={scrollRef} />

			<div className="flex justify-center gap-3 mt-2 text-[10px] text-neutral-500">
				<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" />Top 10</span>
				<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-300" />11-25</span>
				<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />26-100</span>
				<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />101-200</span>
				<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />200+</span>
			</div>
		</div>
	);
}
