import type { CrossSeedPatterns, SeedRoundStats } from '@/lib/rankings/profile';
import type { BracketGame } from './predictions';
import { ROUND_NAMES } from './predictions';

export type FindingSeverity = 'info' | 'mild' | 'bold' | 'wild';

export interface Finding {
	severity: FindingSeverity;
	title: string;
	detail: string;
	round?: number;
	gameId?: string;
}

export interface BracketEvaluation {
	/** 0-100 overall realism score (100 = historically realistic, 0 = historically impossible) */
	realismScore: number;
	/** Label for the bracket style */
	bracketStyle: string;
	findings: Finding[];
}

const ROUND_SHORT: Record<number, string> = {
	1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8', 5: 'FF', 6: 'Champ',
};

/**
 * Evaluate a completed (or partially completed) bracket and return findings.
 *
 * Penalty calibration targets (based on 2002-2025 tournaments):
 * - Chalkiest real years (2007, 2025): score ~80-90
 * - Average year (~20 upsets): score ~70-80
 * - Wild years (2011, 2014, 2023): score ~55-70
 * - Full chalk (0 upsets): score ~70
 * - Historically impossible: score <30
 */
export function evaluateBracket(
	allGames: BracketGame[],
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
): BracketEvaluation {
	const findings: Finding[] = [];
	let penaltyPoints = 0;

	// --- Deep run findings ---
	const deepRunFindings = findDeepRuns(allGames, seedRoundStats);
	findings.push(...deepRunFindings.findings);
	penaltyPoints += deepRunFindings.penalty;

	// --- Per-game upset findings (only truly rare upsets, grouped by seed+round) ---
	const upsetFindings = findUpsets(allGames, seedRoundStats);
	findings.push(...upsetFindings.findings);
	penaltyPoints += upsetFindings.penalty;

	// --- Seed-line pattern findings (informational, minimal penalty) ---
	// Skip seed+round combos already flagged by findUpsets to avoid double-reporting
	const patternFindings = findSeedLinePatterns(allGames, crossSeedPatterns, upsetFindings.flaggedSeedRounds);
	findings.push(...patternFindings.findings);
	penaltyPoints += patternFindings.penalty;

	// --- Overall bracket shape ---
	const shapeFindings = findBracketShape(allGames, seedRoundStats);
	findings.push(...shapeFindings.findings);
	penaltyPoints += shapeFindings.penalty;

	const realismScore = Math.max(0, Math.min(100, Math.round(100 - penaltyPoints)));

	const bracketStyle = realismScore >= 97 ? 'This Is the One'
		: realismScore >= 90 ? 'Almost Perfect'
		: realismScore >= 75 ? 'Mostly Realistic'
		: realismScore >= 55 ? 'Bold Picks'
		: realismScore >= 30 ? 'Chaos Bracket'
		: 'March Madness Fantasy';

	const severityOrder: Record<FindingSeverity, number> = { wild: 0, bold: 1, mild: 2, info: 3 };
	findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

	return { realismScore, bracketStyle, findings };
}

/**
 * Find upsets and group them by seed+round pattern.
 * Only flags truly rare upsets (< 10% per game). Common upsets like 6-over-3
 * in R32 (~22%) are normal and handled by seed-line pattern checks if the
 * aggregate count is unusual.
 */
