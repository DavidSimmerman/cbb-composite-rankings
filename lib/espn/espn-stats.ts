import { PostgresService } from '../database';
import { ESPN_TO_TEAM_KEY } from './espn-team-ids';

export interface EspnStats {
	id: string;
	team_key: string;
	season: number;

	// Rebounds
	total_rebounds: number;
	total_rebounds_rank: number;
	avg_rebounds: number;
	avg_rebounds_rank: number;
	rebounds: number;
	rebounds_rank: number;

	// Team stats
	team_assist_turnover_ratio: number;
	team_assist_turnover_ratio_rank: number;
	technical_fouls: number;
	technical_fouls_rank: number;
	assist_turnover_ratio: number;
	assist_turnover_ratio_rank: number;
	games_played: number;
	games_played_rank: number;
	avg_fouls: number;
	avg_fouls_rank: number;
	fouls: number;
	fouls_rank: number;

	// Opponent stats
	opp_total_rebounds: number;
	opp_total_rebounds_rank: number;
	opp_avg_rebounds: number;
	opp_avg_rebounds_rank: number;
	opp_team_assist_turnover_ratio: number;
	opp_team_assist_turnover_ratio_rank: number;
	opp_technical_fouls: number;
	opp_technical_fouls_rank: number;
	opp_rebounds: number;
	opp_rebounds_rank: number;
	opp_assist_turnover_ratio: number;
	opp_assist_turnover_ratio_rank: number;
	opp_games_played: number;
	opp_avg_fouls: number;
	opp_avg_fouls_rank: number;
	opp_fouls: number;
	opp_fouls_rank: number;

	// Defensive stats
	def_defensive_rebounds: number;
	def_defensive_rebounds_rank: number;
	def_avg_defensive_rebounds: number;
	def_avg_defensive_rebounds_rank: number;
	def_avg_steals: number;
	def_avg_steals_rank: number;
	def_avg_blocks: number;
	def_avg_blocks_rank: number;
	def_blocks: number;
	def_blocks_rank: number;
	def_steals: number;
	def_steals_rank: number;

	// Opponent defensive stats
	opp_def_defensive_rebounds: number;
	opp_def_defensive_rebounds_rank: number;
	opp_def_avg_defensive_rebounds: number;
	opp_def_avg_defensive_rebounds_rank: number;
	opp_def_avg_steals: number;
	opp_def_avg_steals_rank: number;
	opp_def_avg_blocks: number;
	opp_def_avg_blocks_rank: number;
	opp_def_blocks: number;
	opp_def_blocks_rank: number;
	opp_def_steals: number;
	opp_def_steals_rank: number;

	// Offensive stats
	off_avg_points: number;
	off_avg_points_rank: number;
	off_field_goal_pct: number;
	off_field_goal_pct_rank: number;
	off_three_point_field_goal_pct: number;
	off_three_point_field_goal_pct_rank: number;
	off_free_throw_pct: number;
	off_free_throw_pct_rank: number;
	off_avg_turnovers: number;
	off_avg_turnovers_rank: number;
	off_turnovers: number;
	off_turnovers_rank: number;
	off_avg_field_goals_made: number;
	off_avg_field_goals_made_rank: number;
	off_avg_field_goals_attempted: number;
	off_avg_field_goals_attempted_rank: number;
	off_avg_three_point_field_goals_made: number;
	off_avg_three_point_field_goals_made_rank: number;
	off_avg_three_point_field_goals_attempted: number;
	off_avg_three_point_field_goals_attempted_rank: number;
	off_avg_free_throws_made: number;
	off_avg_free_throws_made_rank: number;
	off_avg_free_throws_attempted: number;
	off_avg_free_throws_attempted_rank: number;
	off_avg_offensive_rebounds: number;
	off_avg_offensive_rebounds_rank: number;
	off_avg_assists: number;
	off_avg_assists_rank: number;
	off_points: number;
	off_points_rank: number;
	off_field_goals_made: number;
	off_field_goals_made_rank: number;
	off_field_goals_attempted: number;
	off_field_goals_attempted_rank: number;
	off_three_point_field_goals_made: number;
	off_three_point_field_goals_made_rank: number;
	off_three_point_field_goals_attempted: number;
	off_three_point_field_goals_attempted_rank: number;
	off_free_throws_made: number;
	off_free_throws_made_rank: number;
	off_free_throws_attempted: number;
	off_free_throws_attempted_rank: number;
	off_offensive_rebounds: number;
	off_offensive_rebounds_rank: number;
	off_assists: number;
	off_assists_rank: number;
	off_offensive_rebound_pct: number;
	off_offensive_rebound_pct_rank: number;
	off_scoring_efficiency: number;
	off_scoring_efficiency_rank: number;
	off_shooting_efficiency: number;
	off_shooting_efficiency_rank: number;
	off_three_point_pct: number;

