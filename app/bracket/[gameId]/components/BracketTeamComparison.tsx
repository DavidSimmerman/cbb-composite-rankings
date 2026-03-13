'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import TeamLogo from '@/components/TeamLogo';

interface BracketTeamComparisonProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
}

function getRankColor(rank: number): string {
	if (!rank || isNaN(rank)) return 'oklch(0.4 0 0)';
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

interface ComparisonRow {
	label: string;
	valueA: number;
	valueB: number;
	/** If true, lower is better (rank) */
	lowerBetter?: boolean;
}

export default function BracketTeamComparison({ teamA, teamB }: BracketTeamComparisonProps) {
	if (!teamA.comp_rank || !teamB.comp_rank) return null;

	const rows: ComparisonRow[] = [
		{ label: 'Overall', valueA: teamA.comp_rank, valueB: teamB.comp_rank, lowerBetter: true },
		{ label: 'Offense', valueA: teamA.comp_off_rank, valueB: teamB.comp_off_rank, lowerBetter: true },
		{ label: 'Defense', valueA: teamA.comp_def_rank, valueB: teamB.comp_def_rank, lowerBetter: true },
		{ label: 'March Score', valueA: teamA.march_score, valueB: teamB.march_score },
		{ label: 'Style Score', valueA: teamA.style_score, valueB: teamB.style_score },
		{ label: 'Comps Score', valueA: teamA.comps_score, valueB: teamB.comps_score },
		{ label: 'Rating Score', valueA: teamA.rating_score, valueB: teamB.rating_score },
	];

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-4">Team Comparison</div>

			{/* Header */}
			<div className="flex items-center justify-between mb-3 px-1">
				<div className="flex items-center gap-2">
					<TeamLogo teamKey={teamA.team_key} size={40} className="size-5" />
					<span className="text-sm font-bold">{teamA.abbreviation}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm font-bold">{teamB.abbreviation}</span>
					<TeamLogo teamKey={teamB.team_key} size={40} className="size-5" />
				</div>
			</div>

			<div className="flex flex-col">
				{rows.map(row => {
					const { label, valueA, valueB, lowerBetter } = row;
					const aBetter = lowerBetter ? valueA < valueB : valueA > valueB;
					const bBetter = lowerBetter ? valueB < valueA : valueB > valueA;
					const isRank = lowerBetter;

					// For the advantage bar
					const maxDiff = 150;
					const diff = isRank ? valueA - valueB : valueB - valueA;
					const advantage = Math.max(-1, Math.min(1, diff / maxDiff));
					const barPercent = Math.abs(advantage) * 50;
					const isAFavored = advantage < 0;
					const activeColor = isAFavored ? `#${teamA.color}` : `#${teamB.color}`;

					return (
						<div key={label} className="py-2.5 not-last-of-type:border-b border-neutral-800">
							<div className="text-xs text-neutral-500 text-center mb-1.5">{label}</div>
							<div className="flex items-center gap-2 md:gap-3">
								<div className="w-16 md:w-20 text-right">
									<span
										className={`text-sm font-medium tabular-nums ${aBetter ? 'text-white' : 'text-neutral-500'}`}
										style={isRank ? { color: getRankColor(valueA) } : undefined}
									>
										{isRank ? `#${valueA}` : valueA}
									</span>
								</div>

								<div className="flex-1 h-3 bg-neutral-800 rounded-full relative overflow-hidden">
									<div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-600 z-10" />
									{barPercent > 0 && (
										<div
											className="absolute top-0 bottom-0 rounded-full transition-all duration-300"
											style={{
												left: isAFavored ? `${50 - barPercent}%` : '50%',
												width: `${barPercent}%`,
												backgroundColor: activeColor,
											}}
										/>
									)}
								</div>

								<div className="w-16 md:w-20">
									<span
										className={`text-sm font-medium tabular-nums ${bBetter ? 'text-white' : 'text-neutral-500'}`}
										style={isRank ? { color: getRankColor(valueB) } : undefined}
									>
										{isRank ? `#${valueB}` : valueB}
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
