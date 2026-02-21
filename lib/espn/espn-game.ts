import { getTeamProfile, TeamProfile } from '../rankings/profile';
import { camelToSnake } from '../utils';
import { ESPN_TO_TEAM_KEY } from './espn-team-ids';

export type GameTeamStats = Record<string, number>;

export type GameStatus = 'final' | 'not started' | 'in progress';

export interface GameTeam {
	team_key: string;
	stats: GameTeamStats;
	score: number;
	home_away: 'home' | 'away';
	won: boolean;
	profile: TeamProfile;
}

export interface Game {
	teams: Record<'home' | 'away', GameTeam>;
	broadcast: string | undefined;
	status: GameStatus;
	date: string;
	time: string;
	half: number;
	clock: string;
}

type PartialGame = Omit<Game, 'teams'> & { teams: Record<string, Omit<GameTeam, 'profile'>> };

export async function fetchEspnGame(gameId: string): Promise<PartialGame> {
	const response = await fetch(
		`https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`
	);
	const data = await response.json();

	const game = {
		teams: {} as Record<string, Omit<GameTeam, 'profile'>>
	} as PartialGame;

	const competition = data.header.competitions[0];
	game.broadcast = competition.broadcasts.find((b: any) => b.lang === 'en')?.media?.shortName;

	if (competition.status.type.completed) {
		game.status = 'final';
	} else if (competition.status.type.state === 'pre') {
		game.status = 'not started';
	} else {
		game.status = 'in progress';
	}

	const [date, time] = competition.status.type.shortDetail.split(' - ');
	game.date = date;
	game.time = time;

	game.half = competition.status.diplayPeriod;
	game.clock = competition.status.displayClock;

	data.boxscore.teams.map((t: any) => {
		const teamKey = ESPN_TO_TEAM_KEY[t.team.id];
		const teamStats: GameTeamStats = {};

		const compTeam = competition.competitors.find((ct: any) => ct.team.id === t.team.id);

		t.statistics.forEach((s: any) => {
			if (s.name.includes('-')) {
				const [n1, n2] = s.name.split('-');
				const [v1, v2] = s.displayValue.split('-');
				teamStats[camelToSnake(n1)] = parseInt(v1);
				teamStats[camelToSnake(n2)] = parseInt(v2);
			} else {
				teamStats[camelToSnake(s.name)] = parseInt(s.displayValue);
			}
		});

		game.teams[t.homeAway] = {
			team_key: teamKey,
			stats: teamStats,
			score: parseInt(compTeam.score),
			home_away: t.homeAway,
			won: compTeam.winner
		};
	});

	return game;
}

export async function getGame(gameId: string): Promise<Game> {
	const game = (await fetchEspnGame(gameId)) as Game;

	await Promise.all(
		Object.entries(game.teams).map(async ([homeAway, { team_key: teamKey }]) => {
			const profile = await getTeamProfile(teamKey);
			game.teams[homeAway as 'home' | 'away'].profile = profile;
		})
	);

	return game;
}
