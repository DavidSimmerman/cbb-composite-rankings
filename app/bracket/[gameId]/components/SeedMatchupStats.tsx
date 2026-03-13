'use client';

import type { SeedMatchupStat, SeedRoundStats } from '@/lib/rankings/profile';
import { ROUND_NAMES } from '@/lib/bracket/predictions';
import { getSeedColor } from '@/components/march/MarchCards';

interface SeedMatchupStatsProps {
	seedA: number;
	seedB: number;
	round: number;
	seedMatchupStats: SeedMatchupStat[];
	seedRoundStats: SeedRoundStats;
}

const ROUND_LABEL_MAP: Record<number, string> = {
	1: 'Round of 64',
	2: 'Round of 32',
	3: 'Sweet 16',
	4: 'Elite 8',
	5: 'Final Four',
	6: 'Championship',
};

export default function SeedMatchupStats({ seedA, seedB, round, seedMatchupStats, seedRoundStats }: SeedMatchupStatsProps) {
	const roundName = ROUND_LABEL_MAP[round];
	const higherSeed = Math.min(seedA, seedB);
	const lowerSeed = Math.max(seedA, seedB);

	// Find the head-to-head matchup stat for this seed pairing in this round
	const matchup = seedMatchupStats.find(
		s => s.higher_seed === higherSeed && s.lower_seed === lowerSeed && s.round === roundName
	);

	// Get individual seed round stats
	const seedAStat = seedRoundStats[seedA]?.[roundName];
	const seedBStat = seedRoundStats[seedB]?.[roundName];

	// Also get progression stats for both seeds across all rounds
	const seedAProgression = getRoundProgression(seedA, seedRoundStats);
	const seedBProgression = getRoundProgression(seedB, seedRoundStats);

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-4">Seed Matchup History</div>

			{/* Head-to-head matchup */}
			{matchup && (
				<div className="mb-5">
					<div className="text-sm font-medium text-neutral-400 mb-2">
						{higherSeed} vs {lowerSeed} seeds in the {roundName}
					</div>
					<div className="flex items-center gap-3 mb-2">
						{/* Higher seed bar */}
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm font-bold" style={{ color: getSeedColor(higherSeed) }}>
									{higherSeed}-seed
								</span>
								<span className="text-sm font-bold tabular-nums">
									{Math.round(matchup.higher_seed_win_pct * 100)}%
								</span>
							</div>
							<div className="h-3 rounded-full bg-neutral-800 overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-500"
									style={{
										width: `${matchup.higher_seed_win_pct * 100}%`,
										backgroundColor: getSeedColor(higherSeed),
									}}
								/>
							</div>
						</div>
						<span className="text-xs text-neutral-500 shrink-0 tabular-nums">
							n={matchup.sample_size}
						</span>
						{/* Lower seed bar */}
						<div className="flex-1">
							<div className="flex items-center justify-between mb-1">
								<span className="text-sm font-bold" style={{ color: getSeedColor(lowerSeed) }}>
									{lowerSeed}-seed
								</span>
								<span className="text-sm font-bold tabular-nums">
									{Math.round((1 - matchup.higher_seed_win_pct) * 100)}%
								</span>
							</div>
							<div className="h-3 rounded-full bg-neutral-800 overflow-hidden">
								<div
									className="h-full rounded-full transition-all duration-500"
									style={{
										width: `${(1 - matchup.higher_seed_win_pct) * 100}%`,
										backgroundColor: getSeedColor(lowerSeed),
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Seed progression comparison */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<SeedProgressionCard
					seed={seedA}
					progression={seedAProgression}
				/>
				<SeedProgressionCard
					seed={seedB}
					progression={seedBProgression}
				/>
			</div>
		</div>
	);
}

function SeedProgressionCard({
	seed,
	progression,
}: {
	seed: number;
	progression: { round: string; winPct: number }[];
}) {
	return (
		<div className="border border-neutral-800 rounded-md p-3">
			<div className="text-sm font-bold mb-2" style={{ color: getSeedColor(seed) }}>
				{seed}-seed historical win rates
			</div>
			<div className="flex flex-col gap-1.5">
				{progression.map(({ round, winPct }) => (
					<div key={round} className="flex items-center gap-2">
						<span className="text-xs text-neutral-400 w-8 text-right tabular-nums">{round}</span>
						<div className="flex-1 h-3 rounded bg-neutral-800 overflow-hidden">
							<div
								className="h-full rounded transition-all duration-300"
								style={{
									width: `${winPct}%`,
									backgroundColor: getSeedColor(seed),
									opacity: 0.6 + (winPct / 250),
								}}
							/>
						</div>
						<span className="text-xs text-neutral-300 tabular-nums w-8 text-right">{winPct}%</span>
					</div>
				))}
			</div>
		</div>
	);
}

function getRoundProgression(seed: number, seedRoundStats: SeedRoundStats): { round: string; winPct: number }[] {
	const roundOrder = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];
	const shortLabels: Record<string, string> = {
		'Round of 64': 'R64',
		'Round of 32': 'R32',
		'Sweet 16': 'S16',
		'Elite 8': 'E8',
		'Final Four': 'FF',
		'Championship': 'Champ',
	};

	const stats = seedRoundStats[seed];
	if (!stats) return [];

	return roundOrder
		.filter(r => stats[r])
		.map(r => ({
			round: shortLabels[r] ?? r,
			winPct: Math.round(stats[r].win_pct * 100),
		}));
}
