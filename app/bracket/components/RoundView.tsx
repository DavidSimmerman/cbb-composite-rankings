'use client';

import type { BracketGame } from '@/lib/bracket/predictions';
import { ROUND_SHORT_NAMES } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import MatchupCard, { type SeedPickCounts } from './MatchupCard';
import { ChevronDown, ChevronLeft, ChevronRight, Crown, Dices } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface RoundViewProps {
	games: Map<string, BracketGame>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	selectedRound: number;
	onSelectRound: (round: number) => void;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onSimulateRound: (round: number) => void;
	onPerfectRound: (round: number) => void;
}

type SlideDirection = 'left' | 'right' | null;

export default function RoundView({ games, seedPickCounts, seedRoundStats, selectedRound, onSelectRound, onPickWinner, onSimulateRound, onPerfectRound }: RoundViewProps) {
	const rounds = [1, 2, 3, 4, 5, 6];
	const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);
	const prevRoundRef = useRef(selectedRound);

	// Tab bar scroll
	const tabBarRef = useRef<HTMLDivElement>(null);
	const activeTabRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const tab = activeTabRef.current;
		const bar = tabBarRef.current;
		if (!tab || !bar) return;
		const tabCenter = tab.offsetLeft + tab.offsetWidth / 2;
		bar.scrollTo({ left: tabCenter - bar.offsetWidth / 2, behavior: 'smooth' });
	}, [selectedRound]);

	// Track swipe gestures
	const touchStartX = useRef(0);
	const touchStartY = useRef(0);
	const containerRef = useRef<HTMLDivElement>(null);

	const navigateRound = useCallback((direction: 'left' | 'right') => {
		const next = direction === 'left'
			? Math.min(selectedRound + 1, 6)
			: Math.max(selectedRound - 1, 1);
		if (next !== selectedRound) {
			setSlideDirection(direction);
			onSelectRound(next);
		}
	}, [selectedRound, onSelectRound]);

	// Handle swipe
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const onTouchStart = (e: TouchEvent) => {
			touchStartX.current = e.touches[0].clientX;
			touchStartY.current = e.touches[0].clientY;
		};

		const onTouchEnd = (e: TouchEvent) => {
			const dx = e.changedTouches[0].clientX - touchStartX.current;
			const dy = e.changedTouches[0].clientY - touchStartY.current;
			// Require horizontal swipe > 50px and more horizontal than vertical
			if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
				navigateRound(dx < 0 ? 'left' : 'right');
			}
		};

		el.addEventListener('touchstart', onTouchStart, { passive: true });
		el.addEventListener('touchend', onTouchEnd, { passive: true });
		return () => {
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchend', onTouchEnd);
		};
	}, [navigateRound]);

	// Clear slide animation after it plays
	useEffect(() => {
		if (slideDirection) {
			const timer = setTimeout(() => setSlideDirection(null), 300);
			return () => clearTimeout(timer);
		}
	}, [slideDirection]);

	// Set slide direction when round changes from tab click
	useEffect(() => {
		if (prevRoundRef.current !== selectedRound && !slideDirection) {
			setSlideDirection(selectedRound > prevRoundRef.current ? 'left' : 'right');
		}
		prevRoundRef.current = selectedRound;
	}, [selectedRound, slideDirection]);

	// Auto-advance when all games in current round are picked
	const roundGamesAll = [...games.values()].filter(g => g.round === selectedRound);
	const pickedCount = roundGamesAll.filter(g => g.winner).length;
	const pickableCount = roundGamesAll.filter(g => g.teamA && g.teamB).length;
	const allPicked = pickableCount > 0 && pickedCount === pickableCount;
	const prevPickedCount = useRef(pickedCount);
	const prevSelectedRound = useRef(selectedRound);

	useEffect(() => {
		// Reset tracking when round changes (don't auto-advance on navigation)
		if (prevSelectedRound.current !== selectedRound) {
			prevPickedCount.current = pickedCount;
			prevSelectedRound.current = selectedRound;
			return;
		}
		// Only auto-advance when a new pick was just made that completed the round
		if (allPicked && pickedCount > prevPickedCount.current && selectedRound < 6) {
			const timer = setTimeout(() => {
				setSlideDirection('left');
				onSelectRound(selectedRound + 1);
			}, 400);
			prevPickedCount.current = pickedCount;
			return () => clearTimeout(timer);
		}
		prevPickedCount.current = pickedCount;
	}, [allPicked, pickedCount, selectedRound, onSelectRound]);

	const roundGames = roundGamesAll.sort((a, b) => {
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

	// Check if any games in this round have both teams and no winner
	const hasUnfilledGames = roundGames.some(g => g.teamA && g.teamB && !g.winner);

	const slideClass = slideDirection === 'left'
		? 'animate-slide-in-right'
		: slideDirection === 'right'
			? 'animate-slide-in-left'
			: '';

	return (
		<div className="flex flex-col h-full" ref={containerRef}>
			{/* Round selector tabs */}
			<div ref={tabBarRef} className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 overflow-x-auto shrink-0">
				{roundProgress.map(({ round, completed, total }) => (
					<button
						key={round}
						ref={round === selectedRound ? activeTabRef : undefined}
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

			{/* Round auto-fill bar */}
			{hasUnfilledGames && (
				<div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-800/50 shrink-0">
					<span className="text-xs text-muted-foreground">
						{ROUND_SHORT_NAMES[selectedRound]}
					</span>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer">
								<ChevronDown className="size-3" />
								Auto-fill round
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-64">
							<DropdownMenuItem onClick={() => onSimulateRound(selectedRound)} className="flex-col items-start gap-0 py-2 cursor-pointer">
								<div className="flex items-center gap-2 text-sm font-medium">
									<Dices className="size-4 text-blue-400 shrink-0" />
									Simulate
								</div>
								<p className="text-xs text-muted-foreground mt-1 ml-6">
									Randomized using ML predictions and historical patterns.
								</p>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => onPerfectRound(selectedRound)} className="flex-col items-start gap-0 py-2 cursor-pointer">
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
				</div>
			)}

			{/* Games */}
			<div className={`flex-1 overflow-auto p-3 space-y-4 ${slideClass}`}>
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
									seedPickCounts={seedPickCounts}
									seedRoundStats={seedRoundStats}
									onPickWinner={onPickWinner}
								/>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Next/Back navigation */}
			<div className="flex items-center justify-between px-3 py-2 border-t border-neutral-800 shrink-0">
				{selectedRound > 1 ? (
					<button
						onClick={() => navigateRound('right')}
						className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
					>
						<ChevronLeft className="size-4" />
						{ROUND_SHORT_NAMES[selectedRound - 1]}
					</button>
				) : <div />}
				{selectedRound < 6 ? (
					<button
						onClick={() => navigateRound('left')}
						className="flex items-center gap-1 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
					>
						{ROUND_SHORT_NAMES[selectedRound + 1]}
						<ChevronRight className="size-4" />
					</button>
				) : <div />}
			</div>
		</div>
	);
}
