'use client';

import type { BracketGame, BracketState, BracketTeam } from '@/lib/bracket/predictions';
import { ROUND_NAMES, ROUND_SHORT_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import TeamLogo from '@/components/TeamLogo';
import { getSeedColor } from '@/components/march/MarchCards';

interface BracketImpactProps {
	game: BracketGame;
	gameId: string;
	bracketState: BracketState;
	seedPickCounts: Record<string, number>;
	seedRoundStats: SeedRoundStats;
}

export default function BracketImpact({ game, gameId, bracketState, seedPickCounts, seedRoundStats }: BracketImpactProps) {
	if (!game.teamA || !game.teamB) return null;

	const { teamA, teamB } = game;

	// Find how many of each seed the user has picked across all rounds
	const seedAPicksByRound = getPicksByRound(teamA.seed, bracketState);
	const seedBPicksByRound = getPicksByRound(teamB.seed, bracketState);

	// Find the next game this winner feeds into
	const nextGameId = getNextGameId(gameId, game.round);
	const nextGame = nextGameId ? bracketState.get(nextGameId) : null;
	const nextOpponent = nextGame
		? getNextOpponent(nextGame, gameId)
		: null;

	// Downstream path: what games come after this one
	const pathA = getDownstreamPath(gameId, game.round, teamA.team_key, bracketState);
	const pathB = getDownstreamPath(gameId, game.round, teamB.team_key, bracketState);

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-4">Bracket Impact</div>

			{/* Your seed picks summary */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<SeedPickSummary
					team={teamA}
					picksByRound={seedAPicksByRound}
					currentRound={game.round}
				/>
				<SeedPickSummary
					team={teamB}
					picksByRound={seedBPicksByRound}
					currentRound={game.round}
				/>
			</div>

			{/* Next round opponent */}
			{nextOpponent && (
				<div className="border border-neutral-800 rounded-md p-3 mb-4">
					<div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
						Next Round Opponent
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-neutral-500 tabular-nums">#{nextOpponent.seed}</span>
						<TeamLogo teamKey={nextOpponent.team_key} size={40} className="size-5" />
						<span className="text-sm font-medium">{nextOpponent.team_name}</span>
					</div>
				</div>
			)}

			{/* Championship path */}
			{game.round <= 4 && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<PathToTitle
						team={teamA}
						path={pathA}
						startRound={game.round}
					/>
					<PathToTitle
						team={teamB}
						path={pathB}
						startRound={game.round}
					/>
				</div>
			)}
		</div>
	);
}

