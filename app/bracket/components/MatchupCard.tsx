'use client';

import TeamLogo from '@/components/TeamLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { BracketGame, BracketTeam } from '@/lib/bracket/predictions';
import { ROUND_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import { Info, Eye } from 'lucide-react';
import Link from 'next/link';

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

	return (
		<div className={`border border-neutral-800 rounded-lg ${compact ? 'p-1' : 'p-1.5'} relative group`}>
			{/* Seed facts info icon */}
			{teamA && teamB && seedPickCounts && seedRoundStats && (
				<SeedFactsTooltip
					game={game}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					compact={compact}
				/>
			)}

			{/* Preview button */}
			{hasBothTeams && (
				<Link
					href={`/bracket/${game.id}`}
					className="absolute -top-1.5 -right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={(e: React.MouseEvent) => e.stopPropagation()}
				>
					<div className="bg-neutral-800 border border-neutral-700 rounded-full p-0.5 hover:bg-neutral-700 transition-colors">
						<Eye className={`${compact ? 'size-2.5' : 'size-3'} text-neutral-300`} />
					</div>
				</Link>
			)}

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
			<div className={`${compact ? 'py-0.5 px-1 text-xs' : 'py-1 px-1.5 text-sm'} text-muted-foreground`}>
				TBD
			</div>
		);
	}

	// R64: show short_name, R32+: show abbreviation
	const displayName = round === 1 ? team.short_name : team.abbreviation;

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
				backgroundColor: `#${team.color}20`,
				borderLeft: `2px solid #${team.color}`,
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

function SeedFactsTooltip({
	game,
	seedPickCounts,
	seedRoundStats,
	compact,
}: {
	game: BracketGame;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	compact?: boolean;
}) {
	const { teamA, teamB } = game;
	if (!teamA || !teamB) return null;

	const roundName = ROUND_NAMES[game.round];
	const ROUND_SHORT: Record<number, string> = { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'FF', 6: 'Champ' };
	const shortRound = ROUND_SHORT[game.round] ?? roundName;

	// Show each seed's own historical win rate for this round (independent lookup)
	const seeds = [teamA.seed, teamB.seed];
	const uniqueSeeds = [...new Set(seeds)].sort((a, b) => a - b);

	const items: { seed: number; winPct: number; picked: number }[] = [];

	for (const seed of uniqueSeeds) {
		const stat = seedRoundStats[seed]?.[roundName];
		if (!stat) continue;
		items.push({
			seed,
			winPct: Math.round(stat.win_pct * 100),
			picked: seedPickCounts[`${seed}-${game.round}`] ?? 0,
		});
	}

	if (items.length === 0) return null;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="absolute -top-1.5 -left-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
					<Info className={`${compact ? 'size-3' : 'size-3.5'} text-muted-foreground`} />
				</div>
			</TooltipTrigger>
			<TooltipContent side="top" className="p-0 max-w-72">
				<div className="divide-y divide-neutral-700">
					{items.map(({ seed, winPct, picked }) => (
						<div key={seed} className="px-3 py-2 space-y-0.5">
							<div className="flex items-center justify-between gap-4">
								<span className="font-medium">{seed}-seeds in {shortRound}</span>
								<span className="font-bold tabular-nums">{winPct}%</span>
							</div>
							<div className="text-[11px] text-background/60">
								{game.round === 1
									? `Win rate per game (all tournaments since '02). You have ${picked} of 4 advancing.`
									: `Of all ${seed}-seeds, ${winPct}% win the ${roundName}. You have ${picked} of 4 advancing.`
								}
							</div>
						</div>
					))}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
