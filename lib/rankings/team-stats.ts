// Team page Stats tab: every stat, its value for the team, and where it ranks among all D1 teams
// that season. Ranks are computed here from the raw numbers of every team (rather than read from each
// model's own rank column) so every stat ranks the same way: 1 = best, in the stat's direction.
// Grading is in lib/grades.ts.
import { PostgresService } from '../database';
import { percentileFromRank, type StatRow, type StatSection, type StatSide } from '../grades';

const db = PostgresService.getInstance();

type Fmt = 'pct' | 'd1' | 'd2' | 'signed1' | 'signed2' | 'signed3' | 'rank';

/** SQL over the aliases k (KenPom), b (BartTorvik), m (EvanMiya), e (ESPN stats). */
type Side = { sql: string; higher: boolean; fmt: Fmt };
type RowDef = Omit<StatRow, 'off' | 'def'> & { off?: Side; def?: Side };
type SectionDef = Omit<StatSection, 'rows'> & { rows: RowDef[] };

const up = (sql: string, fmt: Fmt): Side => ({ sql, higher: true, fmt });
const down = (sql: string, fmt: Fmt): Side => ({ sql, higher: false, fmt });
const ts = (p: string) =>
	`${p}points / NULLIF(2 * (${p}field_goals_attempted + 0.44 * ${p}free_throws_attempted), 0) * 100`;

