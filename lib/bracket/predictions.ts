import type { BracketTeamSummary, SeedRoundStats, CrossSeedPatterns, SeedMatchupStat } from '@/lib/rankings/profile';

export interface BracketTeam {
	team_key: string;
	team_name: string;
	short_name: string;
	abbreviation: string;
	seed: number;
	march_score: number;
	/** 0-100: how well similar historical teams performed in the tournament */
	comps_score: number;
	/** 0-100: how well the team's play style matches March success patterns */
	style_score: number;
	/** 0-100: how the team's rating compares to historical same-seeds */
	rating_score: number;
	color: string;
	secondary_color: string;
	logo_url: string;
}

export interface BracketGame {
	id: string;
	round: number; // 1=R64, 2=R32, 3=S16, 4=E8, 5=FF, 6=Championship
	region: string;
	position: number; // position within round+region (for determining next-round slot)
	teamA: BracketTeam | null;
	teamB: BracketTeam | null;
	winner: string | null;
	prediction: { probA: number; probB: number } | null;
	isManualPick: boolean;
}

export type BracketState = Map<string, BracketGame>;

const REGIONS = ['SOUTH', 'EAST', 'WEST', 'MIDWEST'] as const;
export type Region = (typeof REGIONS)[number];
export const ALL_REGIONS = REGIONS;

