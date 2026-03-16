'use client';

import TeamLogo from '@/components/TeamLogo';
import type { BracketGame, BracketTeam } from '@/lib/bracket/predictions';
import { ROUND_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import { Eye } from 'lucide-react';
import Link from 'next/link';

/** Use secondary_color if the primary is too close to black to be visible on dark backgrounds. */
function getVisibleColor(team: BracketTeam): string {
	const hex = team.color;
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	// Relative luminance approximation
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance < 0.15 ? team.secondary_color : hex;
}

export interface SeedPickCounts {
	/** Map of `${seed}-${round}` → number of that seed you've picked to win this round */
	[key: string]: number;
}

interface MatchupCardProps {
	game: BracketGame;
	seedPickCounts?: SeedPickCounts;
	seedRoundStats?: SeedRoundStats;
	onPickWinner: (gameId: string, teamKey: string) => void;
	compact?: boolean;
}

export default function MatchupCard({ game, seedPickCounts, seedRoundStats, onPickWinner, compact }: MatchupCardProps) {
	const { teamA, teamB, winner } = game;

	if (!teamA && !teamB) {
		return (
			<div className={`border border-neutral-800 rounded-lg ${compact ? 'p-1.5' : 'p-2'} opacity-40`}>
				<div className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground text-center`}>TBD</div>
			</div>
		);
	}

	const hasBothTeams = !!teamA && !!teamB;

	// Compute seed facts inline
	const seedFacts = hasBothTeams && seedPickCounts && seedRoundStats
		? getSeedFacts(game, seedPickCounts, seedRoundStats)
		: null;

	return (
		<div className={`border border-neutral-800 rounded-lg ${compact ? 'p-1' : 'p-1.5'}`}>
			<TeamRow
				team={teamA}
				isWinner={winner === teamA?.team_key}
				isLoser={!!winner && winner !== teamA?.team_key}
				onClick={() => teamA && onPickWinner(game.id, teamA.team_key)}
				compact={compact}
				round={game.round}
			/>

			<div className={`border-t border-neutral-800 ${compact ? 'my-0.5' : 'my-1'}`} />

			<TeamRow
				team={teamB}
				isWinner={winner === teamB?.team_key}
				isLoser={!!winner && winner !== teamB?.team_key}
				onClick={() => teamB && onPickWinner(game.id, teamB.team_key)}
				compact={compact}
				round={game.round}
			/>

			{/* Bottom bar: seed facts + preview button */}
			{hasBothTeams && (
				<div className={`flex items-center border-t border-neutral-800 ${compact ? 'mt-0.5 pt-0.5 px-1 gap-1' : 'mt-1 pt-1 px-1.5 gap-2'}`}>
					{/* Seed facts */}
					{seedFacts && seedFacts.length > 0 && (
						<div className="flex-1 flex items-center gap-1.5 min-w-0 overflow-hidden">
							{seedFacts.map(({ seed, winPct, picked }) => (
								<span key={seed} className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-neutral-500 tabular-nums whitespace-nowrap`}>
									{seed}s: {winPct}% ({picked}/4)
								</span>
							))}
						</div>
					)}
					{!seedFacts?.length && <div className="flex-1" />}

					{/* Preview link */}
					<Link
						href={`/bracket/${game.id}`}
						className={`flex items-center gap-0.5 shrink-0 text-neutral-500 hover:text-neutral-300 transition-colors ${compact ? 'text-[8px]' : 'text-[10px]'}`}
						onClick={(e: React.MouseEvent) => e.stopPropagation()}
					>
						<Eye className={compact ? 'size-2.5' : 'size-3'} />
						{!compact && <span>Preview</span>}
					</Link>
				</div>
			)}
		</div>
	);
}

function TeamRow({
	team,
	isWinner,
	isLoser,
	onClick,
	compact,
	round,
}: {
	team: BracketTeam | null;
	isWinner: boolean;
	isLoser: boolean;
	onClick: () => void;
	compact?: boolean;
	round: number;
}) {
	if (!team) {
		return (
			<div className={`flex items-center ${compact ? 'py-0.5 px-1 text-xs min-h-5.5' : 'py-1 px-1.5 text-sm min-h-7.5'} text-muted-foreground`}>
				TBD
			</div>
		);
	}

	// R64: show short_name, R32+: show abbreviation
	const displayName = round === 1 ? team.short_name : team.abbreviation;
	const accentColor = getVisibleColor(team);

	return (
		<button
			onClick={onClick}
			className={`w-full flex items-center gap-1.5 rounded transition-all cursor-pointer ${compact ? 'py-0.5 px-1' : 'py-1 px-1.5'} ${
				isWinner
					? 'bg-opacity-15'
					: isLoser
						? 'opacity-35'
						: 'hover:bg-neutral-800/50'
			}`}
			style={isWinner ? {
				backgroundColor: `#${accentColor}20`,
				borderLeft: `2px solid #${accentColor}`,
			} : undefined}
		>
			<span className={`${compact ? 'text-[10px]' : 'text-xs'} text-muted-foreground tabular-nums w-4 text-right shrink-0`}>
				{team.seed}
			</span>
			<TeamLogo teamKey={team.team_key} size={40} className={compact ? 'size-4' : 'size-5'} />
			<span className={`${compact ? 'text-[11px]' : 'text-sm'} truncate flex-1 text-left font-medium`}>
				{displayName}
			</span>
		</button>
	);
}

function getSeedFacts(
	game: BracketGame,
	seedPickCounts: SeedPickCounts,
	seedRoundStats: SeedRoundStats,
): { seed: number; winPct: number; picked: number }[] {
	const { teamA, teamB } = game;
	if (!teamA || !teamB) return [];

	const roundName = ROUND_NAMES[game.round];
	const seeds = [teamA.seed, teamB.seed];
	const uniqueSeeds = [...new Set(seeds)].sort((a, b) => a - b);

	// In R64, matchups are fixed (1v16, 2v15, etc.) so percentages must sum to 100%.
	// Use the higher seed's stat and derive the complement for the lower seed.
	const isR64Pair = game.round === 1 && uniqueSeeds.length === 2 && uniqueSeeds[0] + uniqueSeeds[1] === 17;

	const items: { seed: number; winPct: number; picked: number }[] = [];
	if (isR64Pair) {
		const higherSeed = uniqueSeeds[0];
		const lowerSeed = uniqueSeeds[1];
		const higherStat = seedRoundStats[higherSeed]?.[roundName];
		if (higherStat) {
			const higherPct = Math.round(higherStat.win_pct * 100);
			items.push({
				seed: higherSeed,
				winPct: higherPct,
				picked: seedPickCounts[`${higherSeed}-${game.round}`] ?? 0,
			});
			items.push({
				seed: lowerSeed,
				winPct: 100 - higherPct,
				picked: seedPickCounts[`${lowerSeed}-${game.round}`] ?? 0,
			});
		}
	} else {
		for (const seed of uniqueSeeds) {
			const stat = seedRoundStats[seed]?.[roundName];
			if (!stat) continue;
			items.push({
				seed,
				winPct: Math.round(stat.win_pct * 100),
				picked: seedPickCounts[`${seed}-${game.round}`] ?? 0,
			});
		}
	}
	return items;
}
