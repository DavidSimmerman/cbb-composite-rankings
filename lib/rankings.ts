import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';

export type CompiledTeamData = {
	team_key: string;
	team_name: string;
	kp_rating: number;
	kp_rating_rank: number;
	kp_offensive_rating: number;
	kp_offensive_rating_rank: number;
	kp_defensive_rating: number;
	kp_defensive_rating_rank: number;
	em_rating: number;
	em_rating_rank: number;
	em_offensive_rating: number;
	em_offensive_rating_rank: number;
	em_defensive_rating: number;
	em_defensive_rating_rank: number;
	bt_rating: number;
	bt_rating_rank: number;
	bt_offensive_rating: number;
	bt_offensive_rating_rank: number;
	bt_defensive_rating: number;
	bt_defensive_rating_rank: number;
	net_rank: number;
	net_q1_record: string;
	net_q2_record: string;
	net_q3_record: string;
	net_q4_record: string;
	avg_rank?: number;
	avg_rank_order?: number;
	avg_offensive_rank?: number;
	avg_offensive_rank_order?: number;
	avg_defensive_rank?: number;
	avg_defensive_rank_order?: number;
	net_q1_wins?: number;
	net_q2_wins?: number;
	net_q3_wins?: number;
	net_q4_wins?: number;
};

let cache: Record<string, CompiledTeamData> | null = null;

export async function fetchRankings(): Promise<CompiledTeamData[]> {
	if (cache) {
		return processTeamData(Object.values(cache));
	}

	const browser = await chromium.launch();

	const [
		{ kenpomRankings, took: kpTook },
		{ evanMiyaRankings, took: emTook },
		{ bartTorvikRankings, took: btTook },
		{ netRankings, took: netTook, attempts: netAttempts }
	] = await Promise.all([
		fetchKenpomRankings(),
		fetchEvanMiyaRankings(browser),
		fetchBartTorvikRankings(browser),
		fetchNetRankings(browser)
	]);

	await browser.close();

	console.log(
		`Data fetching times:\n  KenPom: ${kpTook}s\n  EvanMiya: ${emTook}s\n  BartTorvik: ${btTook}s\n  NET: ${netTook}s (${netAttempts} attempts)`
	);

	const compiledData: Record<string, CompiledTeamData> = {};

	Object.entries(kenpomRankings).forEach(([teamKey, kpValues]) => {
		const emValues = evanMiyaRankings[teamKey];
		const btValues = bartTorvikRankings[teamKey];
		const netValues = netRankings[teamKey];

		compiledData[teamKey] = {
			team_key: teamKey,
			team_name: emValues.team,
			kp_rating: kpValues.net_rating,
			kp_rating_rank: kpValues.rank,
			kp_offensive_rating: kpValues.offensive_rating,
			kp_offensive_rating_rank: kpValues.offensive_rating_rank,
			kp_defensive_rating: kpValues.defensive_rating,
			kp_defensive_rating_rank: kpValues.defensive_rating_rank,
			em_rating: emValues.relative_rating,
			em_rating_rank: emValues.relative_ranking,
			em_offensive_rating: emValues.o_rate,
			em_offensive_rating_rank: emValues.off_rank,
			em_defensive_rating: emValues.d_rate,
			em_defensive_rating_rank: emValues.def_rank,
			bt_rating: btValues.barthag,
			bt_rating_rank: btValues.barthag_rank,
			bt_offensive_rating: btValues.adjoe,
			bt_offensive_rating_rank: btValues.adjoe_rank,
			bt_defensive_rating: btValues.adjde,
			bt_defensive_rating_rank: btValues.adjde_rank,
			net_rank: netValues.rank,
			net_q1_record: netValues.quad_1,
			net_q2_record: netValues.quad_2,
			net_q3_record: netValues.quad_3,
			net_q4_record: netValues.quad_4
		};
	});

	cache = compiledData;
	return processTeamData(Object.values(compiledData));
}

