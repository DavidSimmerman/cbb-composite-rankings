'use client';

import type { BracketGame } from '@/lib/bracket/predictions';
import { ALL_REGIONS, ROUND_SHORT_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import type { Warning } from '@/lib/bracket/warnings';
import MatchupCard, { type SeedPickCounts } from './MatchupCard';

interface RoundViewProps {
	games: Map<string, BracketGame>;
	gameWarnings: Map<string, Warning>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	selectedRound: number;
	onSelectRound: (round: number) => void;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onAutoFill: (gameId: string) => void;
}

export default function RoundView({ games, gameWarnings, seedPickCounts, seedRoundStats, selectedRound, onSelectRound, onPickWinner, onAutoFill }: RoundViewProps) {
	const rounds = [1, 2, 3, 4, 5, 6];

	const roundGames = [...games.values()]
		.filter(g => g.round === selectedRound)
		.sort((a, b) => {
			// Sort by region then position
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

	return (
		<div className="flex flex-col h-full">
			{/* Round selector tabs */}
			<div className="flex gap-1 px-3 py-2 border-b border-neutral-800 overflow-x-auto shrink-0">
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
									warning={gameWarnings.get(game.id)}
									seedPickCounts={seedPickCounts}
									seedRoundStats={seedRoundStats}
									onPickWinner={onPickWinner}
									onAutoFill={onAutoFill}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
