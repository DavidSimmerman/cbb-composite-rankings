import { PostgresService } from '@/lib/database';
import { getTeamRanksMap } from '@/lib/rankings/ranks-map';
import type { TeamRanks } from '@/lib/rankings/ranks-map';
import { NextRequest, NextResponse } from 'next/server';

const db = PostgresService.getInstance();

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

interface SimilarGameResult {
	game_id: string;
	opp_team_key: string;
	opp_abbreviation: string;
	score: number;
	won: boolean | undefined;
	game_score: string | undefined;
	home_away: 'home' | 'away' | 'neutral';
	away_team_key: string;
	home_team_key: string;
	away_score: number | null;
	home_score: number | null;
	away_won: boolean | null;
}

interface DbGame {
	game_id: string;
	home_team_key: string;
	away_team_key: string;
	home_score: number | null;
	away_score: number | null;
	home_won: boolean | null;
	away_won: boolean | null;
	status: string;
}

export async function GET(request: NextRequest) {
	const teamAKey = request.nextUrl.searchParams.get('teamA');
	const teamBKey = request.nextUrl.searchParams.get('teamB');

	if (!teamAKey || !teamBKey) {
		return NextResponse.json({ error: 'Missing teamA and/or teamB params' }, { status: 400 });
	}

	try {
		const [gamesA, gamesB, ranksMap] = await Promise.all([
			db.query<DbGame>(
				`SELECT game_id, home_team_key, away_team_key, home_score, away_score, home_won, away_won, status
				FROM espn_games
				WHERE (home_team_key = $1 OR away_team_key = $1)
					AND season = (SELECT MAX(season) FROM espn_games)
					AND status = 'final'`,
				[teamAKey]
			),
			db.query<DbGame>(
				`SELECT game_id, home_team_key, away_team_key, home_score, away_score, home_won, away_won, status
				FROM espn_games
				WHERE (home_team_key = $1 OR away_team_key = $1)
					AND season = (SELECT MAX(season) FROM espn_games)
					AND status = 'final'`,
				[teamBKey]
			),
			getTeamRanksMap(),
		]);

		const oppRanksA = ranksMap[teamBKey];
		const oppRanksB = ranksMap[teamAKey];

		if (!oppRanksA || !oppRanksB) {
			return NextResponse.json({ error: 'Ranks not available' }, { status: 404 });
		}

		const allCategories = [ratingCategory, overallCategory, ...categories];

		const teamAResults = allCategories.map(cat => {
			const games = scoreSimilarGames(gamesA, teamAKey, oppRanksA, ranksMap, cat.fieldWeights);
			return {
				key: cat.key,
				label: cat.label,
				games: games.slice(0, 10),
				wins: games.filter(g => g.won === true).length,
				losses: games.filter(g => g.won === false).length,
			};
		});

		const teamBResults = allCategories.map(cat => {
			const games = scoreSimilarGames(gamesB, teamBKey, oppRanksB, ranksMap, cat.fieldWeights);
			return {
				key: cat.key,
				label: cat.label,
				games: games.slice(0, 10),
				wins: games.filter(g => g.won === true).length,
				losses: games.filter(g => g.won === false).length,
			};
		});

		return NextResponse.json({
			teamA: { team_key: teamAKey, categories: teamAResults },
			teamB: { team_key: teamBKey, categories: teamBResults },
		});
	} catch (err) {
		console.error('Similar games error:', err);
		return NextResponse.json({ error: 'Failed to compute similar games' }, { status: 500 });
	}
}

function scoreSimilarGames(
	games: DbGame[],
	teamKey: string,
	currentOppRanks: TeamRanks,
	ranksMap: Record<string, TeamRanks>,
	fieldWeights: FieldWeight[],
): SimilarGameResult[] {
	const totalWeight = fieldWeights.reduce((s, fw) => s + fw.weight, 0);
	const normalizedWeights = fieldWeights.map(fw => fw.weight / totalWeight);
	const targetValues = fieldWeights.map(fw => currentOppRanks[fw.field]);

	const results: SimilarGameResult[] = [];

	for (const game of games) {
		const isHome = game.home_team_key === teamKey;
		const oppTeamKey = isHome ? game.away_team_key : game.home_team_key;

		const oppRanks = ranksMap[oppTeamKey];
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

		const won = isHome ? game.home_won : game.away_won;
		const teamScore = isHome ? game.home_score : game.away_score;
		const oppScore = isHome ? game.away_score : game.home_score;
		const gameScore = teamScore != null && oppScore != null ? `${teamScore}-${oppScore}` : undefined;

		results.push({
			game_id: game.game_id,
			opp_team_key: oppTeamKey,
			opp_abbreviation: oppTeamKey,
			score,
			won: won ?? undefined,
			game_score: gameScore,
			home_away: isHome ? 'home' : 'away',
			away_team_key: game.away_team_key,
			home_team_key: game.home_team_key,
			away_score: game.away_score,
			home_score: game.home_score,
			away_won: game.away_won,
		});
	}

	return results.sort((a, b) => b.score - a.score);
}
