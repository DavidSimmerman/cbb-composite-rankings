'use client';

import { useState } from 'react';

// ─── Data interfaces ────────────────────────────────────────────────────────

export interface MatchupRow {
	label: string;
	offenseKey: string;
	defenseKey: string;
}

export const MATCHUP_ROWS: MatchupRow[] = [
	{ label: 'Overall Efficiency', offenseKey: 'comp_avg_offensive_zscore_rank', defenseKey: 'comp_avg_defensive_zscore_rank' },
	{ label: 'Effective FG%', offenseKey: 'bt_efg_pct', defenseKey: 'bt_efgd_pct' },
	{ label: '2pt Shooting', offenseKey: 'bt_2p_pct', defenseKey: 'bt_2p_pct_d' },
	{ label: '3pt Shooting', offenseKey: 'bt_3p_pct', defenseKey: 'bt_3p_pct_d' },
	{ label: '3pt Rate', offenseKey: 'bt_3pr', defenseKey: 'bt_3prd' },
	{ label: 'Free Throw Rate', offenseKey: 'bt_ftr', defenseKey: 'bt_ftrd' },
	{ label: 'Assist %', offenseKey: 'espn_off_assist_percentage', defenseKey: 'espn_opp_off_assist_percentage' },
	{ label: 'Turnover Rate', offenseKey: 'bt_tor', defenseKey: 'bt_tord' },
	{ label: 'Rebound Rate', offenseKey: 'bt_orb', defenseKey: 'bt_drb' },
	{ label: 'Killshots/G', offenseKey: 'em_kill_shots_per_game', defenseKey: 'em_kill_shots_conceded_per_game' },
];

export interface TeamComparisonProps {
	teamAName: string;
	teamBName: string;
	teamAAbbr: string;
	teamBAbbr: string;
	teamAColor: string;
	teamBColor: string;
	teamASecondaryColor: string;
	teamBSecondaryColor: string;
	teamARatings: Record<string, number>;
	teamBRatings: Record<string, number>;
}

// ─── Utility functions ──────────────────────────────────────────────────────

