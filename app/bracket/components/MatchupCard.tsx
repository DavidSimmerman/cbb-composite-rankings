'use client';

import { MarchScoreBadge } from '@/components/march/MarchScoreBadge';
import TeamLogo from '@/components/TeamLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { BracketGame, BracketTeam } from '@/lib/bracket/predictions';
import type { Warning } from '@/lib/bracket/warnings';
import { ROUND_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import { AlertTriangle, Sparkles, OctagonAlert, Info } from 'lucide-react';

export interface SeedPickCounts {
	/** Map of `${seed}-${round}` → number of that seed you've picked to win this round */
	[key: string]: number;
}

interface MatchupCardProps {
	game: BracketGame;
	warning?: Warning | null;
	seedPickCounts?: SeedPickCounts;
	seedRoundStats?: SeedRoundStats;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onAutoFill: (gameId: string) => void;
	compact?: boolean;
}

export default function MatchupCard({ game, warning, seedPickCounts, seedRoundStats, onPickWinner, onAutoFill, compact }: MatchupCardProps) {
	const { teamA, teamB, winner, prediction } = game;

	if (!teamA && !teamB) {
		return (
			<div className={`border border-neutral-800 rounded-lg ${compact ? 'p-1.5' : 'p-2'} opacity-40`}>
				<div className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground text-center`}>TBD</div>
			</div>
		);
	}

	return (
		<div className={`border border-neutral-800 rounded-lg ${compact ? 'p-1' : 'p-1.5'} relative group`}>
			{warning && (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="absolute -top-1.5 -right-1.5 z-10">
							{warning.level === 'red' ? (
								<OctagonAlert className="size-4 text-red-500" />
							) : (
								<AlertTriangle className="size-4 text-yellow-500" />
							)}
						</div>
					</TooltipTrigger>
					<TooltipContent side="top">{warning.detail}</TooltipContent>
				</Tooltip>
			)}

			{/* Seed facts info icon */}
			{teamA && teamB && seedPickCounts && seedRoundStats && (
				<SeedFactsTooltip
					game={game}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					compact={compact}
				/>
			)}

			<TeamRow
				team={teamA}
				isWinner={winner === teamA?.team_key}
				isLoser={!!winner && winner !== teamA?.team_key}
				prob={prediction?.probA}
				onClick={() => teamA && onPickWinner(game.id, teamA.team_key)}
				compact={compact}
				round={game.round}
			/>

			<div className={`border-t border-neutral-800 ${compact ? 'my-0.5' : 'my-1'}`} />

			<TeamRow
				team={teamB}
				isWinner={winner === teamB?.team_key}
				isLoser={!!winner && winner !== teamB?.team_key}
				prob={prediction?.probB}
				onClick={() => teamB && onPickWinner(game.id, teamB.team_key)}
				compact={compact}
				round={game.round}
			/>

			{/* Auto-fill button */}
			{teamA && teamB && !winner && (
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							onClick={() => onAutoFill(game.id)}
							className="absolute -bottom-1.5 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-800 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
						>
							<Sparkles className="size-2.5" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="bottom">Auto-pick</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
}

function TeamRow({
	team,
	isWinner,
	isLoser,
	prob,
	onClick,
	compact,
	round,
}: {
	team: BracketTeam | null;
	isWinner: boolean;
	isLoser: boolean;
	prob?: number;
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
			{!compact && <MarchScoreBadge score={team.march_score} size="sm" />}
			{prob !== undefined && (
				<span className={`${compact ? 'text-[9px]' : 'text-xs'} text-muted-foreground tabular-nums shrink-0`}>
					{(prob * 100).toFixed(0)}%
				</span>
			)}
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
	const seeds = [teamA.seed, teamB.seed];
	// Dedupe seeds (e.g., 8 vs 9 → show both, 1 vs 1 in FF → show once)
	const uniqueSeeds = [...new Set(seeds)];

	const ROUND_SHORT: Record<number, string> = { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'FF', 6: 'Champ' };
	const shortRound = ROUND_SHORT[game.round] ?? roundName;

	const favSeed = Math.min(teamA.seed, teamB.seed);
	const undSeed = Math.max(teamA.seed, teamB.seed);

	// Use the favorite's win rate as the canonical stat; underdog is the complement
	const favStat = seedRoundStats[favSeed]?.[roundName];
	const favWinPct = favStat ? Math.round(favStat.win_pct * 100) : null;

	const items: { seed: number; winPct: number; picked: number }[] = [];

	if (favWinPct !== null) {
		items.push({
			seed: favSeed,
			winPct: favWinPct,
			picked: seedPickCounts[`${favSeed}-${game.round}`] ?? 0,
		});
		if (favSeed !== undSeed) {
			items.push({
				seed: undSeed,
				winPct: 100 - favWinPct,
				picked: seedPickCounts[`${undSeed}-${game.round}`] ?? 0,
			});
		}
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
									? `Historical win rate. You have ${picked} of 4 advancing.`
									: `Historical advance rate. You have ${picked} in the ${shortRound}.`
								}
							</div>
						</div>
					))}
				</div>
			</TooltipContent>
		</Tooltip>
	);
}
