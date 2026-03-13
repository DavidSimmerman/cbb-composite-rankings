'use client';

import { useBracket } from '../context/BracketContext';
import { useParams } from 'next/navigation';
import { ROUND_NAMES } from '@/lib/bracket/predictions';
import type { BracketTeam } from '@/lib/bracket/predictions';
import TeamLogo from '@/components/TeamLogo';
import { MarchProfileCards } from '@/components/march/MarchCards';
import { MarchScoreBadge } from '@/components/march/MarchScoreBadge';
import { ArrowLeft, Trophy } from 'lucide-react';
import Link from 'next/link';
import SeedMatchupStats from './components/SeedMatchupStats';
import BracketImpact from './components/BracketImpact';
import BracketGamePrediction from './components/BracketGamePrediction';
import BracketTeamComparison from './components/BracketTeamComparison';
import BracketSimilarOpponents from './components/BracketSimilarOpponents';

function getRankColor(rank: number): string {
	if (!rank || isNaN(rank)) return 'oklch(0.4 0 0)';
	if (rank <= 36) return 'oklch(0.70 0.22 145)';
	if (rank <= 73) return 'oklch(0.65 0.19 135)';
	if (rank <= 109) return 'oklch(0.62 0.17 120)';
	if (rank <= 146) return 'oklch(0.60 0.16 100)';
	if (rank <= 182) return 'oklch(0.58 0.15 85)';
	return 'oklch(0.58 0.16 70)';
}

export default function GamePreviewPage() {
	const params = useParams();
	const gameId = params.gameId as string;
	const { bracketState, data, handlePickWinner, getTeamByKey, seedPickCounts } = useBracket();

	const game = bracketState.get(gameId);

	if (!game || !game.teamA || !game.teamB) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="text-center">
					<div className="text-lg text-neutral-400 mb-2">Game not found</div>
					<Link href="/bracket" className="text-sm text-blue-400 hover:underline">
						Back to bracket
					</Link>
				</div>
			</div>
		);
	}

	const teamASummary = getTeamByKey(game.teamA.team_key);
	const teamBSummary = getTeamByKey(game.teamB.team_key);
	const roundName = ROUND_NAMES[game.round];

	const onPick = (teamKey: string) => {
		handlePickWinner(gameId, teamKey);
	};

	return (
		<div className="h-full overflow-auto">
			<div className="max-w-340 w-full mx-auto px-2 md:px-4 py-4 space-y-6">
				{/* Header */}
				<div className="flex items-center gap-3">
					<Link
						href="/bracket"
						className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
					>
						<ArrowLeft className="size-5" />
					</Link>
					<div>
						<div className="text-xs text-neutral-500 uppercase tracking-wider">{game.region === 'FF' ? 'Final Four' : game.region} Region</div>
						<div className="text-lg font-bold">{roundName}</div>
					</div>
				</div>

				{/* Matchup Header with Pick Buttons */}
				<MatchupHeader
					teamA={game.teamA}
					teamB={game.teamB}
					winner={game.winner}
					onPick={onPick}
				/>

				{/* Game Prediction */}
				<BracketGamePrediction teamA={game.teamA} teamB={game.teamB} />

				{/* Team Comparison */}
				<BracketTeamComparison teamA={game.teamA} teamB={game.teamB} />

				{/* Similar Opponents */}
				<BracketSimilarOpponents
					teamA={game.teamA}
					teamB={game.teamB}
				/>

				{/* Seed Matchup Stats */}
				<SeedMatchupStats
					seedA={game.teamA.seed}
					seedB={game.teamB.seed}
					round={game.round}
					seedMatchupStats={data.seed_matchup_stats}
					seedRoundStats={data.seed_round_stats}
				/>

				{/* Bracket Impact Analysis */}
				<BracketImpact
					game={game}
					gameId={gameId}
					bracketState={bracketState}
					seedPickCounts={seedPickCounts}
					seedRoundStats={data.seed_round_stats}
				/>

				{/* March Profiles */}
				{teamASummary?.march_analysis && (
					<div>
						<div className="flex items-center gap-2 mb-3">
							<TeamLogo teamKey={game.teamA.team_key} size={40} className="size-5" />
							<span className="text-lg font-bold">{game.teamA.team_name}</span>
							<span className="text-sm text-neutral-500">March Profile</span>
						</div>
						<MarchProfileCards analysis={teamASummary.march_analysis} />
					</div>
				)}

				{teamBSummary?.march_analysis && (
					<div>
						<div className="flex items-center gap-2 mb-3">
							<TeamLogo teamKey={game.teamB.team_key} size={40} className="size-5" />
							<span className="text-lg font-bold">{game.teamB.team_name}</span>
							<span className="text-sm text-neutral-500">March Profile</span>
						</div>
						<MarchProfileCards analysis={teamBSummary.march_analysis} />
					</div>
				)}
			</div>
		</div>
	);
}