function findUpsets(
	allGames: BracketGame[],
	seedRoundStats: SeedRoundStats,
): { findings: Finding[]; penalty: number; flaggedSeedRounds: Set<string> } {
	const findings: Finding[] = [];
	let penalty = 0;
	const flaggedSeedRounds = new Set<string>();

	// Group upsets by winner seed + round
	const groups = new Map<string, {
		winnerSeed: number;
		loserSeed: number;
		round: number;
		count: number;
		teamNames: string[];
	}>();

	for (const game of allGames) {
		if (!game.winner || !game.teamA || !game.teamB) continue;
		const winnerTeam = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
		const loserTeam = game.teamA.team_key === game.winner ? game.teamB : game.teamA;
		if (winnerTeam.seed <= loserTeam.seed) continue;

		const key = `${winnerTeam.seed}-over-${loserTeam.seed}-r${game.round}`;
		const existing = groups.get(key);
		if (existing) {
			existing.count++;
			existing.teamNames.push(winnerTeam.short_name);
		} else {
			groups.set(key, {
				winnerSeed: winnerTeam.seed,
				loserSeed: loserTeam.seed,
				round: game.round,
				count: 1,
				teamNames: [winnerTeam.short_name],
			});
		}
	}

	for (const [, group] of groups) {
		// S16+ upsets: matchups aren't fixed (a 5-over-1 in S16 depends on bracket path),
		// so per-matchup upset rates are misleading. Deep run findings handle these seeds.
		// Only flag R64/R32 upsets here where matchups are structurally fixed.
		if (group.round >= 3) continue;

		const roundName = ROUND_NAMES[group.round];
		const shortRound = ROUND_SHORT[group.round];
		const stat = seedRoundStats[group.winnerSeed]?.[roundName];
		const winPct = stat?.win_pct ?? 0;
		const total = stat?.sample_size ?? 0;
		const wins = Math.round(winPct * total);
		const pctStr = (winPct * 100).toFixed(1);
		const names = group.teamNames.join(', ');
		const countPrefix = group.count > 1 ? `${group.count}× ` : '';

		// For multiple upsets of the same type, compute compound probability.
		// P(k upsets in n=4 games) = C(n,k) * p^k * (1-p)^(n-k)
		const n = 4; // games per seed matchup type per bracket
		const effectiveProb = group.count > 1
			? binomialProbAtLeast(group.count, n, winPct)
			: winPct;

		const compoundPctStr = (effectiveProb * 100).toFixed(1);

		if (effectiveProb < 0.02) {
			findings.push({
				severity: 'wild',
				title: `${countPrefix}${group.winnerSeed}-seed over ${group.loserSeed}-seed in ${shortRound}`,
				detail: group.count > 1
					? `Each game is a ${pctStr}% upset, but ${group.count} in one bracket (${names}) only happens ~${compoundPctStr}% of the time.`
					: `${group.winnerSeed}-seeds win this game in only ${pctStr}% of matchups (${wins} of ${total} games since '02).`,
				round: group.round,
			});
			penalty += 5 * group.count;
			flaggedSeedRounds.add(`${group.winnerSeed}-${group.round}`);
			flaggedSeedRounds.add(`${group.loserSeed}-${group.round}`);
		} else if (effectiveProb < 0.10) {
			findings.push({
				severity: 'bold',
				title: `${countPrefix}${group.winnerSeed}-seed over ${group.loserSeed}-seed in ${shortRound}`,
				detail: group.count > 1
					? `Each game is a ${pctStr}% upset, but ${group.count} in one bracket (${names}) only happens ~${compoundPctStr}% of the time.`
					: `${group.winnerSeed}-seeds win this game ${pctStr}% of the time (${wins} of ${total} since '02).`,
				round: group.round,
			});
			penalty += 3 * group.count;
			flaggedSeedRounds.add(`${group.winnerSeed}-${group.round}`);
			flaggedSeedRounds.add(`${group.loserSeed}-${group.round}`);
		}
	}

	return { findings, penalty, flaggedSeedRounds };
}

/**
 * Find teams making deep runs relative to their seed expectations.
 * Groups double-digit seeds (10+) together for S16+ rounds rather than
 * flagging each individually, unless the specific seed is truly unprecedented.
 */
