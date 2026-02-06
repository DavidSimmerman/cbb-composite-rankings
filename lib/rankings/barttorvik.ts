import { Browser } from 'playwright';
import { waitForSelectorRetries, calculateZScores, validateRankings } from './utils';
import { PostgresService } from '../database';

const db = PostgresService.getInstance();

export interface BartTorvikRanking {
	'id': string;
	'date': string;
	'team_key': string;
	'rk': number;
	'team': string;
	'conf': string;
	'g': number;
	'rec': string;
	'adjoe': number;
	'adjoe_rank': number;
	'adjde': number;
	'adjde_rank': number;
	'barthag': number;
	'barthag_rank': number;
	'efg_pct': number;
	'efg_pct_rank': number;
	'efgd_pct': number;
	'efgd_pct_rank': number;
	'tor': number;
	'tor_rank': number;
	'tord': number;
	'tord_rank': number;
	'orb': number;
	'orb_rank': number;
	'drb': number;
	'drb_rank': number;
	'ftr': number;
	'ftr_rank': number;
	'ftrd': number;
	'ftrd_rank': number;
	'2p_pct': number;
	'2p_pct_rank': number;
	'2p_pct_d': number;
	'2p_pct_d_rank': number;
	'3p_pct': number;
	'3p_pct_rank': number;
	'3p_pct_d': number;
	'3p_pct_d_rank': number;
	'3pr': number;
	'3pr_rank': number;
	'3prd': number;
	'3prd_rank': number;
	'adj_t': number;
	'adj_t_rank': number;
	'wab': number;
	'wab_rank': number;
	'barthag_zscore': number;
	'adjoe_zscore': number;
	'adjde_zscore': number;
	'created_at': string;
	'updated_at': string;
}