function SeedPickSummary({
	team,
	picksByRound,
	currentRound,
}: {
	team: BracketTeam;
	picksByRound: Record<number, number>;
	currentRound: number;
}) {
	return (
		<div className="border border-neutral-800 rounded-md p-3">
			<div className="text-sm font-bold mb-2" style={{ color: getSeedColor(team.seed) }}>
				Your {team.seed}-seed picks
			</div>
			<div className="flex flex-col gap-1">
				{[1, 2, 3, 4, 5, 6].map(round => {
					const count = picksByRound[round] ?? 0;
					const maxPossible = round <= 2 ? 4 : round === 3 ? 4 : round === 4 ? 4 : round === 5 ? 2 : 1;
					const isCurrentRound = round === currentRound;

					return (
						<div key={round} className={`flex items-center gap-2 ${isCurrentRound ? 'text-white' : 'text-neutral-500'}`}>
							<span className="text-xs w-10 text-right tabular-nums">{ROUND_SHORT_NAMES[round]}</span>
							<div className="flex gap-0.5">
								{Array.from({ length: Math.min(maxPossible, 4) }, (_, i) => (
									<div
										key={i}
										className={`w-3 h-3 rounded-sm ${i < count ? '' : 'bg-neutral-800'}`}
										style={i < count ? { backgroundColor: getSeedColor(team.seed), opacity: 0.8 } : undefined}
									/>
								))}
							</div>
							<span className="text-[10px] tabular-nums">{count}/{Math.min(maxPossible, 4)}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function PathToTitle({
	team,
	path,
	startRound,
}: {
	team: BracketTeam;
	path: { round: number; opponent: BracketTeam | null }[];
	startRound: number;
}) {
	if (path.length === 0) return null;

	return (
		<div className="border border-neutral-800 rounded-md p-3">
			<div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
				{team.short_name}&apos;s path forward
			</div>
			<div className="flex flex-col gap-1.5">
				{path.map(({ round, opponent }) => (
					<div key={round} className="flex items-center gap-2">
						<span className="text-xs text-neutral-400 w-10 text-right tabular-nums">
							{ROUND_SHORT_NAMES[round]}
						</span>
						{opponent ? (
							<>
								<span className="text-[10px] text-neutral-600">vs</span>
								<span className="text-xs text-neutral-500 tabular-nums">#{opponent.seed}</span>
								<TeamLogo teamKey={opponent.team_key} size={40} className="size-4" />
								<span className="text-xs text-neutral-300 truncate">{opponent.short_name}</span>
							</>
						) : (
							<span className="text-xs text-neutral-600 italic">TBD</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

// Helper functions

function getPicksByRound(seed: number, bracketState: BracketState): Record<number, number> {
	const picks: Record<number, number> = {};
	for (const game of bracketState.values()) {
		if (!game.winner || !game.teamA || !game.teamB) continue;
		const winnerTeam = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
		if (winnerTeam.seed === seed) {
			picks[game.round] = (picks[game.round] ?? 0) + 1;
		}
	}
	return picks;
}

function getNextGameId(gameId: string, round: number): string | null {
	// Parse the game ID format: r{round}-{region}-{position}
	const parts = gameId.split('-');
	if (parts.length < 3) return null;

	const region = parts[1];
	const position = parseInt(parts[2]);
	const nextRound = round + 1;

	if (nextRound > 6) return null;

	// In rounds 1-4, winner feeds into same region next round at position Math.floor(pos/2)
	if (nextRound <= 4) {
		return `r${nextRound}-${region}-${Math.floor(position / 2)}`;
	}

	// Round 4 (E8) → Round 5 (FF)
	if (nextRound === 5) {
		// Each pair of regions feeds into one FF game
		// SOUTH + EAST → r5-FF-0, WEST + MIDWEST → r5-FF-1
		const ffPosition = (region === 'SOUTH' || region === 'EAST') ? 0 : 1;
		return `r5-FF-${ffPosition}`;
	}

	// Round 5 (FF) → Round 6 (Championship)
	if (nextRound === 6) {
		return 'r6-FF-0';
	}

	return null;
}

function getNextOpponent(nextGame: BracketGame, currentGameId: string): BracketTeam | null {
	// The opponent in the next game is the team that's already there from the other feeder game
	if (nextGame.teamA && nextGame.teamB) {
		// Both teams already set — find which one didn't come from our game
		// This is approximate; just return whichever team is set
		return nextGame.teamA;
	}
	return nextGame.teamA ?? nextGame.teamB ?? null;
}

function getDownstreamPath(
	gameId: string,
	startRound: number,
	teamKey: string,
	bracketState: BracketState,
): { round: number; opponent: BracketTeam | null }[] {
	const path: { round: number; opponent: BracketTeam | null }[] = [];
	let currentGameId = gameId;
	let currentRound = startRound;

	while (currentRound < 6) {
		const nextId = getNextGameId(currentGameId, currentRound);
		if (!nextId) break;

		const nextGame = bracketState.get(nextId);
		const nextRound = currentRound + 1;

		// Find the opponent in the next game (the team not from our path)
		let opponent: BracketTeam | null = null;
		if (nextGame) {
			if (nextGame.teamA && nextGame.teamA.team_key !== teamKey) opponent = nextGame.teamA;
			else if (nextGame.teamB && nextGame.teamB.team_key !== teamKey) opponent = nextGame.teamB;
		}

		path.push({ round: nextRound, opponent });
		currentGameId = nextId;
		currentRound = nextRound;
	}

	return path;
}