// Offense = what the team does; Defense = what opponents do against it.
// Style rows rank by volume (1 = most) and are never graded.
export const STAT_SECTIONS: SectionDef[] = [
	{
		key: 'eff',
		title: 'Efficiency',
		blurb: 'Points per trip, the bottom line',
		rows: [
			{ id: 'adj_eff', name: 'Adjusted efficiency', offLabel: 'Adj. offensive efficiency', defLabel: 'Adj. defensive efficiency', off: up('k.offensive_rating', 'd1'), def: down('k.defensive_rating', 'd1') },
			{ id: 'ppp', name: 'Points / possession', defLabel: 'Opp points / possession', off: up('e.off_scoring_efficiency', 'd2'), def: down('e.opp_off_scoring_efficiency', 'd2') },
			{ id: 'ppg', name: 'Points / game', defLabel: 'Opp points / game', off: up('e.off_avg_points', 'd1'), def: down('e.opp_off_avg_points', 'd1') },
			{ id: 'ts', name: 'True shooting %', defLabel: 'Opp true shooting %', off: up(ts('e.off_'), 'pct'), def: down(ts('e.opp_off_'), 'pct') },
			{ id: 'efg', name: 'Effective FG%', defLabel: 'Opp effective FG%', off: up('b.efg_pct', 'pct'), def: down('b.efgd_pct', 'pct') }
		]
	},
	{
		key: 'shoot',
		title: 'Shooting',
		blurb: 'Making shots and contesting them',
		rows: [
			{ id: 'fg', name: 'FG%', defLabel: 'Opp FG%', off: up('e.off_field_goal_pct', 'pct'), def: down('e.opp_off_field_goal_pct', 'pct') },
			{ id: '2p', name: '2pt%', defLabel: 'Opp 2pt%', off: up('b."2p_pct"', 'pct'), def: down('b."2p_pct_d"', 'pct') },
			{ id: '3p', name: '3pt%', defLabel: 'Opp 3pt%', off: up('b."3p_pct"', 'pct'), def: down('b."3p_pct_d"', 'pct') },
			{ id: '3pm', name: '3s made / game', defLabel: 'Opp 3s made / game', off: up('e.off_avg_three_point_field_goals_made', 'd1'), def: down('e.opp_off_avg_three_point_field_goals_made', 'd1') },
			{ id: 'ft', name: 'FT%', defLabel: 'Opp FT%', off: up('e.off_free_throw_pct', 'pct'), def: down('e.opp_off_free_throw_pct', 'pct') }
		]
	},
	{
		key: 'shape',
		title: 'Shot profile',
		blurb: 'How they play: shown, not graded',
		rows: [
			{ id: '3pr', name: '3pt rate', defLabel: 'Opp 3pt rate', style: true, off: up('b."3pr"', 'pct'), def: up('b."3prd"', 'pct') },
			{ id: '3pa', name: '3s attempted / game', defLabel: 'Opp 3s attempted / game', style: true, off: up('e.off_avg_three_point_field_goals_attempted', 'd1'), def: up('e.opp_off_avg_three_point_field_goals_attempted', 'd1') },
			{ id: 'fga', name: 'Shots / game', defLabel: 'Opp shots / game', style: true, off: up('e.off_avg_field_goals_attempted', 'd1'), def: up('e.opp_off_avg_field_goals_attempted', 'd1') },
			{ id: 'apl', name: 'Possession length', note: 'seconds', offLabel: 'Possession length', defLabel: 'Opp possession length', style: true, off: up('k.apl_off', 'd1'), def: up('k.apl_def', 'd1') },
			{ id: 'tempo', name: 'Tempo', note: 'possessions / 40', style: true, off: up('k.adjusted_tempo', 'd1') }
		]
	},
	{
		key: 'ball',
		title: 'Ball control',
		blurb: 'Protecting it and taking it away',
		rows: [
			{ id: 'tor', name: 'Turnover rate', defLabel: 'Forced turnover rate', off: down('b.tor', 'pct'), def: up('b.tord', 'pct') },
			{ id: 'tov', name: 'Turnovers / game', defLabel: 'Opp turnovers / game', off: down('e.off_avg_turnovers', 'd1'), def: up('e.opp_off_avg_turnovers', 'd1') },
			{ id: 'stl', name: 'Steals / game', offLabel: 'Steals against / game', defLabel: 'Steals / game', off: down('e.opp_def_avg_steals', 'd1'), def: up('e.def_avg_steals', 'd1') },
			{ id: 'ast_pct', name: 'Assist %', defLabel: 'Opp assist %', off: up('e.off_assist_percentage', 'pct'), def: down('e.opp_off_assist_percentage', 'pct') },
			{ id: 'ast_to', name: 'Assist : turnover', defLabel: 'Opp assist : turnover', off: up('e.assist_turnover_ratio', 'd2'), def: down('e.opp_assist_turnover_ratio', 'd2') }
		]
	},
	{
		key: 'glass',
		title: 'Rebounding',
		blurb: 'Extra possessions and ending them',
		rows: [
			{ id: 'reb_pct', name: 'Rebound %', offLabel: 'Off. rebound %', defLabel: 'Def. rebound %', off: up('b.orb', 'pct'), def: up('100 - b.drb', 'pct') },
			{ id: 'reb', name: 'Rebounds / game', defLabel: 'Opp rebounds / game', off: up('e.avg_rebounds', 'd1'), def: down('e.opp_avg_rebounds', 'd1') },
			{ id: 'oreb', name: 'Off. rebounds / game', defLabel: 'Opp off. rebounds / game', off: up('e.off_avg_offensive_rebounds', 'd1'), def: down('e.opp_off_avg_offensive_rebounds', 'd1') },
			{ id: 'reb_margin', name: 'Rebound margin / game', off: up('e.dif_avg_rebounds_differential', 'signed1') },
			{ id: 'blk', name: 'Blocks / game', offLabel: 'Shots blocked / game', defLabel: 'Blocks / game', off: down('e.opp_def_avg_blocks', 'd1'), def: up('e.def_avg_blocks', 'd1') }
		]
	},
	{
		key: 'disc',
		title: 'Discipline',
		blurb: 'Fouls, free throws, staying in front',
		rows: [
			{ id: 'fouls', name: 'Fouls / game', offLabel: 'Fouls drawn / game', defLabel: 'Fouls / game', off: up('e.opp_avg_fouls', 'd1'), def: down('e.avg_fouls', 'd1') },
			{ id: 'ftr', name: 'FT rate', defLabel: 'Opp FT rate', off: up('b.ftr', 'pct'), def: down('b.ftrd', 'pct') },
			{ id: 'fta', name: 'FTA / game', defLabel: 'Opp FTA / game', off: up('e.off_avg_free_throws_attempted', 'd1'), def: down('e.opp_off_avg_free_throws_attempted', 'd1') },
			{ id: 'ftm', name: 'Points at the line', defLabel: 'Opp points at the line', off: up('e.off_avg_free_throws_made', 'd1'), def: down('e.opp_off_avg_free_throws_made', 'd1') }
		]
	},
	{
		key: 'clutch',
		title: 'Momentum',
		blurb: 'Runs, margins and close games',
		rows: [
			{ id: 'killshots', name: 'Killshots / game', note: '10-0 runs (EvanMiya)', defLabel: 'Killshots conceded / game', off: up('m.kill_shots_per_game', 'd1'), def: down('m.kill_shots_conceded_per_game', 'd1') },
			{ id: 'killshot_margin', name: 'Killshot margin / game', off: up('m.kill_shots_margin_per_game', 'signed1') },
			{ id: 'margin', name: 'Point margin / game', off: up('e.dif_avg_points_differential', 'signed1') },
			{ id: 'luck', name: 'Luck', note: 'close-game results vs. expected (KenPom)', style: true, off: up('k.luck', 'signed3') }
		]
	},
	{
		key: 'team',
		title: 'Roster & schedule',
		blurb: 'Who they are and who they played',
		rows: [
			{ id: 'sos', name: 'Strength of schedule', offLabel: 'Opp defensive SOS', defLabel: 'Opp offensive SOS', note: "opponents' average adj. defense / offense", off: down('k.sos_defensive_rating', 'd1'), def: up('k.sos_offensive_rating', 'd1') },
			{ id: 'sos_net', name: 'Overall SOS', off: up('k.sos_net_rating', 'signed2') },
			{ id: 'noncon_sos', name: 'Non-conference SOS', off: up('k.noncon_sos', 'signed2') },
			{ id: 'roster', name: 'Roster rank', note: 'EvanMiya', off: down('m.roster_rank', 'rank') }
		]
	}
];

