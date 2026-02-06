import { Browser } from 'playwright';
import { waitForSelectorRetries, calculateZScores, validateRankings } from './utils';
import { PostgresService } from '../database';

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
	net_rating_zscore: number;
	offensive_rating_zscore: number;
	defensive_rating_zscore: number;
	created_at: string;
	updated_at: string;
}

export async function updateKenPom(browser: Browser) {
	const KP_QUERY = `
		INSERT INTO kenpom_rankings (
			team_key, team, rank, conference, win_loss, net_rating,
			offensive_rating, offensive_rating_rank, defensive_rating, defensive_rating_rank,
			adjusted_tempo, adjusted_tempo_rank, luck, luck_rank,
			sos_net_rating, sos_net_rating_rank,
			sos_offensive_rating, sos_offensive_rating_rank,
			sos_defensive_rating, sos_defensive_rating_rank,
			noncon_sos, noncon_sos_rank,
			net_rating_zscore, offensive_rating_zscore, defensive_rating_zscore
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, $13, $14,
			$15, $16,
			$17, $18,
			$19, $20,
			$21, $22,
			$23, $24, $25
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
			net_rating_zscore = EXCLUDED.net_rating_zscore, offensive_rating_zscore = EXCLUDED.offensive_rating_zscore,
			defensive_rating_zscore = EXCLUDED.defensive_rating_zscore
	`;

	const kenpomRankings = await fetchKenpomRankings(browser);

	validateRankings(kenpomRankings, 'KenPom');

	await db.transaction(
		Object.values(kenpomRankings).map(team => ({
			query: KP_QUERY,
			params: [
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
				team.net_rating_zscore,
				team.offensive_rating_zscore,
				team.defensive_rating_zscore
			]
		}))
	);

	console.log(`RANKINGS FETCH: KenPom rankings successfully updated.`);
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

async function fetchKenpomRankings(browser: Browser) {
	const startTime = new Date().getTime();

	const page = await browser.newPage();

	await page.goto('https://kenpom.com/index.php');

	const attempts = await waitForSelectorRetries(page, '#ratings-table tbody tr');

	let teams = await page.evaluate(
		headers => {
			return Array.from(document.querySelectorAll('#ratings-table tbody tr')).map(tr => {
				const teamInfo: Record<string, unknown> = {};

				tr.querySelectorAll('td').forEach((td, i) => {
					const tdContent = td.textContent?.trim() ?? '';
					const header = headers[i];

					if (header === 'team' || header === 'conference' || header === 'win_loss') {
						teamInfo[header] = tdContent;
					} else if (header.endsWith('rank')) {
						teamInfo[header] = parseInt(tdContent);
					} else if (!isNaN(Number(tdContent))) {
						teamInfo[header] = parseFloat(tdContent);
					}
				});

				const teamKey = (teamInfo.team as string)
					.toLowerCase()
					.replaceAll(' ', '_')
					.replaceAll(/[^a-z_]/g, '');

				teamInfo['team_key'] = teamKey;
				return teamInfo;
			});
		},
		[...HEADERS]
	);

	await page.close();

	teams = calculateZScores(teams, [
		{ source: 'net_rating' },
		{ source: 'offensive_rating' },
		{ source: 'defensive_rating', flip: true }
	]);

	const took = Math.round((new Date().getTime() - startTime) / 10) / 100;

	console.log(`RANKINGS FETCH: KenPom rankings took ${took}s in ${attempts} attempt(s).`);

	return teams;
}