function findDeepRuns(
	allGames: BracketGame[],
	seedRoundStats: SeedRoundStats,
): { findings: Finding[]; penalty: number } {
	const findings: Finding[] = [];
	let penalty = 0;

	// Track deepest round won per team
	const teamDeepest = new Map<string, { seed: number; name: string; deepestRound: number }>();
	for (const game of allGames) {
		if (!game.winner || !game.teamA || !game.teamB) continue;
		const winnerTeam = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
		const existing = teamDeepest.get(winnerTeam.team_key);
		if (!existing || game.round > existing.deepestRound) {
			teamDeepest.set(winnerTeam.team_key, {
				seed: winnerTeam.seed,
				name: winnerTeam.short_name,
				deepestRound: game.round,
			});
		}
	}

	const ROUND_ORDER = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

	// Collect deep-run teams by reached round for DD grouping
	const ddByRound = new Map<number, { teams: { seed: number; name: string; pct: number }[]; penalty: number }>();

	for (const [, team] of teamDeepest) {
		if (team.seed <= 4) continue;

		const reachedRound = team.deepestRound + 1;
		if (reachedRound <= 2) continue;

		const reachedRoundName = ROUND_ORDER[reachedRound - 1];
		if (!reachedRoundName) continue;

		// To check if a seed has REACHED a round, look at the previous round's win rate.
		// seedRoundStats[seed][round].win_pct = fraction that WON that round (maxDepth >= threshold).
		// Winning S16 = reaching E8, so use the round they won (deepestRound) not the round they reached.
		const wonRoundName = ROUND_ORDER[team.deepestRound - 1];
		const stat = seedRoundStats[team.seed]?.[wonRoundName];
		const reachPct = stat?.win_pct ?? 0;
		const shortRound = ROUND_SHORT[reachedRound];

		// Unprecedented: this seed has NEVER reached this round
		if (reachPct === 0) {
			findings.push({
				severity: 'wild',
				title: `${team.name} (${team.seed}-seed) in the ${shortRound}`,
				detail: `No ${team.seed}-seed has ever reached the ${reachedRoundName} in 23 tournaments since 2002. This would be a first.`,
				round: reachedRound,
			});
			penalty += 6;
			continue;
		}

		// For seeds 5-9: flag individually if rare enough
		if (team.seed < 10) {
			if (reachPct < 0.02) {
				findings.push({
					severity: 'bold',
					title: `${team.name} (${team.seed}-seed) in the ${shortRound}`,
					detail: `Only ${(reachPct * 100).toFixed(1)}% of ${team.seed}-seeds reach the ${reachedRoundName} (about once every ${Math.round(1 / reachPct / 4)} tournaments).`,
					round: reachedRound,
				});
				penalty += 5;
			} else if (reachPct < 0.05) {
				findings.push({
					severity: 'bold',
					title: `${team.name} (${team.seed}-seed) in the ${shortRound}`,
					detail: `Only ${(reachPct * 100).toFixed(1)}% of ${team.seed}-seeds reach the ${reachedRoundName} (about once every ${Math.round(1 / reachPct / 4)} tournaments).`,
					round: reachedRound,
				});
				penalty += 4;
			} else if (reachPct < 0.10 && reachedRound >= 4) {
				findings.push({
					severity: 'mild',
					title: `${team.name} (${team.seed}-seed) in the ${shortRound}`,
					detail: `About ${(reachPct * 100).toFixed(1)}% of ${team.seed}-seeds reach the ${reachedRoundName} (roughly once every ${Math.round(1 / reachPct / 4)} tournaments). Uncommon but not unheard of.`,
					round: reachedRound,
				});
				penalty += 3;
			} else if (reachPct < 0.20 && reachedRound >= 5) {
				findings.push({
					severity: 'info',
					title: `${team.name} (${team.seed}-seed) in the ${shortRound}`,
					detail: `About ${(reachPct * 100).toFixed(1)}% of ${team.seed}-seeds reach the ${reachedRoundName}. Notable but not rare.`,
					round: reachedRound,
				});
				penalty += 2;
			}
			continue;
		}

		// Seeds 10+: accumulate for grouped DD finding (unless unprecedented, already handled above)
		if (reachedRound >= 3) {
			if (!ddByRound.has(reachedRound)) {
				ddByRound.set(reachedRound, { teams: [], penalty: 0 });
			}
			const group = ddByRound.get(reachedRound)!;
			group.teams.push({ seed: team.seed, name: team.name, pct: reachPct });
			// Penalty scales with rarity
			if (reachPct < 0.02) group.penalty += 5;
			else if (reachPct < 0.05) group.penalty += 4;
			else if (reachPct < 0.10) group.penalty += 3;
		}
	}

	// Emit grouped DD findings (only if there's actual penalty)
	for (const [reachedRound, group] of ddByRound) {
		if (group.teams.length === 0 || group.penalty === 0) continue;
		const shortRound = ROUND_SHORT[reachedRound];
		const reachedRoundName = ROUND_ORDER[reachedRound - 1];
		const teamList = group.teams.map(t => `${t.name} (${t.seed})`).join(', ');

		// Compute aggregate DD rate for reaching this round (use previous round's win rate)
		const wonRoundName = ROUND_ORDER[reachedRound - 2]; // round they won to reach this round
		let ddTotal = 0;
		let ddWins = 0;
		for (let s = 10; s <= 16; s++) {
			const stat = wonRoundName ? seedRoundStats[s]?.[wonRoundName] : undefined;
			if (stat) {
				ddTotal += stat.sample_size;
				ddWins += Math.round(stat.win_pct * stat.sample_size);
			}
		}
		const ddPct = ddTotal > 0 ? (ddWins / ddTotal * 100).toFixed(1) : '0';
		const ddPerYear = ddTotal > 0 ? (ddWins / 23).toFixed(1) : '0'; // 23 tournaments

		if (group.teams.length === 1) {
			const t = group.teams[0];
			const severity: FindingSeverity = t.pct < 0.03 ? 'bold' : 'mild';
			findings.push({
				severity,
				title: `Double-digit seed in the ${shortRound}`,
				detail: `${t.name} (${t.seed}-seed) in the ${reachedRoundName}. Only ${ddPct}% of 10+-seeds reach this round (~${ddPerYear} per tournament on avg).`,
				round: reachedRound,
			});
		} else {
			findings.push({
				severity: 'bold',
				title: `${group.teams.length} double-digit seeds in the ${shortRound}`,
				detail: `${teamList} in the ${reachedRoundName}. Historically ~${ddPerYear} 10+-seeds per tournament reach this round. Having ${group.teams.length} is very unusual.`,
				round: reachedRound,
			});
		}
		penalty += group.penalty;
	}

	return { findings, penalty };
}

