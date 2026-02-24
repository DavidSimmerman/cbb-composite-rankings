import { PostgresService } from '../database';
import { getTeamProfile, TeamProfile } from '../rankings/profile';
import { camelToSnake } from '../utils';
import { getTeamData, TeamData } from './espn-team-data';
import { ESPN_TO_TEAM_KEY } from './espn-team-ids';

const db = PostgresService.getInstance();

export interface GameTeamStats {
	field_goals_made: number;
	field_goals_attempted: number;
	field_goal_pct: number;
	three_point_field_goals_made: number;
	three_point_field_goals_attempted: number;
	three_point_field_goal_pct: number;
	free_throws_made: number;
	free_throws_attempted: number;
	free_throw_pct: number;
	total_rebounds: number;
	offensive_rebounds: number;
	defensive_rebounds: number;
	assists: number;
	steals: number;
	blocks: number;
	turnovers: number;
	team_turnovers: number;
	total_turnovers: number;
	technical_fouls: number;
	total_technical_fouls: number;
	flagrant_fouls: number;
	turnover_points: number;
	fast_break_points: number;
	points_in_paint: number;
	fouls: number;
	largest_lead: number;
	lead_changes: number;
	lead_percentage: number;
	possessions: number;
	points_per_possession: number;
	three_point_rate: number;
	free_throw_rate: number;
	assist_percentage: number;
	turnover_percentage: number;
	rebound_rate: number;
	defensive_rebound_rate: number;
	offensive_rebound_rate: number;
}

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

// ── DB helpers ──

interface DbGameRow {
	game_id: string;
	date: string;
	status: string;
	broadcast: string | null;
	is_halftime: boolean;
	half: number;
	clock: string;
	home_team_key: string;
	away_team_key: string;
	home_score: number;
	away_score: number;
	home_won: boolean | null;
	away_won: boolean | null;
	home_stats: GameTeamStats | null;
	away_stats: GameTeamStats | null;
}

function getSeason(dateStr: string): number {
	const d = new Date(dateStr);
	const month = d.getMonth();
	return month >= 7 ? d.getFullYear() + 1 : d.getFullYear();
}

function getYesterday(): string {
	const d = new Date();
	d.setDate(d.getDate() - 1);
	return d.toISOString().split('T')[0];
}

function needsFetch(dbGame: PartialGame | undefined): boolean {
	if (!dbGame) return true;
	if (dbGame.status === 'final') return false;
	const gameDate = dbGame.date.split('T')[0];
	return gameDate >= getYesterday();
}

function rowToPartialGame(row: DbGameRow): PartialGame {
	return {
		broadcast: row.broadcast ?? undefined,
		status: row.status as GameStatus,
		date: row.date,
		is_halftime: row.is_halftime,
		half: row.half,
		clock: row.clock,
		teams: {
			home: {
				team_key: row.home_team_key,
				stats: row.home_stats!,
				score: row.home_score,
				home_away: 'home',
				won: row.home_won!
			},
			away: {
				team_key: row.away_team_key,
				stats: row.away_stats!,
				score: row.away_score,
				home_away: 'away',
				won: row.away_won!
			}
		}
	};
}

async function queryGamesFromDb(gameIds: string[]): Promise<Map<string, PartialGame>> {
	if (gameIds.length === 0) return new Map();

	const rows = await db.query<DbGameRow>(
		'SELECT * FROM espn_games WHERE game_id = ANY($1)',
		[gameIds]
	);

	const map = new Map<string, PartialGame>();
	for (const row of rows) {
		map.set(row.game_id, rowToPartialGame(row));
	}
	return map;
}

function saveGameToDb(gameId: string, game: PartialGame): void {
	const season = getSeason(game.date);
	const home = game.teams.home;
	const away = game.teams.away;

	if (!home || !away) return;

	db.query(
		`INSERT INTO espn_games (
			game_id, season, date, status, broadcast, is_halftime, half, clock,
			home_team_key, away_team_key, home_score, away_score, home_won, away_won,
			home_stats, away_stats
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		ON CONFLICT (game_id) DO UPDATE SET
			status = EXCLUDED.status, broadcast = EXCLUDED.broadcast,
			is_halftime = EXCLUDED.is_halftime, half = EXCLUDED.half, clock = EXCLUDED.clock,
			home_score = EXCLUDED.home_score, away_score = EXCLUDED.away_score,
			home_won = EXCLUDED.home_won, away_won = EXCLUDED.away_won,
			home_stats = EXCLUDED.home_stats, away_stats = EXCLUDED.away_stats`,
		[
			gameId, season, game.date.split('T')[0], game.status, game.broadcast ?? null,
			game.is_halftime ?? false, game.half ?? 0, game.clock ?? '',
			home.team_key, away.team_key, home.score || 0, away.score || 0,
			home.won ?? null, away.won ?? null,
			home.stats ? JSON.stringify(home.stats) : null,
			away.stats ? JSON.stringify(away.stats) : null
		]
	).catch(err => console.error(`Failed to save game ${gameId} to db:`, err));
}

