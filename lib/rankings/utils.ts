import { Page } from 'playwright';
import { KenPomRanking } from './kenpom';
import { EvanMiyaRanking } from './evanmiya';
import { BartTorvikRanking } from './barttorvik';
import { NetRanking } from './net';
import { BaseTeamData } from '../shared';

export async function waitForSelectorRetries(page: Page, selector: string): Promise<number> {
	const retries = 5;
	let attempts = 0;

	for (let i = 0; i < retries; i++) {
		attempts++;
		try {
			await page.waitForSelector(selector, { timeout: 20000 });
			await new Promise(res => setTimeout(res, 1000));
			break;
		} catch (error) {
			if (i === retries - 1) throw error;
			await page.reload({ waitUntil: 'networkidle' });
		}
	}

	return attempts;
}

export function validateRankings(teams: Record<string, unknown>[], source: string): void {
	for (const team of teams) {
		const teamName = (team.team_key ?? team.team ?? team.school ?? 'unknown') as string;
		for (const [key, value] of Object.entries(team)) {
			if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
				throw new Error(
					`${source} validation failed: team "${teamName}" has invalid value for "${key}": ${value}`
				);
			}
		}
	}
}

export function calculateZScores<T extends Record<string, any>>(teams: T[], keys: { source: string; flip?: boolean }[]): T[] {
	const newTeams: Record<string, any>[] = structuredClone(teams);

	for (const { source, flip } of keys) {
		const mean = newTeams.reduce((sum, t) => sum + (t[source] as number), 0) / newTeams.length;
		const stdDev = Math.sqrt(
			newTeams.reduce((sum, t) => sum + Math.pow((t[source] as number) - mean, 2), 0) / newTeams.length
		);
		newTeams.forEach(t => {
			t[`${source}_zscore`] = (((t[source] as number) - mean) / stdDev) * (flip ? -1 : 1);
		});
	}

	return newTeams as T[];
}

export function mapBaseTeams(
	kpTeams: KenPomRanking[],
	emTeams: EvanMiyaRanking[],
	btTeams: BartTorvikRanking[],
	netTeams: NetRanking[]
): BaseTeamData[] {
	return kpTeams.map(kpValues => {
		const teamKey = kpValues.team_key;
		const emValues = emTeams.find(t => t.team_key === teamKey)!;
		const btValues = btTeams.find(t => t.team_key === teamKey)!;
		const netValues = netTeams.find(t => t.team_key === teamKey)!;

		return {
			team_key: teamKey,
			team_name: emValues.team,
			conference: kpValues.conference,

			kp_rating: kpValues.net_rating,
			kp_rating_rank: kpValues.rank,
			kp_offensive_rating: kpValues.offensive_rating,
			kp_offensive_rating_rank: kpValues.offensive_rating_rank,
			kp_defensive_rating: kpValues.defensive_rating,
			kp_defensive_rating_rank: kpValues.defensive_rating_rank,
			kp_rating_zscore: kpValues.net_rating_zscore,
			kp_offensive_rating_zscore: kpValues.offensive_rating_zscore,
			kp_defensive_rating_zscore: kpValues.defensive_rating_zscore,

			em_rating: emValues.relative_rating,
			em_rating_rank: emValues.relative_ranking,
			em_offensive_rating: emValues.o_rate,
			em_offensive_rating_rank: emValues.off_rank,
			em_defensive_rating: emValues.d_rate,
			em_defensive_rating_rank: emValues.def_rank,
			em_rating_zscore: emValues.relative_rating_zscore,
			em_offensive_rating_zscore: emValues.o_rate_zscore,
			em_defensive_rating_zscore: emValues.d_rate_zscore,

			bt_rating: btValues.barthag,
			bt_rating_rank: btValues.barthag_rank,
			bt_offensive_rating: btValues.adjoe,
			bt_offensive_rating_rank: btValues.adjoe_rank,
			bt_defensive_rating: btValues.adjde,
			bt_defensive_rating_rank: btValues.adjde_rank,
			bt_rating_zscore: btValues.barthag_zscore,
			bt_offensive_rating_zscore: btValues.adjoe_zscore,
			bt_defensive_rating_zscore: btValues.adjde_zscore,

			net_rank: netValues.rank,
			net_q1_record: netValues.quad_1,
			net_q2_record: netValues.quad_2,
			net_q3_record: netValues.quad_3,
			net_q4_record: netValues.quad_4,
			net_q1_wins: netValues.q1_wins,
			net_q2_wins: netValues.q2_wins,
			net_q3_wins: netValues.q3_wins,
			net_q4_wins: netValues.q4_wins,

			net_rank_zscore: netValues.rank_zscore
		};
	});
}
