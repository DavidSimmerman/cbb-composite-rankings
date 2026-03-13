'use client';

import { useRankings } from '@/app/context/RankingsContext';
import TeamLogo from '@/components/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleHelp } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PolarGrid, RadialBar, RadialBarChart } from 'recharts';

const ScoreRadial = dynamic(() => Promise.resolve(ScoreRadialInner), { ssr: false });

// ─── Data interfaces ────────────────────────────────────────────────────────

export interface SimilarGameData {
	game_id: string;
	away_team_key: string;
	home_team_key: string;
	away_score: number;
	home_score: number;
	/** Whether the away team won this game */
	away_won: boolean;
	/** Similarity score 0-100 */
	score: number;
	/** Whether the team in this column won this game */
	won: boolean;
}

export interface CategoryData {
	key: string;
	label: string;
	games: SimilarGameData[];
	wins: number;
	losses: number;
}

export interface SimilarOpponentsProps {
	teamAName: string;
	teamBName: string;
	teamAAbbr: string;
	teamBAbbr: string;
	teamAColor: string;
	teamBColor: string;
	teamACategories: CategoryData[];
	teamBCategories: CategoryData[];
	fixedHeight?: boolean;
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SimilarOpponents({
	teamAName,
	teamBName,
	teamAAbbr,
	teamBAbbr,
	teamAColor,
	teamBColor,
	teamACategories,
	teamBCategories,
	fixedHeight,
}: SimilarOpponentsProps) {
	const [mobileTeam, setMobileTeam] = useState<'a' | 'b'>('a');

	return (
		<div className={`border border-neutral-800 rounded-lg p-2 md:p-4 ${fixedHeight ? 'md:h-175 flex flex-col overflow-y-hidden' : ''}`}>
			<div className="mb-4 shrink-0 flex items-center justify-between">
				<div className="text-2xl font-bold text-neutral-600">Similar Opponents</div>
				<InfoTooltip />
			</div>

			{/* Mobile toggle */}
			<div className="md:hidden flex border-b border-neutral-800 mb-4">
				<button
					onClick={() => setMobileTeam('a')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'a' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'a' ? { borderColor: teamAColor } : undefined}
				>
					{teamAName}
				</button>
				<button
					onClick={() => setMobileTeam('b')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'b' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'b' ? { borderColor: teamBColor } : undefined}
				>
					{teamBName}
				</button>
			</div>

			{/* Desktop: side-by-side columns */}
			<div className={`hidden md:flex md:flex-row gap-6 ${fixedHeight ? 'min-h-0 flex-1' : ''}`}>
				<div className="flex-1 flex flex-col min-h-0">
					<div className="text-lg font-bold text-neutral-400 mb-3 shrink-0">{teamAAbbr}</div>
					<div className="flex-1 min-h-0 overflow-auto px-1">
						{teamACategories.map(cat => (
							<CategorySection key={cat.key} category={cat} />
						))}
					</div>
				</div>
				<div className="md:w-px bg-neutral-800 self-stretch" />
				<div className="flex-1 flex flex-col min-h-0">
					<div className="text-lg font-bold text-neutral-400 mb-3 shrink-0">{teamBAbbr}</div>
					<div className="flex-1 min-h-0 overflow-auto px-1">
						{teamBCategories.map(cat => (
							<CategorySection key={cat.key} category={cat} />
						))}
					</div>
				</div>
			</div>

			{/* Mobile: stacked */}
			<div className="md:hidden">
				{(mobileTeam === 'a' ? teamACategories : teamBCategories).map(cat => (
					<CategorySection key={cat.key} category={cat} />
				))}
			</div>
		</div>
	);
}

// ─── Info tooltip ───────────────────────────────────────────────────────────

function InfoTooltip() {
	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<button className="md:hidden cursor-pointer">
						<CircleHelp className="h-5 text-neutral-600" />
					</button>
				</PopoverTrigger>
				<PopoverContent
					side="left"
					className="max-w-64 text-sm text-center bg-foreground text-background border-foreground"
				>
					<TooltipBody />
				</PopoverContent>
			</Popover>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="hidden md:inline">
							<CircleHelp className="h-5 text-neutral-600" />
						</span>
					</TooltipTrigger>
					<TooltipContent side="left" className="max-w-64 text-sm text-center">
						<TooltipBody />
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</>
	);
}

