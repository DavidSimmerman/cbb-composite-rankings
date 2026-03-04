import { BrowserContext } from 'playwright';
import { PostgresService } from '../database';
import { calculateZScores, validateRankings } from './utils';

const db = PostgresService.getInstance();

export interface KenPomRanking {
	id: string;
	date: string;
	team_key: string;
	rank: number;
	team: string;
	conference: string;
	win_loss: string;
	net_rating: number;
	offensive_rating: number;
	offensive_rating_rank: number;
	defensive_rating: number;
	defensive_rating_rank: number;
	adjusted_tempo: number;
	adjusted_tempo_rank: number;
	luck: number;
	luck_rank: number;
	sos_net_rating: number;
	sos_net_rating_rank: number;
	sos_offensive_rating: number;
	sos_offensive_rating_rank: number;
	sos_defensive_rating: number;
	sos_defensive_rating_rank: number;
	noncon_sos: number;
	noncon_sos_rank: number;
	seed: number;
	coach: string;
	pythag: number;
	pythag_rank: number;
	raw_oe: number;
	raw_oe_rank: number;
	raw_de: number;
	raw_de_rank: number;
	raw_tempo: number;
	raw_tempo_rank: number;
	apl_off: number;
	apl_off_rank: number;
	apl_def: number;
	apl_def_rank: number;
	conf_apl_off: number;
	conf_apl_off_rank: number;
	conf_apl_def: number;
	conf_apl_def_rank: number;
	net_rating_zscore: number;
	offensive_rating_zscore: number;
	defensive_rating_zscore: number;
	created_at: string;
	updated_at: string;
	season: string;
}

interface KenPomApiResponse {
	TeamName: string;
	Season: number;
	Seed: number;
	ConfShort: string;
	Coach: string;
	Wins: number;
	Losses: number;
	AdjEM: number;
	RankAdjEM: number;
	Pythag: number;
	RankPythag: number;
	AdjOE: number;
	RankAdjOE: number;
	OE: number;
	RankOE: number;
	AdjDE: number;
	RankAdjDE: number;
	DE: number;
	RankDE: number;
	Tempo: number;
	RankTempo: number;
	AdjTempo: number;
	RankAdjTempo: number;
	Luck: number;
	RankLuck: number;
	SOS: number;
	RankSOS: number;
	SOSO: number;
	RankSOSO: number;
	SOSD: number;
	RankSOSD: number;
	NCSOS: number;
	RankNCSOS: number;
	APL_Off: number;
	RankAPL_Off: number;
	APL_Def: number;
	RankAPL_Def: number;
	ConfAPL_Off: number;
	RankConfAPL_Off: number;
	ConfAPL_Def: number;
	RankConfAPL_Def: number;
}

