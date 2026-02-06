import { Browser } from 'playwright';
import { waitForSelectorRetries, calculateZScores, validateRankings } from './utils';
import { PostgresService } from '../database';

const db = PostgresService.getInstance();

export interface NetRanking {
	id: string;
	date: string;
	team_key: string;
	rank: number;
	school: string;
	record: string;
	conf: string;
	road: string;
	neutral: string;
	home: string;
	non_div_i: string;
	prev: number;
	quad_1: string;
	q1_wins: number;
	quad_2: string;
	q2_wins: number;
	quad_3: string;
	q3_wins: number;
	quad_4: string;
	q4_wins: number;
	rank_zscore: number;
	created_at: string;
	updated_at: string;
}

export async function updateNet(browser: Browser) {
	const NET_QUERY = `
		INSERT INTO net_rankings (
			team_key, school, rank, record, conf,
			road, neutral, home, non_div_i, prev,
			quad_1, quad_2, quad_3, quad_4,
			q1_wins, q2_wins, q3_wins, q4_wins,
			rank_zscore
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16, $17, $18,
			$19
		)
		ON CONFLICT (team_key, date) DO UPDATE SET
			school = EXCLUDED.school, rank = EXCLUDED.rank, record = EXCLUDED.record, conf = EXCLUDED.conf,
			road = EXCLUDED.road, neutral = EXCLUDED.neutral, home = EXCLUDED.home,
			non_div_i = EXCLUDED.non_div_i, prev = EXCLUDED.prev,
			quad_1 = EXCLUDED.quad_1, quad_2 = EXCLUDED.quad_2, quad_3 = EXCLUDED.quad_3, quad_4 = EXCLUDED.quad_4,
			q1_wins = EXCLUDED.q1_wins, q2_wins = EXCLUDED.q2_wins, q3_wins = EXCLUDED.q3_wins, q4_wins = EXCLUDED.q4_wins,
			rank_zscore = EXCLUDED.rank_zscore
	`;

	const teams = await fetchNetRankings(browser);

	validateRankings(teams, 'NET');

	await db.transaction(
		teams.map(team => ({
			query: NET_QUERY,
			params: [
				team.team_key,
				team.school,
				team.rank,
				team.record,
				team.conf,
				team.road,
				team.neutral,
				team.home,
				team.non_div_i,
				team.prev,
				team.quad_1,
				team.quad_2,
				team.quad_3,
				team.quad_4,
				team.q1_wins,
				team.q2_wins,
				team.q3_wins,
				team.q4_wins,
				team.rank_zscore
			]
		}))
	);

	console.log(`RANKINGS FETCH: NET rankings successfully updated.`);
}

export async function fetchNetRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings', {
		waitUntil: 'networkidle'
	});

	const attempts = await waitForSelectorRetries(page, 'tbody tr');

	let teams = await page.evaluate(() => {
		const TEAM_KEY_MAP: Record<string, string> = {
			uconn: 'connecticut',
			st_johns_ny: 'st_johns',
			saint_marys_ca: 'saint_marys',
			southern_california: 'usc',
			south_fla: 'south_florida',
			sfa: 'stephen_f_austin',
			ole_miss: 'mississippi',
			fla_atlantic: 'florida_atlantic',
			uni: 'northern_iowa',
			sam_houston: 'sam_houston_st',
			uncw: 'unc_wilmington',
			st_thomas_mn: 'st_thomas',
			california_baptist: 'cal_baptist',
			seattle_u: 'seattle',
			etsu: 'east_tennessee_st',
			middle_tenn: 'middle_tennessee',
			uic: 'illinois_chicago',
			southern_ill: 'southern_illinois',
			col_of_charleston: 'charleston',
			lmu_ca: 'loyola_marymount',
			amcorpus_christi: 'texas_am_corpus_chris',
			western_ky: 'western_kentucky',
			northern_colo: 'northern_colorado',
			northern_ky: 'northern_kentucky',
			eastern_mich: 'eastern_michigan',
			utrgv: 'ut_rio_grande_valley',
			ut_martin: 'tennessee_martin',
			queens_nc: 'queens',
			central_ark: 'central_arkansas',
			app_state: 'appalachian_st',
			lamar_university: 'lamar',
			charleston_so: 'charleston_southern',
			ga_southern: 'georgia_southern',
			fgcu: 'florida_gulf_coast',
			southeast_mo_st: 'southeast_missouri',
			bethunecookman: 'bethune_cookman',
			eastern_wash: 'eastern_washington',
			western_mich: 'western_michigan',
			uiw: 'incarnate_word',
			nc_at: 'north_carolina_at',
			eastern_ky: 'eastern_kentucky',
			omaha: 'nebraska_omaha',
			grambling: 'grambling_st',
			central_conn_st: 'central_connecticut',
			western_caro: 'western_carolina',
			southeastern_la: 'southeastern_louisiana',
			southern_u: 'southern',
			boston_u: 'boston_university',
			csu_bakersfield: 'cal_st_bakersfield',
			arkpine_bluff: 'arkansas_pine_bluff',
			eastern_ill: 'eastern_illinois',
			northern_ariz: 'northern_arizona',
			west_ga: 'west_georgia',
			prairie_view: 'prairie_view_am',
			ualbany: 'albany',
			niu: 'northern_illinois',
			umes: 'maryland_eastern_shore',
			army_west_point: 'army',
			fdu: 'fairleigh_dickinson',
			southern_ind: 'southern_indiana',
			central_mich: 'central_michigan',
			north_ala: 'north_alabama',
			loyola_maryland: 'loyola_md',
			nc_central: 'north_carolina_central',
			alcorn: 'alcorn_st',
			western_ill: 'western_illinois',
			ulm: 'louisiana_monroe',
			gardnerwebb: 'gardner_webb',
			mississippi_val: 'mississippi_valley_st'
		};

		const columns = Array.from(document.querySelectorAll('thead.tableFloatingHeaderOriginal th div')).map(e =>
			e.textContent?.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
		);

		return Array.from(document.querySelectorAll('tbody tr')).map(tr => {
			const teamInfo: Record<string, string | number> = {};

			tr.querySelectorAll('td').forEach((td, i) => {
				const tdContent = td.textContent?.trim() ?? '';
				const header = columns[i];

				if (header === 'rank' || header === 'prev') {
					teamInfo[header] = parseInt(tdContent);
				} else {
					teamInfo[header] = tdContent;
				}
			});

			teamInfo.q1_wins = parseInt((teamInfo.quad_1 as string).split('-')[0]);
			teamInfo.q2_wins = parseInt((teamInfo.quad_2 as string).split('-')[0]);
			teamInfo.q3_wins = parseInt((teamInfo.quad_3 as string).split('-')[0]);
			teamInfo.q4_wins = parseInt((teamInfo.quad_4 as string).split('-')[0]);

			const teamKey = (teamInfo.school as string)
				.toLowerCase()
				.replaceAll(' ', '_')
				.replaceAll(/[^a-z_]/g, '');
			teamInfo['team_key'] = TEAM_KEY_MAP[teamKey] ?? teamKey;

			return teamInfo;
		});
	});

	await page.close();

	teams = calculateZScores(teams, [{ source: 'rank', flip: true }]);

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;

	console.log(`RANKINGS FETCH: NET rankings took ${took}s in ${attempts} attempt(s).`);

	return teams;
}
