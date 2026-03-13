'use client';

import { useGame } from '@/app/context/GameContext';
import SimilarOpponents from '@/components/games/SimilarOpponents';
import type { CategoryData, SimilarGameData } from '@/components/games/SimilarOpponents';
import type { EspnGameEnriched } from '@/lib/espn/schedule';
import type { RanksMap, TeamRanks } from '@/lib/rankings/ranks-map';
import { useMemo } from 'react';

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

const ratingCategory: CategoryDef = {
	key: 'rating',
	label: 'Similarly Rated',
	fieldWeights: [
		{ field: 'offRating', weight: 40 },
		{ field: 'defRating', weight: 40 },
		{ field: 'offDefDiff', weight: 20 },
	],
};

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
		{ field: 'defRebRate', weight: 5 },
	],
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
			{ field: 'offKillshots', weight: 5 },
		],
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
			{ field: 'defKillshots', weight: 5 },
		],
	},
	{
		key: 'reb',
		label: 'Rebounding',
		fieldWeights: [
			{ field: 'offRebRate', weight: 50 },
			{ field: 'defRebRate', weight: 50 },
		],
	},
];

const allCategories = [ratingCategory, overallCategory, ...categories];

export default function SimilarGames() {
	const { game, ranksMap, gameId } = useGame();

	if (!game.teams.away.profile || !game.teams.home.profile || !game.teams.away.metadata || !game.teams.home.metadata) {
		return (
			<div className="mt-4 border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-2xl font-bold text-neutral-600 mb-4">Similar Opponents</div>
				<div className="text-sm text-neutral-500">No data available for one or both teams</div>
			</div>
		);
	}

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

		const awayCategories: CategoryData[] = allCategories.map(cat => {
			const games = scoreSimilarGames(gameId, awayEnriched, awayKey, awayOppRanks, ranksMap, cat.fieldWeights);
			return {
				key: cat.key,
				label: cat.label,
				games: games.slice(0, 10),
				wins: games.filter(g => g.won).length,
				losses: games.filter(g => !g.won).length,
			};
		});

		const homeCategories: CategoryData[] = allCategories.map(cat => {
			const games = scoreSimilarGames(gameId, homeEnriched, homeKey, homeOppRanks, ranksMap, cat.fieldWeights);
			return {
				key: cat.key,
				label: cat.label,
				games: games.slice(0, 10),
				wins: games.filter(g => g.won).length,
				losses: games.filter(g => !g.won).length,
			};
		});

		return { awayCategories, homeCategories };
	}, [awaySched, homeSched, awayKey, homeKey, awayOppRanks, homeOppRanks, ranksMap, gameId]);

	if (!data) return null;

	const awayAbbr = game.teams.away.metadata!.abbreviation;
	const homeAbbr = game.teams.home.metadata!.abbreviation;
	const awayName = game.teams.away.profile!.team_name;
	const homeName = game.teams.home.profile!.team_name;
	const awayColor = `#${game.teams.away.metadata!.color}`;
	const homeColor = `#${game.teams.home.metadata!.color}`;

	return (
		<div className="mt-4">
			<SimilarOpponents
				teamAName={awayName}
				teamBName={homeName}
				teamAAbbr={awayAbbr}
				teamBAbbr={homeAbbr}
				teamAColor={awayColor}
				teamBColor={homeColor}
				teamACategories={data.awayCategories}
				teamBCategories={data.homeCategories}
				fixedHeight
			/>
		</div>
	);
}

function scoreSimilarGames(
	currentGameId: string,
	schedule: EspnGameEnriched[],
	teamKey: string,
	currentOppRanks: TeamRanks,
	ranksMap: RanksMap,
	fieldWeights: FieldWeight[],
): SimilarGameData[] {
	const totalWeight = fieldWeights.reduce((s, fw) => s + fw.weight, 0);
	const normalizedWeights = fieldWeights.map(fw => fw.weight / totalWeight);
	const targetValues = fieldWeights.map(fw => currentOppRanks[fw.field]);

	const results: SimilarGameData[] = [];

	for (const enrichedGame of schedule) {
		if (enrichedGame.game_id === currentGameId) continue;

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
			const nd = field === 'offDefDiff'
				? Math.abs(target - opp) / (2 * MAX_RANK)
				: Math.abs(target - opp) / MAX_RANK;
			weightedDiff += Math.sqrt(nd) * normalizedWeights[i];
		}

		if (!valid) continue;

		const score = Math.round(100 * (1 - weightedDiff));
		if (score < MIN_SCORE) continue;

		const teamSide = Object.entries(enrichedGame.game.teams).find(([, t]) => t.team_key === teamKey)?.[0] as 'home' | 'away';
		if (!teamSide) continue;

		const awayTeam = enrichedGame.game.teams.away;
		const homeTeam = enrichedGame.game.teams.home;
		const awayWon = teamSide === 'away' ? enrichedGame.won === true : enrichedGame.won === false;

		results.push({
			game_id: enrichedGame.game_id,
			away_team_key: awayTeam?.team_key ?? '',
			home_team_key: homeTeam?.team_key ?? '',
			away_score: awayTeam?.score ?? 0,
			home_score: homeTeam?.score ?? 0,
			away_won: awayWon,
			score,
			won: enrichedGame.won === true,
		});
	}

	return results.sort((a, b) => b.score - a.score);
}