// Standard bracket positions: [higherSeed, lowerSeed]
// Position order determines R32 matchups (0 vs 1, 2 vs 3, etc.)
const R64_MATCHUP_ORDER: [number, number][] = [
	[1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
];

export const ROUND_NAMES: Record<number, string> = {
	1: 'Round of 64',
	2: 'Round of 32',
	3: 'Sweet 16',
	4: 'Elite 8',
	5: 'Final Four',
	6: 'Championship',
};

export const ROUND_SHORT_NAMES: Record<number, string> = {
	1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'FF', 6: 'Champ',
};

/**
 * Build the initial bracket state from 64 teams.
 * Randomly assigns teams to regions and creates all 63 games.
 */
export function initializeBracket(bracketTeams: BracketTeamSummary[], existingRegions?: Record<string, string[]>): BracketState {
	let state: BracketState = new Map();

	// Group teams by projected seed
	const seedGroups = new Map<number, BracketTeamSummary[]>();
	for (const team of bracketTeams) {
		const seed = team.projected_seed;
		if (!seedGroups.has(seed)) seedGroups.set(seed, []);
		seedGroups.get(seed)!.push(team);
	}

	// Assign to regions: either use existing or shuffle
	const regionAssignment: Record<string, BracketTeam[]> = {};
	for (const r of REGIONS) regionAssignment[r] = [];

	if (existingRegions) {
		// Restore from saved state
		const teamMap = new Map(bracketTeams.map(t => [t.team_key, t]));
		for (const [region, keys] of Object.entries(existingRegions)) {
			for (const key of keys) {
				const t = teamMap.get(key);
				if (t) regionAssignment[region].push(toBracketTeam(t));
			}
		}
	} else {
		// Shuffle each seed line and assign one per region
		for (let seed = 1; seed <= 16; seed++) {
			const teams = seedGroups.get(seed) ?? [];
			shuffle(teams);
			for (let i = 0; i < Math.min(teams.length, 4); i++) {
				regionAssignment[REGIONS[i]].push(toBracketTeam(teams[i]));
			}
		}
	}

	// Create R64 games (8 per region = 32 total)
	for (const region of REGIONS) {
		const regionTeams = regionAssignment[region];
		// Build seed lookup for this region
		const bySeed = new Map<number, BracketTeam>();
		for (const t of regionTeams) bySeed.set(t.seed, t);

		for (let i = 0; i < R64_MATCHUP_ORDER.length; i++) {
			const [highSeed, lowSeed] = R64_MATCHUP_ORDER[i];
			const gameId = `r1-${region}-${i}`;
			state.set(gameId, {
				id: gameId,
				round: 1,
				region,
				position: i,
				teamA: bySeed.get(highSeed) ?? null,
				teamB: bySeed.get(lowSeed) ?? null,
				winner: null,
				prediction: null,
				isManualPick: false,
			});
		}
	}

	// Create empty games for rounds 2-4 (within regions)
	for (const region of REGIONS) {
		for (let round = 2; round <= 4; round++) {
			const gamesInRound = 8 / Math.pow(2, round - 1);
			for (let i = 0; i < gamesInRound; i++) {
				const gameId = `r${round}-${region}-${i}`;
				state.set(gameId, {
					id: gameId,
					round,
					region,
					position: i,
					teamA: null,
					teamB: null,
					winner: null,
					prediction: null,
					isManualPick: false,
				});
			}
		}
	}

	// Final Four (2 games)
	state.set('r5-FF-0', { id: 'r5-FF-0', round: 5, region: 'FF', position: 0, teamA: null, teamB: null, winner: null, prediction: null, isManualPick: false });
	state.set('r5-FF-1', { id: 'r5-FF-1', round: 5, region: 'FF', position: 1, teamA: null, teamB: null, winner: null, prediction: null, isManualPick: false });

	// Championship
	state.set('r6-FF-0', { id: 'r6-FF-0', round: 6, region: 'FF', position: 0, teamA: null, teamB: null, winner: null, prediction: null, isManualPick: false });

	// Auto-advance byes: if a R64 game has only one team, that team gets a bye
	for (const [gameId, game] of [...state]) {
		if (game.round !== 1) continue;
		if (game.teamA && !game.teamB) {
			state = pickWinner(state, gameId, game.teamA.team_key, false);
		} else if (!game.teamA && game.teamB) {
			state = pickWinner(state, gameId, game.teamB.team_key, false);
		}
	}

	return state;
}

/**
 * Get the game ID that a winner from the given game feeds into.
 */
export function getNextGameId(gameId: string): string | null {
	const [roundStr, region, posStr] = gameId.split('-');
	const round = parseInt(roundStr.slice(1));
	const pos = parseInt(posStr);

	if (round === 6) return null; // Championship has no next game

	if (round <= 3) {
		// Within region: next round, position = floor(pos/2)
		return `r${round + 1}-${region}-${Math.floor(pos / 2)}`;
	}

	if (round === 4) {
		// E8 winners go to Final Four
		// SOUTH/EAST → FF game 0, WEST/MIDWEST → FF game 1
		const ffPos = (region === 'SOUTH' || region === 'EAST') ? 0 : 1;
		return `r5-FF-${ffPos}`;
	}

	if (round === 5) {
		// FF winners go to Championship
		return 'r6-FF-0';
	}

	return null;
}

/**
 * Whether a winner goes into teamA or teamB slot of the next game.
 */
export function getNextGameSlot(gameId: string): 'A' | 'B' {
	const [roundStr, region, posStr] = gameId.split('-');
	const round = parseInt(roundStr.slice(1));
	const pos = parseInt(posStr);

	if (round <= 3) {
		return pos % 2 === 0 ? 'A' : 'B';
	}
	if (round === 4) {
		// E8: SOUTH and WEST are teamA, EAST and MIDWEST are teamB
		return (region === 'SOUTH' || region === 'WEST') ? 'A' : 'B';
	}
	if (round === 5) {
		return pos === 0 ? 'A' : 'B';
	}
	return 'A';
}

/**
 * Pick a winner for a game and propagate through the bracket.
 * Returns updated bracket state.
 */
export function pickWinner(state: BracketState, gameId: string, winnerKey: string, isManual: boolean): BracketState {
	const newState = new Map(state);
	const game = { ...newState.get(gameId)! };
	game.winner = winnerKey;
	game.isManualPick = isManual;
	newState.set(gameId, game);

	// Propagate winner to next game
	const nextId = getNextGameId(gameId);
	if (nextId) {
		const nextGame = { ...newState.get(nextId)! };
		const slot = getNextGameSlot(gameId);
		const winnerTeam = game.teamA?.team_key === winnerKey ? game.teamA : game.teamB;

		if (slot === 'A') {
			nextGame.teamA = winnerTeam;
		} else {
			nextGame.teamB = winnerTeam;
		}
		// Clear prediction since teams changed
		nextGame.prediction = null;
		newState.set(nextId, nextGame);
	}

	return newState;
}

/**
 * Clear a pick and cascade downstream.
 * Removes the winner and clears any downstream games that depended on it.
 */
export function clearPick(state: BracketState, gameId: string): BracketState {
	const newState = new Map(state);
	const game = { ...newState.get(gameId)! };
	const oldWinner = game.winner;
	if (!oldWinner) return state;

	game.winner = null;
	game.isManualPick = false;
	newState.set(gameId, game);

	// Cascade: remove this team from all downstream games
	cascadeClear(newState, gameId, oldWinner);

	return newState;
}

function cascadeClear(state: BracketState, fromGameId: string, teamKey: string) {
	const nextId = getNextGameId(fromGameId);
	if (!nextId) return;

	const nextGame = { ...state.get(nextId)! };
	const slot = getNextGameSlot(fromGameId);

	if (slot === 'A' && nextGame.teamA?.team_key === teamKey) {
		// Also need to cascade if this team was the winner of the next game
		if (nextGame.winner === teamKey) {
			nextGame.winner = null;
			nextGame.isManualPick = false;
			cascadeClear(state, nextId, teamKey);
		}
		nextGame.teamA = null;
		nextGame.prediction = null;
	} else if (slot === 'B' && nextGame.teamB?.team_key === teamKey) {
		if (nextGame.winner === teamKey) {
			nextGame.winner = null;
			nextGame.isManualPick = false;
			cascadeClear(state, nextId, teamKey);
		}
		nextGame.teamB = null;
		nextGame.prediction = null;
	}

	state.set(nextId, nextGame);
}

// --- Historical benchmarks for bracket realism ---
// Based on 23 NCAA tournaments (2002-2025, excluding 2020)

/** Typical deepest round WON by each seed (avg across years). Used as deep-run penalty baseline. */
const SEED_AVG_DEPTH: Record<number, number> = {
	1: 4.3, 2: 3.2, 3: 2.9, 4: 2.5, 5: 2.1, 6: 1.8, 7: 1.9, 8: 1.7,
	9: 1.1, 10: 1.5, 11: 1.6, 12: 1.5, 13: 1.2, 14: 1.1, 15: 1.1, 16: 1.0,
};

/** Hard caps: the absolute deepest a seed has EVER gone (round number). */
const SEED_MAX_DEPTH_EVER: Record<number, number> = {
	1: 6, 2: 6, 3: 6, 4: 5, 5: 6, 6: 3, 7: 6, 8: 6,
	9: 4, 10: 4, 11: 5, 12: 4, 13: 2, 14: 1, 15: 3, 16: 2,
};

/** Average double-digit seed (10+) winners per round historically. */
const HISTORICAL_DD_STATS: Record<number, { mean: number; stddev: number }> = {
	1: { mean: 5.5, stddev: 1.8 },  // R64
	2: { mean: 2.4, stddev: 1.3 },  // R32
	3: { mean: 0.8, stddev: 0.7 },  // S16
	4: { mean: 0.3, stddev: 0.4 },  // E8
};

/** Minimum total upsets per round (floors from historical data, ~2 sigma below mean). */
const MIN_UPSETS_PER_ROUND: Record<number, number> = {
	1: 6,   // R64: 32 games, historically 8.4 avg, min ~5 in data
	2: 4,   // R32: 16 games, historically 5.8 avg, min ~3
	3: 1,   // S16: 8 games, historically 2.8 avg, min ~1
	4: 0,   // E8: 4 games, too few to enforce a floor
	5: 0,   // FF
	6: 0,   // Championship
};

// --- Prediction tuning constants ---

/** Weights for tournament viability calculation. */
const VIABILITY_WEIGHTS = { comps: 0.45, style: 0.30, rating: 0.25 } as const;
/** Sigmoid center for viability and march score conversions. */
const SIGMOID_CENTER = 50;
/** Sigmoid divisor — controls separation (70 → 0.69, 30 → 0.31). */
const SIGMOID_DIVISOR = 25;

/** Blending weights when ML prediction is available. */
const BLEND_WITH_ML = { ml: 0.40, seedHistory: 0.30, marchDiff: 0.20, viability: 0.10 } as const;
/** Blending weights when ML prediction is unavailable. */
const BLEND_WITHOUT_ML = { seedHistory: 0.45, marchDiff: 0.40, viability: 0.15 } as const;
/** Regression toward 50/50 to dampen compounding correlation. */
const UNCERTAINTY_REGRESSION = 0.25;

/** Shrinkage constant for conditional win rate (higher = more shrinkage). */
const SHRINK_CONSTANT = 20;
/** Shrinkage target — slightly below 0.5 to bias toward upsets for teams that reached deep rounds. */
const SHRINK_TARGET = 0.45;
/** Minimum conditional win rate floors by round index. */
const CONDITIONAL_RATE_FLOORS: Record<number, number> = {
	0: 0,     // R64: no floor
	1: 0.10,  // R32
	2: 0.15,  // S16
	3: 0.20,  // E8
	4: 0.25,  // FF
	5: 0.30,  // Championship
};

/** Deep-run penalty base per round above typical depth. */
const DEEP_RUN_PENALTY_MODERATE = 0.80;  // Seeds 7-9
const DEEP_RUN_PENALTY_SEVERE = 0.75;    // Seeds 10+
/** Near-zero probability for seeds that have never reached a given round. */
const UNPRECEDENTED_DEPTH_PROB = 0.02;

/** Per-game historical favorite win rates (2002-2025). */
const ROUND_HISTORICAL_FAV_RATE: Record<number, number> = {
	1: 0.74, 2: 0.64, 3: 0.65, 4: 0.60, 5: 0.60, 6: 0.65,
};

/** Chaos score thresholds for biasing toward fewer upsets. */
const CHAOS_THRESHOLD_HIGH = 14;
const CHAOS_THRESHOLD_MODERATE = 10;
/** Chaos bias values applied when thresholds are exceeded. */
const CHAOS_BIAS_HIGH = -0.05;
const CHAOS_BIAS_MODERATE = -0.02;
const CHAOS_BIAS_BATCH_HIGH = 0.2;
const CHAOS_BIAS_BATCH_MODERATE = 0.1;

/** Chaos points awarded per upset by underdog seed range. */
const CHAOS_POINTS = { seed14Plus: 1.5, seed11Plus: 0.7, other: 0.3 } as const;
/** Minimum seed gap for an upset to count as "chaotic". */
const CHAOS_MIN_SEED_GAP = 5;

/** Upset score penalty/bonus thresholds. */
const UPSET_SCORE_RED_PENALTY = -2.0;
const UPSET_SCORE_YELLOW_PENALTY = -0.5;
const UPSET_SCORE_LATE_NEVER_PENALTY = -2.0;
const UPSET_SCORE_LATE_LOW_COND_PENALTY = -1.5;
const UPSET_SCORE_LATE_MILD_PENALTY = -0.3;
/** ML weight in upset desirability scoring. */
const UPSET_ML_WEIGHT = 0.4;
/** Random jitter range for upset scoring variety. */
const UPSET_JITTER = 0.15;

/** Seeds at or below this number don't get deep-run penalties. */
const DEEP_RUN_EXEMPT_SEED = 4;
/** Seeds at or above this get hard-capped at their historical max depth. */
const HARD_CAP_SEED = 13;

// --- Prediction blending ---

/** Round ordering for conditional probability calculation. */
const ROUND_ORDER = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

/**
 * Compute conditional win rate: P(win this round | reached this round).
 * For R64, this equals the unconditional rate (everyone reaches R64).
 * For R32+, this = win_pct[this round] / win_pct[previous round],
 * which properly accounts for selection effects (only good teams reach later rounds).
 *
 * Example: 11-seeds unconditional R32 rate = 29%, but conditional = 29%/45% = 65%
 * because the 11-seeds that reach R32 are the ones that already proved themselves.
 */
function conditionalWinRate(seed: number, roundName: string, seedRoundStats: SeedRoundStats): number {
	const roundIdx = ROUND_ORDER.indexOf(roundName);
	if (roundIdx < 0) return 0.5;

	const stat = seedRoundStats[seed]?.[roundName];
	if (!stat) return 0;

	// R64: everyone reaches it, so unconditional = conditional
	if (roundIdx === 0) return stat.win_pct;

	// For later rounds: P(win R | reached R) = P(maxDepth >= R) / P(maxDepth >= R-1)
	const prevRound = ROUND_ORDER[roundIdx - 1];
	const prevStat = seedRoundStats[seed]?.[prevRound];
	if (!prevStat || prevStat.win_pct === 0) return 0;

	const raw = Math.min(1.0, stat.win_pct / prevStat.win_pct);

	// Shrink toward a seed-based prior when sample size is small.
	// E.g., 5-seeds in E8: only 9 instances → 77.6% conditional rate is noisy.
	// Shrink toward ~50% (balanced prior for any team that reached this round).
	// More shrinkage for smaller samples: weight = sampleAtStage / (sampleAtStage + 20)
	const sampleAtStage = Math.round(prevStat.win_pct * prevStat.sample_size);
	const shrinkWeight = sampleAtStage / (sampleAtStage + SHRINK_CONSTANT);
	const shrunkRate = raw * shrinkWeight + SHRINK_TARGET * (1 - shrinkWeight);

	const floor = CONDITIONAL_RATE_FLOORS[roundIdx] ?? 0;
	return Math.max(floor, shrunkRate);
}

/**
 * Compute a "tournament viability" score (0-1) for a team.
 * Uses the individual march components to assess how likely the team is to
 * perform well in the tournament. Heavily penalizes teams where:
 * - Historical comps flamed out (comps_score < 30)
 * - Play style doesn't match March success patterns (style_score < 30)
 * - Rating is weak for their seed (rating_score < 30)
 *
 * Returns a multiplier centered around 0.5, ranging from ~0.15 (terrible) to ~0.85 (excellent).
 */
function tournamentViability(team: BracketTeam): number {
	const weighted = team.comps_score * VIABILITY_WEIGHTS.comps
		+ team.style_score * VIABILITY_WEIGHTS.style
		+ team.rating_score * VIABILITY_WEIGHTS.rating;
	return 1 / (1 + Math.exp(-(weighted - SIGMOID_CENTER) / SIGMOID_DIVISOR));
}

/**
 * Compute blended win probability for teamA.
 * Combines ML model prediction, seed-based historical rates, and march profile components.
 */
export function computeBlendedProbability(
	mlProbA: number | null,
	teamA: BracketTeam,
	teamB: BracketTeam,
	roundName: string,
	seedRoundStats: SeedRoundStats,
	seedMatchupStats: SeedMatchupStat[],
): number {
	const hasML = mlProbA !== null;
	const seedA = teamA.seed;
	const seedB = teamB.seed;

	// 1. Seed history probability (conditional for R32+)
	let seedHistoryProbA = 0.5;
	const matchup = seedMatchupStats.find(
		m => m.round === roundName &&
			((m.higher_seed === Math.min(seedA, seedB) && m.lower_seed === Math.max(seedA, seedB)))
	);
	if (matchup) {
		seedHistoryProbA = seedA < seedB ? matchup.higher_seed_win_pct : 1 - matchup.higher_seed_win_pct;
	} else {
		const condRateA = conditionalWinRate(seedA, roundName, seedRoundStats);
		const condRateB = conditionalWinRate(seedB, roundName, seedRoundStats);
		if (condRateA > 0 || condRateB > 0) {
			seedHistoryProbA = condRateA / (condRateA + condRateB);
		}
	}

	// 2. Tournament viability comparison
	// Uses comps (45%), style (30%), rating (25%) to assess each team's March viability
	const viabilityA = tournamentViability(teamA);
	const viabilityB = tournamentViability(teamB);
	const viabilityProbA = viabilityA / (viabilityA + viabilityB);

	// 3. March score differential (sigmoid for overall score comparison)
	const scoreDiff = teamA.march_score - teamB.march_score;
	const marchProbA = 1 / (1 + Math.exp(-scoreDiff / SIGMOID_DIVISOR));

	let blended: number;
	if (hasML) {
		const w = BLEND_WITH_ML;
		blended = mlProbA * w.ml + seedHistoryProbA * w.seedHistory + marchProbA * w.marchDiff + viabilityProbA * w.viability;
	} else {
		const w = BLEND_WITHOUT_ML;
		blended = seedHistoryProbA * w.seedHistory + marchProbA * w.marchDiff + viabilityProbA * w.viability;
	}

	// Regression toward uncertainty: tournament outcomes have inherent variance.
	// Pull toward 50/50 to counteract compounding correlation across signals.
	blended = blended * (1 - UNCERTAINTY_REGRESSION) + 0.5 * UNCERTAINTY_REGRESSION;

	return Math.max(0.01, Math.min(0.99, blended));
}

/**
 * Adjust probability based on seed-line constraints.
 * Nudges toward historical averages based on already-decided games in the same round.
 */
export function adjustForSeedLineConstraints(
	baseProbA: number,
	seedA: number,
	seedB: number,
	round: number,
	allGames: BracketGame[],
	crossSeedPatterns: CrossSeedPatterns,
): number {
	const roundName = ROUND_NAMES[round];
	if (!roundName) return baseProbA;

	const adjustForSeed = (seed: number, isTeamA: boolean) => {
		const dist = crossSeedPatterns.distributions[seed]?.[roundName];
		if (!dist) return 0;

		const sameRoundGames = allGames.filter(
			g => g.round === round && g.winner &&
			(g.teamA?.seed === seed || g.teamB?.seed === seed)
		);

		const alreadyWon = sameRoundGames.filter(g => {
			const winningSeed = g.teamA?.team_key === g.winner ? g.teamA.seed : g.teamB?.seed;
			return winningSeed === seed;
		}).length;

		const remaining = 4 - sameRoundGames.length;
		if (remaining <= 0) return 0;

		const expectedTotal = dist.mean;
		const expectedRemaining = Math.max(0, expectedTotal - alreadyWon);
		const expectedPctRemaining = expectedRemaining / remaining;

		const currentImplicit = isTeamA ? baseProbA : (1 - baseProbA);

		const nudge = (expectedPctRemaining - currentImplicit) * 0.5;
		return isTeamA ? nudge : -nudge;
	};

	let adjustment = 0;
	adjustment += adjustForSeed(seedA, true);
	adjustment += adjustForSeed(seedB, false);

	return Math.max(0.01, Math.min(0.99, baseProbA + adjustment));
}

/**
 * Compute a deep-run penalty for a seed in a given round.
 * Returns a multiplier (0-1) that reduces the upset probability for lower seeds
 * advancing past their typical depth.
 *
 * Only applies to seeds 10+ (double-digit seeds). Seeds 1-9 are common enough
 * in later rounds that they don't need artificial dampening.
 */
function deepRunPenalty(seed: number, round: number): number {
	if (seed <= DEEP_RUN_EXEMPT_SEED) return 1.0;

	// Seeds 7-9: moderate penalty for going deeper than typical
	if (seed <= 9) {
		const avgDepth = SEED_AVG_DEPTH[seed] ?? 1;
		const roundsAboveAvg = round - avgDepth;
		if (roundsAboveAvg <= 0) return 1.0;
		return Math.pow(DEEP_RUN_PENALTY_MODERATE, roundsAboveAvg);
	}

	// Hard cap: if this seed has NEVER reached this round, near-zero probability
	const maxEver = SEED_MAX_DEPTH_EVER[seed] ?? 1;
	if (round > maxEver) return UNPRECEDENTED_DEPTH_PROB;

	const avgDepth = SEED_AVG_DEPTH[seed] ?? 1;
	const roundsAboveAvg = round - avgDepth;
	if (roundsAboveAvg <= 0) return 1.0;

	return Math.pow(DEEP_RUN_PENALTY_SEVERE, roundsAboveAvg);
}

/**
 * Pick a winner using weighted random selection.
 * No sharpening — the blended probability already captures the right signal,
 * and sharpening compounds across rounds making top seeds nearly unbeatable.
 */
export function pickRandomWinner(probA: number): 'A' | 'B' {
	return Math.random() < probA ? 'A' : 'B';
}

/**
 * Auto-fill a single game. Returns the winner team_key or null if game can't be filled.
 */
export function autoFillGame(
	game: BracketGame,
	allGames: BracketGame[],
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	seedMatchupStats: SeedMatchupStat[],
): string | null {
	if (!game.teamA || !game.teamB) return null;
	if (game.winner && game.isManualPick) return null;

	const roundName = ROUND_NAMES[game.round];
	let probA = computeBlendedProbability(
		game.prediction?.probA ?? null,
		game.teamA,
		game.teamB,
		roundName,
		seedRoundStats,
		seedMatchupStats,
	);

	probA = adjustForSeedLineConstraints(
		probA,
		game.teamA.seed,
		game.teamB.seed,
		game.round,
		allGames,
		crossSeedPatterns,
	);

	// Hard cap for extreme seeds (13+): if this seed has never reached this depth,
	// make it nearly impossible. Seeds 10-12 are left unrestricted since they DO go
	// on deep runs historically (11-seeds have 4 Final Fours, 12-seeds have 2 E8s).
	const seedA = game.teamA.seed;
	const seedB = game.teamB.seed;
	if (seedA >= HARD_CAP_SEED && seedA > seedB) {
		const maxEver = SEED_MAX_DEPTH_EVER[seedA] ?? 1;
		if (game.round > maxEver) probA = UNPRECEDENTED_DEPTH_PROB;
	} else if (seedB >= HARD_CAP_SEED && seedB > seedA) {
		const maxEver = SEED_MAX_DEPTH_EVER[seedB] ?? 1;
		if (game.round > maxEver) probA = 1 - UNPRECEDENTED_DEPTH_PROB;
	}

	probA = Math.max(0.01, Math.min(0.99, probA));

	const pick = pickRandomWinner(probA);
	return pick === 'A' ? game.teamA.team_key : game.teamB.team_key;
}

/**
 * Sample from a normal distribution, clipped to [min, max].
 */
function sampleNormal(mean: number, stddev: number, min: number, max: number): number {
	// Box-Muller transform
	const u1 = Math.random();
	const u2 = Math.random();
	const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
	return Math.max(min, Math.min(max, mean + z * stddev));
}

/**
 * Auto-fill a round using a two-phase approach:
 *
 * Phase 1 — Seed-line targeting: For each seed line with multiple games in the round,
 * sample a target count of how many should advance based on historical distributions.
 * This ensures realistic seed advancement patterns (e.g., usually 3-4 of 4 one-seeds).
 *
 * Phase 2 — Upset assignment with deep-run penalty: Within each seed group, rank games
 * by upset desirability (march score gap + ML + deep-run penalty) and assign upsets to
 * the most deserving games. Then cap total double-digit seed upsets for the round.
 */
function autoFillRoundBatch(
	state: BracketState,
	round: number,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	chaosScore: number,
	options?: { region?: string },
): { state: BracketState; chaosScore: number } {
	let newState = new Map(state);
	const roundName = ROUND_NAMES[round];

	// Get fillable games for this round
	const roundGames = [...newState.values()].filter(g => {
		if (g.round !== round) return false;
		if (options?.region && g.region !== options.region && round <= 4) return false;
		if (!g.teamA || !g.teamB) return false;
		if (g.winner && g.isManualPick) return false;
		return true;
	});

	if (roundGames.length === 0) return { state: newState, chaosScore };

	// Group games by favorite-vs-underdog seed matchup
	const seedGroups = groupBySeedMatchup(roundGames);

	// Phase 1: Sample how many upsets each seed group should have
	const groupTargets = sampleSeedLineTargets(
		seedGroups, round, roundName, newState, seedRoundStats, crossSeedPatterns, chaosScore,
	);

	// Phase 2: Assign upsets to the most deserving games within each group
	const decisions = assignUpsets(
		seedGroups, groupTargets, round, roundName, newState, seedRoundStats,
	);

	// Phase 3: Cap double-digit seed upsets to historical norms
	enforceDoubleDigitCap(decisions, round, newState);

	// Phase 4: Enforce minimum upset floor to prevent chalk brackets
	enforceUpsetFloor(decisions, round, roundName, newState, seedRoundStats);

	// Phase 5: Flip upsets that would trigger red warnings
	avoidRedWarnings(decisions, round, roundName, newState, seedRoundStats);

	// Apply all decisions and update chaos score
	return applyDecisions(decisions, newState, chaosScore);
}

// --- Batch auto-fill helper types and functions ---

interface RoundDecision {
	gameId: string;
	winnerKey: string;
	isUpset: boolean;
	underdogSeed: number;
}

/** Group games by favorite-vs-underdog seed matchup. */
function groupBySeedMatchup(games: BracketGame[]): Map<string, BracketGame[]> {
	const groups = new Map<string, BracketGame[]>();
	for (const game of games) {
		const favSeed = Math.min(game.teamA!.seed, game.teamB!.seed);
		const undSeed = Math.max(game.teamA!.seed, game.teamB!.seed);
		const key = `${favSeed}-vs-${undSeed}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(game);
	}
	return groups;
}

/** Compute chaos bias based on current chaos score. */
function chaosBiasSingle(chaosScore: number): number {
	if (chaosScore > CHAOS_THRESHOLD_HIGH) return CHAOS_BIAS_HIGH;
	if (chaosScore > CHAOS_THRESHOLD_MODERATE) return CHAOS_BIAS_MODERATE;
	return 0;
}

function chaosBiasBatch(chaosScore: number): number {
	if (chaosScore > CHAOS_THRESHOLD_HIGH) return CHAOS_BIAS_BATCH_HIGH;
	if (chaosScore > CHAOS_THRESHOLD_MODERATE) return CHAOS_BIAS_BATCH_MODERATE;
	return 0;
}

/** Compute chaos points for an upset. */
function chaosPoints(underdogSeed: number): number {
	if (underdogSeed >= 14) return CHAOS_POINTS.seed14Plus;
	if (underdogSeed >= 11) return CHAOS_POINTS.seed11Plus;
	return CHAOS_POINTS.other;
}

/**
 * Phase 1: Sample target upset counts for each seed group based on historical distributions.
 * Single-game groups use matchup-specific favorite rates; multi-game groups
 * sample from the cross-seed distribution.
 */
function sampleSeedLineTargets(
	seedGroups: Map<string, BracketGame[]>,
	round: number,
	roundName: string,
	state: BracketState,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	chaosScore: number,
): Map<string, number> {
	const targets = new Map<string, number>();

	for (const [groupKey, games] of seedGroups) {
		const favSeed = Math.min(games[0].teamA!.seed, games[0].teamB!.seed);

		const undSeed = Math.max(games[0].teamA!.seed, games[0].teamB!.seed);

		if (games.length <= 1) {
			// Single game: compute matchup-specific upset probability
			const upsetRate = singleGameUpsetRate(favSeed, undSeed, round, roundName, seedRoundStats, crossSeedPatterns, chaosScore);
			targets.set(groupKey, Math.random() < upsetRate ? 1 : 0);
			continue;
		}

		// Multi-game group: use batch sampling from historical distribution
		const dist = crossSeedPatterns.distributions[favSeed]?.[roundName];
		const historicalMean = dist?.mean ?? games.length * 0.65;
		const expectedUpsets = games.length - historicalMean;

		// If expected upsets < 1 per group, handle each game individually
		// to avoid rounding bias (e.g., 1-vs-16 with mean 3.91 out of 4
		// would always round to 4, eliminating the rare upset entirely)
		if (expectedUpsets < 1.5) {
			let totalUpsets = 0;
			for (const game of games) {
				const upsetRate = singleGameUpsetRate(favSeed, undSeed, round, roundName, seedRoundStats, crossSeedPatterns, chaosScore);
				if (Math.random() < upsetRate) totalUpsets++;
			}
			targets.set(groupKey, totalUpsets);
			continue;
		}
		const historicalStddev = dist?.stddev ?? 0.5;
		const historicalMin = dist?.min ?? 0;
		const historicalMax = dist?.max ?? games.length;

		// Count favorites that already won this round (from manual picks)
		const allCurrentGames = [...state.values()];
		const alreadyDecided = allCurrentGames.filter(
			g => g.round === round && g.winner &&
			(g.teamA?.seed === favSeed || g.teamB?.seed === favSeed) &&
			!games.some(fg => fg.id === g.id)
		);
		const alreadyWon = alreadyDecided.filter(g => {
			const winnerSeed = g.teamA?.team_key === g.winner ? g.teamA?.seed : g.teamB?.seed;
			return winnerSeed === favSeed;
		}).length;

		const totalGamesForSeed = alreadyDecided.length + games.length;
		const scaledMean = historicalMean * (totalGamesForSeed / 4);
		const scaledMin = Math.max(0, Math.floor(historicalMin * (totalGamesForSeed / 4)));
		const scaledMax = Math.min(totalGamesForSeed, Math.ceil(historicalMax * (totalGamesForSeed / 4)));
		const adjustedMean = scaledMean + chaosBiasBatch(chaosScore);

		const targetTotalWins = Math.round(
			sampleNormal(adjustedMean, historicalStddev * 1.5, scaledMin, scaledMax)
		);
		const targetBatchWins = Math.max(0, Math.min(games.length, targetTotalWins - alreadyWon));
		targets.set(groupKey, games.length - targetBatchWins);
	}

	return targets;
}

/** Compute upset rate for a single-game matchup using conditional win rates. */
function singleGameUpsetRate(
	favSeed: number,
	undSeed: number,
	round: number,
	roundName: string,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	chaosScore: number,
): number {
	let historicalFavWinRate: number;

	// Blend conditional and unconditional rates:
	// - Conditional: P(win | reached this round) — gives underdogs more credit for getting here
	// - Unconditional: P(reaching this round) — reflects absolute team quality
	// Early rounds lean conditional (R32+), later rounds lean unconditional (FF/Champ)
	const favCondRate = conditionalWinRate(favSeed, roundName, seedRoundStats);
	const undCondRate = conditionalWinRate(undSeed, roundName, seedRoundStats);
	const favUncondRate = seedRoundStats[favSeed]?.[roundName]?.win_pct ?? 0;
	const undUncondRate = seedRoundStats[undSeed]?.[roundName]?.win_pct ?? 0;

	// Blend weight: early rounds lean conditional (helps underdogs who proved themselves),
	// later rounds lean unconditional (favors top seeds as genuine best teams)
	const condWeight = round <= 2 ? 0.75 : round <= 3 ? 0.50 : round <= 4 ? 0.35 : 0.25;

	const favRate = favCondRate * condWeight + favUncondRate * (1 - condWeight);
	const undRate = undCondRate * condWeight + undUncondRate * (1 - condWeight);

	if (favRate > 0 || undRate > 0) {
		const rawRate = (favRate + 0.01) / (favRate + undRate + 0.02);
		const seedGap = undSeed - favSeed;
		const roundDepthFactor = round >= 5 ? 0.03 : 0.04;
		const seedGapPrior = Math.min(0.75, 0.50 + seedGap * roundDepthFactor);
		// Only apply prior as a FLOOR — prevents underestimating favorites in close matchups,
		// but never pulls down the rate when data already shows a strong favorite (e.g. 2-vs-15).
		const priorWeight = round >= 5 ? 0.20 : 0.15;
		historicalFavWinRate = seedGapPrior > rawRate
			? rawRate * (1 - priorWeight) + seedGapPrior * priorWeight
			: rawRate;
	} else {
		const dist = crossSeedPatterns.distributions[favSeed]?.[roundName];
		historicalFavWinRate = dist ? dist.mean / 4 : 0.65;
	}

	// Light calibration toward round's historical favorite win rate
	const roundBase = ROUND_HISTORICAL_FAV_RATE[round] ?? 0.65;
	const seedGap = undSeed - favSeed;
	const baseCalibWeight = round >= 5 ? 0.20 : round >= 4 ? 0.15 : round >= 3 ? 0.10 : 0.08;
	const gapScale = Math.max(0.3, 1 - seedGap * 0.12);
	const calibrationWeight = baseCalibWeight * gapScale;
	historicalFavWinRate = historicalFavWinRate * (1 - calibrationWeight) + roundBase * calibrationWeight;

	// Apply deep-run penalty for underdog
	const drPenalty = deepRunPenalty(undSeed, round);
	const adjustedFavRate = 1 - (1 - historicalFavWinRate) * drPenalty;
	const upsetRate = 1 - adjustedFavRate;

	let finalRate = Math.max(0, Math.min(1, upsetRate + chaosBiasSingle(chaosScore)));

	// Hard caps for extreme mismatches in R64
	if (round === 1) {
		if (favSeed === 1 && undSeed === 16) finalRate = 0;
		if (favSeed === 2 && undSeed === 15) finalRate = Math.min(finalRate, 0.025);
	}

	return finalRate;
}

/**
 * Phase 2: Within each seed group, rank games by upset desirability and assign
 * upsets to the most deserving games.
 */
function assignUpsets(
	seedGroups: Map<string, BracketGame[]>,
	groupTargets: Map<string, number>,
	round: number,
	roundName: string,
	state: BracketState,
	seedRoundStats: SeedRoundStats,
): RoundDecision[] {
	const decisions: RoundDecision[] = [];

	for (const [groupKey, games] of seedGroups) {
		const targetUpsets = groupTargets.get(groupKey)!;

		const gameScores = games.map(game => {
			const favIsSideA = game.teamA!.seed <= game.teamB!.seed;
			const favTeam = favIsSideA ? game.teamA! : game.teamB!;
			const undTeam = favIsSideA ? game.teamB! : game.teamA!;

			const upsetScore = scoreUpsetDesirability(
				favTeam, undTeam, game.prediction, favIsSideA, round, roundName, seedRoundStats,
			);

			return { game, favTeam, undTeam, upsetScore };
		});

		gameScores.sort((a, b) => b.upsetScore - a.upsetScore);

		for (let i = 0; i < gameScores.length; i++) {
			const { game, favTeam, undTeam } = gameScores[i];
			const currentGame = state.get(game.id)!;
			if (!currentGame.teamA || !currentGame.teamB) continue;
			if (currentGame.winner && currentGame.isManualPick) continue;

			const isUpset = i < targetUpsets;
			const winnerKey = isUpset ? undTeam.team_key : favTeam.team_key;
			decisions.push({ gameId: game.id, winnerKey, isUpset, underdogSeed: undTeam.seed });
		}
	}

	return decisions;
}

/** Score how deserving a game is of an upset (higher = more deserving). */
function scoreUpsetDesirability(
	favTeam: BracketTeam,
	undTeam: BracketTeam,
	prediction: { probA: number; probB: number } | null,
	favIsSideA: boolean,
	round: number,
	roundName: string,
	seedRoundStats: SeedRoundStats,
): number {
	const favViability = tournamentViability(favTeam);
	const undViability = tournamentViability(undTeam);
	const viabilityGap = favViability - undViability;

	// ML probability of the favorite winning
	const mlProb = prediction ? (favIsSideA ? prediction.probA : prediction.probB) : null;

	let score = -viabilityGap * 2;
	if (mlProb !== null) {
		score += (1 - mlProb) * UPSET_ML_WEIGHT;
	}

	// Deep-run penalty reduces upset score for lower seeds in later rounds
	score *= deepRunPenalty(undTeam.seed, round);

	// Warning-based penalties
	const undSeedStat = seedRoundStats[undTeam.seed]?.[roundName];
	const undWinPct = undSeedStat?.win_pct ?? 0;
	if (round <= 2) {
		if (undWinPct < 0.05) score += UPSET_SCORE_RED_PENALTY;
		else if (undWinPct < 0.35) score += UPSET_SCORE_YELLOW_PENALTY;
	} else {
		if (undWinPct === 0) score += UPSET_SCORE_LATE_NEVER_PENALTY;
		else {
			const condRate = conditionalWinRate(undTeam.seed, roundName, seedRoundStats);
			if (condRate < 0.10) score += UPSET_SCORE_LATE_LOW_COND_PENALTY;
			else if (undWinPct < 0.35) score += UPSET_SCORE_LATE_MILD_PENALTY;
		}
	}

	// Small random jitter for variety
	score += (Math.random() - 0.5) * UPSET_JITTER;

	return score;
}

/** Phase 3: Cap double-digit seed upsets to historical norms. */
function enforceDoubleDigitCap(
	decisions: RoundDecision[],
	round: number,
	state: BracketState,
): void {
	const ddStats = HISTORICAL_DD_STATS[round];
	if (!ddStats) return;

	const ddUpsets = decisions.filter(d => d.isUpset && d.underdogSeed >= 10);
	const ddTarget = Math.round(sampleNormal(ddStats.mean, ddStats.stddev, 0, ddStats.mean + ddStats.stddev * 2));

	if (ddUpsets.length <= ddTarget) return;

	// Flip weakest DD upsets back to favorites (highest seed = weakest)
	ddUpsets.sort((a, b) => b.underdogSeed - a.underdogSeed);
	for (let i = ddTarget; i < ddUpsets.length; i++) {
		const d = ddUpsets[i];
		const game = state.get(d.gameId)!;
		if (game.teamA && game.teamB) {
			const favTeam = game.teamA.seed <= game.teamB.seed ? game.teamA : game.teamB;
			d.winnerKey = favTeam.team_key;
			d.isUpset = false;
		}
	}
}

/** Phase 4: Enforce minimum upset floor to prevent unrealistically chalk brackets. */
function enforceUpsetFloor(
	decisions: RoundDecision[],
	round: number,
	roundName: string,
	state: BracketState,
	seedRoundStats: SeedRoundStats,
): void {
	const minUpsets = MIN_UPSETS_PER_ROUND[round] ?? 0;
	const currentUpsets = decisions.filter(d => d.isUpset).length;
	if (currentUpsets >= minUpsets) return;

	// Rank non-upset games by how plausible the upset would be
	const candidates = decisions
		.filter(d => !d.isUpset)
		.map(d => {
			const game = state.get(d.gameId)!;
			if (!game.teamA || !game.teamB) return { d, score: -Infinity };
			const favTeam = game.teamA.seed <= game.teamB.seed ? game.teamA : game.teamB;
			const undTeam = game.teamA.seed <= game.teamB.seed ? game.teamB : game.teamA;
			const seedGap = undTeam.seed - favTeam.seed;
			const undViability = tournamentViability(undTeam);
			// Don't flip if it would create a red warning
			const undWinPct = seedRoundStats[undTeam.seed]?.[roundName]?.win_pct ?? 0;
			if (undWinPct < 0.05) return { d, score: -Infinity };
			return { d, score: undViability - seedGap * 0.05 };
		})
		.filter(x => x.score > -Infinity)
		.sort((a, b) => b.score - a.score);

	const needed = minUpsets - currentUpsets;
	for (let i = 0; i < Math.min(needed, candidates.length); i++) {
		const { d } = candidates[i];
		const game = state.get(d.gameId)!;
		if (game.teamA && game.teamB) {
			const undTeam = game.teamA.seed <= game.teamB.seed ? game.teamB : game.teamA;
			d.winnerKey = undTeam.team_key;
			d.isUpset = true;
			d.underdogSeed = undTeam.seed;
		}
	}
}

/**
 * Phase 5: Flip upsets that would trigger red warnings.
 * Early rounds: unconditional win rate < 5%.
 * Late rounds: conditional rate < 10% (accounts for selection effects).
 */
function avoidRedWarnings(
	decisions: RoundDecision[],
	round: number,
	roundName: string,
	state: BracketState,
	seedRoundStats: SeedRoundStats,
): void {
	for (const d of decisions) {
		if (!d.isUpset) continue;
		const undWinPct = seedRoundStats[d.underdogSeed]?.[roundName]?.win_pct ?? 0;

		let shouldFlip = false;
		if (round <= 2) {
			shouldFlip = undWinPct < 0.05;
		} else {
			if (undWinPct === 0) {
				shouldFlip = true;
			} else {
				shouldFlip = conditionalWinRate(d.underdogSeed, roundName, seedRoundStats) < 0.10;
			}
		}

		if (shouldFlip) {
			const game = state.get(d.gameId)!;
			if (game.teamA && game.teamB) {
				const favTeam = game.teamA.seed <= game.teamB.seed ? game.teamA : game.teamB;
				d.winnerKey = favTeam.team_key;
				d.isUpset = false;
			}
		}
	}
}

/** Apply all round decisions to the bracket state and accumulate chaos score. */
function applyDecisions(
	decisions: RoundDecision[],
	state: BracketState,
	chaosScore: number,
): { state: BracketState; chaosScore: number } {
	let newState = state;
	let newChaos = chaosScore;

	for (const { gameId, winnerKey, isUpset, underdogSeed } of decisions) {
		const game = newState.get(gameId)!;
		const favSeed = Math.min(game.teamA?.seed ?? 0, game.teamB?.seed ?? 0);
		const seedDiff = underdogSeed - favSeed;
		newState = pickWinner(newState, gameId, winnerKey, false);
		if (isUpset && seedDiff >= CHAOS_MIN_SEED_GAP) {
			newChaos += chaosPoints(underdogSeed);
		}
	}

	return { state: newState, chaosScore: newChaos };
}

/**
 * Auto-fill all unfilled games (or non-manual games) in a bracket.
 * Uses seed-line targeting + deep-run penalties + chaos budget for realistic results.
 */
export function autoFillBracket(
	state: BracketState,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	options?: { region?: string; round?: number },
): BracketState {
	let newState = new Map(state);
	let chaosScore = 0;

	// Calculate initial chaos from any existing picks (only significant upsets)
	for (const game of newState.values()) {
		if (!game.winner || !game.teamA || !game.teamB) continue;
		const winnerSeed = game.teamA.team_key === game.winner ? game.teamA.seed : game.teamB.seed;
		const loserSeed = game.teamA.team_key === game.winner ? game.teamB.seed : game.teamA.seed;
		if (winnerSeed - loserSeed >= CHAOS_MIN_SEED_GAP) {
			chaosScore += chaosPoints(winnerSeed);
		}
	}

	for (let round = 1; round <= 6; round++) {
		if (options?.round && round !== options.round) continue;

		const result = autoFillRoundBatch(
			newState, round,
			seedRoundStats, crossSeedPatterns,
			chaosScore,
			options,
		);
		newState = result.state;
		chaosScore = result.chaosScore;
	}

	return newState;
}

/**
 * Get the region assignment from bracket state (for persistence).
 */
export function getRegionAssignment(state: BracketState): Record<string, string[]> {
	const regions: Record<string, string[]> = {};
	for (const region of REGIONS) {
		const r64Games = [...state.values()].filter(g => g.round === 1 && g.region === region);
		const teamKeys: string[] = [];
		for (const g of r64Games) {
			if (g.teamA) teamKeys.push(g.teamA.team_key);
			if (g.teamB) teamKeys.push(g.teamB.team_key);
		}
		regions[region] = teamKeys;
	}
	return regions;
}

/**
 * "Perfect my bracket" — fill remaining picks to maximize the realism score
 * while reflecting actual team quality (ML predictions, march scores, etc.).
 *
 * Strategy:
 * 1. Generate N auto-fill candidates (randomized, uses ML + march + viability)
 * 2. Score each with the evaluator and keep the best
 * 3. Hill-climb: try flipping individual games to improve the score further
 */
export function perfectBracket(
	state: BracketState,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	evaluate: (games: BracketGame[]) => { realismScore: number },
	options?: { round?: number },
): BracketState {
	const targetRound = options?.round;
	const manualGameIds = new Set<string>();
	for (const [id, game] of state) {
		if (game.isManualPick && game.winner) manualGameIds.add(id);
	}

	// Phase 1: Generate multiple auto-fill candidates and pick the highest-scoring one.
	// Auto-fill is randomized and uses ML predictions + march scores + team viability,
	// so each run produces a different realistic bracket.
	const NUM_CANDIDATES = 20;
	let best: BracketState = new Map(state);
	let bestScore = -1;

	for (let i = 0; i < NUM_CANDIDATES; i++) {
		const candidate = autoFillBracket(new Map(state), seedRoundStats, crossSeedPatterns, targetRound ? { round: targetRound } : undefined);
		const score = evaluate([...candidate.values()]).realismScore;
		if (score > bestScore) {
			best = candidate;
			bestScore = score;
			if (bestScore >= 100) return best;
		}
	}

	// Phase 2: Greedy hill-climb — try flipping each non-manual game and keep improvements.
	// When flipping, re-fill downstream with favorites (chalk) to avoid cascading chaos.
	const MAX_ITERATIONS = 3;
	for (let iter = 0; iter < MAX_ITERATIONS && bestScore < 100; iter++) {
		let improved = false;

		const flippable = [...best.values()]
			.filter(g => g.winner && g.teamA && g.teamB && !manualGameIds.has(g.id) && (!targetRound || g.round === targetRound))
			.sort((a, b) => a.round - b.round);

		for (const game of flippable) {
			const currentWinner = game.winner!;
			const otherTeam = game.teamA!.team_key === currentWinner ? game.teamB! : game.teamA!;

			let candidate = clearPick(best, game.id);
			candidate = pickWinner(candidate, game.id, otherTeam.team_key, false);

			// Re-fill downstream games cleared by the flip (pick favorites) — only if not round-scoped
			if (!targetRound) {
				for (let round = game.round + 1; round <= 6; round++) {
					const downstream = [...candidate.values()]
						.filter(g => g.round === round && !g.winner && g.teamA && g.teamB);
					for (const g of downstream) {
						if (manualGameIds.has(g.id)) continue;
						const fav = g.teamA!.seed <= g.teamB!.seed ? g.teamA! : g.teamB!;
						candidate = pickWinner(candidate, g.id, fav.team_key, false);
					}
				}
			}

			const candidateScore = evaluate([...candidate.values()]).realismScore;
			if (candidateScore > bestScore) {
				best = candidate;
				bestScore = candidateScore;
				improved = true;
				if (bestScore >= 100) break;
			}
		}

		if (!improved) break;
	}

	return best;
}

// --- Utilities ---

function toBracketTeam(t: BracketTeamSummary): BracketTeam {
	return {
		team_key: t.team_key,
		team_name: t.team_name,
		short_name: t.short_name,
		abbreviation: t.abbreviation,
		seed: t.projected_seed,
		march_score: t.march_score,
		comps_score: t.march_analysis.comps_score,
		style_score: t.march_analysis.style_score,
		rating_score: t.march_analysis.rating_score,
		color: t.color,
		secondary_color: t.secondary_color,
		logo_url: t.logo_url,
	};
}

function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}
