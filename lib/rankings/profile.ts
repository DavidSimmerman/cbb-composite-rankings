import { load as cheerioLoad } from 'cheerio';
import { PostgresService } from '../database';
import { ApPollTeam } from '../espn/ap-poll';
import { getPartialGame } from '../espn/espn-game';
import { EspnStats } from '../espn/espn-stats';
import { EspnGame, getSchedule, getScheduleEnriched, ParsedEspnGame } from '../espn/schedule';
import { ESPN_TEAM_IDS } from '../espn/espn-team-ids';
import { BartTorvikRanking } from './barttorvik';
import { CompositeRanking } from './composite';
import { EvanMiyaRanking } from './evanmiya';
import { KenPomRanking } from './kenpom';
import { NetRanking } from './net';

const db = PostgresService.getInstance();

type Prefix<T, P extends string> = {
	[K in keyof T as K extends string ? `${P}_${K}` : never]: T[K];
};

type SystemFields = 'id' | 'date' | 'created_at' | 'updated_at' | 'team_key';

export type FullRatings = Prefix<Omit<KenPomRanking, SystemFields>, 'kp'> &
	Prefix<Omit<EvanMiyaRanking, SystemFields>, 'em'> &
	Prefix<Omit<BartTorvikRanking, SystemFields>, 'bt'> &
	Prefix<Omit<NetRanking, SystemFields>, 'net'> &
	Prefix<Omit<ApPollTeam, SystemFields>, 'ap'> &
	Prefix<Omit<CompositeRanking, SystemFields>, 'comp'> &
	Prefix<Omit<EspnStats, SystemFields>, 'espn'> & { ap_rank: number | undefined };

interface TeamProfileRow {
	team_key: string;
	date: string;
}

interface KenPomProfileRow extends TeamProfileRow {
	kp_rating: number;
	kp_rating_zscore: number;
	kp_rating_rank: number;
	kp_offensive_rating: number;
	kp_offensive_zscore: number;
	kp_offensive_rating_rank: number;
	kp_defensive_rating: number;
	kp_defensive_zscore: number;
	kp_defensive_rating_rank: number;
}

interface EvanMiyaProfileRow extends TeamProfileRow {
	team_name?: string;
	em_rating: number;
	em_rating_zscore: number;
	em_rating_rank: number;
	em_offensive_rating: number;
	em_offensive_zscore: number;
	em_offensive_rating_rank: number;
	em_defensive_rating: number;
	em_defensive_zscore: number;
	em_defensive_rating_rank: number;
}

interface BartTorvikProfileRow extends TeamProfileRow {
	bt_rating: number;
	bt_rating_zscore: number;
	bt_rating_rank: number;
	bt_offensive_rating: number;
	bt_offensive_zscore: number;
	bt_offensive_rating_rank: number;
	bt_defensive_rating: number;
	bt_defensive_zscore: number;
	bt_defensive_rating_rank: number;
}

interface NetProfileRow extends TeamProfileRow {
	net_rank: number;
	net_rank_zscore: number;
}

interface CompositeProfileRow extends TeamProfileRow {
	avg_zscore: number;
	avg_zscore_rank: number;
	avg_offensive_zscore: number;
	avg_offensive_zscore_rank: number;
	avg_defensive_zscore: number;
	avg_defensive_zscore_rank: number;
	sources: string;
}

type TeamProfileData = KenPomProfileRow &
	EvanMiyaProfileRow &
	BartTorvikProfileRow &
	NetProfileRow &
	CompositeProfileRow & { composite_combos: Record<string, CompositeProfileRow> };

export type ProfileRatingsHistory = Record<string, TeamProfileData>;

export type ParsedTeamProfile = Omit<TeamProfile, 'schedule'> & { schedule: ParsedEspnGame[] };

export interface SeasonSnapshot {
	season: string;
	comp_score: number;
	comp_rank: number;
	comp_off_score: number;
	comp_off_rank: number;
	comp_def_score: number;
	comp_def_rank: number;
	kp_rank: number;
	kp_offensive_rating: number;
	kp_offensive_rating_rank: number;
	kp_defensive_rating: number;
	kp_defensive_rating_rank: number;
	kp_net_rating: number;
	kp_adjusted_tempo: number;
	kp_adjusted_tempo_rank: number;
	bt_adjoe: number;
	bt_adjoe_rank: number;
	bt_adjde: number;
	bt_adjde_rank: number;
	bt_3p_pct: number;
	bt_3p_pct_rank: number;
	bt_3p_pct_d: number;
	bt_3p_pct_d_rank: number;
	bt_3pr: number;
	bt_3pr_rank: number;
	bt_efg_pct: number;
	bt_efg_pct_rank: number;
	bt_efgd_pct: number;
	bt_efgd_pct_rank: number;
	bt_tor: number;
	bt_tor_rank: number;
	bt_tord: number;
	bt_tord_rank: number;
	bt_orb: number;
	bt_orb_rank: number;
	bt_drb: number;
	bt_drb_rank: number;
	bt_ftr: number;
	bt_ftr_rank: number;
	bt_2p_pct: number;
	bt_2p_pct_rank: number;
	espn_fg_pct: number;
	espn_fg_pct_rank: number;
	espn_opp_fg_pct: number;
	espn_opp_fg_pct_rank: number;
	espn_3p_pct: number;
	espn_3p_pct_rank: number;
	espn_opp_3p_pct: number;
	espn_opp_3p_pct_rank: number;
	espn_ft_pct: number;
	espn_ft_pct_rank: number;
	espn_avg_turnovers: number;
	espn_avg_turnovers_rank: number;
	espn_opp_avg_turnovers: number;
	espn_opp_avg_turnovers_rank: number;
	espn_orb_pct: number;
	espn_orb_pct_rank: number;
	espn_avg_orb: number;
	espn_avg_orb_rank: number;
	espn_avg_drb: number;
	espn_avg_drb_rank: number;
}

// ─── March Analysis Types ────────────────────────────────────────────────

export interface SeedLineValue {
	projected_seed: number;
	avg_seed: number | null; // Bracket Matrix precise decimal (e.g. 3.15), null if not on BM
	team_kp_rating: number;
	seed_avg_rating: number;
	seed_median_rating: number;
	rating_percentile: number;
	implied_seed: number;
	seed_outcomes: { round: string; reach_pct: number }[];
	notable_comps: { season: number; team_key: string; team_name: string; kp_rating: number; seed: number; wins: number; deepest_round: string }[];
}

export interface HistoricalComp {
	season: number;
	team_key: string;
	team_name: string;
	seed: number;
	similarity: number;
	kp_net_rating: number;
	kp_tempo: number;
	wins: number;
	deepest_round: string;
}

export interface StyleFactor {
	key: string;
	label: string;
	description: string;
	applies: boolean;
	team_value: number | null;
	team_rank: number | null;
	sample_size: number;
	avg_wins_above_seed: number;
	seed_baseline_wins: number;
	final_four_rate: number;
	deep_run_rate: number;
	round_32_rate: number;
	percentile: number;  // 0-100
	verdict: 'positive' | 'negative' | 'neutral';
}

export interface MarchAnalysis {
	seed_line: SeedLineValue;
	similar_teams: HistoricalComp[];
	style_factors: StyleFactor[];  // top 3
	march_score: number;           // 0-100 composite (style + comps + rating)
	style_score: number;           // 0-100 from style factors
	comps_score: number;           // 0-100 from similar teams wins vs seed
	rating_score: number;          // 0-100 rating vs historical same-seeds
	num_qualifying_factors: number;
	expected_wins: number;
}

export interface TeamProfile {
	team_key: string;
	team_name: string;
	ratings_history: ProfileRatingsHistory;
	full_ratings: Record<string, FullRatings>;
	season_snapshots: SeasonSnapshot[];
	schedule: EspnGame[];
	march_analysis: MarchAnalysis | null;
}

async function getFullRatings(teamKey: string) {
	function getQuery(table: string, columns: string, hasSeason = true) {
		return `SELECT ${columns} FROM ${table}
            WHERE team_key = $1
            	AND date = (SELECT MAX(date) FROM ${table})
				${hasSeason ? `AND season = (SELECT MAX(season) FROM ${table})` : ''}
			ORDER BY date DESC`;
	}

	const [kenPomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, compositeRankings, apRankings, espnStats] = await Promise.all([
		db.query(
			getQuery(
				'kenpom_rankings',
				`season, rank, win_loss, offensive_rating, defensive_rating,
				adjusted_tempo, adjusted_tempo_rank,
				sos_offensive_rating, sos_offensive_rating_rank,
				sos_defensive_rating, sos_defensive_rating_rank`
			),
			[teamKey]
		),
		db.query(
			getQuery(
				'evanmiya_rankings',
				`kill_shots_per_game, kill_shots_per_game_rank,
				kill_shots_conceded_per_game, kill_shots_conceded_per_game_rank`
			),
			[teamKey]
		),
		db.query(
			getQuery(
				'barttorvik_rankings',
				`efg_pct, efg_pct_rank, efgd_pct, efgd_pct_rank,
				tor, tor_rank, tord, tord_rank,
				orb, orb_rank, drb, drb_rank,
				ftr, ftr_rank, ftrd, ftrd_rank,
				"2p_pct", "2p_pct_rank", "2p_pct_d", "2p_pct_d_rank",
				"3p_pct", "3p_pct_rank", "3p_pct_d", "3p_pct_d_rank",
				"3pr", "3pr_rank", "3prd", "3prd_rank"`
			),
			[teamKey]
		),
		db.query(getQuery('net_rankings', 'conf', false), [teamKey]),
		db.query(
			`SELECT avg_zscore, avg_zscore_rank, avg_offensive_zscore, avg_offensive_zscore_rank, avg_defensive_zscore, avg_defensive_zscore_rank
			FROM composite_rankings
			WHERE team_key = $1
				AND sources = 'kp,em,bt'
				AND date = (SELECT MAX(date) FROM composite_rankings WHERE sources = 'kp,em,bt')
				AND season = (SELECT MAX(season) FROM composite_rankings WHERE sources = 'kp,em,bt')
			ORDER BY date DESC`,
			[teamKey]
		),
		db.query(getQuery('ap_rankings', 'rank', false), [teamKey]),
		db.query(
			`SELECT season,
				off_field_goal_pct, off_three_point_field_goal_pct,
				off_free_throw_pct, off_free_throw_pct_rank,
				off_assist_percentage, off_assist_percentage_rank,
				off_scoring_efficiency, off_scoring_efficiency_rank,
				avg_fouls, avg_fouls_rank,
				opp_avg_fouls, opp_avg_fouls_rank,
				opp_off_field_goal_pct, opp_off_field_goal_pct_rank,
				opp_off_three_point_field_goal_pct, opp_off_free_throw_pct,
				opp_off_assist_percentage, opp_off_assist_percentage_rank,
				opp_off_avg_turnovers, opp_off_avg_turnovers_rank,
				opp_off_scoring_efficiency, opp_off_scoring_efficiency_rank,
				opp_off_avg_points, opp_off_avg_points_rank,
				def_avg_steals, def_avg_steals_rank,
				def_avg_blocks, def_avg_blocks_rank,
				assist_turnover_ratio, assist_turnover_ratio_rank
			FROM espn_stats WHERE team_key = $1 ORDER BY season DESC`,
			[teamKey]
		)
	]);

	const fullRatings: Record<string, FullRatings> = {};

	kenPomRankings.map((kpValues, i) => {
		const fullSeason: Record<string, any> = {};

		Object.entries(kpValues).forEach(([key, value]) => (fullSeason['kp_' + key] = value));
		Object.entries(evanMiyaRankings[i]).forEach(([key, value]) => (fullSeason['em_' + key] = value));
		Object.entries(bartTorvikRankings[i]).forEach(([key, value]) => (fullSeason['bt_' + key] = value));
		Object.entries(compositeRankings[i]).forEach(([key, value]) => (fullSeason['comp_' + key] = value));
		Object.entries(espnStats[i]).forEach(([key, value]) => (fullSeason['espn_' + key] = value));
		if (netRankings[i]) {
			Object.entries(netRankings[i]).forEach(([key, value]) => (fullSeason['net_' + key] = value));
		}
		if (apRankings[i]) {
			Object.entries(apRankings[i]).forEach(([key, value]) => (fullSeason['ap_' + key] = value));
		}

		fullRatings[kpValues.season] = fullSeason as FullRatings;
	});

	return fullRatings;
}

