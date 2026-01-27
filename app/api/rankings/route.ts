import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export async function GET() {
	const browser = await chromium.launch();

	const [kenpomRankings, bartTorvikRankings, netRankings] = await Promise.all([
		fetchKenpomRankings(),
		fetchBartTorvikRankings(browser),
		fetchNetRankings(browser)
	]);

	await browser.close();

	const compiledData = {};

	Object.entries(kenpomRankings).forEach(([teamKey, kpValues]) => {
		const btValues = bartTorvikRankings[teamKey];
		const netValues = netRankings[teamKey];

		compiledData[teamKey] = {
			team_key: teamKey,
			team_name: btValues.team,
			kp_rating: kpValues.net_rating,
			kp_rating_rank: kpValues.rank,
			kp_offensive_rating: kpValues.offensive_rating,
			kp_offensive_rating_rank: kpValues.offensive_rating_rank,
			kp_defensive_rating: kpValues.defensive_rating,
			kp_defensive_rating_rank: kpValues.defensive_rating_rank,
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

	return NextResponse.json(compiledData);
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

async function fetchKenpomRankings(): Promise<KenpomData> {
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

	return teams;
}

async function fetchBartTorvikRankings(browser: import('playwright').Browser) {
	const page = await browser.newPage();

	await page.goto('https://barttorvik.com/#', { waitUntil: 'networkidle' });

	await page.waitForSelector('.seedrow', {
		timeout: 3000
	});

	const teamData = await page.evaluate(() => {
		const TEAM_KEY_MAP = {
			mcneese_st: 'mcneese',
			cal_st_northridge: 'csun',
			nicholls_st: 'nicholls',
			southeast_missouri_st: 'southeast_missouri',
			siu_edwardsville: 'siue',
			umkc: 'kansas_city'
		};

		const teamMap = {};
		const columns = Array.from(document.querySelectorAll('thead tr:nth-child(2) th')).map(e =>
			e.textContent.toLowerCase().replaceAll('%', '_pct_').replaceAll(/_$/g, '').replaceAll('.', '').replaceAll(' ', '_')
		);
		document.querySelectorAll('.seedrow').forEach(e => {
			const teamData = {};
			e.querySelectorAll('td').forEach((td, i) => {
				const columnName = columns[i];

				if (i === 1) {
					const teamName = td.querySelector('a').childNodes[0].textContent;
					const teamKey = teamName
						.toLowerCase()
						.replaceAll(' ', '_')
						.replaceAll(/[^a-z_]/g, '');
					teamData[columnName] = teamName;
					teamData['teamKey'] = TEAM_KEY_MAP[teamKey] ?? teamKey;
				} else if (i <= 4) {
					teamData[columnName] = td.textContent;
				} else {
					teamData[columnName] = parseFloat(td.childNodes[0].textContent);
					teamData[columnName + '_rank'] = parseInt(td.childNodes[2].textContent);
				}
			});

			teamMap[teamData.teamKey] = teamData;
		});
		return teamMap;
	});

	await page.close();
	return teamData;
}

async function fetchNetRankings(browser: import('playwright').Browser) {
	const page = await browser.newPage();

	await page.goto('https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings', {
		waitUntil: 'networkidle'
	});

	await page.waitForSelector('tbody tr', { timeout: 5000 });

	const teamData = await page.evaluate(() => {
		const TEAM_KEY_MAP = {
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

		const teamMap = {};
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

			const teamKey = teamInfo.school
				.toLowerCase()
				.replaceAll(' ', '_')
				.replaceAll(/[^a-z_]/g, '');
			teamInfo['team_key'] = TEAM_KEY_MAP[teamKey] ?? teamKey;

			teamMap[teamInfo.team_key as string] = teamInfo;
		});

		return teamMap;
	});

	await page.close();
	return teamData;
}
