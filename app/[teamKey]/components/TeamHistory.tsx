'use client';

import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import type { SeasonSnapshot } from '@/lib/rankings/profile';
import { useCallback } from 'react';
import { CARD, CardTitle, Seg, TIER_LEGEND, tier, tierChip, tierText } from './ui';

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
			{ label: 'Off. rating', key: 'comp_off_score', rankKey: 'comp_off_rank' },
			{ label: 'Def. rating', key: 'comp_def_score', rankKey: 'comp_def_rank', lowerBetter: true }
		]
	},
	{
		label: 'Efficiency',
		stats: [
			{ label: 'Adj. OE', key: 'kp_offensive_rating', rankKey: 'kp_offensive_rating_rank' },
			{ label: 'Adj. DE', key: 'kp_defensive_rating', rankKey: 'kp_defensive_rating_rank', lowerBetter: true },
			{ label: 'FG%', key: 'espn_fg_pct', rankKey: 'espn_fg_pct_rank', suffix: '%' },
			{ label: 'Opp FG%', key: 'espn_opp_fg_pct', rankKey: 'espn_opp_fg_pct_rank', suffix: '%', lowerBetter: true }
		]
	},
	{
		label: 'Shooting',
		stats: [
			{ label: '3pt %', key: 'espn_3p_pct', rankKey: 'espn_3p_pct_rank', suffix: '%' },
			{ label: 'Opp 3pt %', key: 'espn_opp_3p_pct', rankKey: 'espn_opp_3p_pct_rank', suffix: '%', lowerBetter: true },
			{ label: '3pt rate', key: 'bt_3pr', rankKey: 'bt_3pr_rank', suffix: '%' },
			{ label: '2pt %', key: 'bt_2p_pct', rankKey: 'bt_2p_pct_rank', suffix: '%' },
			{ label: 'FT %', key: 'espn_ft_pct', rankKey: 'espn_ft_pct_rank', suffix: '%' }
		]
	},
	{
		label: 'Other',
		stats: [
			{ label: 'Tempo', key: 'kp_adjusted_tempo', rankKey: 'kp_adjusted_tempo_rank' },
			{ label: 'Turnovers', key: 'espn_avg_turnovers', rankKey: 'espn_avg_turnovers_rank', lowerBetter: true },
			{ label: 'Opp turnovers', key: 'espn_opp_avg_turnovers', rankKey: 'espn_opp_avg_turnovers_rank' },
			{ label: 'Off. reb', key: 'espn_avg_orb', rankKey: 'espn_avg_orb_rank' },
			{ label: 'Def. reb', key: 'espn_avg_drb', rankKey: 'espn_avg_drb_rank' }
		]
	}
];

const ALL_STATS = STAT_GROUPS.flatMap(g => g.stats);

function formatSeason(season: string): string {
	const s = parseInt(season);
	return `'${String(s - 1).slice(-2).padStart(2, '0')}-'${String(s).slice(-2).padStart(2, '0')}`;
}

// Bar heights: rank mode blends absolute (vs ~363 teams) and relative (vs the team's own seasons) 50/50;
// stat mode is relative to the team's own seasons with a 40% floor, flipped for lower-is-better stats
const MAX_RANK = 363;
const BLEND = 0.5;
const BAR_PX = 110;

