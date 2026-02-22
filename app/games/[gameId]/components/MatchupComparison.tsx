'use client';

import { useGame } from '@/app/context/GameContext';
import { TeamData } from '@/lib/espn/espn-team-data';
import { FullRatings } from '@/lib/rankings/profile';
import { useMemo } from 'react';

interface MatchupRow {
	label: string;
	offenseKey: string;
	defenseKey: string;
}

const matchupRows: MatchupRow[] = [
	{ label: 'Overall Efficiency', offenseKey: 'comp_avg_offensive_zscore_rank', defenseKey: 'comp_avg_defensive_zscore_rank' },
	{ label: 'Effective FG%', offenseKey: 'bt_efg_pct', defenseKey: 'bt_efgd_pct' },
	{ label: '2pt Shooting', offenseKey: 'bt_2p_pct', defenseKey: 'bt_2p_pct_d' },
	{ label: '3pt Shooting', offenseKey: 'bt_3p_pct', defenseKey: 'bt_3p_pct_d' },
	{ label: '3pt Rate', offenseKey: 'bt_3pr', defenseKey: 'bt_3prd' },
	{ label: 'Free Throw Rate', offenseKey: 'bt_ftr', defenseKey: 'bt_ftrd' },
	{ label: 'Assist %', offenseKey: 'espn_off_assist_percentage', defenseKey: 'espn_opp_off_assist_percentage' },
	{ label: 'Turnover Rate', offenseKey: 'bt_tor', defenseKey: 'bt_tord' },
	{ label: 'Rebound Rate', offenseKey: 'bt_orb', defenseKey: 'bt_drb' },
	{ label: 'Killshots/G', offenseKey: 'em_kill_shots_per_game', defenseKey: 'em_kill_shots_conceded_per_game' }
];

export default function MatchupComparison() {
	const { game } = useGame();

	const { awayRatings, homeRatings } = useMemo(() => {
		const awaySeason = Object.keys(game.teams.away.profile.full_ratings).sort().at(-1)!;
		const homeSeason = Object.keys(game.teams.home.profile.full_ratings).sort().at(-1)!;
		return {
			awayRatings: game.teams.away.profile.full_ratings[awaySeason],
			homeRatings: game.teams.home.profile.full_ratings[homeSeason]
		};
	}, [game]);

	const awayName = game.teams.away.profile.team_name;
	const homeName = game.teams.home.profile.team_name;
	const awayMetadata = game.teams.away.metadata;
	const homeMetadata = game.teams.home.metadata;

	return (
		<div className="mt-4 border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-2xl font-bold text-neutral-600 align-top mb-4">Team Comparison</div>
			<div className="flex flex-col md:flex-row md:w-full gap-8">
				<MatchupSection
					title={`${awayName} Offense vs ${homeName} Defense`}
					offenseTeamName={awayName}
					defenseTeamName={homeName}
					offenseRatings={awayRatings}
					defenseRatings={homeRatings}
					offenseMetadata={awayMetadata}
					defenseMetadata={homeMetadata}
				/>
				<div className="hidden md:block md:h-auto md:w-px bg-neutral-800" />
				<MatchupSection
					title={`${homeName} Offense vs ${awayName} Defense`}
					offenseTeamName={homeName}
					defenseTeamName={awayName}
					offenseRatings={homeRatings}
					defenseRatings={awayRatings}
					offenseMetadata={homeMetadata}
					defenseMetadata={awayMetadata}
				/>
			</div>
		</div>
	);
}

function MatchupSection({
	title,
	offenseTeamName,
	defenseTeamName,
	offenseRatings,
	defenseRatings,
	offenseMetadata,
	defenseMetadata
}: {
	title: string;
	offenseTeamName: string;
	defenseTeamName: string;
	offenseRatings: FullRatings;
	defenseRatings: FullRatings;
	offenseMetadata: TeamData;
	defenseMetadata: TeamData;
}) {
	return (
		<div className="w-full">
			<div className="text-lg font-bold text-neutral-400 mb-3">{title}</div>
			<div className="flex justify-between text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 px-1">
				<span>{offenseTeamName} OFF</span>
				<span>{defenseTeamName} DEF</span>
			</div>
			<div className="flex flex-col gap-1">
				{matchupRows.map(row => {
					const offRankKey = getRankKey(row.offenseKey);
					const defRankKey = getRankKey(row.defenseKey);
					const offRank = getStatValue(offenseRatings, offRankKey);
					const defRank = getStatValue(defenseRatings, defRankKey);
					const offValue = getStatValue(offenseRatings, row.offenseKey);
					const defValue = getStatValue(defenseRatings, row.defenseKey);
					const advantage = getAdvantage(offRank, defRank);

					return (
						<MatchupBar
							key={row.label}
							label={row.label}
							offenseValue={formatValue(offValue, row.offenseKey)}
							offenseRank={offRank}
							defenseValue={formatValue(defValue, row.defenseKey)}
							defenseRank={defRank}
							advantage={advantage}
							offenseColor={offenseMetadata.color}
							offenseSecondaryColor={offenseMetadata.secondary_color}
							defenseColor={defenseMetadata.color}
							defenseSecondaryColor={defenseMetadata.secondary_color}
						/>
					);
				})}
			</div>
		</div>
	);
}

