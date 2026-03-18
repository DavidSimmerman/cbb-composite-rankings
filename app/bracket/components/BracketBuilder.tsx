'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useBracket } from '../context/BracketContext';
import {
	ALL_REGIONS,
	ROUND_NAMES,
	type BracketGame,
	type BracketState,
	type BracketTeam,
} from '@/lib/bracket/predictions';
import type { SeedRoundStats, CrossSeedPatterns, BracketPrediction } from '@/lib/rankings/profile';
import { getRankColor } from '@/components/games/TeamComparison';
import { getMarchScoreColor } from '@/components/march/MarchScoreBadge';
import TeamLogo from '@/components/TeamLogo';
import { ChevronLeft, ChevronRight, X, TrendingUp, Zap, Gift, ArrowRightLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';

// ─── Step definitions ───────────────────────────────────────────────────────

interface WizardStep {
	id: string;
	round: number;
	title: string;
	/** R64 seed pair: [higherSeed, lowerSeed] */
	seedPair?: [number, number];
	/** Position index in R64_MATCHUP_ORDER (for R64 steps) */
	positionIndex?: number;
	/** R32 section reference (for R32 sub-steps) */
	r32Section?: R32Section;
	/** S16 section reference (for S16 sub-steps) */
	s16Section?: R32Section;
	/** E8 section reference (for E8 sub-steps) */
	e8Section?: R32Section;
}

/** R64 steps ordered from most predictable to most chaotic */
const R64_WIZARD_ORDER: { seedPair: [number, number]; positionIndex: number; title: string }[] = [
	{ seedPair: [1, 16], positionIndex: 0, title: 'The Near-Certainties' },
	{ seedPair: [2, 15], positionIndex: 7, title: 'Almost as Safe' },
	{ seedPair: [3, 14], positionIndex: 5, title: 'Strong Favorites' },
	{ seedPair: [4, 13], positionIndex: 3, title: 'Watch for Cinderellas' },
	{ seedPair: [5, 12], positionIndex: 2, title: 'The Classic Upset Spot' },
	{ seedPair: [6, 11], positionIndex: 4, title: 'Dangerous Territory' },
	{ seedPair: [7, 10], positionIndex: 6, title: 'Toss-Up Territory' },
	{ seedPair: [8, 9], positionIndex: 1, title: 'The Coin Flips' },
];

const LATER_ROUND_STEPS: { round: number; title: string }[] = [
	{ round: 2, title: 'Round of 32' },
	{ round: 3, title: 'Sweet 16' },
	{ round: 4, title: 'Elite 8' },
	{ round: 5, title: 'Final Four' },
	{ round: 6, title: 'Championship' },
];

function buildSteps(hasFirstFour: boolean, r32Sections: R32Section[], hasValuePicks: boolean, s16Sections: R32Section[], e8Sections: R32Section[]): WizardStep[] {
	const steps: WizardStep[] = [];
	if (hasFirstFour) {
		steps.push({ id: 'first-four', round: 0, title: 'First Four' });
	}
	for (const r64 of R64_WIZARD_ORDER) {
		steps.push({
			id: `r64-${r64.seedPair[0]}v${r64.seedPair[1]}`,
			round: 1,
			title: r64.title,
			seedPair: r64.seedPair,
			positionIndex: r64.positionIndex,
		});
	}
	// R32: one step per section
	for (const section of r32Sections) {
		steps.push({
			id: `r32-${section.label.toLowerCase().replace(/\s+/g, '-')}`,
			round: 2,
			title: section.label,
			r32Section: section,
		});
	}
	// Value picks (conditional)
	if (hasValuePicks) {
		steps.push({ id: 'value-picks', round: -1, title: 'Value Picks' });
	}
	// S16: one step per section
	for (const section of s16Sections) {
		steps.push({
			id: `s16-${section.label.toLowerCase().replace(/\s+/g, '-')}`,
			round: 3,
			title: section.label,
			s16Section: section,
		});
	}
	// E8: one step per section
	for (const section of e8Sections) {
		steps.push({
			id: `e8-${section.label.toLowerCase().replace(/\s+/g, '-')}`,
			round: 4,
			title: section.label,
			e8Section: section,
		});
	}
	// FF + Championship
	for (const lr of LATER_ROUND_STEPS) {
		if (lr.round <= 4) continue;
		steps.push({ id: `round-${lr.round}`, round: lr.round, title: lr.title });
	}
	return steps;
}

// ─── Game grouping ──────────────────────────────────────────────────────────

function getGamesForStep(step: WizardStep, bracketState: BracketState): BracketGame[] {
	if (step.round === 0) {
		return [...bracketState.values()].filter(g => g.round === 0);
	}
	if (step.round === 1 && step.positionIndex !== undefined) {
		return ALL_REGIONS
			.map(r => bracketState.get(`r1-${r}-${step.positionIndex}`))
			.filter((g): g is BracketGame => !!g);
	}
	// R32 section: return games from the section directly (re-fetch from state for freshness)
	if (step.round === 2 && step.r32Section) {
		return step.r32Section.games
			.map(g => bracketState.get(g.id))
			.filter((g): g is BracketGame => !!g);
	}
	// S16 section: return games from the section directly (re-fetch from state for freshness)
	if (step.round === 3 && step.s16Section) {
		return step.s16Section.games
			.map(g => bracketState.get(g.id))
			.filter((g): g is BracketGame => !!g);
	}
	// E8 section: return games from the section directly (re-fetch from state for freshness)
	if (step.round === 4 && step.e8Section) {
		return step.e8Section.games
			.map(g => bracketState.get(g.id))
			.filter((g): g is BracketGame => !!g);
	}
	// FF+: all games for this round, sorted by region then position
	const regionOrder = ['SOUTH', 'EAST', 'WEST', 'MIDWEST', 'FF'];
	return [...bracketState.values()]
		.filter(g => g.round === step.round)
		.sort((a, b) => {
			const ri = regionOrder.indexOf(a.region) - regionOrder.indexOf(b.region);
			return ri !== 0 ? ri : a.position - b.position;
		});
}

// ─── R32 sub-group sections ──────────────────────────────────────────────────

interface R32Section {
	label: string;
	blurb?: string;
	games: BracketGame[];
}

/** Check if an R32 game has a feeder from R64 where the lower seed won (upset). */
function hasR64UpsetFeeder(game: BracketGame, bracketState: BracketState): boolean {
	const feederIds = [
		`r1-${game.region}-${game.position * 2}`,
		`r1-${game.region}-${game.position * 2 + 1}`,
	];
	for (const fid of feederIds) {
		const feeder = bracketState.get(fid);
		if (!feeder?.winner || !feeder.teamA || !feeder.teamB) continue;
		const winner = feeder.teamA.team_key === feeder.winner ? feeder.teamA : feeder.teamB;
		const loser = feeder.teamA.team_key === feeder.winner ? feeder.teamB : feeder.teamA;
		if (winner.seed > loser.seed) return true;
	}
	return false;
}

function getR32Sections(bracketState: BracketState, crossSeedPatterns: CrossSeedPatterns, seedRoundStats: SeedRoundStats): R32Section[] {
	const sections: R32Section[] = [];
	const r32Name = 'Round of 32';

	// Section A: pos 0 across all regions (1 vs 8/9 winner)
	const oneSeedGames = ALL_REGIONS
		.map(r => bracketState.get(`r2-${r}-0`))
		.filter((g): g is BracketGame => !!g);
	if (oneSeedGames.length > 0) {
		const winPct1 = Math.round((seedRoundStats[1]?.[r32Name]?.win_pct ?? 0.92) * 100);
		sections.push({
			label: '1-Seed Matchups',
			blurb: `1-seeds win ${winPct1}% of R32 games. 8 and 9 seeds occasionally pull the upset but it's rare.`,
			games: oneSeedGames,
		});
	}

	// Section B: pos 3 across all regions (2 vs 7/10 winner)
	const twoSeedGames = ALL_REGIONS
		.map(r => bracketState.get(`r2-${r}-3`))
		.filter((g): g is BracketGame => !!g);
	if (twoSeedGames.length > 0) {
		const winPct2 = Math.round((seedRoundStats[2]?.[r32Name]?.win_pct ?? 0.83) * 100);
		const upsetPct = 100 - winPct2;
		sections.push({
			label: '2-Seed Matchups',
			blurb: `2-seeds win ${winPct2}% in the R32, but 7 and 10 seeds pull upsets ${upsetPct}% of the time — about one per tournament.`,
			games: twoSeedGames,
		});
	}

	// Remaining games (pos 1, pos 2) split by R64 upset presence
	const middleGames = ALL_REGIONS
		.flatMap(r => [bracketState.get(`r2-${r}-1`), bracketState.get(`r2-${r}-2`)])
		.filter((g): g is BracketGame => !!g);

	const upsetGames = middleGames.filter(g => hasR64UpsetFeeder(g, bracketState));
	const remainingGames = middleGames.filter(g => !hasR64UpsetFeeder(g, bracketState));

	if (upsetGames.length > 0) {
		// Compute double-digit seeds making S16 average
		let ddSeedS16Avg = 0;
		for (let seed = 10; seed <= 16; seed++) {
			const dist = crossSeedPatterns.distributions[seed]?.['Round of 32'];
			if (dist) ddSeedS16Avg += dist.mean;
		}
		sections.push({
			label: 'Upset Watch',
			blurb: `You picked these upsets — do you want to keep them alive? Historically, ~${ddSeedS16Avg.toFixed(1)} double-digit seeds make the Sweet 16 per tournament.`,
			games: upsetGames,
		});
	}

	if (remainingGames.length > 0) {
		sections.push({ label: 'Remaining Matchups', games: remainingGames });
	}

	return sections;
}

// ─── S16 sub-group sections ─────────────────────────────────────────────────

function getS16Sections(bracketState: BracketState, seedRoundStats: SeedRoundStats, crossSeedPatterns: CrossSeedPatterns): R32Section[] {
	const s16Games = ALL_REGIONS
		.flatMap(r => [bracketState.get(`r3-${r}-0`), bracketState.get(`r3-${r}-1`)])
		.filter((g): g is BracketGame => !!g);

	const sections: R32Section[] = [];
	const s16Name = 'Sweet 16';

	// Section 1: Cinderella Watch — games with any 10+ seed
	const cinderellaGames = s16Games.filter(g =>
		(g.teamA && g.teamA.seed >= 10) || (g.teamB && g.teamB.seed >= 10)
	);
	if (cinderellaGames.length > 0) {
		const ddSeeds = new Set<number>();
		for (const g of cinderellaGames) {
			if (g.teamA && g.teamA.seed >= 10) ddSeeds.add(g.teamA.seed);
			if (g.teamB && g.teamB.seed >= 10) ddSeeds.add(g.teamB.seed);
		}
		const seedStats = [...ddSeeds].sort((a, b) => a - b).map(seed => {
			const pct = Math.round((seedRoundStats[seed]?.[s16Name]?.win_pct ?? 0) * 100);
			return `${seed}-seeds win ${pct}%`;
		}).join(', ');

		// Compute average double-digit seeds making E8 per tournament
		let ddSeedE8Avg = 0;
		for (let seed = 10; seed <= 16; seed++) {
			const dist = crossSeedPatterns.distributions[seed]?.[s16Name];
			if (dist) ddSeedE8Avg += dist.mean;
		}

		sections.push({
			label: 'Cinderella Watch',
			blurb: `Most Cinderella runs end here. ${seedStats} of Sweet 16 games. Only ~${ddSeedE8Avg.toFixed(1)} double-digit seeds make the Elite 8 per tournament.`,
			games: cinderellaGames,
		});
	}

	const remaining = s16Games.filter(g => !cinderellaGames.includes(g));

	// Section 2: 1-Seed Matchups — games with a 1-seed (not already in cinderella)
	const oneSeedGames = remaining.filter(g =>
		(g.teamA?.seed === 1) || (g.teamB?.seed === 1)
	);
	if (oneSeedGames.length > 0) {
		const winPct1 = Math.round((seedRoundStats[1]?.[s16Name]?.win_pct ?? 0) * 100);
		const oppSeeds = new Set<number>();
		for (const g of oneSeedGames) {
			const opp = g.teamA?.seed === 1 ? g.teamB : g.teamA;
			if (opp) oppSeeds.add(opp.seed);
		}
		const oppStats = [...oppSeeds].sort((a, b) => a - b).map(seed => {
			const pct = Math.round((seedRoundStats[seed]?.[s16Name]?.win_pct ?? 0) * 100);
			return `${seed}-seeds win ${pct}%`;
		}).join(', ');

		sections.push({
			label: '1-Seed Matchups',
			blurb: `1-seeds advance to the Elite 8 ${winPct1}% of the time. Their opponents: ${oppStats}.`,
			games: oneSeedGames,
		});
	}

	// Section 3: Remaining Matchups — 2/3-seed games or whatever is left
	const finalRemaining = remaining.filter(g => !oneSeedGames.includes(g));
	if (finalRemaining.length > 0) {
		const seeds = new Set<number>();
		for (const g of finalRemaining) {
			if (g.teamA) seeds.add(g.teamA.seed);
			if (g.teamB) seeds.add(g.teamB.seed);
		}
		const seedFacts = [...seeds].sort((a, b) => a - b).map(seed => {
			const pct = Math.round((seedRoundStats[seed]?.[s16Name]?.win_pct ?? 0) * 100);
			return `${seed}-seeds win ${pct}%`;
		}).join(', ');

		sections.push({
			label: 'Remaining Matchups',
			blurb: `Seed stats in the Sweet 16: ${seedFacts}.`,
			games: finalRemaining,
		});
	}

	return sections;
}

// ─── E8 sub-group sections ──────────────────────────────────────────────────

function getE8Sections(bracketState: BracketState, seedRoundStats: SeedRoundStats, crossSeedPatterns: CrossSeedPatterns): R32Section[] {
	const e8Games = ALL_REGIONS
		.map(r => bracketState.get(`r4-${r}-0`))
		.filter((g): g is BracketGame => !!g);

	const sections: R32Section[] = [];
	const e8Name = 'Elite 8';

	// Section 1: Long Shots — games with any 5+ seed
	const longShotGames = e8Games.filter(g =>
		(g.teamA && g.teamA.seed >= 5) || (g.teamB && g.teamB.seed >= 5)
	);
	if (longShotGames.length > 0) {
		const highSeeds = new Set<number>();
		for (const g of longShotGames) {
			if (g.teamA && g.teamA.seed >= 5) highSeeds.add(g.teamA.seed);
			if (g.teamB && g.teamB.seed >= 5) highSeeds.add(g.teamB.seed);
		}
		const seedStats = [...highSeeds].sort((a, b) => a - b).map(seed => {
			const pct = Math.round((seedRoundStats[seed]?.[e8Name]?.win_pct ?? 0) * 100);
			return `${seed}-seeds win ${pct}%`;
		}).join(', ');

		// Average 5+ seeds making F4 per tournament
		let highSeedF4Avg = 0;
		for (let seed = 5; seed <= 16; seed++) {
			const dist = crossSeedPatterns.distributions[seed]?.[e8Name];
			if (dist) highSeedF4Avg += dist.mean;
		}

		sections.push({
			label: 'Long Shots',
			blurb: `These seeds rarely make the Final Four. ${seedStats} of Elite 8 games. Only ~${highSeedF4Avg.toFixed(1)} seeds 5 or higher make the Final Four per tournament.`,
			games: longShotGames,
		});
	}

	// Section 2: Final Four Picks — remaining games (1-4 seeds)
	const remaining = e8Games.filter(g => !longShotGames.includes(g));
	if (remaining.length > 0) {
		const seeds = new Set<number>();
		for (const g of remaining) {
			if (g.teamA) seeds.add(g.teamA.seed);
			if (g.teamB) seeds.add(g.teamB.seed);
		}
		const seedFacts = [...seeds].sort((a, b) => a - b).map(seed => {
			const pct = Math.round((seedRoundStats[seed]?.[e8Name]?.win_pct ?? 0) * 100);
			return `${seed}-seeds make the Final Four ${pct}% of the time`;
		}).join(', ');

		sections.push({
			label: 'Final Four Picks',
			blurb: `${seedFacts}.`,
			games: remaining,
		});
	}

	return sections;
}

// ─── Value picks ─────────────────────────────────────────────────────────────

interface ValuePick {
	r64Game: BracketGame;
	underdog: BracketTeam;
	r32Game: BracketGame;
	r32Winner: string;
}

function getValuePicks(bracketState: BracketState): ValuePick[] {
	const valuePicks: ValuePick[] = [];
	for (const [, game] of bracketState) {
		if (game.round !== 1 || !game.winner || !game.teamA || !game.teamB) continue;
		const winner = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
		const loser = game.teamA.team_key === game.winner ? game.teamB : game.teamA;
		// Only chalk picks (higher seed won)
		if (winner.seed >= loser.seed) continue;
		// Skip toss-up matchups (8v9, 7v10) — not meaningful upsets to flip
		const seedGap = loser.seed - winner.seed;
		if (seedGap <= 3) continue;

		const r32Id = `r2-${game.region}-${Math.floor(game.position / 2)}`;
		const r32Game = bracketState.get(r32Id);
		if (!r32Game?.winner) continue;

		// Chalk winner must lose in R32
		if (r32Game.winner === winner.team_key) continue;

		valuePicks.push({ r64Game: game, underdog: loser, r32Game, r32Winner: r32Game.winner });
	}
	return valuePicks;
}

// ─── Blurb generation ───────────────────────────────────────────────────────

function generateBlurb(
	step: WizardStep,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
): string {
	if (step.round === 0) {
		return 'These play-in games determine the last teams into the bracket. Winners advance to face a top seed in the Round of 64.';
	}

	if (step.seedPair) {
		const [higher, lower] = step.seedPair;
		const stat = seedRoundStats[higher]?.['Round of 64'];
		if (!stat) return '';
		const winPct = Math.round(stat.win_pct * 100);
		const losePct = 100 - winPct;
		const dist = crossSeedPatterns.distributions[lower]?.['Round of 64'];
		const avgUpsets = dist ? dist.mean.toFixed(1) : '?';

		switch (higher) {
			case 1:
				return `Pick all four 1-seeds. They've won ${winPct}% of the time \u2014 only two 16-seeds have ever won (UMBC in 2018, FDU in 2023).`;
			case 2:
				return `2-seeds win ${winPct}% of the time, but 15-over-2 upsets do happen \u2014 about ${avgUpsets} per tournament on average.`;
			case 3:
				return `3-seeds win ${winPct}% of these games. A 14-seed upset happens roughly every other year.`;
			case 4:
				return `4-seeds win ${winPct}% of the time. 13-seeds pull upsets about ${avgUpsets} times per tournament on average.`;
			case 5:
				return `The famous 5-12 matchup. 12-seeds win ${losePct}% of the time \u2014 at least one 12-over-5 upset happens almost every year (avg ${avgUpsets}).`;
			case 6:
				return `6-seeds win ${winPct}%. 11-seeds, often including play-in winners, upset at a ${losePct}% rate.`;
			case 7:
				return `7-10 games are competitive \u2014 10-seeds win ${losePct}% of the time. Pick at least one upset here.`;
			case 8:
				return `These are essentially coin flips. 8-seeds win ${winPct}% and 9-seeds win ${losePct}%. Go with your gut.`;
			default:
				return `${higher}-seeds win ${winPct}% in the Round of 64.`;
		}
	}

	// Later rounds
	const roundName = ROUND_NAMES[step.round];
	const games = step.round === 2 ? 16 : step.round === 3 ? 8 : step.round === 4 ? 4 : step.round === 5 ? 2 : 1;

	// Compute approximate historical upsets for this round
	let expectedUpsets = 0;
	for (let seed = 1; seed <= 16; seed++) {
		const stat = seedRoundStats[seed]?.[roundName];
		if (stat && stat.win_pct < 1) {
			// Lower seeds winning = upsets, approximate from the less common outcomes
			const dist = crossSeedPatterns.distributions[seed]?.[roundName];
			if (dist) expectedUpsets += (4 - dist.mean);
		}
	}

	if (step.round === 2) {
		return `${games} games to pick. Upsets get harder to predict here since matchups depend on your Round of 64 picks. Historically about ${Math.round(expectedUpsets)} upsets happen in this round.`;
	}
	if (step.round === 3) {
		return `The Sweet 16 is where Cinderella stories usually end. Lower seeds that made it this far face much tougher opponents.`;
	}
	if (step.round === 4) {
		return `The Elite 8 \u2014 one win from the Final Four. Upsets are rare here but do happen.`;
	}
	if (step.round === 5) {
		return `The Final Four. Two games to determine who plays for the championship.`;
	}
	return `Pick your national champion.`;
}

// ─── Upset budget ───────────────────────────────────────────────────────────

interface UpsetBudgetData {
	totalUpsets: number;
	historicalAvg: number;
	historicalStddev: number;
	status: 'low' | 'average' | 'high' | 'extreme';
}

function computeRoundUpsetBudget(
	bracketState: BracketState,
	seedRoundStats: SeedRoundStats,
	crossSeedPatterns: CrossSeedPatterns,
	round: number,
): UpsetBudgetData {
	const roundName = ROUND_NAMES[round];
	const games = [...bracketState.values()].filter(g => g.round === round);

	let totalUpsets = 0;
	for (const game of games) {
		if (!game.winner || !game.teamA || !game.teamB) continue;
		const winner = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
		const loser = game.teamA.team_key === game.winner ? game.teamB : game.teamA;
		if (winner.seed > loser.seed) {
			totalUpsets++;
		} else if (round >= 2 && winner.seed >= 10) {
			// Double-digit seed advancing is an unexpected outcome even if they beat a higher seed number
			totalUpsets++;
		}
	}

	let historicalAvg = 0;
	let varianceSum = 0;

	if (round === 1) {
		for (let seed = 1; seed <= 8; seed++) {
			const dist = crossSeedPatterns.distributions[seed]?.[roundName];
			if (dist) {
				historicalAvg += (4 - dist.mean);
				varianceSum += dist.stddev * dist.stddev;
			}
		}
	} else {
		// Approximate from seed win rates for actual matchups
		for (const game of games) {
			if (!game.teamA || !game.teamB) continue;
			const higherSeed = Math.min(game.teamA.seed, game.teamB.seed);
			const stat = seedRoundStats[higherSeed]?.[roundName];
			if (stat) historicalAvg += (1 - stat.win_pct);
		}
	}

	const historicalStddev = Math.sqrt(varianceSum);

	const status: UpsetBudgetData['status'] =
		totalUpsets <= Math.max(0, historicalAvg - historicalStddev) ? 'low'
			: totalUpsets >= historicalAvg + 2 * historicalStddev ? 'extreme'
				: totalUpsets >= historicalAvg + historicalStddev ? 'high'
					: 'average';

	return { totalUpsets, historicalAvg, historicalStddev, status };
}

// ─── Upset suggestions ──────────────────────────────────────────────────────

interface UpsetSuggestion {
	gameId: string;
	favored: BracketTeam;
	underdog: BracketTeam;
	upsetProb: number;
	reasons: string[];
}

function getUpsetSuggestions(
	games: BracketGame[],
	predictions: Record<string, BracketPrediction>,
): UpsetSuggestion[] {
	const suggestions: UpsetSuggestion[] = [];

	for (const game of games) {
		if (!game.teamA || !game.teamB) continue;
		const favored = game.teamA.seed <= game.teamB.seed ? game.teamA : game.teamB;
		const underdog = game.teamA.seed <= game.teamB.seed ? game.teamB : game.teamA;

		// ML prediction
		const pred = lookupPrediction(predictions, game.teamA.team_key, game.teamB.team_key, game.round);
		const mlUpsetProb = pred
			? (game.teamA.seed <= game.teamB.seed ? pred.prob_b : pred.prob_a)
			: null;

		const reasons: string[] = [];
		if (mlUpsetProb !== null && mlUpsetProb > 0.35) reasons.push('ML model favors the upset');
		if (underdog.march_score - favored.march_score > 10) reasons.push('better tournament profile');
		if (underdog.comp_rank < favored.comp_rank) reasons.push('higher composite rating');

		const upsetProb = mlUpsetProb ?? 0.2;

		suggestions.push({ gameId: game.id, favored, underdog, upsetProb, reasons });
	}

	return suggestions.sort((a, b) => b.upsetProb - a.upsetProb);
}

function lookupPrediction(
	predictions: Record<string, BracketPrediction>,
	teamAKey: string,
	teamBKey: string,
	round: number,
): BracketPrediction | null {
	const [first, second] = [teamAKey, teamBKey].sort();
	const key = `${first}-vs-${second}-r${round}`;
	const pred = predictions[key];
	if (!pred) return null;
	if (first === teamAKey) return pred;
	return {
		prob_a: pred.prob_b, prob_b: pred.prob_a, predicted_margin: -pred.predicted_margin,
		predicted_score_a: pred.predicted_score_b, predicted_score_b: pred.predicted_score_a,
		keys_a: pred.keys_b, keys_b: pred.keys_a,
	};
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function BracketBuilder({ onClose }: { onClose: () => void }) {
	const { bracketState, data, handlePickWinner, handleSwapR64Pick } = useBracket();

	const hasFirstFour = [...bracketState.values()].some(g => g.round === 0);
	const r32Sections = useMemo(
		() => getR32Sections(bracketState, data.cross_seed_patterns, data.seed_round_stats),
		[bracketState, data.cross_seed_patterns, data.seed_round_stats],
	);
	const valuePicks = useMemo(() => getValuePicks(bracketState), [bracketState]);
	const s16Sections = useMemo(
		() => getS16Sections(bracketState, data.seed_round_stats, data.cross_seed_patterns),
		[bracketState, data.seed_round_stats, data.cross_seed_patterns],
	);
	const e8Sections = useMemo(
		() => getE8Sections(bracketState, data.seed_round_stats, data.cross_seed_patterns),
		[bracketState, data.seed_round_stats, data.cross_seed_patterns],
	);
	const steps = useMemo(
		() => buildSteps(hasFirstFour, r32Sections, valuePicks.length > 0, s16Sections, e8Sections),
		[hasFirstFour, r32Sections, valuePicks.length, s16Sections, e8Sections],
	);

	// Start at saved step or first incomplete step
	const [currentStep, setCurrentStep] = useState(() => {
		if (typeof window !== 'undefined') {
			const saved = sessionStorage.getItem('bracket-builder-step');
			if (saved !== null) {
				const parsed = Number(saved);
				if (parsed >= 0 && parsed < steps.length) return parsed;
			}
		}
		for (let i = 0; i < steps.length; i++) {
			const s = steps[i];
			if (s.round === -1) continue; // skip value picks for auto-advance
			const games = getGamesForStep(s, bracketState);
			const allPicked = games.length > 0 && games.every(g => g.winner !== null);
			if (!allPicked) return i;
		}
		return 0;
	});

	useEffect(() => {
		sessionStorage.setItem('bracket-builder-step', String(currentStep));
	}, [currentStep]);

	const step = steps[currentStep];
	const isValuePicksStep = step.round === -1;
	const stepGames = isValuePicksStep ? [] : getGamesForStep(step, bracketState);
	const isStepComplete = isValuePicksStep
		? true // value picks are always skippable
		: stepGames.length > 0 && stepGames.every(g => g.winner !== null);
	const pickedCount = stepGames.filter(g => g.winner !== null).length;

	const upsetBudget = step.round >= 0
		? computeRoundUpsetBudget(bracketState, data.seed_round_stats, data.cross_seed_patterns, step.round)
		: null;

	const blurb = isValuePicksStep ? '' : generateBlurb(step, data.seed_round_stats, data.cross_seed_patterns);

	const handleValueFlip = (r64GameId: string, newWinnerKey: string) => {
		handleSwapR64Pick(r64GameId, newWinnerKey);
	};

	// Upset suggestions for R64 seed groups (higher seed >= 3) and R32 upset watch sections
	const suggestions = useMemo(() => {
		const isR64Upset = step.seedPair && step.seedPair[0] >= 3;
		const isR32UpsetWatch = step.r32Section?.label === 'Upset Watch';
		if (!isR64Upset && !isR32UpsetWatch) return [];
		return getUpsetSuggestions(stepGames, data.predictions);
	}, [step, stepGames, data.predictions]);

	const topSuggestion = suggestions.length > 0 ? suggestions[0] : null;

	// Check if prior round is complete (for R32+ steps)
	const priorRoundComplete = step.round <= 1 || (() => {
		const priorGames = [...bracketState.values()].filter(g => g.round === step.round - 1);
		return priorGames.every(g => g.winner !== null);
	})();

	// Touch swipe for mobile
	const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

	const goNext = () => {
		if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
		else onClose();
	};
	const goPrev = () => {
		if (currentStep > 0) setCurrentStep(s => s - 1);
	};

	const progress = ((currentStep + 1) / steps.length) * 100;

	return (
		<div
			className="flex-1 min-h-0 flex flex-col"
			onTouchStart={e => {
				const t = e.touches[0];
				setTouchStart({ x: t.clientX, y: t.clientY });
			}}
			onTouchEnd={e => {
				if (!touchStart) return;
				const t = e.changedTouches[0];
				const dx = t.clientX - touchStart.x;
				const dy = t.clientY - touchStart.y;
				if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
					if (dx < 0) goNext();
					else goPrev();
				}
				setTouchStart(null);
			}}
		>
			{/* Progress bar */}
			<div className="shrink-0 border-b border-neutral-800 px-4 py-2">
				<div className="flex items-center justify-between mb-1.5">
					<span className="text-sm font-medium">
						Step {currentStep + 1} of {steps.length}
					</span>
					<button
						onClick={onClose}
						className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="size-3" />
						Exit Builder
					</button>
				</div>
				<div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
					<div
						className="h-full bg-violet-500 rounded-full transition-all duration-300"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</div>

			{/* Step content */}
			<div className="flex-1 overflow-auto px-4 py-4">
				<div className="max-w-2xl mx-auto">
					{isValuePicksStep ? (
						<ValuePicksContent
							valuePicks={valuePicks}
							onFlip={handleValueFlip}
							predictions={data.predictions}
							r64UpsetBudget={computeRoundUpsetBudget(bracketState, data.seed_round_stats, data.cross_seed_patterns, 1)}
							bracketState={bracketState}
						/>
					) : (
						<>
							{/* Header */}
							<div className="mb-4">
								{step.seedPair && (
									<div className="text-xs text-violet-400 font-medium mb-1">
										Round of 64 &middot; {step.seedPair[0]} vs {step.seedPair[1]} seeds
									</div>
								)}
								{step.round >= 2 && (
									<div className="text-xs text-violet-400 font-medium mb-1">
										{ROUND_NAMES[step.round]}
									</div>
								)}
								<h2 className="text-xl font-bold">{step.title}</h2>
								{(step.r32Section?.blurb || step.s16Section?.blurb || step.e8Section?.blurb) ? (
									<p className="text-sm text-muted-foreground mt-1">{step.r32Section?.blurb ?? step.s16Section?.blurb ?? step.e8Section?.blurb}</p>
								) : blurb ? (
									<p className="text-sm text-muted-foreground mt-1">{blurb}</p>
								) : null}
							</div>

							{/* Upset budget */}
							{upsetBudget && (
								<UpsetBudgetBar budget={upsetBudget} roundName={ROUND_NAMES[step.round] ?? 'First Four'} />
							)}

							{/* Upset suggestion */}
							{topSuggestion && (
								<div className="border border-amber-800/50 bg-amber-950/30 rounded-lg p-3 mt-3">
									<div className="flex items-center gap-1.5 text-xs font-medium text-amber-400 mb-1">
										<Zap className="size-3.5" />
										Most Likely Upset
									</div>
									<p className="text-sm">
										<span className="font-medium">{topSuggestion.underdog.team_name}</span>
										<span className="text-muted-foreground"> ({topSuggestion.underdog.seed}) over </span>
										<span className="font-medium">{topSuggestion.favored.team_name}</span>
										<span className="text-muted-foreground"> ({topSuggestion.favored.seed})</span>
										<span className="text-muted-foreground"> &mdash; {Math.round(topSuggestion.upsetProb * 100)}% chance</span>
									</p>
									{topSuggestion.reasons.length > 0 && (
										<p className="text-xs text-muted-foreground mt-0.5">
											{topSuggestion.reasons.join(' \u00b7 ')}
										</p>
									)}
								</div>
							)}

							{/* Matchup cards */}
							{step.round > 1 && !priorRoundComplete ? (
								<div className="border border-neutral-800 rounded-lg p-6 mt-4 text-center">
									<p className="text-sm text-muted-foreground mb-3">
										Complete the {ROUND_NAMES[step.round - 1]} first to unlock these matchups.
									</p>
									<button
										onClick={goPrev}
										className="px-4 py-2 rounded-md text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer"
									>
										Go Back
									</button>
								</div>
							) : (
								<div className="space-y-3 mt-4">
									{/* E8+: group by region */}
									{step.round > 2 && !step.s16Section && !step.e8Section && (() => {
										const regionOrder = ['SOUTH', 'EAST', 'WEST', 'MIDWEST', 'FF'];
										const groups: { region: string; games: BracketGame[] }[] = [];
										for (const r of regionOrder) {
											const regionGames = stepGames.filter(g => g.region === r);
											if (regionGames.length > 0) groups.push({ region: r, games: regionGames });
										}
										return groups.map(({ region, games }) => (
											<div key={region}>
												{groups.length > 1 && (
													<div className="text-xs text-muted-foreground font-medium mt-4 mb-2 first:mt-0">
														{region === 'FF' ? 'Final Four' : region}
													</div>
												)}
												<div className="space-y-4">
													{games.map(game => (
														<GameCardWithSwap
															key={game.id}
															game={game}
															bracketState={bracketState}
															onPickWinner={handlePickWinner}
															predictions={data.predictions}
														/>
													))}
												</div>
											</div>
										));
									})()}
									{/* R64 / First Four / R32 / S16 / E8 sections: flat list */}
									{(step.round <= 2 || step.s16Section || step.e8Section) && stepGames.map(game => (
										<GameCardWithSwap
											key={game.id}
											game={game}
											bracketState={bracketState}
											onPickWinner={handlePickWinner}
											predictions={data.predictions}
										/>
									))}
								</div>
							)}

							{/* Step completion indicator */}
							{stepGames.length > 0 && (
								<div className="mt-4 text-center">
									<span className={`text-xs ${isStepComplete ? 'text-green-400' : 'text-muted-foreground'}`}>
										{pickedCount}/{stepGames.length} picked
									</span>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{/* Navigation */}
			<div className="shrink-0 border-t border-neutral-800 px-4 py-3 flex items-center justify-between">
				<button
					onClick={goPrev}
					disabled={currentStep === 0}
					className="flex items-center gap-1 px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
				>
					<ChevronLeft className="size-4" />
					Back
				</button>

				<div className="flex items-center gap-2">
					<button
						onClick={goNext}
						className="flex items-center gap-1 px-4 py-2 rounded-md text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer"
					>
						{currentStep === steps.length - 1 ? 'Finish' : 'Next'}
						<ChevronRight className="size-4" />
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Value Picks content ─────────────────────────────────────────────────────

function ValuePicksContent({
	valuePicks,
	onFlip,
	predictions,
	r64UpsetBudget,
	bracketState,
}: {
	valuePicks: ValuePick[];
	onFlip: (r64GameId: string, newWinnerKey: string) => void;
	predictions: Record<string, BracketPrediction>;
	r64UpsetBudget: UpsetBudgetData;
	bracketState: BracketState;
}) {
	// Capture the initial set of value pick game IDs + their underdog/r32 info on first render
	// so the list order never changes regardless of flips/undos
	const stableEntries = useRef<{ gameId: string; underdogKey: string }[]>(null);
	if (stableEntries.current === null) {
		stableEntries.current = valuePicks.map(vp => ({
			gameId: vp.r64Game.id,
			underdogKey: vp.underdog.team_key,
		}));
	}

	const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());

	if (stableEntries.current.length === 0) {
		return (
			<div className="text-center py-8">
				<Gift className="size-8 text-muted-foreground mx-auto mb-3" />
				<h2 className="text-xl font-bold mb-2">No Value Picks Available</h2>
				<p className="text-sm text-muted-foreground">
					All your chalk picks advance past the Round of 32 — no free upsets to grab here.
				</p>
			</div>
		);
	}

	const handleFlip = (gameId: string, newWinnerKey: string) => {
		setFlippedIds(prev => new Set(prev).add(gameId));
		onFlip(gameId, newWinnerKey);
	};

	const handleUndo = (gameId: string, chalkKey: string) => {
		setFlippedIds(prev => {
			const next = new Set(prev);
			next.delete(gameId);
			return next;
		});
		onFlip(gameId, chalkKey);
	};

	return (
		<>
			<div className="mb-4">
				<div className="text-xs text-violet-400 font-medium mb-1 flex items-center gap-1.5">
					<Gift className="size-3.5" />
					Bonus Step
				</div>
				<h2 className="text-xl font-bold">Value Picks</h2>
				<p className="text-sm text-muted-foreground mt-1">
					You don&apos;t have these teams advancing past the Round of 32 — a low risk way to try and get another upset.
				</p>
			</div>

			<UpsetBudgetBar budget={r64UpsetBudget} roundName="Round of 64" />

			<div className="space-y-4 mt-4">
				{stableEntries.current.map(({ gameId, underdogKey }) => {
					const currentGame = bracketState.get(gameId);
					if (!currentGame?.teamA || !currentGame.teamB) return null;

					const isFlipped = flippedIds.has(gameId);
					const r32Id = `r2-${currentGame.region}-${Math.floor(currentGame.position / 2)}`;
					const r32Game = bracketState.get(r32Id);
					const chalkTeam = currentGame.teamA.seed <= currentGame.teamB.seed ? currentGame.teamA : currentGame.teamB;
					const underdogTeam = currentGame.teamA.seed <= currentGame.teamB.seed ? currentGame.teamB : currentGame.teamA;
					const r32WinnerTeam = r32Game?.winner
						? (r32Game.teamA?.team_key === r32Game.winner ? r32Game.teamA : r32Game.teamB)
						: null;

					if (isFlipped) {
						return (
							<div key={gameId} className="border border-green-800/50 rounded-lg overflow-hidden">
								<BuilderGameCard
									game={currentGame}
									onPickWinner={() => {}}
									predictions={predictions}
								/>
								<div className="border-t border-green-800/50 px-3 py-2.5 flex items-center justify-between bg-green-950/20">
									<p className="text-xs text-green-400">
										Flipped to upset
									</p>
									<button
										onClick={() => handleUndo(gameId, chalkTeam.team_key)}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
									>
										<ArrowRightLeft className="size-3" />
										Undo
									</button>
								</div>
							</div>
						);
					}

					return (
						<div key={gameId} className="border border-neutral-800 rounded-lg overflow-hidden">
							<BuilderGameCard
								game={currentGame}
								onPickWinner={() => {}}
								predictions={predictions}
							/>
							<div className="border-t border-neutral-800 px-3 py-2.5 flex items-center justify-between bg-neutral-900/50">
								<p className="text-xs text-muted-foreground">
									You have {r32WinnerTeam?.short_name ?? 'the other team'} winning in R32 — this team doesn&apos;t go further
								</p>
								<button
									onClick={() => handleFlip(gameId, underdogKey)}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer shrink-0"
								>
									<ArrowRightLeft className="size-3" />
									Flip to {underdogTeam.short_name}
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</>
	);
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const STATUS_COLORS = {
	low: 'text-blue-400',
	average: 'text-green-400',
	high: 'text-yellow-400',
	extreme: 'text-red-400',
} as const;

const STATUS_LABELS = {
	low: 'Chalky',
	average: 'Average',
	high: 'Above Average',
	extreme: 'Very Bold',
} as const;

function UpsetBudgetBar({ budget, roundName }: { budget: UpsetBudgetData; roundName: string }) {
	const { totalUpsets, historicalAvg, historicalStddev } = budget;
	const maxRange = Math.max(Math.ceil(historicalAvg + 2 * historicalStddev), totalUpsets + 1, 6);
	const currentPos = Math.min((totalUpsets / maxRange) * 100, 100);
	const avgPos = Math.min((historicalAvg / maxRange) * 100, 100);

	return (
		<div className="border border-neutral-800 rounded-lg p-3">
			<div className="flex items-center justify-between text-xs mb-2">
				<span className="text-muted-foreground flex items-center gap-1.5">
					<TrendingUp className="size-3" />
					Upset Budget &mdash; {roundName}
				</span>
				<span className={STATUS_COLORS[budget.status]}>
					{totalUpsets} upset{totalUpsets !== 1 ? 's' : ''} &middot; {STATUS_LABELS[budget.status]}
				</span>
			</div>
			<div className="relative h-2 bg-neutral-800 rounded-full">
				<div
					className="absolute h-full bg-violet-500 rounded-full transition-all duration-300"
					style={{ width: `${currentPos}%` }}
				/>
				<div
					className="absolute top-0 h-full w-0.5 bg-green-400/70 rounded-full"
					style={{ left: `${avgPos}%` }}
					title={`Historical avg: ~${historicalAvg.toFixed(1)}`}
				/>
			</div>
			<div className="flex items-center justify-between mt-1">
				<span className="text-[10px] text-muted-foreground">0</span>
				<span className="text-[10px] text-muted-foreground">
					Avg: ~{historicalAvg.toFixed(1)} per tournament
				</span>
				<span className="text-[10px] text-muted-foreground">{maxRange}</span>
			</div>
		</div>
	);
}

// ─── Game card with swap ─────────────────────────────────────────────────────

function GameCardWithSwap({
	game,
	bracketState,
	onPickWinner,
	predictions,
}: {
	game: BracketGame;
	bracketState: BracketState;
	onPickWinner: (gameId: string, teamKey: string) => void;
	predictions: Record<string, BracketPrediction>;
}) {
	const showSwap = game.round > 1 && game.teamA && game.teamB;
	if (!showSwap) {
		return <BuilderGameCard game={game} onPickWinner={onPickWinner} predictions={predictions} />;
	}
	return (
		<div className="border border-neutral-800 rounded-lg overflow-hidden">
			<BuilderGameCard game={game} onPickWinner={onPickWinner} predictions={predictions} noBorder />
			<div className="flex justify-end px-3 py-1.5 border-t border-neutral-800">
				<SwapDialog
					gameId={game.id}
					bracketState={bracketState}
					onPickWinner={onPickWinner}
					predictions={predictions}
				/>
			</div>
		</div>
	);
}

// ─── Swap dialog ─────────────────────────────────────────────────────────────

function getFeederGameIds(gameId: string): [string, string] | null {
	const [roundStr, region, posStr] = gameId.split('-');
	const round = parseInt(roundStr.slice(1));
	const pos = parseInt(posStr);
	if (round <= 1) return null;

	if (round <= 4) {
		return [`r${round - 1}-${region}-${pos * 2}`, `r${round - 1}-${region}-${pos * 2 + 1}`];
	}
	if (round === 5) {
		const regions = pos === 0 ? ['SOUTH', 'EAST'] : ['WEST', 'MIDWEST'];
		return [`r4-${regions[0]}-0`, `r4-${regions[1]}-0`];
	}
	if (round === 6) {
		return ['r5-FF-0', 'r5-FF-1'];
	}
	return null;
}

function SwapDialog({
	gameId,
	bracketState,
	onPickWinner,
	predictions,
}: {
	gameId: string;
	bracketState: BracketState;
	onPickWinner: (gameId: string, teamKey: string) => void;
	predictions: Record<string, BracketPrediction>;
}) {
	const [open, setOpen] = useState(false);
	const feederIds = getFeederGameIds(gameId);
	if (!feederIds) return null;

	const [feederA, feederB] = feederIds;
	const gameA = bracketState.get(feederA);
	const gameB = bracketState.get(feederB);
	if (!gameA || !gameB) return null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
					<ArrowRightLeft className="size-3" />
					Swap
				</button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Change Previous Round Picks</DialogTitle>
					<DialogDescription>
						Pick different winners from the previous round to change this matchup.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 mt-2">
					<BuilderGameCard game={gameA} onPickWinner={onPickWinner} predictions={predictions} />
					<BuilderGameCard game={gameB} onPickWinner={onPickWinner} predictions={predictions} />
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ─── Builder game card ──────────────────────────────────────────────────────

function getVisibleColor(team: BracketTeam): string {
	const hex = team.color;
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance < 0.15 ? team.secondary_color : hex;
}

function BuilderGameCard({
	game,
	onPickWinner,
	predictions,
	noBorder,
}: {
	game: BracketGame;
	onPickWinner: (gameId: string, teamKey: string) => void;
	predictions: Record<string, BracketPrediction>;
	noBorder?: boolean;
}) {
	const { teamA, teamB, winner } = game;
	if (!teamA || !teamB) {
		return (
			<div className="border border-neutral-800 rounded-lg p-4 opacity-40">
				<div className="text-sm text-muted-foreground text-center">TBD</div>
			</div>
		);
	}

	const pred = lookupPrediction(predictions, teamA.team_key, teamB.team_key, game.round);
	const colorA = getVisibleColor(teamA);
	const colorB = getVisibleColor(teamB);

	return (
		<div className={noBorder ? '' : 'border border-neutral-800 rounded-lg overflow-hidden'}>
			<div className="grid grid-cols-[1fr_auto_1fr]">
				{/* Team A column */}
				<button
					onClick={() => onPickWinner(game.id, teamA.team_key)}
					className={`flex flex-col gap-2 p-3 transition-all cursor-pointer ${
						winner === teamA.team_key
							? ''
							: winner === teamB.team_key
								? 'opacity-35'
								: 'hover:bg-neutral-800/50'
					}`}
					style={winner === teamA.team_key ? {
						backgroundColor: `#${colorA}20`,
						borderLeft: `3px solid #${colorA}`,
					} : undefined}
				>
					{/* Team identity */}
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground tabular-nums w-4 text-right shrink-0">
							{teamA.seed}
						</span>
						<TeamLogo teamKey={teamA.team_key} size={40} className="size-6" />
						<span className="text-sm font-medium truncate">{teamA.short_name}</span>
					</div>
					{/* Stats */}
					<div className="flex flex-wrap gap-x-2 gap-y-1 ml-1">
						<TeamStatBadge label="Rank" value={`#${teamA.comp_rank}`} color={getRankColor(teamA.comp_rank)} isBetter={teamA.comp_rank < teamB.comp_rank} />
						<TeamStatBadge label="Off" value={`#${teamA.comp_off_rank}`} color={getRankColor(teamA.comp_off_rank)} isBetter={teamA.comp_off_rank < teamB.comp_off_rank} />
						<TeamStatBadge label="Def" value={`#${teamA.comp_def_rank}`} color={getRankColor(teamA.comp_def_rank)} isBetter={teamA.comp_def_rank < teamB.comp_def_rank} />
						<TeamStatBadge label="March" value={`${Math.round(teamA.march_score)}`} color={getMarchScoreColor(teamA.march_score)} isBetter={teamA.march_score > teamB.march_score} />
						{pred && <TeamStatBadge label="Win" value={`${Math.round(pred.prob_a * 100)}%`} isBetter={pred.prob_a > pred.prob_b} />}
					</div>
				</button>

				{/* VS divider */}
				<div className="flex flex-col items-center justify-center px-2 text-xs text-muted-foreground border-x border-neutral-800 gap-2">
					<span>vs</span>
					<Link
						href={`/bracket/${game.id}`}
						className="text-neutral-500 hover:text-neutral-300 transition-colors"
						onClick={(e: React.MouseEvent) => e.stopPropagation()}
					>
						<Eye className="size-3.5" />
					</Link>
				</div>

				{/* Team B column */}
				<button
					onClick={() => onPickWinner(game.id, teamB.team_key)}
					className={`flex flex-col gap-2 p-3 transition-all cursor-pointer items-end ${
						winner === teamB.team_key
							? ''
							: winner === teamA.team_key
								? 'opacity-35'
								: 'hover:bg-neutral-800/50'
					}`}
					style={winner === teamB.team_key ? {
						backgroundColor: `#${colorB}20`,
						borderRight: `3px solid #${colorB}`,
					} : undefined}
				>
					{/* Team identity */}
					<div className="flex items-center gap-2 flex-row-reverse">
						<span className="text-xs text-muted-foreground tabular-nums w-4 text-left shrink-0">
							{teamB.seed}
						</span>
						<TeamLogo teamKey={teamB.team_key} size={40} className="size-6" />
						<span className="text-sm font-medium truncate">{teamB.short_name}</span>
					</div>
					{/* Stats */}
					<div className="flex flex-wrap gap-x-2 gap-y-1 mr-1 justify-end">
						<TeamStatBadge label="Rank" value={`#${teamB.comp_rank}`} color={getRankColor(teamB.comp_rank)} isBetter={teamB.comp_rank < teamA.comp_rank} />
						<TeamStatBadge label="Off" value={`#${teamB.comp_off_rank}`} color={getRankColor(teamB.comp_off_rank)} isBetter={teamB.comp_off_rank < teamA.comp_off_rank} />
						<TeamStatBadge label="Def" value={`#${teamB.comp_def_rank}`} color={getRankColor(teamB.comp_def_rank)} isBetter={teamB.comp_def_rank < teamA.comp_def_rank} />
						<TeamStatBadge label="March" value={`${Math.round(teamB.march_score)}`} color={getMarchScoreColor(teamB.march_score)} isBetter={teamB.march_score > teamA.march_score} />
						{pred && <TeamStatBadge label="Win" value={`${Math.round(pred.prob_b * 100)}%`} isBetter={pred.prob_b > pred.prob_a} />}
					</div>
				</button>
			</div>
		</div>
	);
}

function TeamStatBadge({ label, value, color, isBetter }: { label: string; value: string; color?: string; isBetter: boolean }) {
	return (
		<span className="text-[10px] tabular-nums">
			<span className="text-neutral-500">{label} </span>
			<span
				className={isBetter ? 'font-semibold' : 'text-neutral-400'}
				style={color ? { color } : undefined}
			>
				{value}
			</span>
		</span>
	);
}