export const KP_QUERY = `
	INSERT INTO kenpom_rankings (
		team_key, team, rank, conference, win_loss, net_rating,
		offensive_rating, offensive_rating_rank, defensive_rating, defensive_rating_rank,
		adjusted_tempo, adjusted_tempo_rank, luck, luck_rank,
		sos_net_rating, sos_net_rating_rank,
		sos_offensive_rating, sos_offensive_rating_rank,
		sos_defensive_rating, sos_defensive_rating_rank,
		noncon_sos, noncon_sos_rank,
		seed, coach, pythag, pythag_rank,
		raw_oe, raw_oe_rank, raw_de, raw_de_rank,
		raw_tempo, raw_tempo_rank,
		apl_off, apl_off_rank, apl_def, apl_def_rank,
		conf_apl_off, conf_apl_off_rank, conf_apl_def, conf_apl_def_rank,
		net_rating_zscore, offensive_rating_zscore, defensive_rating_zscore,
		season
	) VALUES (
		$1, $2, $3, $4, $5, $6,
		$7, $8, $9, $10,
		$11, $12, $13, $14,
		$15, $16,
		$17, $18,
		$19, $20,
		$21, $22,
		$23, $24, $25, $26,
		$27, $28, $29, $30,
		$31, $32,
		$33, $34, $35, $36,
		$37, $38, $39, $40,
		$41, $42, $43,
		$44
	)
	ON CONFLICT (team_key, date) DO UPDATE SET
		team = EXCLUDED.team, rank = EXCLUDED.rank, conference = EXCLUDED.conference,
		win_loss = EXCLUDED.win_loss, net_rating = EXCLUDED.net_rating,
		offensive_rating = EXCLUDED.offensive_rating, offensive_rating_rank = EXCLUDED.offensive_rating_rank,
		defensive_rating = EXCLUDED.defensive_rating, defensive_rating_rank = EXCLUDED.defensive_rating_rank,
		adjusted_tempo = EXCLUDED.adjusted_tempo, adjusted_tempo_rank = EXCLUDED.adjusted_tempo_rank,
		luck = EXCLUDED.luck, luck_rank = EXCLUDED.luck_rank,
		sos_net_rating = EXCLUDED.sos_net_rating, sos_net_rating_rank = EXCLUDED.sos_net_rating_rank,
		sos_offensive_rating = EXCLUDED.sos_offensive_rating, sos_offensive_rating_rank = EXCLUDED.sos_offensive_rating_rank,
		sos_defensive_rating = EXCLUDED.sos_defensive_rating, sos_defensive_rating_rank = EXCLUDED.sos_defensive_rating_rank,
		noncon_sos = EXCLUDED.noncon_sos, noncon_sos_rank = EXCLUDED.noncon_sos_rank,
		seed = EXCLUDED.seed, coach = EXCLUDED.coach,
		pythag = EXCLUDED.pythag, pythag_rank = EXCLUDED.pythag_rank,
		raw_oe = EXCLUDED.raw_oe, raw_oe_rank = EXCLUDED.raw_oe_rank,
		raw_de = EXCLUDED.raw_de, raw_de_rank = EXCLUDED.raw_de_rank,
		raw_tempo = EXCLUDED.raw_tempo, raw_tempo_rank = EXCLUDED.raw_tempo_rank,
		apl_off = EXCLUDED.apl_off, apl_off_rank = EXCLUDED.apl_off_rank,
		apl_def = EXCLUDED.apl_def, apl_def_rank = EXCLUDED.apl_def_rank,
		conf_apl_off = EXCLUDED.conf_apl_off, conf_apl_off_rank = EXCLUDED.conf_apl_off_rank,
		conf_apl_def = EXCLUDED.conf_apl_def, conf_apl_def_rank = EXCLUDED.conf_apl_def_rank,
		net_rating_zscore = EXCLUDED.net_rating_zscore, offensive_rating_zscore = EXCLUDED.offensive_rating_zscore,
		defensive_rating_zscore = EXCLUDED.defensive_rating_zscore,
		season = EXCLUDED.season
`;