function MatchupBar({
	label,
	offenseValue,
	offenseRank,
	defenseValue,
	defenseRank,
	advantage,
	offenseColor,
	offenseSecondaryColor,
	defenseColor,
	defenseSecondaryColor
}: {
	label: string;
	offenseValue: string;
	offenseRank: number;
	defenseValue: string;
	defenseRank: number;
	advantage: number;
	offenseColor: string;
	offenseSecondaryColor: string;
	defenseColor: string;
	defenseSecondaryColor: string;
}) {
	const offRankColor = getRankColor(offenseRank);
	const defRankColor = getRankColor(defenseRank);

	// advantage: -1 = offense dominant, +1 = defense dominant
	const barPercent = Math.abs(advantage) * 50;
	const isOffenseFavored = advantage < 0;

	const activeColor = isOffenseFavored ? `#${offenseColor}` : `#${defenseColor}`;
	const activeSecondaryColor = isOffenseFavored ? `#${offenseSecondaryColor}` : `#${defenseSecondaryColor}`;

	return (
		<div className="py-2 not-last-of-type:border-b border-neutral-800">
			<div className="text-xs text-neutral-500 text-center mb-1.5">{label}</div>
			<div className="flex items-center gap-3">
				{/* Offense side */}
				<div className="flex items-center gap-1.5 w-24 justify-end">
					<span className="text-sm font-medium text-white tabular-nums">{offenseValue}</span>
					<span className="text-xs font-medium tabular-nums w-7 text-right" style={{ color: offRankColor }}>
						{offenseRank}
					</span>
				</div>

				{/* Indicator bar */}
				<div className="flex-1 h-3 bg-neutral-800 rounded-full relative overflow-hidden">
					{/* Center line */}
					<div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-600 z-10" />

					{/* Advantage fill */}
					{barPercent > 0 && (
						<div
							className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
							style={{
								left: isOffenseFavored ? `${50 - barPercent}%` : '50%',
								width: `${barPercent}%`,
								backgroundColor: activeColor,
								border: `1px solid ${activeSecondaryColor}85`
							}}
						/>
					)}
				</div>

				{/* Defense side */}
				<div className="flex items-center gap-1.5 w-24">
					<span className="text-xs font-medium tabular-nums w-7" style={{ color: defRankColor }}>
						{defenseRank}
					</span>
					<span className="text-sm font-medium text-white tabular-nums">{defenseValue}</span>
				</div>
			</div>
		</div>
	);
}

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

function getStatValue(ratings: FullRatings, key: string): number {
	return (ratings as unknown as Record<string, number>)[key] ?? 0;
}

function getRankKey(key: string): string {
	if (key.endsWith('_rank')) return key;
	return key + '_rank';
}

function formatValue(value: number, key: string): string {
	if (key.includes('zscore_rank')) return '#' + value;
	if (key.includes('scoring_efficiency')) return (Math.round(value * 100) / 100).toString();
	if (key.includes('pct') || key.includes('orb') || key.includes('drb') || key.includes('ftr') || key.includes('tor')) {
		return value + '%';
	}
	return String(value);
}

/** Returns a value from -1 (fully left/offense) to 1 (fully right/defense) */
function getAdvantage(offenseRank: number, defenseRank: number): number {
	const ceiling = Math.min(offenseRank, defenseRank);
	const ceilingPct = Math.abs(365 - ceiling) / 364;

	const diff = offenseRank - defenseRank;
	const maxDiff = 150;
	return Math.max(-1, Math.min(1, diff / maxDiff)) * ceilingPct;
}
