'use client';

import { useGame } from '@/app/context/GameContext';
import { useRankings } from '@/app/context/RankingsContext';
import TeamLogo from '@/components/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EspnGameEnriched } from '@/lib/espn/schedule';
import { RanksMap, TeamRanks } from '@/lib/rankings/ranks-map';
import { CircleHelp } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PolarGrid, RadialBar, RadialBarChart } from 'recharts';

const MAX_RANK = 363;
const MIN_SCORE = 60;

interface FieldWeight {
	field: keyof TeamRanks;
	weight: number;
}

interface CategoryDef {
	key: string;
	label: string;
	fieldWeights: FieldWeight[];
}

interface SimilarGame {
	enrichedGame: EspnGameEnriched;
	oppTeamKey: string;
	teamSide: 'home' | 'away';
	score: number;
}

const overallCategory: CategoryDef = {
	key: 'overall',
	label: 'Overall',
	fieldWeights: [
		{ field: 'offRating', weight: 22.5 },
		{ field: 'defRating', weight: 27.5 },
		{ field: 'tempo', weight: 15 },
		{ field: 'offDefDiff', weight: 10 },
		{ field: 'off3ptRate', weight: 5 },
		{ field: 'off3ptPct', weight: 5 },
		{ field: 'offEfgPct', weight: 5 },
		{ field: 'offRebRate', weight: 5 },
		{ field: 'defRebRate', weight: 5 }
	]
};

const categories: CategoryDef[] = [
	{
		key: 'offense',
		label: 'Offense',
		fieldWeights: [
			{ field: 'offRating', weight: 20 },
			{ field: 'tempo', weight: 15 },
			{ field: 'off3ptRate', weight: 15 },
			{ field: 'off3ptPct', weight: 15 },
			{ field: 'offEfgPct', weight: 10 },
			{ field: 'offFtRate', weight: 10 },
			{ field: 'offAstPct', weight: 5 },
			{ field: 'offToPct', weight: 5 },
			{ field: 'offKillshots', weight: 5 }
		]
	},
	{
		key: 'defense',
		label: 'Defense',
		fieldWeights: [
			{ field: 'defRating', weight: 20 },
			{ field: 'def3ptRate', weight: 15 },
			{ field: 'def3ptPct', weight: 15 },
			{ field: 'defEfgPct', weight: 15 },
			{ field: 'defFtRate', weight: 10 },
			{ field: 'defAstPct', weight: 10 },
			{ field: 'defToPct', weight: 10 },
			{ field: 'defKillshots', weight: 5 }
		]
	},
	{
		key: 'reb',
		label: 'Rebounding',
		fieldWeights: [
			{ field: 'offRebRate', weight: 50 },
			{ field: 'defRebRate', weight: 50 }
		]
	}
];

