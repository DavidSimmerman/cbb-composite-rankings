import { getTeamProfile, TeamProfile } from '../rankings/profile';
import { camelToSnake } from '../utils';
import { getTeamData, TeamData } from './espn-team-data';
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
	metadata: TeamData;
}

export interface Game {
	teams: Record<'home' | 'away', GameTeam>;
	broadcast: string | undefined;
	status: GameStatus;
	date: string;
	is_halftime: boolean;
	half: number;
	clock: string;
}

export type PartialGame = Omit<Game, 'teams'> & { teams: Record<string, Omit<GameTeam, 'profile' | 'metadata'>> };

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

	game.date = competition.date;

	game.is_halftime = competition.status.type?.name === 'STATUS_HALFTIME';
	game.half = competition.status.displayPeriod;
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

		const possessions =
			teamStats.field_goals_attempted +
			teamStats.free_throws_attempted * 0.44 +
			teamStats.turnovers -
			teamStats.offensive_rebounds;
		teamStats.possessions = possessions;

		teamStats.points_per_possession = parseInt(compTeam.score) / possessions;
		teamStats.points_per_possession = parseInt(compTeam.score) / possessions;

		teamStats.three_point_rate =
			Math.round((teamStats.three_point_field_goals_attempted / teamStats.field_goals_attempted) * 1000) / 10;

		teamStats.free_throw_rate = Math.round((teamStats.free_throws_attempted / teamStats.field_goals_attempted) * 1000) / 10;

		teamStats.assist_percentage = Math.round((teamStats.assists / teamStats.field_goals_made) * 1000) / 10;

		teamStats.turnover_percentage = Math.round((teamStats.turnovers / possessions) * 1000) / 10;

		game.teams[t.homeAway] = {
			team_key: teamKey,
			stats: teamStats,
			score: parseInt(compTeam.score),
			home_away: t.homeAway,
			won: compTeam.winner
		};
	});

	Object.entries(game.teams).forEach(([key, team]) => {
		const opp = Object.entries(game.teams).find(([tk]) => tk !== key)![1];

		team.stats.rebound_rate = team.stats.total_rebounds / (team.stats.total_rebounds + opp.stats.total_rebounds);
		team.stats.defensive_rebound_rate =
			team.stats.defensive_rebounds / (team.stats.defensive_rebounds + opp.stats.offensive_rebounds);
		team.stats.offensive_rebound_rate =
			team.stats.offensive_rebounds / (team.stats.offensive_rebounds + opp.stats.defensive_rebounds);
	});

	return game;
}

export async function getGame(gameId: string): Promise<Game> {
	const game = (await fetchEspnGame(gameId)) as Game;

	await Promise.all(
		Object.entries(game.teams).map(async ([homeAway, { team_key: teamKey }]) => {
			const [profile, metadata] = await Promise.all([getTeamProfile(teamKey), getTeamData(teamKey)]);
			game.teams[homeAway as 'home' | 'away'].profile = profile;
			game.teams[homeAway as 'home' | 'away'].metadata = metadata!;
		})
	);

	return game;
}
