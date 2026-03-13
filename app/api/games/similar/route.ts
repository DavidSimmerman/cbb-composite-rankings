import { getTeamProfile } from '@/lib/rankings/profile';
import { getTeamRanksMap } from '@/lib/rankings/ranks-map';
import type { TeamRanks } from '@/lib/rankings/ranks-map';
import type { EspnGameEnriched } from '@/lib/espn/schedule';
import { NextRequest, NextResponse } from 'next/server';

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
}

interface CategoryResult {
	key: string;
	label: string;
	games: SimilarGameResult[];
	wins: number;
	losses: number;
}

export async function GET(request: NextRequest) {
	const teamAKey = request.nextUrl.searchParams.get('teamA');
	const teamBKey = request.nextUrl.searchParams.get('teamB');

	if (!teamAKey || !teamBKey) {
		return NextResponse.json({ error: 'Missing teamA and/or teamB params' }, { status: 400 });
	}

	try {
		const [profileA, profileB, ranksMap] = await Promise.all([
			getTeamProfile(teamAKey),
			getTeamProfile(teamBKey),
			getTeamRanksMap(),
		]);

		if (!profileA || !profileB) {
			return NextResponse.json({ error: 'Team profile not found' }, { status: 404 });
		}

		const schedA = (profileA.schedule ?? []) as unknown as EspnGameEnriched[];
		const schedB = (profileB.schedule ?? []) as unknown as EspnGameEnriched[];

		const oppRanksA = ranksMap[teamBKey]; // A plays B, so B is A's opponent
		const oppRanksB = ranksMap[teamAKey]; // B plays A, so A is B's opponent

		if (!oppRanksA || !oppRanksB) {
			return NextResponse.json({ error: 'Ranks not available' }, { status: 404 });
		}

		const allCategories = [ratingCategory, overallCategory, ...categories];

		const teamAResults = allCategories.map(cat => {
			const games = scoreSimilarGames(schedA, teamAKey, oppRanksA, ranksMap, cat.fieldWeights);
			return {
				key: cat.key,
				label: cat.label,
				games: games.slice(0, 10),
				wins: games.filter(g => g.won === true).length,
				losses: games.filter(g => g.won === false).length,
			};
		});

		const teamBResults = allCategories.map(cat => {
			const games = scoreSimilarGames(schedB, teamBKey, oppRanksB, ranksMap, cat.fieldWeights);
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
	schedule: EspnGameEnriched[],
	teamKey: string,
	currentOppRanks: TeamRanks,
	ranksMap: Record<string, TeamRanks>,
	fieldWeights: FieldWeight[],
): SimilarGameResult[] {
	const totalWeight = fieldWeights.reduce((s, fw) => s + fw.weight, 0);
	const normalizedWeights = fieldWeights.map(fw => fw.weight / totalWeight);
	const targetValues = fieldWeights.map(fw => currentOppRanks[fw.field]);

	const results: SimilarGameResult[] = [];
	const enriched = schedule.filter(g => g.game);

	for (const eg of enriched) {
		const teams = Object.values(eg.game.teams);
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

		results.push({
			game_id: eg.game_id,
			opp_team_key: oppTeam.team_key,
			opp_abbreviation: oppTeam.team_key,
			score,
			won: eg.won,
			game_score: eg.score,
			home_away: eg.homeAway,
		});
	}

	return results.sort((a, b) => b.score - a.score);
}