export default function SimilarGames() {
	const { game, ranksMap, gameId } = useGame();

	const awaySched = game.teams.away.profile.schedule as unknown as EspnGameEnriched[];
	const homeSched = game.teams.home.profile.schedule as unknown as EspnGameEnriched[];

	const awayKey = game.teams.away.team_key;
	const homeKey = game.teams.home.team_key;

	const awayOppRanks = ranksMap[homeKey];
	const homeOppRanks = ranksMap[awayKey];

	const data = useMemo(() => {
		if (!awayOppRanks || !homeOppRanks) return null;

		const awayEnriched = awaySched?.filter(g => g.game) ?? [];
		const homeEnriched = homeSched?.filter(g => g.game) ?? [];

		const awayByCategory = categories.map(cat => ({
			category: cat,
			games: scoreSimilarGames(gameId, awayEnriched, awayKey, awayOppRanks, ranksMap, cat.fieldWeights)
		}));

		const homeByCategory = categories.map(cat => ({
			category: cat,
			games: scoreSimilarGames(gameId, homeEnriched, homeKey, homeOppRanks, ranksMap, cat.fieldWeights)
		}));

		const awayOverall = scoreSimilarGames(
			gameId,
			awayEnriched,
			awayKey,
			awayOppRanks,
			ranksMap,
			overallCategory.fieldWeights
		);
		const homeOverall = scoreSimilarGames(
			gameId,
			homeEnriched,
			homeKey,
			homeOppRanks,
			ranksMap,
			overallCategory.fieldWeights
		);

		return { awayByCategory, homeByCategory, awayOverall, homeOverall };
	}, [awaySched, homeSched, awayKey, homeKey, awayOppRanks, homeOppRanks, ranksMap, gameId]);

	if (!data) return null;

	const awayName = game.teams.away.metadata.abbreviation;
	const homeName = game.teams.home.metadata.abbreviation;

	return (
		<div className="mt-4 border border-neutral-800 rounded-lg p-2 md:p-4 md:h-175 flex flex-col overflow-y-hidden">
			<div className="mb-4 shrink-0 flex items-center justify-between">
				<div className="text-2xl font-bold text-neutral-600">Similar Opponents</div>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<CircleHelp className="h-5 text-neutral-600" />
						</TooltipTrigger>
						<TooltipContent side="left" className="max-w-64">
							Games against opponents with similar statistical profiles to the current matchup. The similarity score
							reflects how closely a past opponent matches across ratings, tempo, shooting, and other key metrics.
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<div className="flex flex-col md:flex-row gap-6 min-h-0 flex-1">
				<TeamSimilarColumn teamName={awayName} byCategory={data.awayByCategory} overall={data.awayOverall} />
				<div className="hidden md:block md:w-px bg-neutral-800 self-stretch" />
				<TeamSimilarColumn teamName={homeName} byCategory={data.homeByCategory} overall={data.homeOverall} />
			</div>
		</div>
	);
}

function TeamSimilarColumn({
	teamName,
	byCategory,
	overall
}: {
	teamName: string;
	byCategory: { category: CategoryDef; games: SimilarGame[] }[];
	overall: SimilarGame[];
}) {
	return (
		<div className="flex-1 flex flex-col min-h-0">
			<div className="text-lg font-bold text-neutral-400 mb-3 shrink-0">{teamName}</div>
			<div className="flex-1 min-h-0 overflow-auto px-1">
				<CategorySection category={overallCategory} games={overall} />
				{byCategory.map(({ category, games }) => (
					<CategorySection key={category.key} category={category} games={games} />
				))}
			</div>
		</div>
	);
}

function CategorySection({ category, games }: { category: CategoryDef; games: SimilarGame[] }) {
	const [expanded, setExpanded] = useState(false);
	const displayGames = expanded ? games : games.slice(0, 3);
	const hasMore = games.length > 3;

	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 mb-2">
				<span className="text-normal font-semibold text-neutral-500">{category.label}</span>
				{games.length > 0 &&
					(() => {
						const wins = games.filter(g => g.enrichedGame.won === true).length;
						const losses = games.filter(g => g.enrichedGame.won === false).length;
						return (
							<span className="text-sm text-neutral-600">
								(<span className="">{wins}</span>-<span className="">{losses}</span>)
							</span>
						);
					})()}
			</div>
			{games.length === 0 ? (
				<div className="text-xs text-neutral-700 py-1 mb-2">No similar opponents</div>
			) : (
				<div className="grid grid-cols-3 gap-2">
					{displayGames.map(sg => (
						<SimilarGameCard key={sg.enrichedGame.game_id} sg={sg} />
					))}
					{hasMore && (
						<div className="col-span-3 flex">
							<button
								onClick={() => setExpanded(!expanded)}
								className="text-xs m-auto text-neutral-500 hover:text-neutral-300 py-1 cursor-pointer"
							>
								{expanded ? 'Hide more' : `Show ${games.length - 3} more`}
							</button>
						</div>
					)}
				</div>
			)}
			{!hasMore && <div className="col-span-3 h-6"></div>}
		</div>
	);
}

