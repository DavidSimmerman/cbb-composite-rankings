import { PostgresService } from '../database';
import { ESPN_TO_TEAM_KEY } from './espn-team-ids';

const db = PostgresService.getInstance();

export interface TeamData {
	team_key: string;
	abbreviation: string;
	color: string;
	secondary_color: string;
	name: string;
	espn_id: number;
	school: string;
	mascot: string;
	nickname: string;
	short_name: string;
}

export async function updateTeamData() {
	const response = await fetch(
		'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=400'
	);
	const data = await response.json();

	const teams: TeamData[] = data.sports[0].leagues[0].teams
		.map((entry: any) => {
			const t = entry.team;
			const teamKey = ESPN_TO_TEAM_KEY[t.id];
			if (!teamKey) return null;

			return {
				team_key: teamKey,
				abbreviation: t.abbreviation,
				color: t.color,
				secondary_color: t.alternateColor,
				name: t.displayName,
				espn_id: parseInt(t.id),
				school: t.location,
				mascot: t.name,
				nickname: t.nickname,
				short_name: t.shortDisplayName
			};
		})
		.filter(Boolean);

	const query = `
		INSERT INTO team_data (
			team_key, abbreviation, color, secondary_color, name,
			espn_id, school, mascot, nickname, short_name
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (team_key) DO UPDATE SET
			abbreviation = EXCLUDED.abbreviation,
			color = EXCLUDED.color,
			secondary_color = EXCLUDED.secondary_color,
			name = EXCLUDED.name,
			espn_id = EXCLUDED.espn_id,
			school = EXCLUDED.school,
			mascot = EXCLUDED.mascot,
			nickname = EXCLUDED.nickname,
			short_name = EXCLUDED.short_name,
			updated_at = CURRENT_TIMESTAMP
	`;

	await db.transaction(
		teams.map(team => ({
			query,
			params: [
				team.team_key,
				team.abbreviation,
				team.color,
				team.secondary_color,
				team.name,
				team.espn_id,
				team.school,
				team.mascot,
				team.nickname,
				team.short_name
			]
		}))
	);

	console.log(`ESPN TEAM DATA: Successfully updated ${teams.length} teams.`);
}

export async function getAllTeamData(): Promise<Record<string, TeamData>> {
	const rows = await db.query<TeamData>('SELECT * FROM team_data');
	return Object.fromEntries(rows.map(row => [row.team_key, row]));
}

export async function getTeamData(teamKey: string): Promise<TeamData | null> {
	const rows = await db.query<TeamData>('SELECT * FROM team_data WHERE team_key = $1', [teamKey]);
	return rows[0] ?? null;
}
