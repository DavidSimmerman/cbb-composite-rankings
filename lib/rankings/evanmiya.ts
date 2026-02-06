import { Browser } from 'playwright';
import { waitForSelectorRetries, calculateZScores, validateRankings } from './utils';
import { PostgresService } from '../database';

const db = PostgresService.getInstance();

export interface EvanMiyaRanking {
	id: string;
	date: string;
	team_key: string;
	relative_ranking: number;
	team: string;
	trends: string[];
	o_rate: number;
	d_rate: number;
	relative_rating: number;
	opponent_adjust: number;
	pace_adjust: number;
	off_rank: number;
	def_rank: number;
	true_tempo: number;
	tempo_rank: number;
	injury_rank: number;
	home_rank: number;
	roster_rank: number;
	kill_shots_per_game: number;
	kill_shots_conceded_per_game: number;
	kill_shots_margin_per_game: number;
	total_kill_shots: number;
	total_kill_shots_conceded: number;
	d1_wins: number;
	d1_losses: number;
	relative_rating_zscore: number;
	o_rate_zscore: number;
	d_rate_zscore: number;
	created_at: string;
	updated_at: string;
}

export async function updateEvanMiya(browser: Browser) {
	const EM_QUERY = `
		INSERT INTO evanmiya_rankings (
			team_key, team, relative_ranking, trends,
			o_rate, d_rate, relative_rating,
			opponent_adjust, pace_adjust,
			off_rank, def_rank,
			true_tempo, tempo_rank,
			injury_rank, home_rank, roster_rank,
			kill_shots_per_game, kill_shots_conceded_per_game, kill_shots_margin_per_game,
			total_kill_shots, total_kill_shots_conceded,
			d1_wins, d1_losses,
			relative_rating_zscore, o_rate_zscore, d_rate_zscore
		) VALUES (
			$1, $2, $3, $4,
			$5, $6, $7,
			$8, $9,
			$10, $11,
			$12, $13,
			$14, $15, $16,
			$17, $18, $19,
			$20, $21,
			$22, $23,
			$24, $25, $26
		)
		ON CONFLICT (team_key, date) DO UPDATE SET
			team = EXCLUDED.team, relative_ranking = EXCLUDED.relative_ranking, trends = EXCLUDED.trends,
			o_rate = EXCLUDED.o_rate, d_rate = EXCLUDED.d_rate, relative_rating = EXCLUDED.relative_rating,
			opponent_adjust = EXCLUDED.opponent_adjust, pace_adjust = EXCLUDED.pace_adjust,
			off_rank = EXCLUDED.off_rank, def_rank = EXCLUDED.def_rank,
			true_tempo = EXCLUDED.true_tempo, tempo_rank = EXCLUDED.tempo_rank,
			injury_rank = EXCLUDED.injury_rank, home_rank = EXCLUDED.home_rank, roster_rank = EXCLUDED.roster_rank,
			kill_shots_per_game = EXCLUDED.kill_shots_per_game, kill_shots_conceded_per_game = EXCLUDED.kill_shots_conceded_per_game,
			kill_shots_margin_per_game = EXCLUDED.kill_shots_margin_per_game,
			total_kill_shots = EXCLUDED.total_kill_shots, total_kill_shots_conceded = EXCLUDED.total_kill_shots_conceded,
			d1_wins = EXCLUDED.d1_wins, d1_losses = EXCLUDED.d1_losses,
			relative_rating_zscore = EXCLUDED.relative_rating_zscore, o_rate_zscore = EXCLUDED.o_rate_zscore,
			d_rate_zscore = EXCLUDED.d_rate_zscore
	`;

	const teams = await fetchEvanMiyaRankings(browser);

	validateRankings(teams, 'EvanMiya');

	await db.transaction(
		teams.map(team => ({
			query: EM_QUERY,
			params: [
				team.team_key,
				team.team,
				team.relative_ranking,
				JSON.stringify(team.trends),
				team.o_rate,
				team.d_rate,
				team.relative_rating,
				team.opponent_adjust,
				team.pace_adjust,
				team.off_rank,
				team.def_rank,
				team.true_tempo,
				team.tempo_rank,
				team.injury_rank,
				team.home_rank,
				team.roster_rank,
				team.kill_shots_per_game,
				team.kill_shots_conceded_per_game,
				team.kill_shots_margin_per_game,
				team.total_kill_shots,
				team.total_kill_shots_conceded,
				team.d1_wins,
				team.d1_losses,
				team.relative_rating_zscore,
				team.o_rate_zscore,
				team.d_rate_zscore
			]
		}))
	);

	console.log(`RANKINGS FETCH: EvanMiya rankings successfully updated.`);
}