/**
 * Find unusual seed-line patterns across the bracket.
 * Low penalties — these are informational to help the user understand
 * aggregate patterns, not to heavily penalize individual picks.
 */
function findSeedLinePatterns(
	allGames: BracketGame[],
	crossSeedPatterns: CrossSeedPatterns,
	skipSeedRounds: Set<string> = new Set(),
): { findings: Finding[]; penalty: number } {
	const findings: Finding[] = [];
	let penalty = 0;

	for (let round = 1; round <= 6; round++) {
		const roundName = ROUND_NAMES[round];
		const shortRound = ROUND_SHORT[round];
		const roundGames = allGames.filter(g => g.round === round && g.winner);
		if (roundGames.length < 2) continue;

		const seedWinCounts = new Map<number, { won: number; total: number }>();
		for (const g of roundGames) {
			if (!g.teamA || !g.teamB) continue;
			const winnerTeam = g.teamA.team_key === g.winner ? g.teamA : g.teamB;
			const loserTeam = g.teamA.team_key === g.winner ? g.teamB : g.teamA;

			for (const team of [winnerTeam, loserTeam]) {
				if (!seedWinCounts.has(team.seed)) seedWinCounts.set(team.seed, { won: 0, total: 0 });
				const entry = seedWinCounts.get(team.seed)!;
				entry.total++;
				if (team.team_key === g.winner) entry.won++;
			}
		}

		for (const [seed, { won, total }] of seedWinCounts) {
			if (total < 3) continue;
			if (skipSeedRounds.has(`${seed}-${round}`)) continue;

			const dist = crossSeedPatterns.distributions[seed]?.[roundName];
			if (!dist) continue;

			const isUnprecedented = crossSeedPatterns.unprecedented.some(
				u => u.seed === seed && u.round === roundName && u.count === won
			);

			if (isUnprecedented) {
				findings.push({
					severity: 'bold',
					title: `${won} of ${total} ${seed}-seeds winning ${shortRound}`,
					detail: `This exact count has never occurred in 23 tournaments. Historical range: ${dist.min}-${dist.max} out of 4 per year.`,
					round,
				});
				penalty += 2;
			} else {
				const deviations = Math.abs(won - dist.mean) / (dist.stddev || 1);
				if (deviations > 2.5) {
					findings.push({
						severity: 'mild',
						title: `${won} of ${total} ${seed}-seeds winning ${shortRound}`,
						detail: `Average is ${dist.mean.toFixed(1)} out of 4 per year (±${dist.stddev.toFixed(1)}). Your bracket is ${deviations.toFixed(1)}σ from the historical average.`,
						round,
					});
					penalty += 1;
				}
			}
		}
	}

	return { findings, penalty };
}