function format(v: number, fmt: Fmt) {
	switch (fmt) {
		case 'pct':
			return `${v.toFixed(1)}%`;
		case 'd1':
			return v.toFixed(1);
		case 'd2':
			return v.toFixed(2);
		case 'signed1':
			return `${v > 0 ? '+' : ''}${v.toFixed(1)}`;
		case 'signed2':
			return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
		case 'signed3':
			return `${v > 0 ? '+' : ''}${v.toFixed(3)}`;
		case 'rank':
			return `#${Math.round(v)}`;
	}
}

const sides = (['off', 'def'] as const).flatMap(side =>
	STAT_SECTIONS.flatMap(s => s.rows.flatMap(r => (r[side] ? [{ col: `${side}__${r.id}`, def: r[side]! }] : [])))
);

type SeasonTable = { at: number; rows: Record<string, number | null>[] };
const cache = new Map<number, SeasonTable>();
const TTL = 10 * 60 * 1000;

// Every D1 team's numbers for a season: KenPom's last snapshot defines who's D1
async function seasonTable(season: number) {
	const hit = cache.get(season);
	if (hit && Date.now() - hit.at < TTL) return hit.rows;

	const last = (table: string) =>
		`SELECT * FROM ${table} WHERE season::int = $1 AND date = (SELECT MAX(date) FROM ${table} WHERE season::int = $1)`;
	const rows = await db.query<Record<string, number | null>>(
		`WITH k AS (${last('kenpom_rankings')}),
			b AS (${last('barttorvik_rankings')}),
			m AS (${last('evanmiya_rankings')}),
			e AS (SELECT * FROM espn_stats WHERE season::int = $1)
		SELECT k.team_key,
			${sides.map(s => `(${s.def.sql})::float8 AS "${s.col}"`).join(',\n\t\t\t')}
		FROM k
		LEFT JOIN b ON b.team_key = k.team_key
		LEFT JOIN m ON m.team_key = k.team_key
		LEFT JOIN e ON e.team_key = k.team_key`,
		[season]
	);
	cache.set(season, { at: Date.now(), rows });
	return rows;
}

export async function getTeamStatSections(teamKey: string, season: number): Promise<StatSection[]> {
	const rows = await seasonTable(season);
	const team = rows.find(r => (r.team_key as unknown as string) === teamKey);

	const sideFor = (col: string, def: Side): StatSide | null => {
		const value = team?.[col];
		if (value == null || !Number.isFinite(value)) return null;
		const all = rows.map(r => r[col]).filter((v): v is number => v != null && Number.isFinite(v));
		const better = all.filter(v => (def.higher ? v > value : v < value)).length;
		const rank = better + 1;
		return { value, display: format(value, def.fmt), rank, n: all.length, pct: percentileFromRank(rank, all.length) };
	};

	return STAT_SECTIONS.map(s => ({
		...s,
		rows: s.rows.map(r => ({
			...r,
			off: r.off ? sideFor(`off__${r.id}`, r.off) : undefined,
			def: r.def ? sideFor(`def__${r.id}`, r.def) : undefined
		}))
	}));
}