export default function TeamHistory() {
	const { season_snapshots } = useTeamProfile();
	const [selectedStat, setSelectedStat] = useCookie<string>('history_stat', 'comp_score');
	const [viewMode, setViewMode] = useCookie<'stat' | 'rank'>('history_view', 'rank');

	const stat = ALL_STATS.find(s => s.key === selectedStat) ?? ALL_STATS[0];
	const group = STAT_GROUPS.find(g => g.stats.includes(stat))!;
	const showRank = viewMode === 'rank';

	const bars = (() => {
		const data = season_snapshots
			.filter(s => s[stat.rankKey] != null && s[stat.key] != null)
			.map(s => ({ season: s.season, rank: Number(s[stat.rankKey]), value: Number(s[stat.key]) }));

		if (showRank) {
			const ranks = data.map(d => d.rank);
			const worst = Math.max(...ranks);
			const spread = worst - Math.min(...ranks) || 1;
			return data.map(d => ({
				...d,
				height: ((MAX_RANK - d.rank) / MAX_RANK) * (1 - BLEND) + ((worst - d.rank) / spread) * BLEND,
				label: `${d.rank}`
			}));
		}
		const values = data.map(d => d.value);
		const lo = Math.min(...values);
		const spread = Math.max(...values) - lo || 1;
		return data.map(d => {
			const relative = stat.lowerBetter ? (lo + spread - d.value) / spread : (d.value - lo) / spread;
			return {
				...d,
				height: 0.4 + relative * 0.6,
				label: `${Number.isInteger(d.value) ? d.value : Math.round(d.value * 10) / 10}${stat.suffix ?? ''}`
			};
		});
	})();

	// Start scrolled to the most recent season
	const scrollRef = useCallback((node: HTMLDivElement | null) => {
		if (node) node.scrollLeft = node.scrollWidth;
	}, []);

	if (season_snapshots.length < 2) {
		return <div className={`${CARD} p-6 text-center text-[13px] text-slate-500`}>Not enough seasons yet for a history.</div>;
	}

	return (
		<div className={`${CARD} p-3.5 lg:p-4`}>
			<div className="flex items-center justify-between gap-2 mb-2.5">
				<CardTitle>Season history</CardTitle>
				<Seg
					small
					options={[
						{ key: 'rank', label: 'Rank' },
						{ key: 'stat', label: 'Stat' }
					]}
					value={viewMode}
					onChange={setViewMode}
				/>
			</div>
			<div className="overflow-x-auto -mx-3.5 px-3.5 lg:mx-0 lg:px-0">
				<Seg
					small
					className="w-max"
					options={STAT_GROUPS.map(g => ({ key: g.label, label: g.label }))}
					value={group.label}
					onChange={label => setSelectedStat(STAT_GROUPS.find(g => g.label === label)!.stats[0].key)}
				/>
			</div>
			<div className="flex gap-1.5 mt-2 mb-4 overflow-x-auto -mx-3.5 px-3.5 lg:mx-0 lg:px-0">
				{group.stats.map(s => (
					<button
						key={s.key}
						onClick={() => setSelectedStat(s.key)}
						className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] cursor-pointer transition-colors ${s === stat ? 'bg-violet-500/20 text-violet-200' : 'border border-white/10 text-slate-400 hover:text-slate-200'}`}
					>
						{s.label}
					</button>
				))}
			</div>

			{bars.length === 0 ? (
				<div className="h-[150px] grid place-items-center text-[13px] text-slate-500">No seasons with this stat.</div>
			) : (
				<div ref={scrollRef} className="overflow-x-auto">
					<div className="flex items-end gap-1.5 min-w-full w-max" style={{ height: BAR_PX + 40 }}>
						{bars.map(b => (
							<div key={b.season} className="w-9 lg:flex-1 lg:min-w-9 flex flex-col items-center justify-end h-full gap-1">
								<span className="text-[10px] tabular-nums whitespace-nowrap" style={{ color: tierText(b.rank) }}>
									{b.label}
								</span>
								<div
									className="w-full max-w-12 rounded-t-md"
									title={`${formatSeason(b.season)}: #${b.rank}`}
									style={{
										height: Math.max(6, b.height * BAR_PX),
										background: `linear-gradient(180deg, ${tier(b.rank)}, ${tier(b.rank)}40)`
									}}
								/>
								<span className="text-[9.5px] text-slate-500 whitespace-nowrap">{formatSeason(b.season)}</span>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
				National rank
				{TIER_LEGEND.map(([r, label]) => (
					<span key={label} className="rounded px-1.5 py-0.5" style={tierChip(r)}>
						{label}
					</span>
				))}
			</div>
		</div>
	);
}
