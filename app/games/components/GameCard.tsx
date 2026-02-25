'use client';

import TeamLogo from '@/components/TeamLogo';
import type { ScoreboardGameEnriched, ScoreboardTeam } from '@/lib/espn/scoreboard';
import { Eye } from 'lucide-react';
import Link from 'next/link';

export type GameHighlight = 'watching' | 'upset' | 'close' | 'top30' | null;

export function getGameHighlight(game: ScoreboardGameEnriched, isWatched: boolean): GameHighlight {
	if (isWatched) return 'watching';

	// Upset alert: AP top 25 team is losing/lost to a team 10+ composite ranks worse
	if (game.status.state === 'in' || game.status.state === 'post') {
		const homeRank = game.homeTeamRating;
		const awayRank = game.awayTeamRating;
		const homeScore = game.homeTeam.score ?? 0;
		const awayScore = game.awayTeam.score ?? 0;
		const isSecondHalf = game.status.state === 'post' || game.status.period >= 2;

		if (isSecondHalf) {
			if (game.homeTeam.curatedRank && homeRank && awayRank && awayRank - homeRank >= 10 && awayScore > homeScore) {
				return 'upset';
			}
			if (game.awayTeam.curatedRank && awayRank && homeRank && homeRank - awayRank >= 10 && homeScore > awayScore) {
				return 'upset';
			}
		}

		// Close game: within 5 points with 4 mins or less in 2nd half (live only)
		if (game.status.state === 'in' && isSecondHalf && Math.abs(homeScore - awayScore) <= 5) {
			const clock = game.status.displayClock;
			const parts = clock.split(':');
			const mins = parseInt(parts[0]);
			if (mins <= 4) return 'close';
		}
	}

	// Top 30 matchup: both teams are individually ranked in the top 30
	if (game.homeTeamRating && game.awayTeamRating && game.homeTeamRating <= 30 && game.awayTeamRating <= 30) return 'top30';

	return null;
}

const highlightClasses: Record<GameHighlight & string, string> = {
	watching: 'border-blue-500 ring-1 ring-blue-500/30',
	upset: 'border-red-500 ring-1 ring-red-500/30',
	close: 'border-yellow-500 ring-1 ring-yellow-500/30',
	top30: 'border-emerald-500 ring-1 ring-emerald-500/30'
};

function TeamRow({
	team,
	rating,
	isWinner,
	showScore
}: {
	team: ScoreboardTeam;
	rating: number | undefined;
	isWinner: boolean;
	showScore: boolean;
}) {
	return (
		<div className={`flex items-center gap-2 ${isWinner ? 'font-semibold' : 'text-muted-foreground'}`}>
			<TeamLogo teamKey={team.teamKey || ''} size={40} className="size-6 shrink-0" />
			<div className="flex items-center gap-1.5 min-w-0 flex-1">
				{team.curatedRank && <span className="text-xs text-muted-foreground font-normal">{team.curatedRank}</span>}
				<span className="truncate text-sm">{team.name}</span>
				{rating && (
					<span className="text-[10px] text-muted-foreground font-normal shrink-0 bg-muted rounded px-1">
						#{rating}
					</span>
				)}
			</div>
			<div className="flex items-center gap-2 ml-auto shrink-0">
				<span className="text-xs text-muted-foreground font-normal">{team.record}</span>
				{showScore && team.score !== undefined && (
					<span className="text-base tabular-nums w-8 text-right">{team.score}</span>
				)}
			</div>
		</div>
	);
}

export default function GameCard({
	game,
	highlight,
	isWatched,
	onToggleWatch
}: {
	game: ScoreboardGameEnriched;
	highlight: GameHighlight;
	isWatched: boolean;
	onToggleWatch: (gameId: string) => void;
}) {
	const isLive = game.status.state === 'in';
	const isFinal = game.status.state === 'post';
	const showScore = isLive || isFinal;

	const homeWon =
		isFinal &&
		game.homeTeam.score !== undefined &&
		game.awayTeam.score !== undefined &&
		game.homeTeam.score > game.awayTeam.score;
	const awayWon =
		isFinal &&
		game.homeTeam.score !== undefined &&
		game.awayTeam.score !== undefined &&
		game.awayTeam.score > game.homeTeam.score;

	const borderClass = highlight ? highlightClasses[highlight] : 'border-border';

	return (
		<div className={`relative rounded-lg border bg-card transition-colors ${borderClass}`}>
			{/* Watch button */}
			<button
				onClick={e => {
					e.preventDefault();
					onToggleWatch(game.id);
				}}
				className="absolute top-2.5 right-2.5 z-10 p-1 rounded-md hover:bg-accent/50 cursor-pointer transition-colors"
				title={isWatched ? 'Unwatch game' : 'Watch game'}
			>
				{isWatched ? (
					<Eye className="size-3.5 text-blue-500" />
				) : (
					<Eye className="size-3.5 text-muted-foreground/40 hover:text-muted-foreground" />
				)}
			</button>

			<Link href={`/games/${game.id}`} className="block p-3 md:p-4 hover:bg-accent/30 rounded-lg transition-colors">
				<div className="flex items-center justify-between mb-2.5 pr-6">
					<div className="flex items-center gap-2">
						{isLive && (
							<span className="text-xs font-medium text-red-500 flex items-center gap-1">
								<span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
								{game.status.shortDetail}
							</span>
						)}
						{isFinal && <span className="text-xs text-muted-foreground">Final</span>}
						{game.status.state === 'pre' && (
							<span className="text-xs text-muted-foreground">{game.status.shortDetail}</span>
						)}
					</div>
					<div className="flex items-center gap-2">
						{game.broadcast && (
							<span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
								{game.broadcast}
							</span>
						)}
						{game.conference.shortName && (
							<span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
								{game.conference.shortName}
							</span>
						)}
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<TeamRow
						team={game.awayTeam}
						rating={game.awayTeamRating}
						isWinner={awayWon || (!isFinal && !isLive)}
						showScore={showScore}
					/>
					<TeamRow
						team={game.homeTeam}
						rating={game.homeTeamRating}
						isWinner={homeWon || (!isFinal && !isLive)}
						showScore={showScore}
					/>
				</div>

				{game.odds && game.status.state === 'pre' && (
					<div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3 text-xs text-muted-foreground">
						{game.odds.spread && <span>Spread: {game.odds.spread}</span>}
						{game.odds.overUnder && <span>O/U: {game.odds.overUnder}</span>}
					</div>
				)}
			</Link>
		</div>
	);
}