function MatchupHeader({
	teamA,
	teamB,
	winner,
	onPick,
}: {
	teamA: BracketTeam;
	teamB: BracketTeam;
	winner: string | null;
	onPick: (teamKey: string) => void;
}) {
	return (
		<div
			className="rounded-lg p-4 relative overflow-hidden"
			style={{
				background: `linear-gradient(135deg, #${teamA.color}40 0%, #${teamA.color}15 30%, #${teamB.color}15 70%, #${teamB.color}40 100%)`,
				border: `1px solid color-mix(in srgb, #${teamA.color} 40%, #${teamB.color} 40%)`,
			}}
		>
			<div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
				{/* Team A */}
				<div className="flex flex-col items-center gap-2">
					<Link href={`/${teamA.team_key}`} className="hover:opacity-80 transition-opacity">
						<TeamLogo teamKey={teamA.team_key} size={80} className="size-16 md:size-20" />
					</Link>
					<div className="text-center">
						<div className="text-xs text-neutral-400">#{teamA.seed} seed</div>
						<Link href={`/${teamA.team_key}`} className="text-lg font-bold hover:underline">
							{teamA.team_name}
						</Link>
					</div>
					{/* Ratings row */}
					<div className="flex items-center gap-3">
						<MarchScoreBadge score={teamA.march_score} size="md" />
						<div className="flex flex-col gap-0.5">
							<RatingLabel label="Rating" rank={teamA.comp_rank} />
							<RatingLabel label="Off" rank={teamA.comp_off_rank} />
							<RatingLabel label="Def" rank={teamA.comp_def_rank} />
						</div>
					</div>
				</div>

				{/* VS */}
				<div className="text-neutral-600 font-bold text-xl">VS</div>

				{/* Team B */}
				<div className="flex flex-col items-center gap-2">
					<Link href={`/${teamB.team_key}`} className="hover:opacity-80 transition-opacity">
						<TeamLogo teamKey={teamB.team_key} size={80} className="size-16 md:size-20" />
					</Link>
					<div className="text-center">
						<div className="text-xs text-neutral-400">#{teamB.seed} seed</div>
						<Link href={`/${teamB.team_key}`} className="text-lg font-bold hover:underline">
							{teamB.team_name}
						</Link>
					</div>
					{/* Ratings row */}
					<div className="flex items-center gap-3">
						<MarchScoreBadge score={teamB.march_score} size="md" />
						<div className="flex flex-col gap-0.5">
							<RatingLabel label="Rating" rank={teamB.comp_rank} />
							<RatingLabel label="Off" rank={teamB.comp_off_rank} />
							<RatingLabel label="Def" rank={teamB.comp_def_rank} />
						</div>
					</div>
				</div>
			</div>

			{/* Pick Buttons */}
			<div className="grid grid-cols-2 gap-3 mt-5">
				<button
					onClick={() => onPick(teamA.team_key)}
					className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all cursor-pointer border ${
						winner === teamA.team_key
							? 'border-transparent text-white'
							: 'border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white'
					}`}
					style={winner === teamA.team_key ? {
						backgroundColor: `#${teamA.color}30`,
						borderColor: `#${teamA.color}`,
					} : undefined}
				>
					<Trophy className={`size-4 ${winner === teamA.team_key ? 'text-amber-400' : 'text-neutral-600'}`} />
					Pick {teamA.short_name}
				</button>
				<button
					onClick={() => onPick(teamB.team_key)}
					className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all cursor-pointer border ${
						winner === teamB.team_key
							? 'border-transparent text-white'
							: 'border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white'
					}`}
					style={winner === teamB.team_key ? {
						backgroundColor: `#${teamB.color}30`,
						borderColor: `#${teamB.color}`,
					} : undefined}
				>
					<Trophy className={`size-4 ${winner === teamB.team_key ? 'text-amber-400' : 'text-neutral-600'}`} />
					Pick {teamB.short_name}
				</button>
			</div>

			{winner && (
				<div className="mt-3 text-center text-sm text-neutral-500">
					Click again to clear pick
				</div>
			)}
		</div>
	);
}

function RatingLabel({ label, rank }: { label: string; rank: number }) {
	if (!rank) return null;
	return (
		<div className="flex items-center gap-1.5">
			<span className="text-[10px] text-neutral-500 w-8">{label}</span>
			<span className="text-xs font-medium tabular-nums" style={{ color: getRankColor(rank) }}>
				#{rank}
			</span>
		</div>
	);
}