export async function updateBartTorvik(browser: Browser) {
	const BT_QUERY = `
		INSERT INTO barttorvik_rankings (
			team_key, team, rk, conf, g, rec,
			adjoe, adjoe_rank, adjde, adjde_rank,
			barthag, barthag_rank,
			efg_pct, efg_pct_rank, efgd_pct, efgd_pct_rank,
			tor, tor_rank, tord, tord_rank,
			orb, orb_rank, drb, drb_rank,
			ftr, ftr_rank, ftrd, ftrd_rank,
			"2p_pct", "2p_pct_rank", "2p_pct_d", "2p_pct_d_rank",
			"3p_pct", "3p_pct_rank", "3p_pct_d", "3p_pct_d_rank",
			"3pr", "3pr_rank", "3prd", "3prd_rank",
			adj_t, adj_t_rank, wab, wab_rank,
			barthag_zscore, adjoe_zscore, adjde_zscore
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12,
			$13, $14, $15, $16,
			$17, $18, $19, $20,
			$21, $22, $23, $24,
			$25, $26, $27, $28,
			$29, $30, $31, $32,
			$33, $34, $35, $36,
			$37, $38, $39, $40,
			$41, $42, $43, $44,
			$45, $46, $47
		)
		ON CONFLICT (team_key, date) DO UPDATE SET
			team = EXCLUDED.team, rk = EXCLUDED.rk, conf = EXCLUDED.conf, g = EXCLUDED.g, rec = EXCLUDED.rec,
			adjoe = EXCLUDED.adjoe, adjoe_rank = EXCLUDED.adjoe_rank, adjde = EXCLUDED.adjde, adjde_rank = EXCLUDED.adjde_rank,
			barthag = EXCLUDED.barthag, barthag_rank = EXCLUDED.barthag_rank,
			efg_pct = EXCLUDED.efg_pct, efg_pct_rank = EXCLUDED.efg_pct_rank,
			efgd_pct = EXCLUDED.efgd_pct, efgd_pct_rank = EXCLUDED.efgd_pct_rank,
			tor = EXCLUDED.tor, tor_rank = EXCLUDED.tor_rank, tord = EXCLUDED.tord, tord_rank = EXCLUDED.tord_rank,
			orb = EXCLUDED.orb, orb_rank = EXCLUDED.orb_rank, drb = EXCLUDED.drb, drb_rank = EXCLUDED.drb_rank,
			ftr = EXCLUDED.ftr, ftr_rank = EXCLUDED.ftr_rank, ftrd = EXCLUDED.ftrd, ftrd_rank = EXCLUDED.ftrd_rank,
			"2p_pct" = EXCLUDED."2p_pct", "2p_pct_rank" = EXCLUDED."2p_pct_rank",
			"2p_pct_d" = EXCLUDED."2p_pct_d", "2p_pct_d_rank" = EXCLUDED."2p_pct_d_rank",
			"3p_pct" = EXCLUDED."3p_pct", "3p_pct_rank" = EXCLUDED."3p_pct_rank",
			"3p_pct_d" = EXCLUDED."3p_pct_d", "3p_pct_d_rank" = EXCLUDED."3p_pct_d_rank",
			"3pr" = EXCLUDED."3pr", "3pr_rank" = EXCLUDED."3pr_rank",
			"3prd" = EXCLUDED."3prd", "3prd_rank" = EXCLUDED."3prd_rank",
			adj_t = EXCLUDED.adj_t, adj_t_rank = EXCLUDED.adj_t_rank,
			wab = EXCLUDED.wab, wab_rank = EXCLUDED.wab_rank,
			barthag_zscore = EXCLUDED.barthag_zscore, adjoe_zscore = EXCLUDED.adjoe_zscore, adjde_zscore = EXCLUDED.adjde_zscore
	`;

	const teams = await fetchBartTorvikRankings(browser);

	validateRankings(teams, 'BartTorvik');

	await db.transaction(
		teams.map(team => ({
			query: BT_QUERY,
			params: [
				team.team_key,
				team.team,
				team.rk,
				team.conf,
				team.g,
				team.rec,
				team.adjoe,
				team.adjoe_rank,
				team.adjde,
				team.adjde_rank,
				team.barthag,
				team.barthag_rank,
				team.efg_pct,
				team.efg_pct_rank,
				team.efgd_pct,
				team.efgd_pct_rank,
				team.tor,
				team.tor_rank,
				team.tord,
				team.tord_rank,
				team.orb,
				team.orb_rank,
				team.drb,
				team.drb_rank,
				team.ftr,
				team.ftr_rank,
				team.ftrd,
				team.ftrd_rank,
				team['2p_pct'],
				team['2p_pct_rank'],
				team['2p_pct_d'],
				team['2p_pct_d_rank'],
				team['3p_pct'],
				team['3p_pct_rank'],
				team['3p_pct_d'],
				team['3p_pct_d_rank'],
				team['3pr'],
				team['3pr_rank'],
				team['3prd'],
				team['3prd_rank'],
				team.adj_t,
				team.adj_t_rank,
				team.wab,
				team.wab_rank,
				team.barthag_zscore,
				team.adjoe_zscore,
				team.adjde_zscore
			]
		}))
	);

	console.log(`RANKINGS FETCH: BartTorvik rankings successfully updated.`);
}

export async function fetchBartTorvikRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://barttorvik.com/#', { waitUntil: 'networkidle' });

	const attempts = await waitForSelectorRetries(page, '.seedrow');

	let teams = await page.evaluate(() => {
		const TEAM_KEY_MAP: Record<string, string> = {
			mcneese_st: 'mcneese',
			cal_st_northridge: 'csun',
			nicholls_st: 'nicholls',
			southeast_missouri_st: 'southeast_missouri',
			siu_edwardsville: 'siue',
			umkc: 'kansas_city'
		};

		const columns = Array.from(document.querySelectorAll('thead tr:nth-child(2) th')).map(e =>
			e.textContent!.toLowerCase().replaceAll('%', '_pct_').replaceAll(/_$/g, '').replaceAll('.', '').replaceAll(' ', '_')
		);

		return Array.from(document.querySelectorAll('.seedrow')).map(e => {
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
					teamData['team_key'] = TEAM_KEY_MAP[teamKey] ?? teamKey;
				} else if (i <= 4) {
					teamData[columnName] = td.textContent;
				} else {
					teamData[columnName] = parseFloat(td.childNodes[0].textContent!);
					teamData[columnName + '_rank'] = parseInt(td.childNodes[2].textContent!);
				}
			});

			return teamData;
		});
	});

	await page.close();

	teams = calculateZScores(teams, [{ source: 'barthag' }, { source: 'adjoe' }, { source: 'adjde', flip: true }]);

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;

	console.log(`RANKINGS FETCH: BartTorvik rankings took ${took}s in ${attempts} attempt(s).`);

	return teams;
}
