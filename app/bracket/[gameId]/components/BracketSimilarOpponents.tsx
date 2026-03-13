'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import TeamLogo from '@/components/TeamLogo';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PolarGrid, RadialBar, RadialBarChart } from 'recharts';

const ScoreRadial = dynamic(() => Promise.resolve(ScoreRadialInner), { ssr: false });

interface SimilarGameResult {
	game_id: string;
	opp_team_key: string;
	opp_abbreviation: string;
	score: number;
	won: boolean | undefined;
	game_score: string | undefined;
	home_away: 'home' | 'away' | 'neutral';
}

interface CategoryResult {
	key: string;
	label: string;
	games: SimilarGameResult[];
	wins: number;
	losses: number;
}

interface TeamResult {
	team_key: string;
	categories: CategoryResult[];
}

interface SimilarData {
	teamA: TeamResult;
	teamB: TeamResult;
}

interface BracketSimilarOpponentsProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
}

export default function BracketSimilarOpponents({ teamA, teamB }: BracketSimilarOpponentsProps) {
	const [data, setData] = useState<SimilarData | null>(null);
	const [loading, setLoading] = useState(true);
	const [mobileTeam, setMobileTeam] = useState<'a' | 'b'>('a');

	const colorA = `#${teamA.color}`;
	const colorB = `#${teamB.color}`;

	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch(`/api/games/similar?teamA=${teamA.team_key}&teamB=${teamB.team_key}`);
				if (!res.ok) return;
				const json = await res.json();
				if (json.error) return;
				setData(json);
			} catch {
				// Silently fail
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [teamA.team_key, teamB.team_key]);

	if (loading) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-lg font-bold text-neutral-600 mb-4">Similar Opponents</div>
				<div className="animate-pulse space-y-3">
					<div className="h-6 bg-neutral-800 rounded-full" />
					<div className="h-20 bg-neutral-800 rounded" />
				</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-4">Similar Opponents</div>

			{/* Mobile toggle */}
			<div className="md:hidden flex border-b border-neutral-800 mb-4">
				<button
					onClick={() => setMobileTeam('a')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'a' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'a' ? { borderColor: colorA } : undefined}
				>
					{teamA.team_name}
				</button>
				<button
					onClick={() => setMobileTeam('b')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'b' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'b' ? { borderColor: colorB } : undefined}
				>
					{teamB.team_name}
				</button>
			</div>

			<div className="flex flex-col md:flex-row gap-6">
				<div className={`flex-1 flex flex-col min-h-0 ${mobileTeam !== 'a' ? 'hidden md:flex' : ''}`}>
					<div className="hidden md:block text-base font-bold text-neutral-400 mb-3">{teamA.abbreviation}</div>
					<TeamCategories categories={data.teamA.categories} />
				</div>
				<div className="hidden md:block md:w-px bg-neutral-800 self-stretch" />
				<div className={`flex-1 flex flex-col min-h-0 ${mobileTeam !== 'b' ? 'hidden md:flex' : ''}`}>
					<div className="hidden md:block text-base font-bold text-neutral-400 mb-3">{teamB.abbreviation}</div>
					<TeamCategories categories={data.teamB.categories} />
				</div>
			</div>
		</div>
	);
}

function TeamCategories({ categories }: { categories: CategoryResult[] }) {
	return (
		<div className="flex flex-col">
			{categories.map(cat => (
				<CategorySection key={cat.key} category={cat} />
			))}
		</div>
	);
}

function CategorySection({ category }: { category: CategoryResult }) {
	const [expanded, setExpanded] = useState(false);
	const displayGames = expanded ? category.games : category.games.slice(0, 3);
	const hasMore = category.games.length > 3;

	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 mb-2">
				<span className="text-sm font-semibold text-neutral-500">{category.label}</span>
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
		</div>
	);
}

function GameCard({ game }: { game: SimilarGameResult }) {
	const shadowClass =
		game.won === true
			? 'shadow-[0_0_3px_1px_rgba(34,197,94,0.8)]'
			: game.won === false
				? 'shadow-[0_0_3px_1px_rgba(239,68,68,0.8)]'
				: '';

	// Parse game_score "75-68" format
	const scores = game.game_score?.split('-').map(Number) ?? [];
	const teamScore = game.home_away === 'away' ? scores[0] : scores[1];
	const oppScore = game.home_away === 'away' ? scores[1] : scores[0];

	return (
		<div className={`bg-neutral-900 border border-neutral-800 rounded-lg px-2 md:px-3 py-2 flex items-center gap-2 ${shadowClass}`}>
			<div className="flex-1 flex flex-col gap-1 min-w-0">
				<div className="flex items-center justify-between gap-1">
					<div className="flex items-center gap-1 min-w-0">
						<TeamLogo teamKey={game.opp_team_key} className="size-4 shrink-0" />
						<span className="text-xs text-neutral-400 truncate hidden md:inline">{game.opp_abbreviation.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
					</div>
				</div>
				{game.game_score && (
					<div className="text-[10px] text-neutral-500 tabular-nums">
						{teamScore}-{oppScore}
					</div>
				)}
			</div>
			<ScoreRadial score={game.score} />
		</div>
	);
}

function ScoreRadialInner({ score }: { score: number }) {
	const endAngle = 90 - (score / 100) * 360;

	return (
		<div className="shrink-0 w-9 h-9 relative">
			<RadialBarChart
				width={36}
				height={36}
				cx={18}
				cy={18}
				innerRadius={12}
				outerRadius={17}
				startAngle={90}
				endAngle={endAngle}
				data={[{ value: score }]}
				barSize={4}
			>
				<PolarGrid
					gridType="circle"
					radialLines={false}
					stroke="none"
					polarRadius={[13.5]}
					className="first:fill-neutral-800"
				/>
				<RadialBar dataKey="value" cornerRadius={4} fill="#2563eb" max={100} />
			</RadialBarChart>
			<span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold text-neutral-300 tabular-nums">
				{score}
			</span>
		</div>
	);
}
