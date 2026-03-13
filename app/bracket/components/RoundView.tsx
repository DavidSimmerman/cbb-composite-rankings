'use client';

import type { BracketGame } from '@/lib/bracket/predictions';
import { ROUND_SHORT_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import MatchupCard, { type SeedPickCounts } from './MatchupCard';
import { ChevronDown, Crown, Dices } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface RoundViewProps {
	games: Map<string, BracketGame>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	selectedRound: number;
	onSelectRound: (round: number) => void;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onSimulateRound: (round: number) => void;
	onPerfectRound: (round: number) => void;
}

export default function RoundView({ games, seedPickCounts, seedRoundStats, selectedRound, onSelectRound, onPickWinner, onSimulateRound, onPerfectRound }: RoundViewProps) {
	const rounds = [1, 2, 3, 4, 5, 6];

	const roundGames = [...games.values()]
		.filter(g => g.round === selectedRound)
		.sort((a, b) => {
			const regionOrder = ['SOUTH', 'EAST', 'WEST', 'MIDWEST', 'FF'];
			const aRegion = regionOrder.indexOf(a.region);
			const bRegion = regionOrder.indexOf(b.region);
			if (aRegion !== bRegion) return aRegion - bRegion;
			return a.position - b.position;
		});

	// Group by region for display
	const gamesByRegion = new Map<string, BracketGame[]>();
	for (const g of roundGames) {
		const region = g.region;
		if (!gamesByRegion.has(region)) gamesByRegion.set(region, []);
		gamesByRegion.get(region)!.push(g);
	}

	// Count completed games per round
	const roundProgress = rounds.map(r => {
		const rGames = [...games.values()].filter(g => g.round === r);
		const completed = rGames.filter(g => g.winner).length;
		return { round: r, completed, total: rGames.length };
	});

	// Check if any games in this round have both teams and no winner
	const hasUnfilledGames = roundGames.some(g => g.teamA && g.teamB && !g.winner);

	return (
		<div className="flex flex-col h-full">
			{/* Round selector tabs */}
			<div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 overflow-x-auto shrink-0">
				{roundProgress.map(({ round, completed, total }) => (
					<button
						key={round}
						onClick={() => onSelectRound(round)}
						className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors cursor-pointer ${
							selectedRound === round
								? 'bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
						}`}
					>
						{ROUND_SHORT_NAMES[round]}
						{completed > 0 && (
							<span className={`ml-1 text-xs ${completed === total ? 'text-green-500' : 'text-muted-foreground'}`}>
								{completed}/{total}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Round auto-fill bar */}
			{hasUnfilledGames && (
				<div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/50 shrink-0">
					<span className="text-xs text-muted-foreground">
						{ROUND_SHORT_NAMES[selectedRound]}
					</span>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer">
								<ChevronDown className="size-3" />
								Auto-fill round
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							<DropdownMenuItem onClick={() => onSimulateRound(selectedRound)} className="flex-col items-start gap-0 py-2 cursor-pointer">
								<div className="flex items-center gap-2 text-sm font-medium">
									<Dices className="size-4 text-blue-400 shrink-0" />
									Simulate
								</div>
								<p className="text-xs text-muted-foreground mt-1 ml-6">
									Randomized using ML predictions and historical patterns.
								</p>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => onPerfectRound(selectedRound)} className="flex-col items-start gap-0 py-2 cursor-pointer">
								<div className="flex items-center gap-2 text-sm font-medium">
									<Crown className="size-4 text-amber-500 shrink-0" />
									Perfect My Bracket
								</div>
								<p className="text-xs text-muted-foreground mt-1 ml-6">
									Optimizes for the most realistic bracket based on historical trends.
								</p>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}

			{/* Games */}
			<div className="flex-1 overflow-auto p-3 space-y-4">
				{[...gamesByRegion.entries()].map(([region, games]) => (
					<div key={region}>
						<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
							{region === 'FF' ? 'Final Four' : region}
						</div>
						<div className="space-y-2">
							{games.map(game => (
								<MatchupCard
									key={game.id}
									game={game}
									seedPickCounts={seedPickCounts}
									seedRoundStats={seedRoundStats}
									onPickWinner={onPickWinner}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
