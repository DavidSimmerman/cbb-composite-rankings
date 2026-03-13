'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import type { BracketPageData, BracketTeamSummary } from '@/lib/rankings/profile';
import {
	initializeBracket,
	pickWinner,
	clearPick,
	autoFillBracket,
	perfectBracket,
	getRegionAssignment,
	type BracketState,
	type BracketGame,
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
	const [bracketState, setBracketState] = useState<BracketState>(() => {
		const saved = typeof window !== 'undefined' ? localStorage.getItem('bracket-state') : null;
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				let state = initializeBracket(data.bracket_teams, parsed.regions);
				// Verify all teams made it into the bracket (stale keys → TBD slots)
				const bracketTeamKeys = new Set(data.bracket_teams.map(t => t.team_key));
				const assignedKeys = new Set<string>();
				for (const game of state.values()) {
					if (game.round === 1) {
						if (game.teamA) assignedKeys.add(game.teamA.team_key);
						if (game.teamB) assignedKeys.add(game.teamB.team_key);
					}
				}
				const missing = [...bracketTeamKeys].filter(k => !assignedKeys.has(k));
				if (missing.length > 0) {
					state = initializeBracket(data.bracket_teams);
				}
				// Restore picks in round order so later rounds have teams propagated
				if (parsed.picks && Object.keys(parsed.picks).length > 0) {
					for (let round = 1; round <= 6; round++) {
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
		return initializeBracket(data.bracket_teams);
	});

	const [predictionCache, setPredictionCache] = useState<Map<string, { probA: number; probB: number }>>(() => {
		try {
			const saved = typeof window !== 'undefined' ? localStorage.getItem('bracket-predictions') : null;
			if (saved) {
				const entries = JSON.parse(saved) as [string, { probA: number; probB: number }][];
				return new Map(entries);
			}
		} catch { /* fall through */ }
		return new Map();
	});
	const [evaluation, setEvaluation] = useState<BracketEvaluation | null>(null);
	const fetchingRef = useRef(new Set<string>());

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

	// Save prediction cache to localStorage
	useEffect(() => {
		if (predictionCache.size > 0) {
			localStorage.setItem('bracket-predictions', JSON.stringify([...predictionCache]));
		}
	}, [predictionCache]);

	// Fetch ML predictions for games that have both teams
	useEffect(() => {
		const controller = new AbortController();

		const fetchPredictions = async () => {
			const gamesToPredict = [...bracketState.values()].filter(
				g => g.teamA && g.teamB && !g.prediction && !predictionCache.has(cacheKey(g.teamA!.team_key, g.teamB!.team_key))
			);

			for (const game of gamesToPredict) {
				if (controller.signal.aborted) break;
				const key = cacheKey(game.teamA!.team_key, game.teamB!.team_key);
				if (fetchingRef.current.has(key)) continue;
				fetchingRef.current.add(key);

				try {
					const res = await fetch(`/api/games/predict?home=${game.teamA!.team_key}&away=${game.teamB!.team_key}`, {
						signal: controller.signal,
					});
					if (res.ok) {
						const pred = await res.json();
						const probA = pred.home?.win_probability ?? 0.5;
						const probB = pred.away?.win_probability ?? 0.5;
						setPredictionCache(prev => {
							const next = new Map(prev);
							next.set(key, { probA, probB });
							return next;
						});
					}
				} catch {
					// Silently fail — predictions are optional / aborted
				} finally {
					fetchingRef.current.delete(key);
				}
			}
		};

		fetchPredictions();
		return () => controller.abort();
	}, [bracketState, predictionCache]);

	/** Merge cached ML predictions into a bracket state snapshot. */
	const mergeWithPredictionCache = useCallback((state: BracketState): BracketState => {
		const merged = new Map(state);
		for (const [id, game] of merged) {
			if (game.teamA && game.teamB && !game.prediction) {
				const key = cacheKey(game.teamA.team_key, game.teamB.team_key);
				const cached = predictionCache.get(key);
				if (cached) {
					merged.set(id, { ...game, prediction: cached });
				}
			}
		}
		return merged;
	}, [predictionCache]);

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
		setBracketState(prev => autoFillBracket(mergeWithPredictionCache(prev), data.seed_round_stats, data.cross_seed_patterns));
	}, [data, mergeWithPredictionCache]);

	const handlePerfect = useCallback(() => {
		setBracketState(prev => perfectBracket(
			mergeWithPredictionCache(prev), data.seed_round_stats, data.cross_seed_patterns,
			(games) => evaluateBracket(games, data.seed_round_stats, data.cross_seed_patterns),
		));
	}, [data, mergeWithPredictionCache]);

	const handleSimulateRound = useCallback((round: number) => {
		setBracketState(prev => autoFillBracket(mergeWithPredictionCache(prev), data.seed_round_stats, data.cross_seed_patterns, { round }));
	}, [data, mergeWithPredictionCache]);

	const handlePerfectRound = useCallback((round: number) => {
		setBracketState(prev => perfectBracket(
			mergeWithPredictionCache(prev), data.seed_round_stats, data.cross_seed_patterns,
			(games) => evaluateBracket(games, data.seed_round_stats, data.cross_seed_patterns),
			{ round },
		));
	}, [data, mergeWithPredictionCache]);

	const handleReset = useCallback(() => {
		setBracketState(prev => {
			const regions = getRegionAssignment(prev);
			return initializeBracket(data.bracket_teams, regions);
		});
	}, [data.bracket_teams]);

	const handleReRandomize = useCallback(() => {
		setBracketState(initializeBracket(data.bracket_teams));
	}, [data.bracket_teams]);

	const handleEvaluate = useCallback(() => {
		const merged = mergeWithPredictionCache(bracketState);
		const result = evaluateBracket([...merged.values()], data.seed_round_stats, data.cross_seed_patterns);
		setEvaluation(result);
	}, [bracketState, mergeWithPredictionCache, data.seed_round_stats, data.cross_seed_patterns]);

	const value = useMemo<BracketContextValue>(() => ({
		data,
		bracketState,
		seedPickCounts,
		totalPicks,
		evaluation,
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
		data, bracketState, seedPickCounts, totalPicks, evaluation,
		handlePickWinner, handleSimulate, handlePerfect,
		handleSimulateRound, handlePerfectRound,
		handleReset, handleReRandomize, handleEvaluate,
		getTeamByKey,
	]);

	return <BracketCtx.Provider value={value}>{children}</BracketCtx.Provider>;
}

function cacheKey(teamA: string, teamB: string): string {
	return `${teamA}-vs-${teamB}`;
}
