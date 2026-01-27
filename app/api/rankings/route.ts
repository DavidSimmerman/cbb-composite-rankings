import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export async function GET() {
	const [kenpomRankings, bartTorvikRankings] = await Promise.all([fetchKenpomRankings(), fetchBartTorvikRankings()]);

	const compiledData = {};

	Object.entries(kenpomRankings).forEach(([teamKey, kpValues]) => {
		const btValues = bartTorvikRankings[teamKey];

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
			bt_defensive_rating_rank: btValues.adjde_rank
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

export async function fetchKenpomRankings(): Promise<KenpomData> {
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

export async function fetchBartTorvikRankings() {
	const browser = await chromium.launch();
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
					teamData[columnName] = td.childNodes[0].textContent;
					teamData[columnName + '_rank'] = td.childNodes[2].textContent;
				}
			});

			teamMap[teamData.teamKey] = teamData;
		});
		return teamMap;
	});

	await browser.close();
	return teamData;
}