export async function fetchEvanMiyaRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://evanmiya.com/?team_ratings', {
		waitUntil: 'networkidle'
	});

	const attempts = await waitForSelectorRetries(page, '.rt-page-size-select');

	await page.selectOption('.rt-page-size-select', { index: 5 });
	await page.waitForSelector('#team_ratings_page-team_ratings .rt-tr-group:nth-of-type(365)');

	let teams = await page.evaluate(() => {
		const TEAM_KEY_MAP: Record<string, string> = {
			nc_st: 'nc_state',
			miami_fla: 'miami_fl',
			mcneese_st: 'mcneese',
			ole_miss: 'mississippi',
			illinoischicago: 'illinois_chicago',
			st_thomas_mn: 'st_thomas',
			california_baptist: 'cal_baptist',
			saint_bonaventure: 'st_bonaventure',
			college_of_charleston: 'charleston',
			texasrio_grande_valley: 'ut_rio_grande_valley',
			texas_amcorpus_christi: 'texas_am_corpus_chris',
			florida_international: 'fiu',
			tennesseemartin: 'tennessee_martin',
			fort_wayne: 'purdue_fort_wayne',
			long_island: 'liu',
			cal_state_northridge: 'csun',
			nicholls_st: 'nicholls',
			southeast_missouri_st: 'southeast_missouri',
			cal_state_fullerton: 'cal_st_fullerton',
			bethunecookman: 'bethune_cookman',
			siu_edwardsville: 'siue',
			omaha: 'nebraska_omaha',
			southern_mississippi: 'southern_miss',
			arkansaslittle_rock: 'little_rock',
			grambling: 'grambling_st',
			detroit: 'detroit_mercy',
			south_carolina_upstate: 'usc_upstate',
			cal_state_bakersfield: 'cal_st_bakersfield',
			loyola_maryland: 'loyola_md',
			arkansaspine_bluff: 'arkansas_pine_bluff',
			louisianalafayette: 'louisiana',
			marylandeastern_shore: 'maryland_eastern_shore',
			prairie_view: 'prairie_view_am',
			saint_francis_pa: 'saint_francis',
			missourikansas_city: 'kansas_city',
			louisianamonroe: 'louisiana_monroe',
			gardnerwebb: 'gardner_webb'
		};

		const TREND_MAP: Record<string, string> = {
			'📈': 'played better recently',
			'📉': 'played worse recently',
			'🔥': 'hot streak',
			'🥶': 'cold streak',
			'🔒': 'consistent',
			'💥': 'volatile',
			'🤕': 'injuries',
			'👠': 'cinderella'
		};

		const columns = Array.from(document.querySelectorAll('#team_ratings_page-team_ratings .rt-th')).map(h =>
			h
				.querySelector('.rt-text-content:not(:has(span)), span')
				?.textContent?.toLocaleLowerCase()
				.replaceAll(' ', '_')
				.replaceAll('-', '_')
		);

		return Array.from(document.querySelectorAll('#team_ratings_page-team_ratings .rt-tr-group')).map(row => {
			const team: Record<string, unknown> = {};

			row.querySelectorAll('.rt-td-inner').forEach((td, i) => {
				const column = columns[i];
				if (column === 'team') {
					const teamName = td.querySelector('a')!.textContent!.trim();
					const teamKey = teamName
						.toLowerCase()
						.replaceAll(' ', '_')
						.replaceAll(/[^a-z_]/g, '')
						.replaceAll(/_state$/g, '_st');

					team[column] = teamName;
					team['team_key'] = TEAM_KEY_MAP[teamKey] ?? teamKey;
					team['trends'] = Array.from(td.querySelectorAll('.tippy')).map(t => TREND_MAP[t.textContent!.trim()]);
				} else if (
					column?.endsWith('ranking') ||
					column?.endsWith('rank') ||
					column?.startsWith('total') ||
					column?.startsWith('d1')
				) {
					team[column] = parseInt(td.textContent!.trim());
				} else if (column) {
					team[column] = parseFloat(td.textContent!.trim());
				}
			});

			return team;
		});
	});

	await page.close();

	teams = calculateZScores(teams, [{ source: 'relative_rating' }, { source: 'o_rate' }, { source: 'd_rate' }]);

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;

	console.log(`RANKINGS FETCH: EvanMiya rankings took ${took}s in ${attempts} attempt(s).`);

	return teams;
}
