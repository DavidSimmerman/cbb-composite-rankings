'use client';

import { useBracket } from '../context/BracketContext';
import BracketView from './BracketView';
import RoundView from './RoundView';
import EvaluationPanel from './EvaluationPanel';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, RotateCcw, ClipboardCheck, Crown, Dices, Wand2 } from 'lucide-react';
import BracketBuilder from './BracketBuilder';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export default function BracketClient() {
	const {
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
		handleEvaluate,
		setEvaluation,
	} = useBracket();

	const [showBuilder, setShowBuilder] = useState(() => {
		if (typeof window !== 'undefined') return sessionStorage.getItem('bracket-builder') === 'true';
		return false;
	});
	useEffect(() => {
		sessionStorage.setItem('bracket-builder', String(showBuilder));
	}, [showBuilder]);

	const hasFirstFour = [...bracketState.values()].some(g => g.round === 0);
	const [selectedRound, setSelectedRound] = useState(() => {
		if (typeof window !== 'undefined') {
			const saved = sessionStorage.getItem('bracket-round');
			if (saved !== null) {
				const parsed = Number(saved);
				if (parsed >= 0 && parsed <= 6) return parsed;
			}
		}
		return hasFirstFour ? 0 : 1;
	});

	useEffect(() => {
		sessionStorage.setItem('bracket-round', String(selectedRound));
	}, [selectedRound]);
	const prevTotalPicks = useRef(totalPicks);
	const maxPicks = 63 + [...bracketState.values()].filter(g => g.round === 0).length;

	// Jump to championship on full-bracket auto-fill
	useEffect(() => {
		if (totalPicks === maxPicks && prevTotalPicks.current < maxPicks) {
			setSelectedRound(6);
		}
		prevTotalPicks.current = totalPicks;
	}, [totalPicks, maxPicks]);

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar (hidden when builder is active) */}
			{!showBuilder && <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800 shrink-0 flex-wrap">
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
					onClick={() => setShowBuilder(true)}
					className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer"
				>
					<Wand2 className="size-3.5" />
					Bracket Builder
				</button>

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
					<div className="ml-auto flex items-center gap-3">
					<span className="text-xs text-muted-foreground">
						{totalPicks}/{maxPicks} picks
					</span>
				</div>
			</div>}

			{/* Evaluation panel */}
			{evaluation && (
				<div className="px-3 py-2 shrink-0">
					<EvaluationPanel
						evaluation={evaluation}
						onClose={() => setEvaluation(null)}
					/>
				</div>
			)}

			{showBuilder ? (
				<BracketBuilder onClose={() => {
					setShowBuilder(false);
					sessionStorage.removeItem('bracket-builder-step');
				}} />
			) : (
				<>
					{/* Desktop bracket view */}
					<div className="hidden md:flex flex-1 min-h-0 overflow-auto">
						<BracketView
							games={bracketState}
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
							games={bracketState}
							seedPickCounts={seedPickCounts}
							seedRoundStats={data.seed_round_stats}
							selectedRound={selectedRound}
							onSelectRound={setSelectedRound}
							onPickWinner={handlePickWinner}
							onSimulateRound={handleSimulateRound}
							onPerfectRound={handlePerfectRound}
						/>
					</div>
				</>
			)}
		</div>
	);
}
