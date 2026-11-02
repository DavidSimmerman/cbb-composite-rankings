'use client';

import PredBar from '@/components/PredBar';
import TeamLogo from '@/components/TeamLogo';
import { formatLine } from '@/lib/games/line-utils';
import type { CardTeam, ScoreboardCard } from '@/lib/games/scoreboard-data';
import { Eye, Tv } from 'lucide-react';
import Link from 'next/link';

export type GameTag = 'watching' | 'upset' | 'close' | 'top30' | null;

export const TAGS: Record<Exclude<GameTag, null>, { label: string; cls: string; title: string }> = {
	upset: {
		label: 'Upset watch',
		cls: 'text-rose-300 bg-rose-500/10 ring-rose-400/30',
		title: 'An AP top-25 team is behind in the second half against a team ranked 10+ spots lower'
	},
	close: {
		label: 'Close finish',
		cls: 'text-amber-300 bg-amber-500/10 ring-amber-400/30',
		title: 'Within 5 points with 4 minutes or less to play'
	},
	top30: {
		label: 'Top-30 matchup',
		cls: 'text-emerald-300 bg-emerald-500/10 ring-emerald-400/30',
		title: 'Both teams are in the composite top 30'
	},
	watching: { label: 'Watching', cls: 'text-sky-300 bg-sky-500/10 ring-sky-400/30', title: 'You are watching this game' }
};

/** Same rules as the old scoreboard highlight borders, now shown as a labelled tag. */
export function getGameTag(game: ScoreboardCard, isWatched: boolean): GameTag {
	if (game.state === 'in' || game.state === 'post') {
		const homeRank = game.home.rank;
		const awayRank = game.away.rank;
		const homeScore = game.home.score ?? 0;
		const awayScore = game.away.score ?? 0;
		const isSecondHalf = game.state === 'post' || game.period >= 2;

		if (isSecondHalf) {
			if (game.home.ap && homeRank && awayRank && awayRank - homeRank >= 10 && awayScore > homeScore) return 'upset';
			if (game.away.ap && awayRank && homeRank && homeRank - awayRank >= 10 && homeScore > awayScore) return 'upset';
		}

		if (game.state === 'in' && isSecondHalf && Math.abs(homeScore - awayScore) <= 5) {
			const mins = parseInt((game.clock || '').split(':')[0]);
			if (mins <= 4) return 'close';
		}
	}
	if (isWatched) return 'watching';
	if (game.home.rank && game.away.rank && game.home.rank <= 30 && game.away.rank <= 30) return 'top30';
	return null;
}

function TeamRow({ team, dim }: { team: CardTeam; dim: boolean }) {
	return (
		<div className={`flex items-center gap-2.5 h-8 ${dim ? 'opacity-55' : ''}`}>
			{team.teamKey ? (
				<TeamLogo teamKey={team.teamKey} size={40} className="size-[22px] shrink-0 object-contain" />
			) : (
				<span className="size-[22px] shrink-0 rounded-full bg-white/[0.06]" />
			)}
			<span className="text-[11px] text-slate-500 w-4 text-right shrink-0 tabular-nums">{team.ap ?? ''}</span>
			<span className="text-white font-medium text-[14px] truncate">{team.name}</span>
			{team.rank != null && (
				<span
					className="text-[10.5px] rounded px-1 font-medium tabular-nums shrink-0"
					style={{ background: '#a78bfa26', color: '#a78bfa' }}
					title="Composite rank"
				>
					#{team.rank}
				</span>
			)}
			<span className="ml-auto text-[11px] text-slate-500 tabular-nums shrink-0">{team.record}</span>
			{team.score != null && (
				<span className={`w-8 text-right text-[18px] font-semibold tabular-nums shrink-0 ${dim ? 'text-slate-300' : 'text-white'}`}>
					{team.score}
				</span>
			)}
		</div>
	);
}