function processTeamData(teams: CompiledTeamData[]): CompiledTeamData[] {
	teams.forEach(team => {
		team.avg_rank =
			Math.round(((team.kp_rating_rank + team.em_rating_rank + team.bt_rating_rank + team.net_rank) / 4) * 100) / 100;
		team.avg_offensive_rank =
			Math.round(
				((team.kp_offensive_rating_rank + team.em_offensive_rating_rank + team.bt_offensive_rating_rank) / 3) * 100
			) / 100;
		team.avg_defensive_rank =
			Math.round(
				((team.kp_defensive_rating_rank + team.em_defensive_rating_rank + team.bt_defensive_rating_rank) / 3) * 100
			) / 100;

		team.net_q1_wins = parseInt(team.net_q1_record.split('-')[0]);
		team.net_q2_wins = parseInt(team.net_q2_record.split('-')[0]);
		team.net_q3_wins = parseInt(team.net_q3_record.split('-')[0]);
		team.net_q4_wins = parseInt(team.net_q4_record.split('-')[0]);
	});

	[...teams].sort((a, b) => a.avg_rank! - b.avg_rank!).forEach((team, i) => (team.avg_rank_order = i + 1));
	[...teams]
		.sort((a, b) => a.avg_offensive_rank! - b.avg_offensive_rank!)
		.forEach((team, i) => (team.avg_offensive_rank_order = i + 1));
	[...teams]
		.sort((a, b) => a.avg_defensive_rank! - b.avg_defensive_rank!)
		.forEach((team, i) => (team.avg_defensive_rank_order = i + 1));

	return teams;
}

const HEADERS = [
	'rank',
	'team',
	'conference',
	'win_loss',
	'net_rating',
	'offensive_rating',
	'offensive_rating_rank',
	'defensive_rating',
	'defensive_rating_rank',
	'adjusted_tempo',
	'adjusted_tempo_rank',
	'luck',
	'luck_rank',
	'sos_net_rating',
	'sos_net_rating_rank',
	'sos_offensive_rating',
	'sos_offensive_rating_rank',
	'sos_defensive_rating',
	'sos_defensive_rating_rank',
	'noncon_sos',
	'noncon_sos_rank'
] as const;

type Header = (typeof HEADERS)[number];

type TeamData = {
	[K in Header]: K extends 'team' | 'conference' | 'win_loss' ? string : number;
} & { team_key: string };

type KenpomData = Record<string, TeamData>;

async function fetchKenpomRankings(): Promise<{ kenpomRankings: KenpomData; took: number }> {
	const startTime = new Date().getTime();

	const response = await fetch('https://kenpom.com/index.php');
	const data = await response.text();

	const $ = cheerio.load(data);

	const rows = $('#ratings-table tbody tr');

	const teams: KenpomData = Array.from(rows).reduce<KenpomData>((acc, tr) => {
		const teamInfo = {} as TeamData;

		$(tr)
			.children()
			.each((i, td) => {
				const tdContent = $(td).text().trim();
				const header = HEADERS[i] as Header;

				if (header === 'team' || header === 'conference' || header === 'win_loss') {
					teamInfo[header] = tdContent;
				} else if (header.endsWith('rank')) {
					teamInfo[header] = parseInt(tdContent);
				} else if (!isNaN(Number(tdContent))) {
					teamInfo[header] = parseFloat(tdContent);
				}
			});

		teamInfo['team_key'] = teamInfo.team
			.toLowerCase()
			.replaceAll(' ', '_')
			.replaceAll(/[^a-z_]/g, '');

		acc[teamInfo.team_key] = teamInfo;

		return acc;
	}, {});

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;
	return { kenpomRankings: teams, took };
}