	// Opponent offensive stats
	opp_off_avg_points: number;
	opp_off_avg_points_rank: number;
	opp_off_field_goal_pct: number;
	opp_off_field_goal_pct_rank: number;
	opp_off_three_point_field_goal_pct: number;
	opp_off_three_point_field_goal_pct_rank: number;
	opp_off_free_throw_pct: number;
	opp_off_free_throw_pct_rank: number;
	opp_off_avg_turnovers: number;
	opp_off_avg_turnovers_rank: number;
	opp_off_turnovers: number;
	opp_off_turnovers_rank: number;
	opp_off_avg_field_goals_made: number;
	opp_off_avg_field_goals_made_rank: number;
	opp_off_avg_field_goals_attempted: number;
	opp_off_avg_field_goals_attempted_rank: number;
	opp_off_avg_three_point_field_goals_made: number;
	opp_off_avg_three_point_field_goals_made_rank: number;
	opp_off_avg_three_point_field_goals_attempted: number;
	opp_off_avg_three_point_field_goals_attempted_rank: number;
	opp_off_avg_free_throws_made: number;
	opp_off_avg_free_throws_made_rank: number;
	opp_off_avg_free_throws_attempted: number;
	opp_off_avg_free_throws_attempted_rank: number;
	opp_off_avg_offensive_rebounds: number;
	opp_off_avg_offensive_rebounds_rank: number;
	opp_off_avg_assists: number;
	opp_off_avg_assists_rank: number;
	opp_off_points: number;
	opp_off_points_rank: number;
	opp_off_field_goals_made: number;
	opp_off_field_goals_made_rank: number;
	opp_off_field_goals_attempted: number;
	opp_off_field_goals_attempted_rank: number;
	opp_off_three_point_field_goals_made: number;
	opp_off_three_point_field_goals_made_rank: number;
	opp_off_three_point_field_goals_attempted: number;
	opp_off_three_point_field_goals_attempted_rank: number;
	opp_off_free_throws_made: number;
	opp_off_free_throws_made_rank: number;
	opp_off_free_throws_attempted: number;
	opp_off_free_throws_attempted_rank: number;
	opp_off_offensive_rebounds: number;
	opp_off_offensive_rebounds_rank: number;
	opp_off_assists: number;
	opp_off_offensive_rebound_pct: number;
	opp_off_offensive_rebound_pct_rank: number;
	opp_off_scoring_efficiency: number;
	opp_off_scoring_efficiency_rank: number;
	opp_off_shooting_efficiency: number;
	opp_off_shooting_efficiency_rank: number;
	opp_off_three_point_pct: number;

