'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import type { BracketPageData, BracketPrediction, BracketTeamSummary } from '@/lib/rankings/profile';
import {
	initializeBracket,
	pickWinner,
	clearPick,
	autoFillBracket,
	perfectBracket,
	getRegionAssignment,
	type BracketState,
} from '@/lib/bracket/predictions';
import { evaluateBracket, type BracketEvaluation } from '@/lib/bracket/evaluation';

interface BracketContextValue {
	// Data from server
	data: BracketPageData;

	// Bracket state
	bracketState: BracketState;
	seedPickCounts: Record<string, number>;
	totalPicks: number;
	evaluation: BracketEvaluation | null;
	/** True when using real tournament bracket data (fixed regions) */
	hasRealRegions: boolean;

	// Actions
	handlePickWinner: (gameId: string, teamKey: string) => void;
	handleSimulate: () => void;
	handlePerfect: () => void;
	handleSimulateRound: (round: number) => void;
	handlePerfectRound: (round: number) => void;
	handleReset: () => void;
	handleReRandomize: () => void;
	handleEvaluate: () => void;
	setEvaluation: (e: BracketEvaluation | null) => void;

	// Helpers
	getTeamByKey: (teamKey: string) => BracketTeamSummary | undefined;
}

const BracketCtx = createContext<BracketContextValue | null>(null);

export function useBracket() {
	const ctx = useContext(BracketCtx);
	if (!ctx) throw new Error('useBracket must be used within BracketProvider');
	return ctx;
}