function SimilarGameCard({ sg }: { sg: SimilarGame }) {
	const awayTeam = sg.enrichedGame.game.teams.away;
	const homeTeam = sg.enrichedGame.game.teams.home;

	const won = sg.enrichedGame.won;
	const awayWon = sg.teamSide === 'away' ? won === true : won === false;

	const shadowClass =
		won === true
			? 'shadow-[0_0_3px_1px_rgba(34,197,94,0.8)]'
			: won === false
				? 'shadow-[0_0_3px_1px_rgba(239,68,68,0.8)]'
				: '';

	return (
		<Link href={`/games/${sg.enrichedGame.game_id}`} className="cursor-pointer">
			<Card className={`px-2 md:px-3 py-2 flex items-center gap-3 hover:bg-neutral-800 ${shadowClass}`}>
				<CardContent className="px-0 flex gap-1 md:gap-2 w-full">
					<div className="flex-1 flex flex-col md:gap-1.5 min-w-0 ml-0">
						<TeamScoreRow teamKey={awayTeam?.team_key ?? ''} score={awayTeam?.score ?? 0} winner={awayWon} />
						<TeamScoreRow teamKey={homeTeam?.team_key ?? ''} score={homeTeam?.score ?? 0} winner={!awayWon} />
					</div>
					<ScoreRadial score={sg.score} />
				</CardContent>
			</Card>
		</Link>
	);
}

function ScoreRadial({ score }: { score: number }) {
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

function TeamScoreRow({ teamKey, score, winner }: { teamKey: string; score: number; winner: boolean }) {
	const rankings = useRankings();
	const displayName =
		rankings.find(t => t.metadata?.team_key === teamKey)?.metadata?.abbreviation ??
		teamKey
			.split('_')
			.map(w => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
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

function scoreSimilarGames(
	gameId: string,
	schedule: EspnGameEnriched[],
	teamKey: string,
	currentOppRanks: TeamRanks,
	ranksMap: RanksMap,
	fieldWeights: FieldWeight[]
): SimilarGame[] {
	const totalWeight = fieldWeights.reduce((s, fw) => s + fw.weight, 0);
	const normalizedWeights = fieldWeights.map(fw => fw.weight / totalWeight);

	const targetValues = fieldWeights.map(fw => currentOppRanks[fw.field]);

	const results: SimilarGame[] = [];

	for (const enrichedGame of schedule) {
		if (enrichedGame.game_id === gameId) continue;

		const teams = Object.values(enrichedGame.game.teams);
		const oppTeam = teams.find(t => t.team_key !== teamKey);
		if (!oppTeam) continue;

		const oppRanks = ranksMap[oppTeam.team_key];
		if (!oppRanks) continue;

		let weightedDiff = 0;
		let valid = true;
		for (let i = 0; i < fieldWeights.length; i++) {
			const target = targetValues[i];
			const opp = oppRanks[fieldWeights[i].field];
			if ((!target && target !== 0) || (!opp && opp !== 0)) {
				valid = false;
				break;
			}
			const field = fieldWeights[i].field;
			let nd: number;
			if (field === 'offDefDiff') {
				// offDefDiff ranges from ~-362 to ~362, normalize by 2*MAX_RANK
				nd = Math.abs(target - opp) / (2 * MAX_RANK);
			} else {
				nd = Math.abs(target - opp) / MAX_RANK;
			}
			weightedDiff += Math.sqrt(nd) * normalizedWeights[i];
		}

		if (!valid) continue;

		const score = Math.round(100 * (1 - weightedDiff));

		const teamSide = Object.entries(enrichedGame.game.teams).find(([, t]) => t.team_key === teamKey)?.[0] as 'home' | 'away';
		if (!teamSide) continue;

		results.push({
			enrichedGame,
			oppTeamKey: oppTeam.team_key,
			teamSide,
			score
		});
	}

	return results.filter(r => r.score >= MIN_SCORE).sort((a, b) => b.score - a.score);
}