	// Differential stats
	dif_avg_points_differential: number;
	dif_avg_points_differential_rank: number;
	dif_avg_field_goals_made_differential: number;
	dif_avg_field_goals_made_differential_rank: number;
	dif_avg_field_goals_attempted_differential: number;
	dif_avg_field_goals_attempted_differential_rank: number;
	dif_avg_three_point_field_goals_made_differential: number;
	dif_avg_three_point_field_goals_made_differential_rank: number;
	dif_avg_three_point_field_goals_attempted_differential: number;
	dif_avg_three_point_field_goals_attempted_differential_rank: number;
	dif_avg_free_throws_made_differential: number;
	dif_avg_free_throws_made_differential_rank: number;
	dif_avg_free_throws_attempted_differential: number;
	dif_avg_free_throws_attempted_differential_rank: number;
	dif_avg_turnovers_differential: number;
	dif_avg_turnovers_differential_rank: number;
	dif_avg_rebounds_differential: number;
	dif_avg_rebounds_differential_rank: number;
	dif_points_differential: number;
	dif_points_differential_rank: number;
	dif_field_goals_made_differential: number;
	dif_field_goals_made_differential_rank: number;
	dif_field_goals_attempted_differential: number;
	dif_field_goals_attempted_differential_rank: number;
	dif_three_point_field_goals_made_differential: number;
	dif_three_point_field_goals_made_differential_rank: number;
	dif_three_point_field_goals_attempted_differential: number;
	dif_three_point_field_goals_attempted_differential_rank: number;
	dif_free_throws_made_differential: number;
	dif_free_throws_made_differential_rank: number;
	dif_free_throws_attempted_differential: number;
	dif_free_throws_attempted_differential_rank: number;
	dif_turnovers_differential: number;
	dif_turnovers_differential_rank: number;
	dif_rebounds_differential: number;
	dif_rebounds_differential_rank: number;
	dif_free_throw_pct_differential: number;
	dif_free_throw_pct_differential_rank: number;
	dif_scoring_efficiency_differential: number;
	dif_scoring_efficiency_differential_rank: number;
	dif_shooting_efficiency_differential: number;
	dif_shooting_efficiency_differential_rank: number;
	dif_field_goal_pct_differential: number;
	dif_field_goal_pct_differential_rank: number;
	dif_three_point_field_goal_pct_differential: number;
	dif_three_point_field_goal_pct_differential_rank: number;
	dif_avg_offensive_rebounds_differential: number;
	dif_avg_offensive_rebounds_differential_rank: number;
	dif_avg_defensive_rebounds_differential: number;
	dif_avg_defensive_rebounds_differential_rank: number;
	dif_avg_assists_differential: number;
	dif_avg_assists_differential_rank: number;
	dif_avg_steals_differential: number;
	dif_avg_steals_differential_rank: number;
	dif_avg_blocks_differential: number;
	dif_avg_blocks_differential_rank: number;
	dif_avg_fouls_differential: number;
	dif_avg_fouls_differential_rank: number;

	created_at: string;
	updated_at: string;
}

const IGNORE_RANKS = [
	'games_playerd',
	'opp_games_played',
	'total_rebounds_rank',
	'rebounds_rank',
	'opp_rebounds_rank',
	'opp_total_rebounds_rank',
	'off_points_rank',
	'opp_off_points_rank',
	'opp_off_assists',
	'off_field_goals_made_rank',
	'off_three_point_field_goals_made_rank',
	'off_free_throws_made_rank',
	'off_turnovers_rank',
	'off_offensive_rebounds_rank',
	'off_assists_rank',
	'fouls_rank',
	'def_blocks_rank',
	'def_steals_rank',
	'def_defensive_rebounds_rank'
];