export function BracketProvider({ data, children }: { data: BracketPageData; children: ReactNode }) {
	// Check if teams have real region assignments (from tournament_games)
	const hasRealRegions = data.bracket_teams.some(t => t.region && ['SOUTH', 'EAST', 'WEST', 'MIDWEST'].includes(t.region));

	const firstFourGames = data.first_four_games;

	const [bracketState, setBracketState] = useState<BracketState>(() => {
		const saved = typeof window !== 'undefined' ? localStorage.getItem('bracket-state') : null;
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				// With real regions, don't use saved region assignments — always use tournament data
				let state = initializeBracket(data.bracket_teams, hasRealRegions ? undefined : parsed.regions, firstFourGames);
				// Verify all teams made it into the bracket (stale keys → TBD slots)
				const bracketTeamKeys = new Set(data.bracket_teams.filter(t => t.region && ['SOUTH', 'EAST', 'WEST', 'MIDWEST'].includes(t.region)).map(t => t.team_key));
				const assignedKeys = new Set<string>();
				for (const game of state.values()) {
					if (game.round === 1) {
						if (game.teamA) assignedKeys.add(game.teamA.team_key);
						if (game.teamB) assignedKeys.add(game.teamB.team_key);
					}
				}
				const missing = [...bracketTeamKeys].filter(k => !assignedKeys.has(k));
				if (missing.length > 0) {
					state = initializeBracket(data.bracket_teams, undefined, firstFourGames);
				}
				// Restore picks in round order so later rounds have teams propagated
				if (parsed.picks && Object.keys(parsed.picks).length > 0) {
					for (let round = 0; round <= 6; round++) {
						const roundPicks = Object.entries(parsed.picks as Record<string, { winner: string; isManual: boolean }>)
							.filter(([id]) => {
								const game = state.get(id);
								return game?.round === round;
							});
						for (const [id, { winner, isManual }] of roundPicks) {
							const game = state.get(id);
							if (game?.teamA && game?.teamB &&
								(game.teamA.team_key === winner || game.teamB.team_key === winner)) {
								state = pickWinner(state, id, winner, isManual);
							}
						}
					}
				}
				return state;
			} catch { /* fall through */ }
		}
		return initializeBracket(data.bracket_teams, undefined, firstFourGames);
	});

	const [evaluation, setEvaluation] = useState<BracketEvaluation | null>(null);

	// Team lookup map
	const teamMap = useMemo(() => {
		const map = new Map<string, BracketTeamSummary>();
		for (const t of data.bracket_teams) map.set(t.team_key, t);
		return map;
	}, [data.bracket_teams]);

	const getTeamByKey = useCallback((teamKey: string) => teamMap.get(teamKey), [teamMap]);

	// Save bracket state to localStorage
	useEffect(() => {
		const regions = getRegionAssignment(bracketState);
		const picks: Record<string, { winner: string; isManual: boolean }> = {};
		for (const [id, game] of bracketState) {
			if (game.winner) {
				picks[id] = { winner: game.winner, isManual: game.isManualPick };
			}
		}
		localStorage.setItem('bracket-state', JSON.stringify({ regions, picks }));
	}, [bracketState]);


	/** Merge pre-calculated ML predictions into a bracket state snapshot. */
	const mergeWithPredictions = useCallback((state: BracketState): BracketState => {
		const merged = new Map(state);
		for (const [id, game] of merged) {
			if (game.teamA && game.teamB && !game.prediction) {
				const pred = lookupPrediction(data.predictions, game.teamA.team_key, game.teamB.team_key, game.round);
				if (pred) {
					merged.set(id, { ...game, prediction: { probA: pred.prob_a, probB: pred.prob_b } });
				}
			}
		}
		return merged;
	}, [data.predictions]);

	// Count total picks
	const totalPicks = useMemo(() => {
		return [...bracketState.values()].filter(g => g.winner).length;
	}, [bracketState]);

	// Compute seed pick counts
	const seedPickCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		for (const game of bracketState.values()) {
			if (!game.winner || !game.teamA || !game.teamB) continue;
			const winnerTeam = game.teamA.team_key === game.winner ? game.teamA : game.teamB;
			const key = `${winnerTeam.seed}-${game.round}`;
			counts[key] = (counts[key] ?? 0) + 1;
		}
		return counts;
	}, [bracketState]);

	// Close evaluation when bracket changes
	useEffect(() => {
		setEvaluation(null);
	}, [bracketState]);

	// Handlers
	const handlePickWinner = useCallback((gameId: string, teamKey: string) => {
		setBracketState(prev => {
			const game = prev.get(gameId);
			if (!game) return prev;
			if (game.winner === teamKey) return clearPick(prev, gameId);
			if (game.winner) {
				const cleared = clearPick(prev, gameId);
				return pickWinner(cleared, gameId, teamKey, true);
			}
			return pickWinner(prev, gameId, teamKey, true);
		});
	}, []);

	const handleSimulate = useCallback(() => {
		setBracketState(prev => autoFillBracket(mergeWithPredictions(prev), data.seed_round_stats, data.cross_seed_patterns));
	}, [data, mergeWithPredictions]);

	const handlePerfect = useCallback(() => {
		setBracketState(prev => perfectBracket(
			mergeWithPredictions(prev), data.seed_round_stats, data.cross_seed_patterns,
			(games) => evaluateBracket(games, data.seed_round_stats, data.cross_seed_patterns),
		));
	}, [data, mergeWithPredictions]);

	const handleSimulateRound = useCallback((round: number) => {
		setBracketState(prev => autoFillBracket(mergeWithPredictions(prev), data.seed_round_stats, data.cross_seed_patterns, { round }));
	}, [data, mergeWithPredictions]);

	const handlePerfectRound = useCallback((round: number) => {
		setBracketState(prev => perfectBracket(
			mergeWithPredictions(prev), data.seed_round_stats, data.cross_seed_patterns,
			(games) => evaluateBracket(games, data.seed_round_stats, data.cross_seed_patterns),
			{ round },
		));
	}, [data, mergeWithPredictions]);

	const handleReset = useCallback(() => {
		setBracketState(prev => {
			const regions = getRegionAssignment(prev);
			return initializeBracket(data.bracket_teams, regions, firstFourGames);
		});
	}, [data.bracket_teams, firstFourGames]);

	const handleReRandomize = useCallback(() => {
		setBracketState(initializeBracket(data.bracket_teams, undefined, firstFourGames));
	}, [data.bracket_teams, firstFourGames]);

	const handleEvaluate = useCallback(() => {
		const merged = mergeWithPredictions(bracketState);
		const result = evaluateBracket([...merged.values()], data.seed_round_stats, data.cross_seed_patterns);
		setEvaluation(result);
	}, [bracketState, mergeWithPredictions, data.seed_round_stats, data.cross_seed_patterns]);

	const value = useMemo<BracketContextValue>(() => ({
		data,
		bracketState,
		seedPickCounts,
		totalPicks,
		evaluation,
		hasRealRegions,
		handlePickWinner,
		handleSimulate,
		handlePerfect,
		handleSimulateRound,
		handlePerfectRound,
		handleReset,
		handleReRandomize,
		handleEvaluate,
		setEvaluation,
		getTeamByKey,
	}), [
		data, bracketState, seedPickCounts, totalPicks, evaluation, hasRealRegions,
		handlePickWinner, handleSimulate, handlePerfect,
		handleSimulateRound, handlePerfectRound,
		handleReset, handleReRandomize, handleEvaluate,
		getTeamByKey,
	]);

	return <BracketCtx.Provider value={value}>{children}</BracketCtx.Provider>;
}

/** Look up a pre-calculated prediction by team keys and round. */
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
	// If teamA is the alphabetically-first team, prob_a matches; otherwise flip
	if (first === teamAKey) return pred;
	return {
		prob_a: pred.prob_b, prob_b: pred.prob_a, predicted_margin: -pred.predicted_margin,
		predicted_score_a: pred.predicted_score_b, predicted_score_b: pred.predicted_score_a,
		keys_a: pred.keys_b, keys_b: pred.keys_a,
	};
}