export function getRankColor(rank: number): string {
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

function getAdvantage(offenseRank: number, defenseRank: number): number {
	const ceiling = Math.min(offenseRank, defenseRank);
	const ceilingPct = Math.abs(365 - ceiling) / 364;
	const diff = offenseRank - defenseRank;
	const maxDiff = 150;
	return Math.max(-1, Math.min(1, diff / maxDiff)) * ceilingPct;
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function TeamComparison({
	teamAName,
	teamBName,
	teamAAbbr,
	teamBAbbr,
	teamAColor,
	teamBColor,
	teamASecondaryColor,
	teamBSecondaryColor,
	teamARatings,
	teamBRatings,
}: TeamComparisonProps) {
	const [mobileTeam, setMobileTeam] = useState<'a' | 'b'>('a');

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-2xl font-bold text-neutral-600 mb-4">Team Comparison</div>

			{/* Mobile toggle */}
			<div className="md:hidden flex border-b border-neutral-800 mb-4">
				<button
					onClick={() => setMobileTeam('a')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'a' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'a' ? { borderColor: teamAColor } : undefined}
				>
					{teamAName}
				</button>
				<button
					onClick={() => setMobileTeam('b')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'b' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'b' ? { borderColor: teamBColor } : undefined}
				>
					{teamBName}
				</button>
			</div>

			<div className="flex flex-col md:flex-row md:w-full gap-8">
				<div className={`w-full ${mobileTeam !== 'a' ? 'hidden md:block' : ''}`}>
					<MatchupSection
						title={`${teamAAbbr} OFF vs ${teamBAbbr} DEF`}
						offenseTeamName={teamAAbbr}
						defenseTeamName={teamBAbbr}
						offenseRatings={teamARatings}
						defenseRatings={teamBRatings}
						offenseColor={teamAColor}
						offenseSecondaryColor={teamASecondaryColor}
						defenseColor={teamBColor}
						defenseSecondaryColor={teamBSecondaryColor}
					/>
				</div>
				<div className="hidden md:block md:h-auto md:w-px bg-neutral-800" />
				<div className={`w-full ${mobileTeam !== 'b' ? 'hidden md:block' : ''}`}>
					<MatchupSection
						title={`${teamBAbbr} OFF vs ${teamAAbbr} DEF`}
						offenseTeamName={teamBAbbr}
						defenseTeamName={teamAAbbr}
						offenseRatings={teamBRatings}
						defenseRatings={teamARatings}
						offenseColor={teamBColor}
						offenseSecondaryColor={teamBSecondaryColor}
						defenseColor={teamAColor}
						defenseSecondaryColor={teamASecondaryColor}
					/>
				</div>
			</div>
		</div>
	);
}

// ─── Matchup section ────────────────────────────────────────────────────────

function MatchupSection({
	title,
	offenseTeamName,
	defenseTeamName,
	offenseRatings,
	defenseRatings,
	offenseColor,
	offenseSecondaryColor,
	defenseColor,
	defenseSecondaryColor,
}: {
	title: string;
	offenseTeamName: string;
	defenseTeamName: string;
	offenseRatings: Record<string, number>;
	defenseRatings: Record<string, number>;
	offenseColor: string;
	offenseSecondaryColor: string;
	defenseColor: string;
	defenseSecondaryColor: string;
}) {
	return (
		<div className="w-full">
			<div className="hidden md:block text-lg font-bold text-neutral-400 mb-3">{title}</div>
			<div className="flex justify-between text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 px-1">
				<span>{offenseTeamName} OFF</span>
				<span>{defenseTeamName} DEF</span>
			</div>
			<div className="flex flex-col gap-1">
				{MATCHUP_ROWS.map(row => {
					const offRankKey = getRankKey(row.offenseKey);
					const defRankKey = getRankKey(row.defenseKey);
					const offRank = offenseRatings[offRankKey] ?? 0;
					const defRank = defenseRatings[defRankKey] ?? 0;
					const offValue = offenseRatings[row.offenseKey] ?? 0;
					const defValue = defenseRatings[row.defenseKey] ?? 0;
					const advantage = getAdvantage(offRank, defRank);

					const offRankColor = getRankColor(offRank);
					const defRankColor = getRankColor(defRank);
					const barPercent = Math.abs(advantage) * 50;
					const isOffenseFavored = advantage < 0;
					const activeColor = isOffenseFavored ? offenseColor : defenseColor;
					const activeSecondaryColor = isOffenseFavored ? offenseSecondaryColor : defenseSecondaryColor;

					return (
						<div key={row.label} className="py-2 not-last-of-type:border-b border-neutral-800">
							<div className="text-xs text-neutral-500 text-center mb-1.5">{row.label}</div>
							<div className="flex items-center gap-1.5 md:gap-3">
								<div className="flex items-center gap-1 md:gap-1.5 w-18 md:w-24 justify-end">
									<span className="text-xs md:text-sm font-medium text-white tabular-nums">
										{formatValue(offValue, row.offenseKey)}
									</span>
									<span className="text-xs font-medium tabular-nums w-6 md:w-7 text-right" style={{ color: offRankColor }}>
										{offRank}
									</span>
								</div>

								<div className="flex-1 h-3 bg-neutral-800 rounded-full relative overflow-hidden">
									<div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-600 z-10" />
									{barPercent > 0 && (
										<div
											className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
											style={{
												left: isOffenseFavored ? `${50 - barPercent}%` : '50%',
												width: `${barPercent}%`,
												backgroundColor: activeColor,
												border: `1px solid ${activeSecondaryColor}85`,
											}}
										/>
									)}
								</div>

								<div className="flex items-center gap-1 md:gap-1.5 w-18 md:w-24">
									<span className="text-xs font-medium tabular-nums w-6 md:w-7" style={{ color: defRankColor }}>
										{defRank}
									</span>
									<span className="text-xs md:text-sm font-medium text-white tabular-nums">
										{formatValue(defValue, row.defenseKey)}
									</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