async function fetchBartTorvikRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://barttorvik.com/#', { waitUntil: 'networkidle' });

	await page.waitForSelector('.seedrow', {
		timeout: 3000
	});

	const teamData = await page.evaluate(() => {
		const TEAM_KEY_MAP: Record<string, string> = {
			mcneese_st: 'mcneese',
			cal_st_northridge: 'csun',
			nicholls_st: 'nicholls',
			southeast_missouri_st: 'southeast_missouri',
			siu_edwardsville: 'siue',
			umkc: 'kansas_city'
		};

		const teamMap: Record<string, Record<string, unknown>> = {};
		const columns = Array.from(document.querySelectorAll('thead tr:nth-child(2) th')).map(e =>
			e.textContent!.toLowerCase().replaceAll('%', '_pct_').replaceAll(/_$/g, '').replaceAll('.', '').replaceAll(' ', '_')
		);
		document.querySelectorAll('.seedrow').forEach(e => {
			const teamData: Record<string, unknown> = {};
			e.querySelectorAll('td').forEach((td, i) => {
				const columnName = columns[i];

				if (i === 1) {
					const teamName = td.querySelector('a')!.childNodes[0].textContent;
					const teamKey = teamName!
						.toLowerCase()
						.replaceAll(' ', '_')
						.replaceAll(/[^a-z_]/g, '');
					teamData[columnName] = teamName;
					teamData['teamKey'] = TEAM_KEY_MAP[teamKey] ?? teamKey;
				} else if (i <= 4) {
					teamData[columnName] = td.textContent;
				} else {
					teamData[columnName] = parseFloat(td.childNodes[0].textContent!);
					teamData[columnName + '_rank'] = parseInt(td.childNodes[2].textContent!);
				}
			});

			teamMap[teamData.teamKey as string] = teamData;
		});
		return teamMap;
	});

	await page.close();

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;
	return { bartTorvikRankings: teamData, took };
}

async function fetchNetRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings', {
		waitUntil: 'networkidle'
	});

	const retries = 3;
	let attempts = 0;

	for (let i = 0; i < retries; i++) {
		attempts++;
		try {
			await page.waitForSelector('tbody tr', { timeout: 10000 });
			break;
		} catch (error) {
			if (i === retries - 1) throw error;
		}
	}

	const teamData = await page.evaluate(() => {
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

		const teamMap: Record<string, Record<string, string | number>> = {};
		const columns = Array.from(document.querySelectorAll('thead.tableFloatingHeaderOriginal th div')).map(e =>
			e.textContent?.trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_')
		);

		document.querySelectorAll('tbody tr').forEach(tr => {
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

			const teamKey = (teamInfo.school as string)
				.toLowerCase()
				.replaceAll(' ', '_')
				.replaceAll(/[^a-z_]/g, '');
			teamInfo['team_key'] = TEAM_KEY_MAP[teamKey] ?? teamKey;

			teamMap[teamInfo.team_key as string] = teamInfo;
		});

		return teamMap;
	});

	await page.close();

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;
	return { netRankings: teamData, attempts, took };
}

async function fetchEvanMiyaRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://evanmiya.com/?team_ratings', {
		waitUntil: 'networkidle'
	});

	await page.waitForSelector('.rt-page-size-select');
	await page.selectOption('.rt-page-size-select', { index: 5 });
	await page.waitForSelector('#team_ratings_page-team_ratings .rt-tr-group:nth-of-type(365)');

	const teamData = await page.evaluate(() => {
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

		const teamMap: Record<string, Record<string, unknown>> = {};

		const columns = Array.from(document.querySelectorAll('#team_ratings_page-team_ratings .rt-th')).map(h =>
			h
				.querySelector('.rt-text-content:not(:has(span)), span')
				?.textContent?.toLocaleLowerCase()
				.replaceAll(' ', '_')
				.replaceAll('-', '_')
		);

		document.querySelectorAll('#team_ratings_page-team_ratings .rt-tr-group').forEach(row => {
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

			teamMap[team.team_key as string] = team;
		});

		return teamMap;
	});

	await page.close();

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;

	return { evanMiyaRankings: teamData, took };
}