/** Evaluate overall bracket shape (FF composition, champion seed, total upsets). */
function findBracketShape(
	allGames: BracketGame[],
	seedRoundStats: SeedRoundStats,
): { findings: Finding[]; penalty: number } {
	const findings: Finding[] = [];
	let penalty = 0;

	// Final Four composition
	const ffGames = allGames.filter(g => g.round === 5 && g.teamA && g.teamB);
	const ffSeeds: number[] = [];
	for (const g of ffGames) {
		if (g.teamA) ffSeeds.push(g.teamA.seed);
		if (g.teamB) ffSeeds.push(g.teamB.seed);
	}

	if (ffSeeds.length === 4) {
		const oneSeeds = ffSeeds.filter(s => s === 1).length;
		const topFourSeeds = ffSeeds.filter(s => s <= 4).length;
		const highestSeed = Math.max(...ffSeeds);

		if (oneSeeds === 0) {
			findings.push({
				severity: 'mild',
				title: 'No 1-seeds in the Final Four',
				detail: `At least one 1-seed has made the FF in ~78% of tournaments (18 of 23 years). Going without any is a bold call.`,
			});
			penalty += 3;
		} else if (oneSeeds === 4) {
			findings.push({
				severity: 'mild',
				title: 'All four 1-seeds in the Final Four',
				detail: `This has only happened once in 23 tournaments (2008). On average, 1.7 one-seeds make the FF per year.`,
			});
			penalty += 3;
		}

		if (highestSeed >= 11) {
			findings.push({
				severity: 'bold',
				title: `${highestSeed}-seed in the Final Four`,
				detail: highestSeed > 11
					? `The highest seed to ever reach the Final Four is 11. A ${highestSeed}-seed would be unprecedented.`
					: `11-seeds have reached the Final Four 4 times in 23 tournaments (VCU '11, Loyola '18, UCLA '21, NC State '24).`,
			});
			penalty += highestSeed > 11 ? 5 : 3;
		} else if (highestSeed >= 7) {
			findings.push({
				severity: 'mild',
				title: `${highestSeed}-seed in the Final Four`,
				detail: `${highestSeed}-seeds in the Final Four is uncommon but has happened a few times since 2002.`,
			});
			penalty += 2;
		}

		if (topFourSeeds <= 1) {
			findings.push({
				severity: 'bold',
				title: `Only ${topFourSeeds} top-4 seed in the Final Four`,
				detail: `The Final Four averages ~3 teams seeded 1-4 per tournament. Having ${topFourSeeds} would be historically chaotic.`,
			});
			penalty += 4;
		} else if (topFourSeeds === 2) {
			findings.push({
				severity: 'info',
				title: `Only 2 top-4 seeds in the Final Four`,
				detail: `The Final Four averages ~3 teams seeded 1-4 per tournament. A bit of chaos but it happens.`,
			});
			penalty += 1;
		}
	}

	// Champion seed
	const champGame = allGames.find(g => g.round === 6 && g.winner);
	if (champGame && champGame.teamA && champGame.teamB) {
		const champTeam = champGame.teamA.team_key === champGame.winner ? champGame.teamA : champGame.teamB;
		const champSeed = champTeam.seed;

		if (champSeed >= 9) {
			findings.push({
				severity: 'wild',
				title: `${champTeam.short_name} (${champSeed}-seed) wins it all`,
				detail: `No seed higher than 8 has ever won the championship. Lowest champions: 8-seed Villanova (1985), 7-seed UConn (2014).`,
			});
			penalty += 6;
		} else if (champSeed >= 5) {
			findings.push({
				severity: 'mild',
				title: `${champTeam.short_name} (${champSeed}-seed) as champion`,
				detail: `${champSeed}-seeds have won the title — uncommon but possible (UConn 2014 as 7-seed, Butler nearly won as 5/8).`,
			});
			penalty += 1;
		}
	}

	// Total upsets: penalize both extremes
	let totalUpsets = 0;
	for (const game of allGames) {
		if (!game.winner || !game.teamA || !game.teamB) continue;
		const winnerSeed = game.teamA.team_key === game.winner ? game.teamA.seed : game.teamB.seed;
		const loserSeed = game.teamA.team_key === game.winner ? game.teamB.seed : game.teamA.seed;
		if (winnerSeed > loserSeed) totalUpsets++;
	}

	const decidedGames = allGames.filter(g => g.winner && g.teamA && g.teamB).length;
	if (decidedGames >= 32) {
		const HIST_AVG_UPSETS = 20;
		const HIST_MIN_UPSETS = 11;
		const HIST_LOW_UPSETS = 16; // ~1 sigma below average

		if (totalUpsets > 26) {
			findings.push({
				severity: 'mild',
				title: `${totalUpsets} total upsets`,
				detail: `The historical average is ~${HIST_AVG_UPSETS} upsets per tournament (23 years). Your bracket has more chaos than any real tournament.`,
			});
			penalty += Math.min(5, Math.round((totalUpsets - 26) * 1.5));
		} else if (totalUpsets < HIST_MIN_UPSETS) {
			const chalkPenalty = Math.round(20 * Math.pow(1 - totalUpsets / HIST_MIN_UPSETS, 1.5));
			const severity: FindingSeverity = totalUpsets <= 5 ? 'bold' : 'mild';
			findings.push({
				severity,
				title: totalUpsets === 0
					? 'Zero upsets — perfectly chalk'
					: `Only ${totalUpsets} total upsets`,
				detail: totalUpsets === 0
					? `No tournament has ever had zero upsets. Even the chalkiest years (2007, 2025) have ${HIST_MIN_UPSETS}+.`
					: `Very chalk — tournaments average ~${HIST_AVG_UPSETS} upsets. Even the chalkiest years (2007, 2025) have ${HIST_MIN_UPSETS}-12.`,
			});
			penalty += chalkPenalty;
		} else if (totalUpsets < HIST_LOW_UPSETS) {
			// Graduated penalty for below-average upset counts — prevents hill-climb
			// from stripping upsets down to just above the minimum threshold
			const lowPenalty = Math.round((HIST_LOW_UPSETS - totalUpsets) * 0.8);
			findings.push({
				severity: 'info',
				title: `Only ${totalUpsets} total upsets`,
				detail: `Below the historical average of ~${HIST_AVG_UPSETS} per tournament. Most years have at least ${HIST_LOW_UPSETS}.`,
			});
			penalty += lowPenalty;
		}

		// Per-round R64 chalk check: R64 averages ~8.4 upsets, penalize if too few
		const r64Games = allGames.filter(g => g.round === 1 && g.winner && g.teamA && g.teamB);
		if (r64Games.length >= 16) {
			let r64Upsets = 0;
			for (const g of r64Games) {
				const winnerSeed = g.teamA!.team_key === g.winner ? g.teamA!.seed : g.teamB!.seed;
				const loserSeed = g.teamA!.team_key === g.winner ? g.teamB!.seed : g.teamA!.seed;
				if (winnerSeed > loserSeed) r64Upsets++;
			}
			const HIST_R64_LOW = 6; // ~2 sigma below R64 average of 8.4
			if (r64Upsets < HIST_R64_LOW) {
				findings.push({
					severity: 'info',
					title: `Only ${r64Upsets} first-round upsets`,
					detail: `The Round of 64 averages ~8-9 upsets per tournament. Having fewer than ${HIST_R64_LOW} is unusually chalky.`,
				});
				penalty += Math.round((HIST_R64_LOW - r64Upsets) * 1.5);
			}
		}
	}

	return { findings, penalty };
}

/** P(at least k successes in n trials with probability p). */
function binomialProbAtLeast(k: number, n: number, p: number): number {
	let sum = 0;
	for (let i = k; i <= n; i++) {
		sum += comb(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
	}
	return sum;
}

function comb(n: number, k: number): number {
	if (k > n) return 0;
	if (k === 0 || k === n) return 1;
	let result = 1;
	for (let i = 0; i < k; i++) {
		result = result * (n - i) / (i + 1);
	}
	return result;
}
