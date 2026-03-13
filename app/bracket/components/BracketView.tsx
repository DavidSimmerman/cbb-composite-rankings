'use client';

import type { BracketGame } from '@/lib/bracket/predictions';
import { ROUND_SHORT_NAMES, type Region } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import MatchupCard, { type SeedPickCounts } from './MatchupCard';
import { ChevronDown, Crown, Dices } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface BracketViewProps {
	games: Map<string, BracketGame>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onSimulateRound: (round: number) => void;
	onPerfectRound: (round: number) => void;
}

export default function BracketView({ games, seedPickCounts, seedRoundStats, onPickWinner, onSimulateRound, onPerfectRound }: BracketViewProps) {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[1fr_1fr] w-full h-full p-4 gap-x-2 gap-y-4">
			{/* Top-left: SOUTH (R64 → E8) */}
			<div className="col-start-1 row-start-1">
				<RegionBracket
					region="SOUTH"
					games={games}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onSimulateRound={onSimulateRound}
					onPerfectRound={onPerfectRound}
					direction="ltr"
					showRoundFill
				/>
			</div>

			{/* Bottom-left: EAST (R64 → E8) */}
			<div className="col-start-1 row-start-2">
				<RegionBracket
					region="EAST"
					games={games}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onSimulateRound={onSimulateRound}
					onPerfectRound={onPerfectRound}
					direction="ltr"
					showRoundFill={false}
				/>
			</div>

			{/* Center: Final Four + Championship — spans both rows, centered */}
			<div className="col-start-2 row-start-1 row-span-2 flex flex-col items-center justify-center gap-3 w-56 shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Final Four</span>
					<RoundAutoFillButton round={5} games={games} onSimulateRound={onSimulateRound} onPerfectRound={onPerfectRound} />
				</div>
				<div className="w-44">
					<MatchupCard
						game={games.get('r5-FF-0')!}
						seedPickCounts={seedPickCounts}
						seedRoundStats={seedRoundStats}
						onPickWinner={onPickWinner}
						compact
					/>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground font-semibold uppercase tracking-wide mt-2">Championship</span>
					<RoundAutoFillButton round={6} games={games} onSimulateRound={onSimulateRound} onPerfectRound={onPerfectRound} />
				</div>
				<div className="w-full">
					<MatchupCard
						game={games.get('r6-FF-0')!}
						seedPickCounts={seedPickCounts}
						seedRoundStats={seedRoundStats}
						onPickWinner={onPickWinner}
					/>
				</div>
				<div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-2">Final Four</div>
				<div className="w-44">
					<MatchupCard
						game={games.get('r5-FF-1')!}
						seedPickCounts={seedPickCounts}
						seedRoundStats={seedRoundStats}
						onPickWinner={onPickWinner}
						compact
					/>
				</div>
			</div>

			{/* Top-right: WEST (E8 ← R64) */}
			<div className="col-start-3 row-start-1">
				<RegionBracket
					region="WEST"
					games={games}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onSimulateRound={onSimulateRound}
					onPerfectRound={onPerfectRound}
					direction="rtl"
					showRoundFill
				/>
			</div>

			{/* Bottom-right: MIDWEST (E8 ← R64) */}
			<div className="col-start-3 row-start-2">
				<RegionBracket
					region="MIDWEST"
					games={games}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onSimulateRound={onSimulateRound}
					onPerfectRound={onPerfectRound}
					direction="rtl"
					showRoundFill={false}
				/>
			</div>
		</div>
	);
}

function RoundAutoFillButton({
	round,
	games,
	onSimulateRound,
	onPerfectRound,
}: {
	round: number;
	games: Map<string, BracketGame>;
	onSimulateRound: (round: number) => void;
	onPerfectRound: (round: number) => void;
}) {
	const hasUnfilled = [...games.values()].some(g => g.round === round && g.teamA && g.teamB && !g.winner);
	if (!hasUnfilled) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer">
					<ChevronDown className="size-2.5" />
					Auto-fill
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="center" className="w-52">
				<DropdownMenuItem onClick={() => onSimulateRound(round)} className="cursor-pointer">
					<Dices className="size-3.5 text-blue-400" />
					Simulate {ROUND_SHORT_NAMES[round]}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={() => onPerfectRound(round)} className="cursor-pointer">
					<Crown className="size-3.5 text-amber-500" />
					Perfect {ROUND_SHORT_NAMES[round]}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function RegionBracket({
	region,
	games,
	seedPickCounts,
	seedRoundStats,
	onPickWinner,
	onSimulateRound,
	onPerfectRound,
	direction,
	showRoundFill,
}: {
	region: Region;
	games: Map<string, BracketGame>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onSimulateRound: (round: number) => void;
	onPerfectRound: (round: number) => void;
	direction: 'ltr' | 'rtl';
	showRoundFill: boolean;
}) {
	const rounds = direction === 'ltr' ? [1, 2, 3, 4] : [4, 3, 2, 1];

	return (
		<div className="h-full flex flex-col">
			<div className={`flex items-center gap-2 mb-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{region}</span>
			</div>
			{showRoundFill && (
				<div className="flex items-center gap-1 mb-1">
					{rounds.map(round => (
						<div key={round} className="flex-1 flex justify-center">
							<RoundAutoFillButton round={round} games={games} onSimulateRound={onSimulateRound} onPerfectRound={onPerfectRound} />
						</div>
					))}
				</div>
			)}
			<div className="flex items-stretch gap-1 flex-1">
				{rounds.map(round => {
					const roundGames = [...games.values()]
						.filter(g => g.round === round && g.region === region)
						.sort((a, b) => a.position - b.position);

					const gapClass = round === 1 ? 'gap-1' : round === 2 ? 'gap-3' : round === 3 ? 'gap-8' : 'gap-16';

					return (
						<div key={round} className={`flex flex-col justify-around ${gapClass} flex-1`}>
							{roundGames.map(game => (
								<MatchupCard
									key={game.id}
									game={game}
									seedPickCounts={seedPickCounts}
									seedRoundStats={seedRoundStats}
									onPickWinner={onPickWinner}
									compact
								/>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