const REVERSE_RANKS = [
	'opp_total_rebounds',
	'opp_avg_rebounds',
	'opp_team_assist_turnover_ratio',
	'opp_rebounds',
	'opp_assist_turnover_ratio',
	'opp_def_defensive_rebounds',
	'opp_def_avg_defensive_rebounds',
	'opp_def_avg_steals',
	'opp_def_avg_blocks',
	'opp_def_blocks',
	'opp_def_steals',
	'off_turnovers',
	'opp_off_avg_points',
	'opp_off_field_goal_pct',
	'opp_off_three_point_field_goal_pct',
	'opp_off_free_throw_pct',
	'opp_off_avg_field_goals_made',
	'opp_off_avg_field_goals_attempted',
	'opp_off_avg_three_point_field_goals_made',
	'opp_off_avg_three_point_field_goals_attempted',
	'opp_off_avg_free_throws_made',
	'opp_off_avg_free_throws_attempted',
	'opp_off_avg_offensive_rebounds',
	'opp_off_avg_assists',
	'opp_off_points',
	'opp_off_field_goals_made',
	'opp_off_field_goals_attempted',
	'opp_off_three_point_field_goals_made',
	'opp_off_three_point_field_goals_attempted',
	'opp_off_free_throws_made',
	'opp_off_free_throws_attempted',
	'opp_off_offensive_rebounds',
	'opp_off_offensive_rebound_pct',
	'opp_off_scoring_efficiency',
	'opp_off_shooting_efficiency',
	'opp_off_three_point_pct',
	'technical_fouls'
];

export async function fetchEspnStats(season = 26) {
	const response = await fetch(
		`https://site.web.api.espn.com/apis/common/v3/sports/basketball/mens-college-basketball/statistics/byteam?limit=370&conference=50&season=20${season}`
	);
	const data = await response.json();

	const missingRanks = new Set<string>();

	const teams: Record<string, any>[] = data.teams.map((team: any) => {
		const teamData: Record<string, any> = {
			team_key: ESPN_TO_TEAM_KEY[team.team.id],
			season
		};

		team.categories.forEach((cat: any) => {
			let keyPrefix = '';

			if (cat.displayName.startsWith('Opponent')) {
				keyPrefix += 'opp_';
			}

			if (cat.name === 'offensive') {
				keyPrefix += 'off_';
			} else if (cat.name === 'defensive') {
				keyPrefix += 'def_';
			} else if (cat.name === 'differential') {
				keyPrefix += 'dif_';
			}

			const labels: string[] = data.categories
				.find((c: any) => c.names && c.name === cat.name)
				.names.map((n: string) => camelToSnake(n));

			cat.values.forEach((value: number, i: number) => {
				teamData[keyPrefix + labels[i]] = value;

				if (IGNORE_RANKS.includes(keyPrefix + labels[i])) {
					return;
				}

				const rank = parseInt(cat.ranks?.[i]);

				if (!isNaN(rank)) {
					teamData[keyPrefix + labels[i] + '_rank'] = rank;
				} else {
					missingRanks.add(keyPrefix + labels[i]);
				}
			});
		});

		return teamData;
	});

	missingRanks.forEach((key: string) => {
		const sorted = teams
			.filter(t => t[key] != null)
			.sort((a, b) => (REVERSE_RANKS.includes(key) ? a[key] - b[key] : b[key] - a[key]));
		sorted.forEach((t, i) => (t[key + '_rank'] = i + 1));
	});

	return teams;
}

const db = PostgresService.getInstance();

export async function updateEspnStats(season = 26) {
	const teams = await fetchEspnStats(season);

	const columns = Object.keys(teams[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
	const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
	const updates = columns
		.filter(c => c !== 'team_key' && c !== 'season')
		.map(c => `${c} = EXCLUDED.${c}`)
		.join(', ');

	const query = `
		INSERT INTO espn_stats (${columns.join(', ')})
		VALUES (${placeholders})
		ON CONFLICT (team_key, season) DO UPDATE SET ${updates}
	`;

	await db.transaction(
		teams.map(team => ({
			query,
			params: columns.map(c => team[c])
		}))
	);

	console.log(`ESPN STATS: Successfully updated ${teams.length} teams.`);
}

export async function getEspnStats(teamKey: string) {
	return await db.query(
		`SELECT * FROM espn_stats
        WHERE team_key = $1
        ORDER BY season DESC`,
		[teamKey]
	);
}

function camelToSnake(str: string) {
	return str.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
}