async function getSeasonSnapshots(teamKey: string): Promise<SeasonSnapshot[]> {
	return db.query<SeasonSnapshot>(
		`SELECT
			k.season,
			c.avg_zscore AS comp_score,
			c.avg_zscore_rank AS comp_rank,
			c.avg_offensive_zscore AS comp_off_score,
			c.avg_offensive_zscore_rank AS comp_off_rank,
			c.avg_defensive_zscore AS comp_def_score,
			c.avg_defensive_zscore_rank AS comp_def_rank,
			k.rank AS kp_rank,
			k.offensive_rating AS kp_offensive_rating,
			k.offensive_rating_rank AS kp_offensive_rating_rank,
			k.defensive_rating AS kp_defensive_rating,
			k.defensive_rating_rank AS kp_defensive_rating_rank,
			k.net_rating AS kp_net_rating,
			k.adjusted_tempo AS kp_adjusted_tempo,
			k.adjusted_tempo_rank AS kp_adjusted_tempo_rank,
			b.adjoe AS bt_adjoe, b.adjoe_rank AS bt_adjoe_rank,
			b.adjde AS bt_adjde, b.adjde_rank AS bt_adjde_rank,
			b."3p_pct" AS bt_3p_pct, b."3p_pct_rank" AS bt_3p_pct_rank,
			b."3p_pct_d" AS bt_3p_pct_d, b."3p_pct_d_rank" AS bt_3p_pct_d_rank,
			b."3pr" AS bt_3pr, b."3pr_rank" AS bt_3pr_rank,
			b.efg_pct AS bt_efg_pct, b.efg_pct_rank AS bt_efg_pct_rank,
			b.efgd_pct AS bt_efgd_pct, b.efgd_pct_rank AS bt_efgd_pct_rank,
			b.tor AS bt_tor, b.tor_rank AS bt_tor_rank,
			b.tord AS bt_tord, b.tord_rank AS bt_tord_rank,
			b.orb AS bt_orb, b.orb_rank AS bt_orb_rank,
			b.drb AS bt_drb, b.drb_rank AS bt_drb_rank,
			b.ftr AS bt_ftr, b.ftr_rank AS bt_ftr_rank,
			b."2p_pct" AS bt_2p_pct, b."2p_pct_rank" AS bt_2p_pct_rank,
			e.off_field_goal_pct AS espn_fg_pct, e.off_field_goal_pct_rank AS espn_fg_pct_rank,
			e.opp_off_field_goal_pct AS espn_opp_fg_pct, e.opp_off_field_goal_pct_rank AS espn_opp_fg_pct_rank,
			e.off_three_point_field_goal_pct AS espn_3p_pct, e.off_three_point_field_goal_pct_rank AS espn_3p_pct_rank,
			e.opp_off_three_point_field_goal_pct AS espn_opp_3p_pct, e.opp_off_three_point_field_goal_pct_rank AS espn_opp_3p_pct_rank,
			e.off_free_throw_pct AS espn_ft_pct, e.off_free_throw_pct_rank AS espn_ft_pct_rank,
			e.off_avg_turnovers AS espn_avg_turnovers, e.off_avg_turnovers_rank AS espn_avg_turnovers_rank,
			e.opp_off_avg_turnovers AS espn_opp_avg_turnovers, e.opp_off_avg_turnovers_rank AS espn_opp_avg_turnovers_rank,
			e.off_offensive_rebound_pct AS espn_orb_pct, e.off_offensive_rebound_pct_rank AS espn_orb_pct_rank,
			e.off_avg_offensive_rebounds AS espn_avg_orb, e.off_avg_offensive_rebounds_rank AS espn_avg_orb_rank,
			e.def_avg_defensive_rebounds AS espn_avg_drb, e.def_avg_defensive_rebounds_rank AS espn_avg_drb_rank
		FROM (
			SELECT DISTINCT ON (season) *
			FROM kenpom_rankings
			WHERE team_key = $1
			ORDER BY season, date DESC
		) k
		LEFT JOIN (
			SELECT DISTINCT ON (season) *
			FROM barttorvik_rankings
			WHERE team_key = $1
			ORDER BY season, date DESC
		) b ON k.season = b.season
		LEFT JOIN LATERAL (
			SELECT *
			FROM composite_rankings
			WHERE team_key = $1 AND season = k.season
			ORDER BY date DESC, array_length(string_to_array(sources, ','), 1) DESC
			LIMIT 1
		) c ON true
		LEFT JOIN espn_stats e ON e.team_key = $1 AND e.season = k.season
		ORDER BY k.season ASC`,
		[teamKey]
	);
}

// ─── March Analysis: Cached Tournament Dataset ──────────────────────────

interface TourneyGameRow {
	season: number; round: string;
	team_a_key: string | null; team_b_key: string | null;
	team_a_seed: number; team_b_seed: number;
	home_team_key: string | null; away_team_key: string | null;
	home_score: number | null; away_score: number | null;
}

interface TourneyKenPomRow {
	season: number; team_key: string; team: string;
	net_rating: number; offensive_rating: number; defensive_rating: number;
	adjusted_tempo: number; sos_net_rating: number; rank: number;
}

interface TourneyBartTorvikRow {
	season: number; team_key: string;
	'3pr': number; '3p_pct': number; '3p_pct_d': number;
	tor: number; tord: number; efg_pct: number; orb: number;
	ftr: number; '2p_pct': number;
	'3pr_rank': number; '3p_pct_rank': number; '3p_pct_d_rank': number;
	tor_rank: number; orb_rank: number;
	ftr_rank: number; '2p_pct_rank': number;
}

interface TourneyCompositeRow {
	season: number; team_key: string;
	avg_zscore: number; avg_offensive_zscore: number; avg_defensive_zscore: number;
}

interface SeedOutcomeEntry { seed: number; wins: number }
interface SeasonSeedOutcome { season: number; seed: number; wins: number; maxDepth: number }

interface TourneyTeamSeason {
	season: number; team_key: string; team_name: string;
	seed: number; wins: number; deepest_round: string;
	opp_best_seed: number;
	comp_rating: number; comp_off_rating: number; comp_def_rating: number;
	kp_tempo: number; kp_sos: number; kp_rank: number;
	bt_3pr: number | null; bt_3p_pct: number | null; bt_3p_pct_d: number | null;
	bt_tor: number | null; bt_tord: number | null; bt_efg_pct: number | null; bt_orb: number | null;
	bt_ftr: number | null; bt_2p_pct: number | null;
	bt_3pr_rank: number | null; bt_3p_pct_rank: number | null; bt_3p_pct_d_rank: number | null;
	bt_tor_rank: number | null; bt_orb_rank: number | null;
	bt_ftr_rank: number | null; bt_2p_pct_rank: number | null;
}

const ROUND_DEPTH: Record<string, number> = {
	'First Four': 0, 'Round of 64': 1, 'Round of 32': 2,
	'Sweet 16': 3, 'Elite 8': 4, 'Final Four': 5, 'Championship': 6
};
const WINS_TO_ROUND = ['R64', 'R32', 'S16', 'E8', 'F4', 'Finals', 'Champ'];
const ROUND_LABELS = ['R32', 'S16', 'E8', 'F4', 'Finals', 'Champ'];

// ─── Bracket Matrix Scraper ──────────────────────────────────────────────

// Maps Bracket Matrix team names → our team_keys (only for names that don't follow the standard pattern)
const BM_NAME_OVERRIDES: Record<string, string> = {
	'Connecticut': 'connecticut', 'Miami (FLA.)': 'miami_fl', 'Miami (Ohio)': 'miami_oh',
	"St. John's": 'st_johns', "St. Mary's (CA)": 'saint_marys', 'Saint Louis': 'saint_louis',
	'Central Florida': 'ucf', 'North Carolina State': 'nc_state', 'Stephen F. Austin': 'stephen_f_austin',
	'North Dakota State': 'north_dakota_st', 'Long Island': 'liu', 'Bethune-Cookman': 'bethune_cookman',
	'Northern Iowa': 'northern_iowa', 'South Florida': 'south_florida',
	'Sam Houston State': 'sam_houston_st', 'Middle Tennessee': 'middle_tennessee',
	'Loyola Chicago': 'loyola_chicago', 'San Diego State': 'san_diego_st',
	'Southeast Missouri': 'southeast_missouri', 'Western Kentucky': 'western_kentucky',
	'East Tennessee State': 'east_tennessee_st', 'Florida Atlantic': 'florida_atlantic',
	'Southern Illinois': 'southern_illinois', 'Oral Roberts': 'oral_roberts',
	'Eastern Washington': 'eastern_washington', 'South Dakota State': 'south_dakota_st',
	'Abilene Christian': 'abilene_christian', 'Florida Gulf Coast': 'florida_gulf_coast',
	'Cal State Fullerton': 'cal_st_fullerton', 'Fairleigh Dickinson': 'fairleigh_dickinson',
	'UC Santa Barbara': 'uc_santa_barbara', 'Grand Canyon': 'grand_canyon',
	'New Mexico State': 'new_mexico_st',
	'McNeese St': 'mcneese', 'McNeese State': 'mcneese',
};

