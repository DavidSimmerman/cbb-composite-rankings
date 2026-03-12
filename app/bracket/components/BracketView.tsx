'use client';

import type { BracketGame } from '@/lib/bracket/predictions';
import { type Region } from '@/lib/bracket/predictions';
import type { SeedRoundStats } from '@/lib/rankings/profile';
import type { Warning } from '@/lib/bracket/warnings';
import MatchupCard, { type SeedPickCounts } from './MatchupCard';

interface BracketViewProps {
	games: Map<string, BracketGame>;
	gameWarnings: Map<string, Warning>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onAutoFill: (gameId: string) => void;
	onAutoFillRegion: (region: string) => void;
}

export default function BracketView({ games, gameWarnings, seedPickCounts, seedRoundStats, onPickWinner, onAutoFill, onAutoFillRegion }: BracketViewProps) {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[1fr_1fr] w-full h-full p-4 gap-x-2 gap-y-4">
			{/* Top-left: SOUTH (R64 → E8) */}
			<div className="col-start-1 row-start-1">
				<RegionBracket
					region="SOUTH"
					games={games}
					gameWarnings={gameWarnings}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
					onAutoFillRegion={onAutoFillRegion}
					direction="ltr"
				/>
			</div>

			{/* Bottom-left: EAST (R64 → E8) */}
			<div className="col-start-1 row-start-2">
				<RegionBracket
					region="EAST"
					games={games}
					gameWarnings={gameWarnings}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
					onAutoFillRegion={onAutoFillRegion}
					direction="ltr"
				/>
			</div>

			{/* Center: Final Four + Championship — spans both rows, centered */}
			<div className="col-start-2 row-start-1 row-span-2 flex flex-col items-center justify-center gap-3 w-52 shrink-0">
				<div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Final Four</div>
				<MatchupCard
					game={games.get('r5-FF-0')!}
					warning={gameWarnings.get('r5-FF-0')}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
				/>
				<div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-2">Championship</div>
				<MatchupCard
					game={games.get('r6-FF-0')!}
					warning={gameWarnings.get('r6-FF-0')}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
				/>
				<div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-2">Final Four</div>
				<MatchupCard
					game={games.get('r5-FF-1')!}
					warning={gameWarnings.get('r5-FF-1')}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
				/>
			</div>

			{/* Top-right: WEST (E8 ← R64) */}
			<div className="col-start-3 row-start-1">
				<RegionBracket
					region="WEST"
					games={games}
					gameWarnings={gameWarnings}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
					onAutoFillRegion={onAutoFillRegion}
					direction="rtl"
				/>
			</div>

			{/* Bottom-right: MIDWEST (E8 ← R64) */}
			<div className="col-start-3 row-start-2">
				<RegionBracket
					region="MIDWEST"
					games={games}
					gameWarnings={gameWarnings}
					seedPickCounts={seedPickCounts}
					seedRoundStats={seedRoundStats}
					onPickWinner={onPickWinner}
					onAutoFill={onAutoFill}
					onAutoFillRegion={onAutoFillRegion}
					direction="rtl"
				/>
			</div>
		</div>
	);
}

function RegionBracket({
	region,
	games,
	gameWarnings,
	seedPickCounts,
	seedRoundStats,
	onPickWinner,
	onAutoFill,
	onAutoFillRegion,
	direction,
}: {
	region: Region;
	games: Map<string, BracketGame>;
	gameWarnings: Map<string, Warning>;
	seedPickCounts: SeedPickCounts;
	seedRoundStats: SeedRoundStats;
	onPickWinner: (gameId: string, teamKey: string) => void;
	onAutoFill: (gameId: string) => void;
	onAutoFillRegion: (region: string) => void;
	direction: 'ltr' | 'rtl';
}) {
	const rounds = direction === 'ltr' ? [1, 2, 3, 4] : [4, 3, 2, 1];

	return (
		<div className="h-full flex flex-col">
			<div className={`flex items-center gap-2 mb-2 ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}>
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{region}</span>
				<button
					onClick={() => onAutoFillRegion(region)}
					className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer px-1.5 py-0.5 rounded border border-neutral-700 hover:border-neutral-500 transition-colors"
				>
					Auto-fill
				</button>
			</div>
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
									warning={gameWarnings.get(game.id)}
									seedPickCounts={seedPickCounts}
									seedRoundStats={seedRoundStats}
									onPickWinner={onPickWinner}
									onAutoFill={onAutoFill}
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
