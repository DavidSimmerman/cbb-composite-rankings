'use client';

import type { BracketPageData } from '@/lib/rankings/profile';
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
import BracketView from './BracketView';
import RoundView from './RoundView';
import EvaluationPanel from './EvaluationPanel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, Shuffle, ClipboardCheck, Crown, Dices } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BracketClientProps {
	data: BracketPageData;
}

export default function BracketClient({ data }: BracketClientProps) {
	const [bracketState, setBracketState] = useState<BracketState>(() => {
		// Try to restore from localStorage
		const saved = typeof window !== 'undefined' ? localStorage.getItem('bracket-state') : null;
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				return initializeBracket(data.bracket_teams, parsed.regions);
			} catch { /* fall through */ }
		}
		return initializeBracket(data.bracket_teams);
	});

	const [selectedRound, setSelectedRound] = useState(1);
	const [predictionCache, setPredictionCache] = useState<Map<string, { probA: number; probB: number }>>(new Map());
	const [evaluation, setEvaluation] = useState<BracketEvaluation | null>(null);
	const fetchingRef = useRef(new Set<string>());

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

	// Restore picks from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem('bracket-state');
		if (!saved) return;
		try {
			const { picks } = JSON.parse(saved);
			if (!picks || Object.keys(picks).length === 0) return;

			setBracketState(prev => {
				let state = new Map(prev);
				// Apply picks in round order
				for (let round = 1; round <= 6; round++) {
					const roundPicks = Object.entries(picks as Record<string, { winner: string; isManual: boolean }>)
						.filter(([id]) => {
							const game = state.get(id);
							return game?.round === round;
						});
					for (const [id, { winner, isManual }] of roundPicks) {
						const game = state.get(id);
						if (game?.teamA && game?.teamB) {
							state = pickWinner(state, id, winner, isManual);
						}
					}
				}
				return state;
			});
		} catch { /* ignore */ }
	}, []);

	// Fetch ML predictions for games that have both teams
	useEffect(() => {
		const fetchPredictions = async () => {
			const gamesToPredict = [...bracketState.values()].filter(
				g => g.teamA && g.teamB && !g.prediction && !predictionCache.has(cacheKey(g.teamA!.team_key, g.teamB!.team_key))
			);

			for (const game of gamesToPredict) {
				const key = cacheKey(game.teamA!.team_key, game.teamB!.team_key);
				if (fetchingRef.current.has(key)) continue;
				fetchingRef.current.add(key);

				try {
					const res = await fetch(`/api/games/predict?home=${game.teamA!.team_key}&away=${game.teamB!.team_key}`);
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
					// Silently fail — predictions are optional
				} finally {
					fetchingRef.current.delete(key);
				}
			}
		};

		fetchPredictions();
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

	// Merge predictions into bracket state
	const gamesWithPredictions = useMemo(() => {
		return mergeWithPredictionCache(bracketState);
	}, [bracketState, mergeWithPredictionCache]);

	// Count total picks
	const totalPicks = useMemo(() => {
		return [...bracketState.values()].filter(g => g.winner).length;
	}, [bracketState]);

	// Compute seed pick counts: how many of each seed are picked to win each round
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

			// If clicking the current winner, clear the pick
			if (game.winner === teamKey) {
				return clearPick(prev, gameId);
			}

			// If changing pick, clear old one first then set new
			if (game.winner) {
				const cleared = clearPick(prev, gameId);
				return pickWinner(cleared, gameId, teamKey, true);
			}

			return pickWinner(prev, gameId, teamKey, true);
		});
	}, []);

	const handleSimulate = useCallback(() => {
		setBracketState(prev => {
			return autoFillBracket(
				mergeWithPredictionCache(prev),
				data.seed_round_stats,
				data.cross_seed_patterns,
			);
		});
	}, [data, mergeWithPredictionCache]);

	const handlePerfect = useCallback(() => {
		setBracketState(prev => {
			return perfectBracket(
				mergeWithPredictionCache(prev),
				data.seed_round_stats,
				data.cross_seed_patterns,
				(games) => evaluateBracket(games, data.seed_round_stats, data.cross_seed_patterns),
			);
		});
	}, [data, mergeWithPredictionCache]);

	const handleSimulateRound = useCallback((round: number) => {
		setBracketState(prev => {
			return autoFillBracket(
				mergeWithPredictionCache(prev),
				data.seed_round_stats,
				data.cross_seed_patterns,
				{ round },
			);
		});
	}, [data, mergeWithPredictionCache]);

	const handlePerfectRound = useCallback((round: number) => {
		setBracketState(prev => {
			return perfectBracket(
				mergeWithPredictionCache(prev),
				data.seed_round_stats,
				data.cross_seed_patterns,
				(games) => evaluateBracket(games, data.seed_round_stats, data.cross_seed_patterns),
				{ round },
			);
		});
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
		const result = evaluateBracket(
			[...gamesWithPredictions.values()],
			data.seed_round_stats,
			data.cross_seed_patterns,
		);
		setEvaluation(result);
	}, [gamesWithPredictions, data.seed_round_stats, data.cross_seed_patterns]);

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 shrink-0 flex-wrap">
				{/* Auto-fill dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-accent hover:bg-accent/80 text-accent-foreground transition-colors cursor-pointer">
							<ChevronDown className="size-3.5" />
							Auto-fill
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-72">
						<DropdownMenuItem onClick={handleSimulate} className="flex-col items-start gap-0 py-2.5 cursor-pointer">
							<div className="flex items-center gap-2 text-sm font-medium">
								<Dices className="size-4 text-blue-400 shrink-0" />
								Simulate
							</div>
							<p className="text-xs text-muted-foreground mt-1 ml-6">
								Randomized bracket using ML predictions, team ratings, and historical seed patterns.
							</p>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handlePerfect} className="flex-col items-start gap-0 py-2.5 cursor-pointer">
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

				<button
					onClick={handleEvaluate}
					disabled={totalPicks < 10}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
				>
					<ClipboardCheck className="size-3.5" />
					Evaluate
				</button>
				<button
					onClick={handleReset}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
				>
					<RotateCcw className="size-3.5" />
					Reset
				</button>
				<button
					onClick={handleReRandomize}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
				>
					<Shuffle className="size-3.5" />
					Re-randomize
				</button>

				<div className="ml-auto flex items-center gap-3">
					<span className="text-xs text-muted-foreground">
						{totalPicks}/63 picks
					</span>
				</div>
			</div>

			{/* Evaluation panel */}
			{evaluation && (
				<div className="px-3 py-2 shrink-0">
					<EvaluationPanel
						evaluation={evaluation}
						onClose={() => setEvaluation(null)}
					/>
				</div>
			)}

			{/* Desktop bracket view */}
			<div className="hidden md:flex flex-1 min-h-0 overflow-auto">
				<BracketView
					games={gamesWithPredictions}
					seedPickCounts={seedPickCounts}
					seedRoundStats={data.seed_round_stats}
					onPickWinner={handlePickWinner}
					onSimulateRound={handleSimulateRound}
					onPerfectRound={handlePerfectRound}
				/>
			</div>

			{/* Mobile round view */}
			<div className="md:hidden flex-1 min-h-0">
				<RoundView
					games={gamesWithPredictions}
					seedPickCounts={seedPickCounts}
					seedRoundStats={data.seed_round_stats}
					selectedRound={selectedRound}
					onSelectRound={setSelectedRound}
					onPickWinner={handlePickWinner}
					onSimulateRound={handleSimulateRound}
					onPerfectRound={handlePerfectRound}
				/>
			</div>
		</div>
	);
}

/** Cache key preserves team order so probA/probB map to the correct teams. */
function cacheKey(teamA: string, teamB: string): string {
	return `${teamA}-vs-${teamB}`;
}