function TooltipBody() {
	return (
		<>
			<p>Games against opponents with similar statistical profiles to the current matchup.</p>
			<p className="mt-2">
				The score below shows how closely a past opponent matches across ratings, tempo, shooting, and other
				key metrics.
			</p>
			<div className="flex justify-center mt-2">
				<ScoreRadial score={75} />
			</div>
		</>
	);
}

// ─── Category section ───────────────────────────────────────────────────────

function CategorySection({ category }: { category: CategoryData }) {
	const [expanded, setExpanded] = useState(false);
	const displayGames = expanded ? category.games : category.games.slice(0, 3);
	const hasMore = category.games.length > 3;

	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 mb-2">
				<span className="text-normal font-semibold text-neutral-500">{category.label}</span>
				{category.games.length > 0 && (
					<span className="text-sm text-neutral-600">
						({category.wins}-{category.losses})
					</span>
				)}
			</div>
			{category.games.length === 0 ? (
				<div className="text-xs text-neutral-700 py-1 mb-2">No similar opponents</div>
			) : (
				<div className="grid grid-cols-3 gap-2">
					{displayGames.map(game => (
						<GameCard key={game.game_id} game={game} />
					))}
					{hasMore && (
						<div className="col-span-3 flex">
							<button
								onClick={() => setExpanded(!expanded)}
								className="text-sm md:text-xs m-auto text-neutral-500 hover:text-neutral-300 py-1 cursor-pointer"
							>
								{expanded ? 'Hide more' : `Show ${category.games.length - 3} more`}
							</button>
						</div>
					)}
				</div>
			)}
			{!hasMore && <div className="col-span-3 h-6" />}
		</div>
	);
}

// ─── Game card ──────────────────────────────────────────────────────────────

function GameCard({ game }: { game: SimilarGameData }) {
	const shadowClass =
		game.won
			? 'shadow-[0_0_3px_1px_rgba(34,197,94,0.8)]'
			: 'shadow-[0_0_3px_1px_rgba(239,68,68,0.8)]';

	return (
		<Link href={`/games/${game.game_id}`} className="cursor-pointer">
			<Card className={`px-2 md:px-3 py-2 flex items-center gap-3 hover:bg-neutral-800 ${shadowClass}`}>
				<CardContent className="px-0 flex gap-1 md:gap-2 w-full">
					<div className="flex-1 flex flex-col md:gap-1.5 min-w-0 ml-0">
						<TeamScoreRow
							teamKey={game.away_team_key}
							score={game.away_score}
							winner={game.away_won}
						/>
						<TeamScoreRow
							teamKey={game.home_team_key}
							score={game.home_score}
							winner={!game.away_won}
						/>
					</div>
					<ScoreRadial score={game.score} />
				</CardContent>
			</Card>
		</Link>
	);
}

// ─── Team score row ─────────────────────────────────────────────────────────

function TeamScoreRow({ teamKey, score, winner }: {
	teamKey: string;
	score: number;
	winner: boolean;
}) {
	const rankings = useRankings();
	const displayName =
		rankings.find(t => t.metadata?.team_key === teamKey)?.metadata?.abbreviation ??
		teamKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

	return (
		<div className="flex items-center justify-between gap-2">
			<div className={`flex gap-1 text-sm truncate ${winner ? 'text-neutral-200' : 'text-neutral-500'}`}>
				<TeamLogo teamKey={teamKey} className="h-lh" />
				<span className="hidden md:block">{displayName}</span>
			</div>
			<div className="flex items-center gap-1 shrink-0">
				<span className={`text-sm font-bold tabular-nums ${winner ? 'text-white' : 'text-neutral-500'}`}>{score}</span>
			</div>
		</div>
	);
}

// ─── Score radial ───────────────────────────────────────────────────────────

function ScoreRadialInner({ score }: { score: number }) {
	const endAngle = 90 - (score / 100) * 360;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="shrink-0 w-10 h-10 my-auto -mr-2 relative">
						<RadialBarChart
							width={40}
							height={40}
							cx={20}
							cy={20}
							innerRadius={14}
							outerRadius={20}
							startAngle={90}
							endAngle={endAngle}
							data={[{ value: score }]}
							barSize={4}
						>
							<PolarGrid
								gridType="circle"
								radialLines={false}
								stroke="none"
								polarRadius={[15.5]}
								className="first:fill-neutral-800"
							/>
							<RadialBar dataKey="value" cornerRadius={4} fill="#2563eb" max={100} />
						</RadialBarChart>
						<span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-neutral-300 tabular-nums">
							{score}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>Similarity Score: {score}%</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