export function mapApiTeam(t: KenPomApiResponse): Record<string, unknown> {
	const teamKey = t.TeamName.toLowerCase()
		.replaceAll(' ', '_')
		.replaceAll(/[^a-z_]/g, '');

	return {
		team_key: teamKey,
		team: t.TeamName,
		rank: t.RankAdjEM,
		conference: t.ConfShort,
		win_loss: `${t.Wins}-${t.Losses}`,
		net_rating: t.AdjEM,
		offensive_rating: t.AdjOE,
		offensive_rating_rank: t.RankAdjOE,
		defensive_rating: t.AdjDE,
		defensive_rating_rank: t.RankAdjDE,
		adjusted_tempo: t.AdjTempo,
		adjusted_tempo_rank: t.RankAdjTempo,
		luck: t.Luck,
		luck_rank: t.RankLuck,
		sos_net_rating: t.SOS,
		sos_net_rating_rank: t.RankSOS,
		sos_offensive_rating: t.SOSO,
		sos_offensive_rating_rank: t.RankSOSO,
		sos_defensive_rating: t.SOSD,
		sos_defensive_rating_rank: t.RankSOSD,
		noncon_sos: t.NCSOS,
		noncon_sos_rank: t.RankNCSOS,
		seed: t.Seed,
		coach: t.Coach,
		pythag: t.Pythag,
		pythag_rank: t.RankPythag,
		raw_oe: t.OE,
		raw_oe_rank: t.RankOE,
		raw_de: t.DE,
		raw_de_rank: t.RankDE,
		raw_tempo: t.Tempo,
		raw_tempo_rank: t.RankTempo,
		apl_off: t.APL_Off,
		apl_off_rank: t.RankAPL_Off,
		apl_def: t.APL_Def,
		apl_def_rank: t.RankAPL_Def,
		conf_apl_off: t.ConfAPL_Off,
		conf_apl_off_rank: t.RankConfAPL_Off,
		conf_apl_def: t.ConfAPL_Def,
		conf_apl_def_rank: t.RankConfAPL_Def,
		season: String(t.Season).slice(2)
	};
}

export function getKpDbParams(team: Record<string, unknown>) {
	return [
		team.team_key,
		team.team,
		team.rank,
		team.conference,
		team.win_loss,
		team.net_rating,
		team.offensive_rating,
		team.offensive_rating_rank,
		team.defensive_rating,
		team.defensive_rating_rank,
		team.adjusted_tempo,
		team.adjusted_tempo_rank,
		team.luck,
		team.luck_rank,
		team.sos_net_rating,
		team.sos_net_rating_rank,
		team.sos_offensive_rating,
		team.sos_offensive_rating_rank,
		team.sos_defensive_rating,
		team.sos_defensive_rating_rank,
		team.noncon_sos,
		team.noncon_sos_rank,
		team.seed,
		team.coach,
		team.pythag,
		team.pythag_rank,
		team.raw_oe,
		team.raw_oe_rank,
		team.raw_de,
		team.raw_de_rank,
		team.raw_tempo,
		team.raw_tempo_rank,
		team.apl_off,
		team.apl_off_rank,
		team.apl_def,
		team.apl_def_rank,
		team.conf_apl_off,
		team.conf_apl_off_rank,
		team.conf_apl_def,
		team.conf_apl_def_rank,
		team.net_rating_zscore,
		team.offensive_rating_zscore,
		team.defensive_rating_zscore,
		team.season
	];
}

export async function fetchKenpomRankings(year = 2026): Promise<Record<string, unknown>[]> {
	const startTime = Date.now();

	const url = year ? `https://kenpom.com/api.php?endpoint=ratings&y=${year}` : 'https://kenpom.com/api.php?endpoint=ratings';

	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${process.env.KP_API_KEY}` }
	});

	if (!response.ok) {
		throw new Error(`KenPom API returned ${response.status}: ${await response.text()}`);
	}

	const data: KenPomApiResponse[] = await response.json();

	let teams = data.map(mapApiTeam);

	teams = calculateZScores(teams, [
		{ source: 'net_rating' },
		{ source: 'offensive_rating' },
		{ source: 'defensive_rating', flip: true }
	]);

	const took = Math.round((Date.now() - startTime) / 10) / 100;
	console.log(`RANKINGS FETCH: KenPom rankings took ${took}s (${teams.length} teams).`);

	return teams;
}

// BrowserContext param kept for compatibility with rankingsMap signature
export async function updateKenPom(_browser?: BrowserContext) {
	const teams = await fetchKenpomRankings();

	validateRankings(teams, 'KenPom');

	await db.transaction(
		teams.map(team => ({
			query: KP_QUERY,
			params: getKpDbParams(team)
		}))
	);

	console.log(`RANKINGS FETCH: KenPom rankings successfully updated.`);
}
