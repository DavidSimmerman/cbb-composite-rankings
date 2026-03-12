import type { CrossSeedPatterns, SeedRoundStats } from '@/lib/rankings/profile';
import type { BracketGame } from './predictions';
import { ROUND_NAMES } from './predictions';

export type WarningLevel = 'yellow' | 'red';

export interface Warning {
	level: WarningLevel;
	message: string;
	detail: string;
	gameId?: string; // if warning is about a specific game
}

/**
 * Compute warnings for a single game pick.
 */
export function computeGameWarning(
	game: BracketGame,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
): Warning | null {
	if (!game.winner || !game.teamA || !game.teamB) return null;

	const winnerTeam = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
	const loserTeam = game.teamA.team_key === game.winner ? game.teamB : game.teamA;
	const roundName = ROUND_NAMES[game.round];

	// Seed-based win rate for the winner in this round
	const winnerSeedStat = seedRoundStats[winnerTeam.seed]?.[roundName];
	const winPct = winnerSeedStat?.win_pct ?? 0.5;

	// Check for upset severity by seed difference
	const seedDiff = winnerTeam.seed - loserTeam.seed;
	const isUpset = seedDiff > 0; // higher seed number = worse team

	if (isUpset) {
		const wins = Math.round(winPct * (winnerSeedStat?.sample_size ?? 0));
		const total = winnerSeedStat?.sample_size ?? 0;
		const sampleNote = total > 0 ? ` (${wins} wins in ${total} matchups since 2002)` : '';

		// Red: historically unprecedented or near-zero (<5%)
		if (winPct < 0.05) {
			return {
				level: 'red',
				message: `${winnerTeam.seed}-seed over ${loserTeam.seed}-seed`,
				detail: `A ${winnerTeam.seed}-seed winning in the ${roundName} has happened only ${(winPct * 100).toFixed(1)}% of matchups${sampleNote}.`,
				gameId: game.id,
			};
		}

		// Yellow: historically unlikely (<35%)
		if (winPct < 0.35) {
			return {
				level: 'yellow',
				message: `${winnerTeam.seed}-seed upset in ${ROUND_SHORT[game.round]}`,
				detail: `A ${winnerTeam.seed}-seed winning in the ${roundName} happens about ${(winPct * 100).toFixed(0)}% of matchups${sampleNote}.`,
				gameId: game.id,
			};
		}
	}

	return null;
}

const ROUND_SHORT: Record<number, string> = {
	1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'FF', 6: 'Champ',
};

/**
 * Compute cross-bracket warnings that look at the full set of picks.
 */
export function computeCrossBracketWarnings(
	allGames: BracketGame[],
	crossSeedPatterns: CrossSeedPatterns,
): Warning[] {
	const warnings: Warning[] = [];

	// For each round, check seed-line patterns
	for (let round = 1; round <= 6; round++) {
		const roundName = ROUND_NAMES[round];
		const roundGames = allGames.filter(g => g.round === round && g.winner);

		// Group by seed of interest: how many of each seed won this round?
		const seedWinCounts = new Map<number, { won: number; total: number }>();

		for (const g of roundGames) {
			if (!g.teamA || !g.teamB) continue;
			const winnerTeam = g.teamA.team_key === g.winner ? g.teamA : g.teamB;
			const loserTeam = g.teamA.team_key === g.winner ? g.teamB : g.teamA;

			// Track both seeds
			for (const team of [winnerTeam, loserTeam]) {
				if (!seedWinCounts.has(team.seed)) seedWinCounts.set(team.seed, { won: 0, total: 0 });
				const entry = seedWinCounts.get(team.seed)!;
				entry.total++;
				if (team.team_key === g.winner) entry.won++;
			}
		}

		// Check each seed's pattern against historical data
		for (const [seed, { won, total }] of seedWinCounts) {
			if (total < 2) continue; // Need at least 2 games decided to flag patterns

			const dist = crossSeedPatterns.distributions[seed]?.[roundName];
			if (!dist) continue;

			const losses = total - won;

			// Check if this exact count has ever occurred
			const isUnprecedented = crossSeedPatterns.unprecedented.some(
				u => u.seed === seed && u.round === roundName && u.count === won
			);

			if (isUnprecedented && total >= 3) {
				warnings.push({
					level: 'red',
					message: `${won} of ${total} ${seed}-seeds winning ${ROUND_SHORT[round]}`,
					detail: `Having exactly ${won} of ${total} ${seed}-seed${total > 1 ? 's' : ''} win the ${roundName} has never happened in tournament history (${dist.min}-${dist.max} is the historical range).`,
				});
			} else if (total >= 3) {
				// Check if the pattern is very rare (more than 2 stddev from mean)
				const deviations = Math.abs(won - dist.mean) / (dist.stddev || 1);
				if (deviations > 2.5) {
					warnings.push({
						level: 'yellow',
						message: `Unusual: ${won} of ${total} ${seed}-seeds in ${ROUND_SHORT[round]}`,
						detail: `Historically, an average of ${dist.mean.toFixed(1)} ${seed}-seeds win the ${roundName} (std dev: ${dist.stddev.toFixed(1)}). Having ${won} is unusual.`,
					});
				}
			}
		}
	}

	// Check for too many double-digit seeds in later rounds
	for (const round of [3, 4, 5]) {
		const roundName = ROUND_NAMES[round];
		const roundGames = allGames.filter(g => g.round === round && g.winner);
		const doubleDigitWinners = roundGames.filter(g => {
			const winner = g.teamA?.team_key === g.winner ? g.teamA : g.teamB;
			return winner && winner.seed >= 10;
		}).length;

		if (round === 3 && doubleDigitWinners > 3) {
			warnings.push({
				level: 'yellow',
				message: `${doubleDigitWinners} double-digit seeds in S16`,
				detail: `Having ${doubleDigitWinners} double-digit seeds in the Sweet 16 is historically very rare. The most ever is typically 2-3.`,
			});
		} else if (round >= 4 && doubleDigitWinners > 1) {
			warnings.push({
				level: 'yellow',
				message: `${doubleDigitWinners} double-digit seeds in ${ROUND_SHORT[round]}`,
				detail: `Having ${doubleDigitWinners} double-digit seed${doubleDigitWinners > 1 ? 's' : ''} in the ${roundName} is uncommon.`,
			});
		}
	}

	return warnings;
}

/**
 * Get all warnings for the current bracket state.
 */
export function getAllWarnings(
	allGames: BracketGame[],
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
): { gameWarnings: Map<string, Warning>; crossWarnings: Warning[] } {
	const gameWarnings = new Map<string, Warning>();

	for (const game of allGames) {
		const warning = computeGameWarning(game, seedRoundStats, crossSeedPatterns);
		if (warning) {
			gameWarnings.set(game.id, warning);
		}
	}

	const crossWarnings = computeCrossBracketWarnings(allGames, crossSeedPatterns);

	return { gameWarnings, crossWarnings };
}