export default function GameCard({
	game,
	tag,
	isWatched,
	onToggleWatch,
	loadingPrediction
}: {
	game: ScoreboardCard;
	tag: GameTag;
	isWatched: boolean;
	onToggleWatch: (gameId: string) => void;
	loadingPrediction: boolean;
}) {
	const started = game.state !== 'pre';
	const leader =
		!started || game.home.score == null || game.away.score == null || game.home.score === game.away.score
			? null
			: game.home.score > game.away.score
				? 'home'
				: 'away';

	const p = game.prediction;
	const pHome = p?.homeWinProb ?? 0.5;
	const fav = pHome >= 0.5 ? game.home : game.away;
	const awayFav = pHome < 0.5;
	const line = formatLine(game.line?.homeSpread, game.home.abbr, game.away.abbr);
	const ou = game.line?.overUnder;

	return (
		<div className="relative rounded-xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.04] transition-colors">
			<Link href={`/games/${game.id}`} className="block p-3.5">
				<div className="flex items-center gap-2 mb-2 text-[11px] pr-7 min-h-5">
					{game.state === 'in' ? (
						<span className="flex items-center gap-1.5 text-rose-300 font-medium whitespace-nowrap">
							<span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />
							{game.status}
						</span>
					) : (
						<span className="text-slate-400 font-medium whitespace-nowrap">{game.status}</span>
					)}
					{game.broadcast && (
						<span className="flex items-center gap-1 text-slate-500 truncate">
							<Tv className="size-[11px] shrink-0" />
							{game.broadcast}
						</span>
					)}
					{tag && (
						<span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 ring-1 ${TAGS[tag].cls}`} title={TAGS[tag].title}>
							{TAGS[tag].label}
						</span>
					)}
				</div>

				<TeamRow team={game.away} dim={leader !== null && leader !== 'away'} />
				<TeamRow team={game.home} dim={leader !== null && leader !== 'home'} />

				<div className="mt-2.5 pt-2.5 border-t border-white/[0.06]">
					{p ? (
						<>
							<div className="flex items-center justify-between gap-2 text-[11px] mb-1.5">
								<span className="text-slate-500 shrink-0">{started ? 'Pregame model' : 'Model pick'}</span>
								<span className="text-slate-300 truncate">
									{fav.name} <span className="text-white font-semibold">{Math.round(Math.max(pHome, 1 - pHome) * 100)}%</span>
									{p.spread != null && <span className="text-slate-500"> · by {Math.abs(p.spread).toFixed(1)}</span>}
								</span>
							</div>
							<PredBar pAway={1 - pHome} colors={[game.away.color, game.home.color]} />
							<div className="flex justify-between mt-1 text-[10px] tabular-nums">
								<span className={`flex items-center gap-1 min-w-0 ${awayFav ? 'text-slate-200' : 'text-slate-500'}`}>
									<span className="size-1.5 rounded-full shrink-0" style={{ background: game.away.color }} />
									<span className="truncate">{game.away.name}</span> {Math.round((1 - pHome) * 100)}%
								</span>
								<span className={`flex items-center gap-1 min-w-0 ${awayFav ? 'text-slate-500' : 'text-slate-200'}`}>
									<span className="truncate">{game.home.name}</span> {Math.round(pHome * 100)}%
									<span className="size-1.5 rounded-full shrink-0" style={{ background: game.home.color }} />
								</span>
							</div>
						</>
					) : loadingPrediction ? (
						<div className="animate-pulse">
							<div className="flex justify-between mb-1.5">
								<span className="text-[11px] text-slate-500">Model pick</span>
								<span className="h-3 w-24 rounded bg-white/[0.06]" />
							</div>
							<div className="h-1.5 rounded-full bg-white/[0.06]" />
						</div>
					) : (
						<div className="text-[11px] text-slate-500">
							{started ? 'No pregame prediction saved' : 'Model pick unavailable for this game'}
						</div>
					)}
					{(line || ou != null) && (
						<div className="flex gap-3 mt-2 text-[11px] text-slate-500">
							{line && (
								<span>
									Line <span className="text-slate-300">{line}</span>
								</span>
							)}
							{ou != null && (
								<span>
									O/U <span className="text-slate-300">{ou}</span>
								</span>
							)}
						</div>
					)}
				</div>
			</Link>
			<button
				onClick={() => onToggleWatch(game.id)}
				className="absolute top-3 right-3 p-1 rounded-md hover:bg-white/10 cursor-pointer transition-colors"
				title={isWatched ? 'Stop watching' : 'Watch this game'}
				aria-label={isWatched ? 'Stop watching' : 'Watch this game'}
				aria-pressed={isWatched}
			>
				<Eye className={`size-[13px] ${isWatched ? 'text-sky-300' : 'text-slate-600 hover:text-slate-400'}`} />
			</button>
		</div>
	);
}