function bmNameToTeamKey(name: string): string {
	if (BM_NAME_OVERRIDES[name]) return BM_NAME_OVERRIDES[name];
	return name.toLowerCase()
		.replace(/\s+state$/i, '_st')
		.replace(/\s+/g, '_')
		.replace(/[.'()]/g, '')
		.replace(/_+/g, '_');
}

type BracketMatrixEntry = { team_key: string; avg_seed: number; team_name: string };

let _bmCache: BracketMatrixEntry[] | null = null;
let _bmCacheTime = 0;
const BM_CACHE_TTL = 3600_000;

async function getBracketMatrixSeeds(): Promise<BracketMatrixEntry[]> {
	if (_bmCache && Date.now() - _bmCacheTime < BM_CACHE_TTL) return _bmCache;

	try {
		const res = await fetch('http://www.bracketmatrix.com/', {
			signal: AbortSignal.timeout(10_000),
		});
		if (!res.ok) return _bmCache ?? [];
		const html = await res.text();
		const $ = cheerioLoad(html);
		const teams: BracketMatrixEntry[] = [];

		$('tr').each((_i, row) => {
			const cells = $(row).find('td');
			const texts: string[] = [];
			cells.each((_j, cell) => { texts.push($(cell).text().trim()); });
			if (texts[0] && /^\d+$/.test(texts[0]) && texts.length > 3 && texts[1]) {
				const avgSeed = parseFloat(texts[3]);
				if (!isNaN(avgSeed)) {
					teams.push({
						team_key: bmNameToTeamKey(texts[1]),
						avg_seed: avgSeed,
						team_name: texts[1],
					});
				}
			}
		});

		_bmCache = teams;
		_bmCacheTime = Date.now();
		return teams;
	} catch {
		return _bmCache ?? [];
	}
}

// ─── ESPN Tournament Seeds ──────────────────────────────────────────────

type EspnTournamentSeed = { team_key: string; seed: number; region: string };

let _espnSeedCache: EspnTournamentSeed[] | null = null;
let _espnSeedCacheTime = 0;

async function getEspnTournamentSeeds(season: number): Promise<EspnTournamentSeed[]> {
	if (_espnSeedCache && Date.now() - _espnSeedCacheTime < BM_CACHE_TTL) return _espnSeedCache;

	const rows = await db.query<{ team_key: string; seed: number; region: string }>(
		`SELECT DISTINCT team_key, seed, region FROM (
			SELECT team_a_key AS team_key, team_a_seed AS seed, region
			FROM tournament_games
			WHERE season = $1 AND round = 'Round of 64' AND team_a_key IS NOT NULL
			UNION
			SELECT team_b_key AS team_key, team_b_seed AS seed, region
			FROM tournament_games
			WHERE season = $1 AND round = 'Round of 64' AND team_b_key IS NOT NULL
		) t
		ORDER BY seed, team_key`,
		[season]
	);

	if (rows.length >= 64) {
		_espnSeedCache = rows;
		_espnSeedCacheTime = Date.now();
		return rows;
	}

	// Not enough data yet (bracket not fully scraped)
	return [];
}

// Fallback: rank-based seed estimate when Bracket Matrix is unavailable
const SEED_RANK_MAP: [number, number][] = [
	[1, 4], [2, 8], [3, 12], [4, 16], [5, 24], [6, 32], [7, 40], [8, 48],
	[9, 56], [10, 64], [11, 72], [12, 80], [13, 100], [14, 120], [15, 150], [16, 200]
];

function rankToSeed(rank: number): number {
	for (const [seed, maxRank] of SEED_RANK_MAP) {
		if (rank <= maxRank) return seed;
	}
	return 16;
}

let _datasetCache: TourneyTeamSeason[] | null = null;
let _seedOutcomesCache: SeedOutcomeEntry[] | null = null;
let _seasonSeedOutcomesCache: SeasonSeedOutcome[] | null = null;
let _datasetCacheTime = 0;
const CACHE_TTL = 3600_000;

async function getTournamentDataset(): Promise<{ dataset: TourneyTeamSeason[]; allSeedOutcomes: SeedOutcomeEntry[]; seasonSeedOutcomes: SeasonSeedOutcome[] }> {
	if (_datasetCache && _seedOutcomesCache && _seasonSeedOutcomesCache && Date.now() - _datasetCacheTime < CACHE_TTL) {
		return { dataset: _datasetCache, allSeedOutcomes: _seedOutcomesCache, seasonSeedOutcomes: _seasonSeedOutcomesCache };
	}

	// Teams with composite data (2010+)
	const compositeTeamFilter = `
		SELECT season, team_a_key AS team_key FROM tournament_games WHERE season >= 2010 AND team_a_key IS NOT NULL
		UNION SELECT season, team_b_key FROM tournament_games WHERE season >= 2010 AND team_b_key IS NOT NULL
	`;

	const [allGames, kenpom, barttorvik, composite] = await Promise.all([
		// ALL games back to 2002 for seed outcomes
		db.query<TourneyGameRow>(
			`SELECT tg.season, tg.round,
				tg.team_a_key, tg.team_b_key, tg.team_a_seed, tg.team_b_seed,
				eg.home_team_key, eg.away_team_key, eg.home_score, eg.away_score
			FROM tournament_games tg
			LEFT JOIN espn_games eg ON eg.game_id = tg.game_id
			WHERE tg.season >= 2002`
		),
		// Pre-tournament KenPom (for tempo/sos) — 2010+
		db.query<TourneyKenPomRow>(
			`SELECT DISTINCT ON (k.season, k.team_key)
				k.season + 2000 AS season, k.team_key, k.net_rating, k.offensive_rating, k.defensive_rating,
				k.adjusted_tempo, k.sos_net_rating, k.rank,
				COALESCE(em.team, k.team_key) AS team
			FROM kenpom_rankings k
			LEFT JOIN LATERAL (
				SELECT team FROM evanmiya_rankings
				WHERE team_key = k.team_key AND season = k.season
				ORDER BY date DESC LIMIT 1
			) em ON true
			JOIN LATERAL (
				SELECT MIN(eg.date::date) AS first_game
				FROM tournament_games tg
				JOIN espn_games eg ON eg.game_id = tg.game_id
				WHERE tg.season = k.season + 2000 AND tg.round != 'First Four'
			) tourney ON true
			WHERE (k.season + 2000, k.team_key) IN (${compositeTeamFilter})
				AND k.date < tourney.first_game
			ORDER BY k.season, k.team_key, k.date DESC`
		),
		db.query<TourneyBartTorvikRow>(
			`SELECT DISTINCT ON (season, team_key)
				season + 2000 AS season, team_key,
				"3pr", "3p_pct", "3p_pct_d", tor, tord, efg_pct, orb, ftr, "2p_pct",
				"3pr_rank", "3p_pct_rank", "3p_pct_d_rank", tor_rank, orb_rank, ftr_rank, "2p_pct_rank"
			FROM barttorvik_rankings
			WHERE (season + 2000, team_key) IN (${compositeTeamFilter})
			ORDER BY season, team_key, date DESC`
		),
		// Composite (kp,em,bt) — 2010+, latest date per season (composites are stored post-season)
		db.query<TourneyCompositeRow>(
			`SELECT DISTINCT ON (c.season, c.team_key)
				c.season + 2000 AS season, c.team_key,
				c.avg_zscore, c.avg_offensive_zscore, c.avg_defensive_zscore
			FROM composite_rankings c
			WHERE c.sources = 'kp,em,bt'
				AND (c.season + 2000, c.team_key) IN (${compositeTeamFilter})
			ORDER BY c.season, c.team_key, c.date DESC`
		)
	]);

	// Build per-team-season win counts from ALL games (2002+)
	const teamSeasons = new Map<string, { seed: number; wins: number; maxDepth: number; oppBestSeed: number }>();

	for (const g of allGames) {
		if (!g.home_team_key || !g.away_team_key || g.home_score == null || g.away_score == null) continue;

		for (const side of ['a', 'b'] as const) {
			const teamKey = side === 'a' ? g.team_a_key : g.team_b_key;
			const seed = side === 'a' ? g.team_a_seed : g.team_b_seed;
			const oppSeed = side === 'a' ? g.team_b_seed : g.team_a_seed;
			if (!teamKey) continue;

			const key = `${g.season}-${teamKey}`;
			if (!teamSeasons.has(key)) teamSeasons.set(key, { seed, wins: 0, maxDepth: 0, oppBestSeed: 16 });
			const ts = teamSeasons.get(key)!;

			const isHome = g.home_team_key === teamKey;
			const won = isHome ? g.home_score > g.away_score : g.away_score > g.home_score;
			if (won) {
				ts.wins++;
				// Detect mislabeled First Four games: same-seed "Final Four" matchups are play-in games
				const isFirstFour = g.round === 'First Four' ||
					(g.round === 'Final Four' && g.team_a_seed === g.team_b_seed && g.season >= 2011);
				const depth = isFirstFour ? 0 : (ROUND_DEPTH[g.round] ?? 0);
				if (depth > ts.maxDepth) ts.maxDepth = depth;
			}
			if (oppSeed < ts.oppBestSeed) ts.oppBestSeed = oppSeed;
		}
	}

	// All seed outcomes (2002+) for historical seed outcome bars
	const allSeedOutcomes: SeedOutcomeEntry[] = [];
	const seasonSeedOutcomes: SeasonSeedOutcome[] = [];
	for (const [key, ts] of teamSeasons) {
		allSeedOutcomes.push({ seed: ts.seed, wins: ts.wins });
		const season = parseInt(key.split('-', 1)[0]);
		seasonSeedOutcomes.push({ season, seed: ts.seed, wins: ts.wins, maxDepth: ts.maxDepth });
	}

	// Build lookup maps
	const kpMap = new Map<string, TourneyKenPomRow>();
	for (const r of kenpom) kpMap.set(`${r.season}-${r.team_key}`, r);

	const btMap = new Map<string, TourneyBartTorvikRow>();
	for (const r of barttorvik) btMap.set(`${r.season}-${r.team_key}`, r);

	const compMap = new Map<string, TourneyCompositeRow>();
	for (const r of composite) compMap.set(`${r.season}-${r.team_key}`, r);

	// Merge into final dataset — require KenPom + composite
	const dataset: TourneyTeamSeason[] = [];
	for (const [key, ts] of teamSeasons) {
		const [seasonStr, teamKey] = key.split('-', 2);
		const season = parseInt(seasonStr);
		const kp = kpMap.get(key);
		const comp = compMap.get(key);
		if (!kp || !comp) continue;

		const bt = btMap.get(key);
		dataset.push({
			season, team_key: teamKey, team_name: kp.team,
			seed: ts.seed, wins: ts.wins,
			deepest_round: WINS_TO_ROUND[ts.wins] ?? 'R64',
			opp_best_seed: ts.oppBestSeed,
			comp_rating: comp.avg_zscore, comp_off_rating: comp.avg_offensive_zscore,
			comp_def_rating: comp.avg_defensive_zscore,
			kp_tempo: kp.adjusted_tempo, kp_sos: kp.sos_net_rating, kp_rank: kp.rank,
			bt_3pr: bt?.['3pr'] ?? null, bt_3p_pct: bt?.['3p_pct'] ?? null,
			bt_3p_pct_d: bt?.['3p_pct_d'] ?? null, bt_tor: bt?.tor ?? null,
			bt_tord: bt?.tord ?? null, bt_efg_pct: bt?.efg_pct ?? null, bt_orb: bt?.orb ?? null,
			bt_ftr: bt?.ftr ?? null, bt_2p_pct: bt?.['2p_pct'] ?? null,
			bt_3pr_rank: bt?.['3pr_rank'] ?? null, bt_3p_pct_rank: bt?.['3p_pct_rank'] ?? null,
			bt_3p_pct_d_rank: bt?.['3p_pct_d_rank'] ?? null, bt_tor_rank: bt?.tor_rank ?? null,
			bt_orb_rank: bt?.orb_rank ?? null,
			bt_ftr_rank: bt?.ftr_rank ?? null, bt_2p_pct_rank: bt?.['2p_pct_rank'] ?? null,
		});
	}

	_datasetCache = dataset;
	_seedOutcomesCache = allSeedOutcomes;
	_seasonSeedOutcomesCache = seasonSeedOutcomes;
	_datasetCacheTime = Date.now();
	return { dataset, allSeedOutcomes, seasonSeedOutcomes };
}

// ─── Shared Factor Infrastructure ────────────────────────────────────────

const TIERS = [5, 10, 15, 25, 35, 50, 75, 100];
const MIN_SAMPLE = 20;
const NUM_TEAMS = 364;

type SeasonRankMaps = {
	defRanks: Map<number, Map<string, number>>;
	defLowRanks: Map<number, Map<string, number>>;
	tempoHighRanks: Map<number, Map<string, number>>;
	tempoLowRanks: Map<number, Map<string, number>>;
	threePtDefGoodRanks: Map<number, Map<string, number>>;
	threePtDefBadRanks: Map<number, Map<string, number>>;
	toMarginGoodRanks: Map<number, Map<string, number>>;
	toMarginBadRanks: Map<number, Map<string, number>>;
	efgHighRanks: Map<number, Map<string, number>>;
	efgLowRanks: Map<number, Map<string, number>>;
};

/** Dataset-level factor qualifier: only depends on dataset, not team-specific ratings */
type FactorQualifier = {
	key: string; label: string; statLabel: string; bottom?: boolean;
	qualifiesAt: (t: TourneyTeamSeason, tier: number) => boolean;
};

/** Team-specific factor metadata */
type TeamFactorMeta = {
	key: string;
	teamRank: number | null;
	teamValue: number | null;
	widestTeamTier: number | null;
};

function buildSeasonRankMaps(dataset: TourneyTeamSeason[]): SeasonRankMaps {
	const defRanks = new Map<number, Map<string, number>>();
	const defLowRanks = new Map<number, Map<string, number>>();
	const tempoHighRanks = new Map<number, Map<string, number>>();
	const tempoLowRanks = new Map<number, Map<string, number>>();
	const threePtDefGoodRanks = new Map<number, Map<string, number>>();
	const threePtDefBadRanks = new Map<number, Map<string, number>>();
	const toMarginGoodRanks = new Map<number, Map<string, number>>();
	const toMarginBadRanks = new Map<number, Map<string, number>>();
	const efgHighRanks = new Map<number, Map<string, number>>();
	const efgLowRanks = new Map<number, Map<string, number>>();
	for (const season of new Set(dataset.map(d => d.season))) {
		const seasonTeams = dataset.filter(d => d.season === season);
		// Defense (composite)
		const defMap = new Map<string, number>();
		seasonTeams.sort((a, b) => b.comp_def_rating - a.comp_def_rating).forEach((t, i) => defMap.set(t.team_key, i + 1));
		defRanks.set(season, defMap);
		const defLowMap = new Map<string, number>();
		seasonTeams.sort((a, b) => a.comp_def_rating - b.comp_def_rating).forEach((t, i) => defLowMap.set(t.team_key, i + 1));
		defLowRanks.set(season, defLowMap);
		// Tempo
		const thMap = new Map<string, number>();
		seasonTeams.sort((a, b) => b.kp_tempo - a.kp_tempo).forEach((t, i) => thMap.set(t.team_key, i + 1));
		tempoHighRanks.set(season, thMap);
		const tlMap = new Map<string, number>();
		seasonTeams.sort((a, b) => a.kp_tempo - b.kp_tempo).forEach((t, i) => tlMap.set(t.team_key, i + 1));
		tempoLowRanks.set(season, tlMap);
		// 3pt defense (low opponent 3pt% = good defense = rank 1)
		const btTeams = seasonTeams.filter(t => t.bt_3p_pct_d != null);
		const tpdGood = new Map<string, number>();
		[...btTeams].sort((a, b) => a.bt_3p_pct_d! - b.bt_3p_pct_d!).forEach((t, i) => tpdGood.set(t.team_key, i + 1));
		threePtDefGoodRanks.set(season, tpdGood);
		const tpdBad = new Map<string, number>();
		[...btTeams].sort((a, b) => b.bt_3p_pct_d! - a.bt_3p_pct_d!).forEach((t, i) => tpdBad.set(t.team_key, i + 1));
		threePtDefBadRanks.set(season, tpdBad);
		// Turnover margin (tord - tor: higher = better)
		const toTeams = seasonTeams.filter(t => t.bt_tor != null && t.bt_tord != null);
		const tmGood = new Map<string, number>();
		[...toTeams].sort((a, b) => (b.bt_tord! - b.bt_tor!) - (a.bt_tord! - a.bt_tor!)).forEach((t, i) => tmGood.set(t.team_key, i + 1));
		toMarginGoodRanks.set(season, tmGood);
		const tmBad = new Map<string, number>();
		[...toTeams].sort((a, b) => (a.bt_tord! - a.bt_tor!) - (b.bt_tord! - b.bt_tor!)).forEach((t, i) => tmBad.set(t.team_key, i + 1));
		toMarginBadRanks.set(season, tmBad);
		// Effective FG% (higher = better)
		const efgTeams = seasonTeams.filter(t => t.bt_efg_pct != null);
		const efgH = new Map<string, number>();
		[...efgTeams].sort((a, b) => b.bt_efg_pct! - a.bt_efg_pct!).forEach((t, i) => efgH.set(t.team_key, i + 1));
		efgHighRanks.set(season, efgH);
		const efgL = new Map<string, number>();
		[...efgTeams].sort((a, b) => a.bt_efg_pct! - b.bt_efg_pct!).forEach((t, i) => efgL.set(t.team_key, i + 1));
		efgLowRanks.set(season, efgL);
	}
	return { defRanks, defLowRanks, tempoHighRanks, tempoLowRanks, threePtDefGoodRanks, threePtDefBadRanks, toMarginGoodRanks, toMarginBadRanks, efgHighRanks, efgLowRanks };
}

const invertRank = (rank: number | null) => rank != null ? NUM_TEAMS + 1 - rank : null;
const invertQualifies = (rank: number | null, tier: number) => rank != null && rank >= (NUM_TEAMS + 1 - tier);

function buildFactorQualifiers(maps: SeasonRankMaps): FactorQualifier[] {
	return [
		{ key: '3pt_heavy', label: 'High 3pt Rate', statLabel: '3pt attempt rate',
			qualifiesAt: (t, tier) => t.bt_3pr_rank != null && t.bt_3pr_rank <= tier },
		{ key: '3pt_low', label: 'Low 3pt Rate', statLabel: '3pt attempt rate', bottom: true,
			qualifiesAt: (t, tier) => invertQualifies(t.bt_3pr_rank, tier) },
		{ key: 'ft_heavy', label: 'High FT Rate', statLabel: 'free throw rate',
			qualifiesAt: (t, tier) => t.bt_ftr_rank != null && t.bt_ftr_rank <= tier },
		{ key: 'ft_low', label: 'Low FT Rate', statLabel: 'free throw rate', bottom: true,
			qualifiesAt: (t, tier) => invertQualifies(t.bt_ftr_rank, tier) },
		{ key: 'low_turnovers', label: 'Low Turnover Rate', statLabel: 'turnover rate (best)',
			qualifiesAt: (t, tier) => t.bt_tor_rank != null && t.bt_tor_rank <= tier },
		{ key: 'high_turnovers', label: 'High Turnover Rate', statLabel: 'turnover rate', bottom: true,
			qualifiesAt: (t, tier) => invertQualifies(t.bt_tor_rank, tier) },
		{ key: 'elite_defense', label: 'Elite Defense', statLabel: 'composite defense',
			qualifiesAt: (t, tier) => (maps.defRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'weak_defense', label: 'Weak Defense', statLabel: 'composite defense', bottom: true,
			qualifiesAt: (t, tier) => (maps.defLowRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'high_tempo', label: 'High Tempo', statLabel: 'adjusted tempo',
			qualifiesAt: (t, tier) => (maps.tempoHighRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'slow_grinder', label: 'Slow Tempo', statLabel: 'adjusted tempo', bottom: true,
			qualifiesAt: (t, tier) => (maps.tempoLowRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'physical', label: 'High Rebound Rate', statLabel: 'offensive rebound rate',
			qualifiesAt: (t, tier) => t.bt_orb_rank != null && t.bt_orb_rank <= tier },
		{ key: 'low_rebounding', label: 'Low Rebound Rate', statLabel: 'offensive rebound rate', bottom: true,
			qualifiesAt: (t, tier) => invertQualifies(t.bt_orb_rank, tier) },
		{ key: '3pt_defense_good', label: 'Strong 3pt Defense', statLabel: '3pt defense',
			qualifiesAt: (t, tier) => (maps.threePtDefGoodRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: '3pt_defense_bad', label: 'Weak 3pt Defense', statLabel: '3pt defense', bottom: true,
			qualifiesAt: (t, tier) => (maps.threePtDefBadRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'turnover_margin_good', label: 'Strong TO Margin', statLabel: 'turnover margin',
			qualifiesAt: (t, tier) => (maps.toMarginGoodRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'turnover_margin_bad', label: 'Weak TO Margin', statLabel: 'turnover margin', bottom: true,
			qualifiesAt: (t, tier) => (maps.toMarginBadRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'efg_high', label: 'High Effective FG%', statLabel: 'effective FG%',
			qualifiesAt: (t, tier) => (maps.efgHighRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
		{ key: 'efg_low', label: 'Low Effective FG%', statLabel: 'effective FG%', bottom: true,
			qualifiesAt: (t, tier) => (maps.efgLowRanks.get(t.season)?.get(t.team_key) ?? 999) <= tier },
	];
}

function getTeamFactorMeta(ratings: any): TeamFactorMeta[] {
	return [
		{ key: '3pt_heavy', teamRank: ratings.bt_3pr_rank ?? null, teamValue: ratings.bt_3pr ?? null,
			widestTeamTier: (ratings.bt_3pr_rank ?? 999) <= 100 ? 100 : null },
		{ key: '3pt_low', teamRank: invertRank(ratings.bt_3pr_rank), teamValue: ratings.bt_3pr ?? null,
			widestTeamTier: (invertRank(ratings.bt_3pr_rank) ?? 999) <= 100 ? 100 : null },
		{ key: 'ft_heavy', teamRank: ratings.bt_ftr_rank ?? null, teamValue: ratings.bt_ftr ?? null,
			widestTeamTier: (ratings.bt_ftr_rank ?? 999) <= 100 ? 100 : null },
		{ key: 'ft_low', teamRank: invertRank(ratings.bt_ftr_rank), teamValue: ratings.bt_ftr ?? null,
			widestTeamTier: (invertRank(ratings.bt_ftr_rank) ?? 999) <= 100 ? 100 : null },
		{ key: 'low_turnovers', teamRank: ratings.bt_tor_rank ?? null, teamValue: ratings.bt_tor ?? null,
			widestTeamTier: (ratings.bt_tor_rank ?? 999) <= 100 ? 100 : null },
		{ key: 'high_turnovers', teamRank: invertRank(ratings.bt_tor_rank), teamValue: ratings.bt_tor ?? null,
			widestTeamTier: (invertRank(ratings.bt_tor_rank) ?? 999) <= 100 ? 100 : null },
		{ key: 'elite_defense', teamRank: ratings.comp_avg_defensive_zscore_rank ?? null, teamValue: ratings.comp_avg_defensive_zscore ?? null,
			widestTeamTier: (ratings.comp_avg_defensive_zscore_rank ?? 999) <= 25 ? 25 : null },
		{ key: 'weak_defense', teamRank: ratings.comp_avg_defensive_zscore_rank ? NUM_TEAMS + 1 - ratings.comp_avg_defensive_zscore_rank : null,
			teamValue: ratings.comp_avg_defensive_zscore ?? null,
			widestTeamTier: (ratings.comp_avg_defensive_zscore_rank ?? 0) >= (NUM_TEAMS + 1 - 100) ? 100 : null },
		{ key: 'high_tempo', teamRank: ratings.kp_adjusted_tempo_rank ?? null, teamValue: ratings.kp_adjusted_tempo ?? null,
			widestTeamTier: (ratings.kp_adjusted_tempo_rank ?? 999) <= 100 ? 100 : null },
		{ key: 'slow_grinder', teamRank: invertRank(ratings.kp_adjusted_tempo_rank), teamValue: ratings.kp_adjusted_tempo ?? null,
			widestTeamTier: (invertRank(ratings.kp_adjusted_tempo_rank) ?? 999) <= 100 ? 100 : null },
		{ key: 'physical', teamRank: ratings.bt_orb_rank ?? null, teamValue: ratings.bt_orb ?? null,
			widestTeamTier: (ratings.bt_orb_rank ?? 999) <= 100 ? 100 : null },
		{ key: 'low_rebounding', teamRank: invertRank(ratings.bt_orb_rank), teamValue: ratings.bt_orb ?? null,
			widestTeamTier: (invertRank(ratings.bt_orb_rank) ?? 999) <= 100 ? 100 : null },
		{ key: '3pt_defense_good', teamRank: ratings.bt_3p_pct_d_rank ?? null, teamValue: ratings.bt_3p_pct_d ?? null,
			widestTeamTier: (ratings.bt_3p_pct_d_rank ?? 999) <= 100 ? 100 : null },
		{ key: '3pt_defense_bad', teamRank: invertRank(ratings.bt_3p_pct_d_rank), teamValue: ratings.bt_3p_pct_d ?? null,
			widestTeamTier: (invertRank(ratings.bt_3p_pct_d_rank) ?? 999) <= 100 ? 100 : null },
		{ key: 'turnover_margin_good', teamRank: ratings.bt_tord_rank ?? null, teamValue: ratings.bt_tord ?? null,
			widestTeamTier: (ratings.bt_tord_rank ?? 999) <= 100 ? 100 : null },
		{ key: 'turnover_margin_bad', teamRank: invertRank(ratings.bt_tord_rank), teamValue: ratings.bt_tord ?? null,
			widestTeamTier: (invertRank(ratings.bt_tord_rank) ?? 999) <= 100 ? 100 : null },
		{ key: 'efg_high', teamRank: ratings.bt_efg_pct_rank ?? null, teamValue: ratings.bt_efg_pct ?? null,
			widestTeamTier: (ratings.bt_efg_pct_rank ?? 999) <= 100 ? 100 : null },
		{ key: 'efg_low', teamRank: invertRank(ratings.bt_efg_pct_rank), teamValue: ratings.bt_efg_pct ?? null,
			widestTeamTier: (invertRank(ratings.bt_efg_pct_rank) ?? 999) <= 100 ? 100 : null },
	];
}

/** Compute avg_wins_above_seed for a set of qualifying teams */
function computeWinsAboveSeed(teams: TourneyTeamSeason[], seedBaselineWins: Map<number, number>) {
	if (teams.length === 0) return { avgWinsAboveSeed: 0, seedBaseline: 0, finalFourRate: 0, deepRunRate: 0, round32Rate: 0 };
	const avgWinsAboveSeed = teams.reduce((s, t) => s + (t.wins - (seedBaselineWins.get(t.seed) ?? 0)), 0) / teams.length;
	const seedBaseline = teams.reduce((s, t) => s + (seedBaselineWins.get(t.seed) ?? 0), 0) / teams.length;
	const finalFourRate = Math.round((teams.filter(t => t.wins >= 4).length / teams.length) * 100);
	const deepRunRate = Math.round((teams.filter(t => t.wins >= 2).length / teams.length) * 100);
	const round32Rate = Math.round((teams.filter(t => t.wins >= 1).length / teams.length) * 100);
	return { avgWinsAboveSeed, seedBaseline, finalFourRate, deepRunRate, round32Rate };
}

/** Evaluate a single factor for a given seed range, finding the tightest qualifying tier */
function evaluateFactor(
	qualifier: FactorQualifier, meta: TeamFactorMeta,
	seedRange: TourneyTeamSeason[], seedBaselineWins: Map<number, number>
): StyleFactor {
	let bestTier = meta.widestTeamTier;
	let qualifying = bestTier != null ? seedRange.filter(t => qualifier.qualifiesAt(t, bestTier!)) : [];

	if (bestTier != null && qualifying.length >= MIN_SAMPLE) {
		for (const tier of TIERS) {
			if (tier >= bestTier) break;
			if ((meta.teamRank ?? 999) > tier) continue;
			const candidates = seedRange.filter(t => qualifier.qualifiesAt(t, tier));
			if (candidates.length >= MIN_SAMPLE) {
				bestTier = tier;
				qualifying = candidates;
				break;
			}
		}
	}

	const teamQualifies = bestTier != null && qualifying.length >= MIN_SAMPLE;
	const { avgWinsAboveSeed, seedBaseline, finalFourRate, deepRunRate, round32Rate } = computeWinsAboveSeed(qualifying, seedBaselineWins);
	const roundedAboveSeed = Math.round(avgWinsAboveSeed * 100) / 100;
	const verdict = roundedAboveSeed >= 0.15 ? 'positive' as const : roundedAboveSeed <= -0.15 ? 'negative' as const : 'neutral' as const;
	const prefix = qualifier.bottom ? 'Bottom' : 'Top';
	const description = bestTier != null ? `${prefix}-${bestTier} ${qualifier.statLabel}` : qualifier.statLabel;

	return {
		key: qualifier.key, label: qualifier.label, description,
		applies: teamQualifies, team_value: meta.teamValue, team_rank: meta.teamRank,
		sample_size: qualifying.length, avg_wins_above_seed: roundedAboveSeed,
		seed_baseline_wins: Math.round(seedBaseline * 100) / 100,
		final_four_rate: finalFourRate, deep_run_rate: deepRunRate, round_32_rate: round32Rate, percentile: 0, verdict,
	};
}

/** Compute the factor weight for sorting/scoring (same formula used for top-3 selection) */
function factorWeight(f: StyleFactor): number {
	const tierMatch = f.description.match(/(Top|Bottom)-(\d+)/);
	const tier = tierMatch ? parseInt(tierMatch[2]) : 100;
	const tierScore = 1 - (TIERS.indexOf(tier) / (TIERS.length - 1));
	const mag = Math.abs(f.avg_wins_above_seed);
	return tierScore * 0.6 + Math.min(mag / 0.5, 1) * 0.4;
}

/** Convert a raw wins_above_seed value to 0-100 percentile using dynamic global bounds */
export function winsAboveSeedToPercentile(value: number, globalMin: number, globalMax: number): number {
	if (value >= 0) {
		return globalMax > 0 ? Math.min(100, 50 + (value / globalMax) * 50) : 50;
	}
	return globalMin < 0 ? Math.max(0, 50 + (value / Math.abs(globalMin)) * 50) : 50;
}

// Global scale bounds cache (computed alongside dataset)
let _globalBoundsCache: { globalMin: number; globalMax: number } | null = null;
let _globalBoundsCacheTime = 0;

/** Compute global min/max avg_wins_above_seed across all factor×seed×tier combos */
async function getGlobalScaleBounds(): Promise<{ globalMin: number; globalMax: number }> {
	if (_globalBoundsCache && Date.now() - _globalBoundsCacheTime < CACHE_TTL) return _globalBoundsCache;

	const { dataset, allSeedOutcomes } = await getTournamentDataset();
	const maps = buildSeasonRankMaps(dataset);
	const qualifiers = buildFactorQualifiers(maps);

	const seedBaselineWins = new Map<number, number>();
	for (let s = 1; s <= 16; s++) {
		const teams = allSeedOutcomes.filter(t => t.seed === s);
		seedBaselineWins.set(s, teams.length > 0 ? teams.reduce((sum, t) => sum + t.wins, 0) / teams.length : 0);
	}

	let globalMin = 0, globalMax = 0;
	for (const q of qualifiers) {
		for (let seed = 1; seed <= 16; seed++) {
			const seedRange = dataset.filter(t => Math.abs(t.seed - seed) <= 1);
			for (const tier of TIERS) {
				const qualifying = seedRange.filter(t => q.qualifiesAt(t, tier));
				if (qualifying.length < MIN_SAMPLE) continue;
				const avg = qualifying.reduce((s, t) => s + (t.wins - (seedBaselineWins.get(t.seed) ?? 0)), 0) / qualifying.length;
				if (avg > globalMax) globalMax = avg;
				if (avg < globalMin) globalMin = avg;
			}
		}
	}

	_globalBoundsCache = { globalMin, globalMax };
	_globalBoundsCacheTime = Date.now();
	return _globalBoundsCache;
}

// ─── March Analysis: Computation ─────────────────────────────────────────

async function getMarchAnalysis(teamKey: string, fullRatings: Record<string, FullRatings>): Promise<MarchAnalysis | null> {
	const latestSeason = Object.keys(fullRatings).sort().at(-1);
	if (!latestSeason) return null;

	const ratings = fullRatings[latestSeason] as any;
	const compRating = ratings.comp_avg_zscore;
	const compOffRating = ratings.comp_avg_offensive_zscore;
	const compDefRating = ratings.comp_avg_defensive_zscore;
	const kpTempo = ratings.kp_adjusted_tempo;
	const kpSos = ratings.kp_sos_offensive_rating - ratings.kp_sos_defensive_rating;

	if (compRating == null || isNaN(compRating) || compOffRating == null) return null;

	let dataset: TourneyTeamSeason[];
	let allSeedOutcomes: SeedOutcomeEntry[];
	try {
		const result = await getTournamentDataset();
		dataset = result.dataset;
		allSeedOutcomes = result.allSeedOutcomes;
	} catch (e: any) {
		console.error('getMarchAnalysis: getTournamentDataset error:', e?.message, e?.stack);
		return null;
	}
	if (dataset.length === 0) return null;

	// Projected seed: use Bracket Matrix consensus if available, fallback to rank-based estimate
	const bmSeeds = await getBracketMatrixSeeds();
	const bmEntry = bmSeeds.find(b => b.team_key === teamKey);
	const projectedSeed = bmEntry
		? Math.round(bmEntry.avg_seed)
		: rankToSeed(ratings.kp_rank ?? 100);

	// ─── Seed Line Analysis ──────────────────────────────────────────────
	const seedTeams = dataset.filter(t => t.seed === projectedSeed);
	const seedRatings = seedTeams.map(t => t.comp_rating).sort((a, b) => a - b);
	const seedAvg = seedRatings.length > 0 ? seedRatings.reduce((s, v) => s + v, 0) / seedRatings.length : 0;
	const seedMedian = seedRatings.length > 0 ? seedRatings[Math.floor(seedRatings.length / 2)] : 0;
	const ratingPercentile = seedRatings.length > 0
		? Math.round((seedRatings.filter(r => r <= compRating).length / seedRatings.length) * 100)
		: 50;

	// Implied seed: what seed does their rating most closely match?
	const seedAvgs = new Map<number, number>();
	for (let s = 1; s <= 16; s++) {
		const teams = dataset.filter(t => t.seed === s);
		if (teams.length > 0) seedAvgs.set(s, teams.reduce((sum, t) => sum + t.comp_rating, 0) / teams.length);
	}
	let impliedSeed = projectedSeed;
	let minDist = Infinity;
	for (const [s, avg] of seedAvgs) {
		const dist = Math.abs(compRating - avg);
		if (dist < minDist) { minDist = dist; impliedSeed = s; }
	}

	// Seed outcomes: % reaching each round (full 2002+ data)
	const allSeedTeams = allSeedOutcomes.filter(t => t.seed === projectedSeed);
	const seedOutcomes = ROUND_LABELS.map((round, i) => ({
		round,
		reach_pct: allSeedTeams.length > 0
			? Math.round((allSeedTeams.filter(t => t.wins >= i + 1).length / allSeedTeams.length) * 100)
			: 0
	}));

	// Notable comps at this seed with similar or better ratings
	const notableComps = seedTeams
		.filter(t => t.comp_rating >= seedAvg)
		.sort((a, b) => Math.abs(a.comp_rating - compRating) - Math.abs(b.comp_rating - compRating))
		.slice(0, 6)
		.map(t => ({
			season: t.season, team_key: t.team_key, team_name: t.team_name, kp_rating: t.comp_rating,
			seed: t.seed, wins: t.wins, deepest_round: t.deepest_round
		}));

	const seedLine: SeedLineValue = {
		projected_seed: projectedSeed, avg_seed: bmEntry?.avg_seed ?? null,
		team_kp_rating: Math.round(compRating * 100) / 100,
		seed_avg_rating: Math.round(seedAvg * 100) / 100, seed_median_rating: Math.round(seedMedian * 100) / 100,
		rating_percentile: ratingPercentile, implied_seed: impliedSeed,
		seed_outcomes: seedOutcomes, notable_comps: notableComps,
	};

	// ─── Similar Teams ───────────────────────────────────────────────────
	// Z-score normalization across all tournament teams
	const simStats = ['comp_rating', 'comp_off_rating', 'comp_def_rating', 'kp_tempo', 'kp_sos', 'bt_3pr'] as const;
	const weights = [3, 2, 2, 1, 1, 1];
	const means: number[] = [];
	const stds: number[] = [];

	for (const stat of simStats) {
		const values = dataset.map(t => t[stat]).filter(v => v != null) as number[];
		const mean = values.reduce((s, v) => s + v, 0) / values.length;
		const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
		means.push(mean);
		stds.push(std);
	}

	const teamStatValues = [compRating, compOffRating, compDefRating, kpTempo, kpSos, ratings.bt_3pr ?? null];

	const similarities = dataset.map(t => {
		const tStats = [t.comp_rating, t.comp_off_rating, t.comp_def_rating, t.kp_tempo, t.kp_sos, t.bt_3pr];
		let sumSqDiff = 0, totalWeight = 0;
		for (let i = 0; i < simStats.length; i++) {
			if (teamStatValues[i] == null || tStats[i] == null) continue;
			const diff = (teamStatValues[i]! - tStats[i]!) / stds[i];
			sumSqDiff += weights[i] * diff * diff;
			totalWeight += weights[i];
		}
		const distance = Math.sqrt(sumSqDiff / totalWeight);
		return { team: t, similarity: Math.exp(-distance) };
	});

	const similarTeams: HistoricalComp[] = similarities
		.sort((a, b) => b.similarity - a.similarity)
		.slice(0, 12)
		.map(({ team: t, similarity }) => ({
			season: t.season, team_key: t.team_key, team_name: t.team_name,
			seed: t.seed, similarity: Math.round(similarity * 100),
			kp_net_rating: Math.round(t.comp_rating * 100) / 100,
			kp_tempo: Math.round(t.kp_tempo * 10) / 10,
			wins: t.wins, deepest_round: t.deepest_round,
		}));

	// ─── Style Factors ───────────────────────────────────────────────────
	const maps = buildSeasonRankMaps(dataset);
	const qualifiers = buildFactorQualifiers(maps);
	const teamMeta = getTeamFactorMeta(ratings);

	// Precompute seed-line baseline avg wins (uses full 2002+ data)
	const seedBaselineWins = new Map<number, number>();
	for (let s = 1; s <= 16; s++) {
		const teams = allSeedOutcomes.filter(t => t.seed === s);
		seedBaselineWins.set(s, teams.length > 0 ? teams.reduce((sum, t) => sum + t.wins, 0) / teams.length : 0);
	}

	// Filter to ±1 seed of projected seed for style factor analysis
	const seedRange = dataset.filter(t => Math.abs(t.seed - projectedSeed) <= 1);

	// Evaluate all factors
	const allEvaluated = qualifiers.map((q, i) => evaluateFactor(q, teamMeta[i], seedRange, seedBaselineWins));

	// Pick top 3 factors by score (tier tightness + magnitude)
	const applicable = allEvaluated.filter(f => f.applies);
	applicable.sort((a, b) => factorWeight(b) - factorWeight(a));
	const styleFactors = applicable.slice(0, 3);

	// ─── March Score ────────────────────────────────────────────────────
	const { globalMin, globalMax } = await getGlobalScaleBounds();

	// Fill in per-factor percentiles now that we have global bounds
	for (const f of allEvaluated) {
		f.percentile = Math.round(winsAboveSeedToPercentile(f.avg_wins_above_seed, globalMin, globalMax));
	}

	// ─── Style Score (0-100) ─────────────────────────────────────────────
	let styleScore = 50;
	if (applicable.length > 0) {
		let weightedSum = 0, totalWeight = 0;
		for (const f of applicable) {
			const w = factorWeight(f);
			weightedSum += w * f.avg_wins_above_seed;
			totalWeight += w;
		}
		const styleRaw = totalWeight > 0 ? weightedSum / totalWeight : 0;
		styleScore = Math.round(winsAboveSeedToPercentile(styleRaw, globalMin, globalMax));
	}

	// ─── Comps Score (0-100) ─────────────────────────────────────────────
	const seedBaseline = seedBaselineWins.get(projectedSeed) ?? 0;
	let compsScore = 50;
	if (similarTeams.length > 0) {
		const compsAvgWins = similarTeams.reduce((s, t) => s + t.wins, 0) / similarTeams.length;
		const compsWinsAboveSeed = compsAvgWins - seedBaseline;
		compsScore = Math.round(winsAboveSeedToPercentile(compsWinsAboveSeed, globalMin, globalMax));
	}

	// ─── Rating Score (0-100) ────────────────────────────────────────────
	const ratingScore = Math.round(ratingPercentile);

	// ─── Combined March Score ────────────────────────────────────────────
	// 45% historical comps, 30% style factors, 25% rating vs seed
	const marchScore = Math.round(compsScore * 0.45 + styleScore * 0.30 + ratingScore * 0.25);

	// ─── Expected Wins ───────────────────────────────────────────────────
	const applicableDeltas = styleFactors.map(f => f.avg_wins_above_seed);
	const styleAdjustment = applicableDeltas.length > 0
		? applicableDeltas.reduce((s, d) => s + d, 0) * 0.5
		: 0;
	const ratingBoost = (ratingPercentile - 50) / 100 * 0.5;
	const expectedWins = Math.round(Math.max(0, Math.min(6, seedBaseline + styleAdjustment + ratingBoost)) * 100) / 100;

	return {
		seed_line: seedLine, similar_teams: similarTeams, style_factors: styleFactors,
		march_score: marchScore, style_score: styleScore, comps_score: compsScore, rating_score: ratingScore,
		num_qualifying_factors: applicable.length,
		expected_wins: expectedWins,
	};
}

// ─── March Page Data ─────────────────────────────────────────────────────

export interface FactorMatrixCell {
	factor_key: string;
	factor_label: string;
	seed: number;
	tier: number;
	sample_size: number;
	avg_wins_above_seed: number;
	percentile: number;
	deep_run_rate: number;
	round_32_rate: number;
	final_four_rate: number;
	current_team_keys: string[];
}

export interface BracketTeamSummary {
	team_key: string;
	team_name: string;
	short_name: string;
	abbreviation: string;
	projected_seed: number;
	avg_seed: number | null;
	march_score: number;
	march_analysis: MarchAnalysis;
	comp_rating: number;
	comp_rank: number;
	comp_off_rank: number;
	comp_def_rank: number;
	color: string;
	secondary_color: string;
	logo_url: string;
	/** Actual ESPN region assignment (only set when using real bracket data) */
	region?: string;
}

export interface MarchPageData {
	factor_matrix: FactorMatrixCell[];
	global_min: number;
	global_max: number;
	bracket_teams: BracketTeamSummary[];
	seed_baselines: Record<number, number>;
}

/** Fetch minimal ratings for multiple teams (just the fields getMarchAnalysis needs) */
async function getBulkLatestRatings(teamKeys: string[]): Promise<Record<string, Record<string, FullRatings>>> {
	if (teamKeys.length === 0) return {};

	const rows = await db.query<any>(
		`SELECT
			k.team_key,
			k.season,
			k.rank AS kp_rank,
			k.adjusted_tempo AS kp_adjusted_tempo,
			k.adjusted_tempo_rank AS kp_adjusted_tempo_rank,
			k.sos_offensive_rating AS kp_sos_offensive_rating,
			k.sos_defensive_rating AS kp_sos_defensive_rating,
			c.avg_zscore AS comp_avg_zscore,
			c.avg_zscore_rank AS comp_avg_zscore_rank,
			c.avg_offensive_zscore AS comp_avg_offensive_zscore,
			c.avg_offensive_zscore_rank AS comp_avg_offensive_zscore_rank,
			c.avg_defensive_zscore AS comp_avg_defensive_zscore,
			c.avg_defensive_zscore_rank AS comp_avg_defensive_zscore_rank,
			b."3pr" AS bt_3pr, b."3pr_rank" AS bt_3pr_rank,
			b.ftr AS bt_ftr, b.ftr_rank AS bt_ftr_rank,
			b.tor AS bt_tor, b.tor_rank AS bt_tor_rank,
			b.orb AS bt_orb, b.orb_rank AS bt_orb_rank
		FROM (
			SELECT DISTINCT ON (team_key) *
			FROM kenpom_rankings
			WHERE team_key = ANY($1)
			ORDER BY team_key, season DESC, date DESC
		) k
		LEFT JOIN LATERAL (
			SELECT avg_zscore, avg_zscore_rank,
				avg_offensive_zscore, avg_offensive_zscore_rank,
				avg_defensive_zscore, avg_defensive_zscore_rank
			FROM composite_rankings
			WHERE team_key = k.team_key AND sources = 'kp,em,bt'
			ORDER BY date DESC
			LIMIT 1
		) c ON true
		LEFT JOIN (
			SELECT DISTINCT ON (team_key) *
			FROM barttorvik_rankings
			WHERE team_key = ANY($1)
			ORDER BY team_key, season DESC, date DESC
		) b ON b.team_key = k.team_key`,
		[teamKeys]
	);

	const result: Record<string, Record<string, FullRatings>> = {};
	for (const r of rows) {
		if (!result[r.team_key]) result[r.team_key] = {};
		result[r.team_key][r.season] = r as any;
	}
	return result;
}

export async function getMarchPageData(): Promise<MarchPageData> {
	const currentSeason = 2026;
	const [{ dataset, allSeedOutcomes }, espnSeeds, bmSeeds, { globalMin, globalMax }, allTeamData] = await Promise.all([
		getTournamentDataset(),
		getEspnTournamentSeeds(currentSeason),
		getBracketMatrixSeeds(),
		getGlobalScaleBounds(),
		(await import('../espn/espn-team-data')).getAllTeamData(),
	]);

	// Use ESPN actual seeds if available, otherwise fall back to Bracket Matrix
	const useEspn = espnSeeds.length >= 64;
	const espnRegionMap = new Map<string, string>(); // team_key → region
	const seedEntries: { team_key: string; seed: number; team_name: string }[] = useEspn
		? espnSeeds.map(e => {
			espnRegionMap.set(e.team_key, e.region);
			return { team_key: e.team_key, seed: e.seed, team_name: e.team_key };
		})
		: bmSeeds.map(b => ({ team_key: b.team_key, seed: b.avg_seed, team_name: b.team_name }));

	// Seed baselines
	const seedBaselineWins = new Map<number, number>();
	for (let s = 1; s <= 16; s++) {
		const teams = allSeedOutcomes.filter(t => t.seed === s);
		seedBaselineWins.set(s, teams.length > 0 ? teams.reduce((sum, t) => sum + t.wins, 0) / teams.length : 0);
	}
	const seedBaselines: Record<number, number> = {};
	for (const [s, v] of seedBaselineWins) seedBaselines[s] = Math.round(v * 100) / 100;

	// Factor matrix
	const maps = buildSeasonRankMaps(dataset);
	const qualifiers = buildFactorQualifiers(maps);
	const factorMatrix: FactorMatrixCell[] = [];

	// Get bracket team keys and their projected seeds for matrix matching
	const bracketTeamKeys = seedEntries.map(b => b.team_key);
	const bulkRatings = await getBulkLatestRatings(bracketTeamKeys);

	// Build per-bracket-team factor meta for matching to matrix cells
	const bracketTeamMetas = new Map<string, { seed: number; meta: TeamFactorMeta[] }>();
	for (const entry of seedEntries) {
		const teamRatings = bulkRatings[entry.team_key];
		if (!teamRatings) continue;
		const latestSeason = Object.keys(teamRatings).sort().at(-1);
		if (!latestSeason) continue;
		const r = teamRatings[latestSeason] as any;
		bracketTeamMetas.set(entry.team_key, { seed: Math.round(entry.seed), meta: getTeamFactorMeta(r) });
	}

	for (const q of qualifiers) {
		for (let seed = 1; seed <= 16; seed++) {
			const seedRange = dataset.filter(t => Math.abs(t.seed - seed) <= 1);
			for (const tier of TIERS) {
				const qualifying = seedRange.filter(t => q.qualifiesAt(t, tier));
				if (qualifying.length < MIN_SAMPLE) continue;

				const { avgWinsAboveSeed, finalFourRate, deepRunRate, round32Rate } = computeWinsAboveSeed(qualifying, seedBaselineWins);
				const percentile = Math.round(winsAboveSeedToPercentile(avgWinsAboveSeed, globalMin, globalMax));

				// Find current bracket teams that qualify for this cell
				const currentTeamKeys: string[] = [];
				for (const [tk, { seed: projSeed, meta }] of bracketTeamMetas) {
					if (Math.abs(projSeed - seed) > 1) continue;
					const m = meta.find(m => m.key === q.key);
					if (!m || m.widestTeamTier == null) continue;
					if ((m.teamRank ?? 999) <= tier) currentTeamKeys.push(tk);
				}

				factorMatrix.push({
					factor_key: q.key, factor_label: q.label,
					seed, tier, sample_size: qualifying.length,
					avg_wins_above_seed: Math.round(avgWinsAboveSeed * 100) / 100,
					percentile, deep_run_rate: deepRunRate, round_32_rate: round32Rate, final_four_rate: finalFourRate,
					current_team_keys: currentTeamKeys,
				});
			}
		}
	}

	// Bracket teams with march analysis
	const bracketTeams: BracketTeamSummary[] = [];
	await Promise.all(seedEntries.map(async entry => {
		const teamRatings = bulkRatings[entry.team_key];
		if (!teamRatings) return;
		const analysis = await getMarchAnalysis(entry.team_key, teamRatings as any);
		if (!analysis) return;
		const td = allTeamData[entry.team_key];
		const latestSeason = Object.keys(teamRatings).sort().at(-1)!;
		const latestRatings = teamRatings[latestSeason] as any;
		const espnId = td?.espn_id ?? ESPN_TEAM_IDS[entry.team_key];
		bracketTeams.push({
			team_key: entry.team_key,
			team_name: td?.short_name ?? td?.name ?? entry.team_name,
			short_name: td?.short_name ?? td?.name ?? entry.team_name,
			abbreviation: td?.abbreviation ?? entry.team_key.toUpperCase().slice(0, 4),
			projected_seed: useEspn ? entry.seed : 0, // ESPN seeds are final; BM assigned below
			avg_seed: useEspn ? entry.seed : entry.seed,
			march_score: analysis.march_score,
			march_analysis: analysis,
			comp_rating: latestRatings?.comp_avg_zscore ?? 0,
			comp_rank: latestRatings?.comp_avg_zscore_rank ?? 0,
			comp_off_rank: latestRatings?.comp_avg_offensive_zscore_rank ?? 0,
			comp_def_rank: latestRatings?.comp_avg_defensive_zscore_rank ?? 0,
			color: td?.color ?? '333333',
			secondary_color: td?.secondary_color ?? '666666',
			logo_url: espnId ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png` : '',
			region: espnRegionMap.get(entry.team_key),
		});
	}));

	if (!useEspn) {
		// Assign projected seeds from Bracket Matrix: sort by avg_seed, 4 per seed line (1-16)
		bracketTeams.sort((a, b) => a.avg_seed! - b.avg_seed!);
		for (let i = 0; i < bracketTeams.length; i++) {
			bracketTeams[i].projected_seed = Math.min(16, Math.floor(i / 4) + 1);
		}
	}

	return { factor_matrix: factorMatrix, global_min: globalMin, global_max: globalMax, bracket_teams: bracketTeams, seed_baselines: seedBaselines };
}

// --- Bracket Page Data ---

export interface SeedRoundStat {
	win_pct: number;
	sample_size: number;
	/** How many of the 4 same-seeded teams won this round, per year — e.g. [4, 4, 3, 4, 4, 3, ...] */
	wins_per_year: number[];
}

export type SeedRoundStats = Record<number, Record<string, SeedRoundStat>>;

export interface CrossSeedPatterns {
	/** For seed S, round R, count C: has it ever happened that exactly C of 4 S-seeds won round R? */
	unprecedented: { seed: number; round: string; count: number }[];
	/** Per seed per round: mean and stddev of wins-of-4-per-year */
	distributions: Record<number, Record<string, { mean: number; stddev: number; min: number; max: number }>>;
}

export interface SeedMatchupStat {
	higher_seed: number;
	lower_seed: number;
	round: string;
	higher_seed_win_pct: number;
	sample_size: number;
}

export interface BracketPageData {
	bracket_teams: BracketTeamSummary[];
	seed_baselines: Record<number, number>;
	seed_round_stats: SeedRoundStats;
	cross_seed_patterns: CrossSeedPatterns;
	seed_matchup_stats: SeedMatchupStat[];
}

const BRACKET_ROUNDS = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

export async function getBracketPageData(): Promise<BracketPageData> {
	const [marchData, { allSeedOutcomes, seasonSeedOutcomes }] = await Promise.all([
		getMarchPageData(),
		getTournamentDataset(),
	]);

	// Compute seed-round stats from seasonSeedOutcomes
	// For each seed (1-16) and round, compute: win rate, per-year distribution
	// Use maxDepth (deepest round reached) instead of win count to avoid First Four inflation
	const seedRoundStats: SeedRoundStats = {};
	const roundDepthThresholds: Record<string, number> = {
		'Round of 64': 1, 'Round of 32': 2, 'Sweet 16': 3,
		'Elite 8': 4, 'Final Four': 5, 'Championship': 6,
	};

	// Get unique seasons
	const seasons = [...new Set(seasonSeedOutcomes.map(s => s.season))].sort();

	for (let seed = 1; seed <= 16; seed++) {
		seedRoundStats[seed] = {};
		const seedOutcomes = seasonSeedOutcomes.filter(s => s.seed === seed);

		for (const [roundName, minDepth] of Object.entries(roundDepthThresholds)) {
			const total = seedOutcomes.length;
			const won = seedOutcomes.filter(s => s.maxDepth >= minDepth).length;

			// Per-year: how many of the 4 same-seeded teams won this round
			const winsPerYear: number[] = [];
			for (const season of seasons) {
				const seasonTeams = seedOutcomes.filter(s => s.season === season);
				if (seasonTeams.length === 0) continue;
				const winsThisYear = seasonTeams.filter(s => s.maxDepth >= minDepth).length;
				winsPerYear.push(winsThisYear);
			}

			seedRoundStats[seed][roundName] = {
				win_pct: total > 0 ? won / total : 0,
				sample_size: total,
				wins_per_year: winsPerYear,
			};
		}
	}

	// Compute cross-seed patterns
	const unprecedented: CrossSeedPatterns['unprecedented'] = [];
	const distributions: CrossSeedPatterns['distributions'] = {};

	for (let seed = 1; seed <= 16; seed++) {
		distributions[seed] = {};
		for (const roundName of BRACKET_ROUNDS) {
			const stat = seedRoundStats[seed]?.[roundName];
			if (!stat || stat.wins_per_year.length === 0) continue;

			const arr = stat.wins_per_year;
			const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
			const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
			const stddev = Math.sqrt(variance);
			const min = Math.min(...arr);
			const max = Math.max(...arr);

			distributions[seed][roundName] = { mean, stddev, min, max };

			// Check for unprecedented counts (0 through 4)
			const occurredCounts = new Set(arr);
			for (let c = 0; c <= 4; c++) {
				if (!occurredCounts.has(c)) {
					unprecedented.push({ seed, round: roundName, count: c });
				}
			}
		}
	}

	// Compute seed-vs-seed matchup stats from tournament_games
	const matchupStats = computeSeedMatchupStats(seasonSeedOutcomes);

	return {
		bracket_teams: marchData.bracket_teams,
		seed_baselines: marchData.seed_baselines,
		seed_round_stats: seedRoundStats,
		cross_seed_patterns: { unprecedented, distributions },
		seed_matchup_stats: matchupStats,
	};
}

function computeSeedMatchupStats(seasonSeedOutcomes: SeasonSeedOutcome[]): SeedMatchupStat[] {
	// Use the standard bracket matchups and historical win rates
	// For bracket: 1v16, 2v15, 3v14, 4v13, 5v12, 6v11, 7v10, 8v9 in R64
	// Use maxDepth instead of wins to avoid First Four inflation
	const stats: SeedMatchupStat[] = [];

	const r64Pairs: [number, number][] = [[1,16],[2,15],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9]];

	for (const [high, low] of r64Pairs) {
		const highOutcomes = seasonSeedOutcomes.filter(s => s.seed === high);
		if (highOutcomes.length === 0) continue;
		// Higher seed wins R64 = reached at least depth 1 (won R64 game)
		const highWins = highOutcomes.filter(s => s.maxDepth >= 1).length;
		stats.push({
			higher_seed: high,
			lower_seed: low,
			round: 'Round of 64',
			higher_seed_win_pct: highWins / highOutcomes.length,
			sample_size: highOutcomes.length,
		});
	}

	return stats;
}

export async function getTeamProfile(teamKey: string, options?: { enrichedSchedule?: boolean }): Promise<TeamProfile> {
	const start = performance.now();
	function getQuery(
		table: string,
		keys: Partial<
			Record<
				keyof KenPomRanking | keyof EvanMiyaRanking | keyof BartTorvikRanking | keyof NetRanking | keyof CompositeRanking,
				string
			>
		>,
		hasSeason = true
	) {
		const query = `
			SELECT
				team_key,
				date,
				${Object.entries(keys)
					.map(([k, v]) => `${k} as ${v}`)
					.join(',\n')}
			FROM ${table}
			WHERE team_key = $1
				AND date >= NOW() - INTERVAL '30 days'
				${hasSeason ? `AND season = (SELECT MAX(season) FROM ${table})` : ''}
			ORDER BY date ASC
		`;

		return query;
	}

	const [fullRankings, seasonSnapshots, kenpomRankings, evanMiyaRankings, bartTorvikRankings, netRankings, compositeRankings, schedule]: [
		Record<string, FullRatings>,
		SeasonSnapshot[],
		KenPomProfileRow[],
		EvanMiyaProfileRow[],
		BartTorvikProfileRow[],
		NetProfileRow[],
		CompositeProfileRow[],
		EspnGame[]
	] = await Promise.all([
		getFullRatings(teamKey),
		getSeasonSnapshots(teamKey),
		db.query<KenPomProfileRow>(
			getQuery('kenpom_rankings', {
				net_rating: 'kp_rating',
				net_rating_zscore: 'kp_rating_zscore',
				rank: 'kp_rating_rank',
				offensive_rating: 'kp_offensive_rating',
				offensive_rating_zscore: 'kp_offensive_zscore',
				offensive_rating_rank: 'kp_offensive_rating_rank',
				defensive_rating: 'kp_defensive_rating',
				defensive_rating_zscore: 'kp_defensive_zscore',
				defensive_rating_rank: 'kp_defensive_rating_rank'
			}),
			[teamKey]
		),
		db.query<EvanMiyaProfileRow>(
			getQuery('evanmiya_rankings', {
				team: 'team_name',
				relative_rating: 'em_rating',
				relative_rating_zscore: 'em_rating_zscore',
				relative_ranking: 'em_rating_rank',
				o_rate: 'em_offensive_rating',
				o_rate_zscore: 'em_offensive_zscore',
				off_rank: 'em_offensive_rating_rank',
				d_rate: 'em_defensive_rating',
				d_rate_zscore: 'em_defensive_zscore',
				def_rank: 'em_defensive_rating_rank'
			}),
			[teamKey]
		),
		db.query<BartTorvikProfileRow>(
			getQuery('barttorvik_rankings', {
				barthag: 'bt_rating',
				barthag_zscore: 'bt_rating_zscore',
				barthag_rank: 'bt_rating_rank',
				adjoe: 'bt_offensive_rating',
				adjoe_zscore: 'bt_offensive_zscore',
				adjoe_rank: 'bt_offensive_rating_rank',
				adjde: 'bt_defensive_rating',
				adjde_zscore: 'bt_defensive_zscore',
				adjde_rank: 'bt_defensive_rating_rank'
			}),
			[teamKey]
		),
		db.query<NetProfileRow>(
			getQuery('net_rankings', {
				rank: 'net_rank',
				rank_zscore: 'net_rank_zscore'
			}, false),
			[teamKey]
		),
		db.query<CompositeProfileRow>(
			getQuery('composite_rankings', {
				avg_zscore: 'avg_zscore',
				avg_zscore_rank: 'avg_zscore_rank',
				avg_offensive_zscore: 'avg_offensive_zscore',
				avg_offensive_zscore_rank: 'avg_offensive_zscore_rank',
				avg_defensive_zscore: 'avg_defensive_zscore',
				avg_defensive_zscore_rank: 'avg_defensive_zscore_rank',
				sources: 'sources'
			}),
			[teamKey]
		),
		options?.enrichedSchedule ? getScheduleEnriched(teamKey) : getSchedule(teamKey)
	]);

	const teamName = evanMiyaRankings[0].team_name!;
	evanMiyaRankings.forEach(r => delete r['team_name']);

	const ratings_history = kenpomRankings.reduce<Record<string, TeamProfileData>>((map, kp) => {
		const date = kp.date;

		const compositeMap: Record<string, CompositeProfileRow> = {};

		compositeRankings.forEach(r => {
			if (r.date !== date) {
				return;
			}

			compositeMap[r.sources] = r;
		});

		map[date] = {
			...kp,
			...evanMiyaRankings.find(r => r.date === date),
			...bartTorvikRankings.find(r => r.date === date),
			...netRankings.find(r => r.date === date),
			...compositeMap['kp,em,bt,net'],
			composite_combos: compositeMap
		} as TeamProfileData;
		return map;
	}, {});

	if (!options?.enrichedSchedule) {
		await Promise.all(
			schedule
				.filter(g => g.is_live)
				.map(async g => {
					const game = await getPartialGame(g.game_id);
					const teamSide = Object.values(game.teams).find(t => t.team_key === teamKey);
					const oppSide = Object.values(game.teams).find(t => t.team_key !== teamKey);
					g.live_score = {
						teamScore: teamSide?.score ?? 0,
						oppScore: oppSide?.score ?? 0
					};
				})
		);
	}

	const marchAnalysis = await getMarchAnalysis(teamKey, fullRankings);

	return { team_key: teamKey, team_name: teamName, full_ratings: fullRankings, season_snapshots: seasonSnapshots, ratings_history, schedule, march_analysis: marchAnalysis };
}