// ── ESPN API fetch ──

function fetchFromEspn(gameId: string): Promise<PartialGame> {
	console.log(`fetching game ${gameId} from ESPN API`);
	const start = performance.now();

	return fetch(
		`https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${gameId}`
	)
		.then(r => r.json())
		.then(data => {
			const game = { teams: {} as Record<string, Omit<GameTeam, 'profile'>> } as PartialGame;

			const competition = data.header.competitions[0];
			game.broadcast = competition.broadcasts.find((b: any) => b.lang === 'en')?.media?.shortName;

			if (competition.status.type.completed) {
				game.status = 'final';
			} else if (competition.status.type.state === 'pre') {
				game.status = 'not started';
			} else {
				game.status = 'in progress';
			}

			const rawDate = new Date(competition.date);
			game.date = rawDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
			game.is_halftime = competition.status.type?.name === 'STATUS_HALFTIME';
			game.half = competition.status.displayPeriod;
			game.clock = competition.status.displayClock || rawDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true,
				timeZone: 'America/New_York',
				timeZoneName: 'short'
			});

			data.boxscore.teams.map((t: any) => {
				const teamKey = ESPN_TO_TEAM_KEY[t.team.id];
				const teamStats = {} as Record<string, number>;
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
				teamStats.three_point_rate =
					Math.round((teamStats.three_point_field_goals_attempted / teamStats.field_goals_attempted) * 1000) / 10;
				teamStats.free_throw_rate =
					Math.round((teamStats.free_throws_attempted / teamStats.field_goals_attempted) * 1000) / 10;
				teamStats.assist_percentage = Math.round((teamStats.assists / teamStats.field_goals_made) * 1000) / 10;
				teamStats.turnover_percentage = Math.round((teamStats.turnovers / possessions) * 1000) / 10;

				game.teams[t.homeAway] = {
					team_key: teamKey,
					stats: teamStats as unknown as GameTeamStats,
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

			console.log(`Getting game ${gameId} took ${Math.round((performance.now() - start) / 10) / 100}s`);

			saveGameToDb(gameId, game);

			return game;
		});
}

// ── Public API ──

export async function getPartialGame(gameId: string): Promise<PartialGame> {
	const dbGames = await queryGamesFromDb([gameId]);
	const dbGame = dbGames.get(gameId);

	if (!needsFetch(dbGame)) {
		console.log(`game ${gameId} loaded from db`);
		return dbGame!;
	}

	return fetchFromEspn(gameId);
}

export async function getPartialGames(gameIds: string[]): Promise<Map<string, PartialGame>> {
	const dbGames = await queryGamesFromDb(gameIds);

	const toFetch = gameIds.filter(id => needsFetch(dbGames.get(id)));

	if (toFetch.length > 0) {
		console.log(`fetching ${toFetch.length}/${gameIds.length} games from ESPN API`);
		const fetched = await Promise.all(toFetch.map(id => fetchFromEspn(id).then(g => [id, g] as const)));
		for (const [id, game] of fetched) {
			dbGames.set(id, game);
		}
	} else {
		console.log(`all ${gameIds.length} games loaded from db`);
	}

	return dbGames;
}

export async function getGame(gameId: string): Promise<Game> {
	const game = (await getPartialGame(gameId)) as Game;

	await Promise.all(
		Object.entries(game.teams).map(async ([homeAway, { team_key: teamKey }]) => {
			const [profile, metadata] = await Promise.all([
				getTeamProfile(teamKey, { enrichedSchedule: true }),
				getTeamData(teamKey)
			]);
			game.teams[homeAway as 'home' | 'away'].profile = profile;
			game.teams[homeAway as 'home' | 'away'].metadata = metadata!;
		})
	);

	return game;
}
