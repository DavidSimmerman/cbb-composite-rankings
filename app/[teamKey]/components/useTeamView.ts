'use client';

import { signed } from '@/app/components/models';
import { useRankings } from '@/app/context/RankingsContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { teamTone } from '@/lib/team-colors';
import { useMemo } from 'react';
import { MODEL_COLORS } from './ui';

type ModelRank = { short: string; color: string; rank: number | null };
export type Tile = { label: string; rank: number | null; value: string | null; models: ModelRank[] };

// Composite values per 70 possessions: net rating signed, points scored / allowed plain
const fmt = (v: number | null, sign = false) => (v == null ? null : sign ? signed(v) : v.toFixed(1));

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

// Everything the header shows, for the latest season (live rankings) or a past one (its final snapshot)
export function useTeamView() {
	const rankings = useRankings();
	const profile = useTeamProfile();

	return useMemo(() => {
		const team = rankings.find(r => r.team_key === profile.team_key);
		const meta = profile.team_data ?? team?.metadata ?? null;
		const isLatest = profile.season === profile.latest_season;
		const full = profile.full_ratings[profile.season];
		// Last ratings snapshot of the season: model ranks for past seasons
		const lastDay = Object.values(profile.ratings_history)
			.filter(h => h.season === profile.season)
			.sort((a, b) => a.date.localeCompare(b.date))
			.at(-1);

		const live = isLatest && team;
		const conference = (live ? team.conference : full?.kp_conference) ?? team?.conference ?? null;

		const record = live ? team.record : full?.kp_win_loss;
		const quads = live
			? [team.net_q1_record, team.net_q2_record, team.net_q3_record, team.net_q4_record]
			: [full?.net_quad_1, full?.net_quad_2, full?.net_quad_3, full?.net_quad_4];

		// Conference record from the schedule: finished games against teams in the same conference.
		// Neutral-site March games are left out, so conference tournaments don't count (as on ESPN).
		const confGames = profile.schedule.filter(
			g =>
				g.score &&
				typeof g.won === 'boolean' &&
				conference &&
				g.opp.conference === conference &&
				!(g.homeAway === 'neutral' && g.date.slice(5, 7) === '03')
		);
		const confRecord = conference
			? `${confGames.filter(g => g.won).length}-${confGames.filter(g => !g.won).length}`
			: null;

		const src = live ? team : lastDay;
		const m = (short: keyof typeof SHORT, rank: unknown): ModelRank => ({
			short: SHORT[short],
			color: MODEL_COLORS[short],
			rank: num(rank)
		});

		const tiles: Tile[] = [
			{
				label: 'Composite',
				rank: num(live ? team.avg_zscore_rank : full?.comp_avg_zscore_rank),
				value: fmt(num(live ? team.per70_rating : full?.comp_per70_rating), true),
				models: [
					m('kenpom', src?.kp_rating_rank),
					m('evanmiya', src?.em_rating_rank),
					m('barttorvik', src?.bt_rating_rank),
					m('net', live ? team.net_rank : (lastDay?.net_rank ?? full?.net_rank))
				]
			},
			{
				label: 'Offense',
				rank: num(live ? team.avg_offensive_zscore_rank : full?.comp_avg_offensive_zscore_rank),
				value: fmt(num(live ? team.per70_offensive_rating : full?.comp_per70_offensive_rating)),
				models: [
					m('kenpom', src?.kp_offensive_rating_rank),
					m('evanmiya', src?.em_offensive_rating_rank),
					m('barttorvik', src?.bt_offensive_rating_rank)
				]
			},
			{
				label: 'Defense',
				rank: num(live ? team.avg_defensive_zscore_rank : full?.comp_avg_defensive_zscore_rank),
				value: fmt(num(live ? team.per70_defensive_rating : full?.comp_per70_defensive_rating)),
				models: [
					m('kenpom', src?.kp_defensive_rating_rank),
					m('evanmiya', src?.em_defensive_rating_rank),
					m('barttorvik', src?.bt_defensive_rating_rank)
				]
			}
		];

		return {
			team,
			meta,
			isLatest,
			tone: teamTone(meta?.color, meta?.secondary_color),
			apRank: isLatest ? (team?.ap_rank ?? full?.ap_rank) : undefined,
			conference,
			record: record ?? null,
			quads,
			hasQuads: quads.some(q => q != null),
			confRecord,
			tiles
		};
	}, [rankings, profile]);
}

const SHORT = { kenpom: 'KP', evanmiya: 'EM', barttorvik: 'BT', net: 'NET', composite: 'CMP' } as const;
