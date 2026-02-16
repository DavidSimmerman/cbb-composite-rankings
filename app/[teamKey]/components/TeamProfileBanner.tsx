'use client';

import { useRankings } from '@/app/context/RankingsContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { getRankHeatMap } from '@/lib/utils';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

export default function TeamProfileBanner() {
	const rankings = useRankings();
	const profile = useTeamProfile();

	const team = useMemo(() => rankings.find(r => r.team_key === profile.team_key)!, [profile.team_key]);

	return (
		<Card className="w-full mt-8 py-3">
			<CardContent className="flex gap-4 items-center px-4">
				<TeamLogo teamKey={profile.team_key} className="h-22" />
				<div className="flex flex-col gap-2">
					<div className="text-5xl font-kanit font-medium ">
						{team.ap_rank && <span className="text-muted-foreground text-4xl mr-1">{team.ap_rank}</span>}
						{profile.team_name}
					</div>
					<div className="flex gap-3">
						<div className="text-xl text-muted-foreground">{team.record}</div>
						<div className="flex gap-3">
							<div className="flex items-center gap-1">
								<div
									className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-emerald-500/80 bg-emerald-500/30`}
								>
									Q1
								</div>
								{team.net_q1_record}
							</div>

							<div className="flex items-center gap-1">
								<div
									className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-blue-500/80 bg-blue-500/30`}
								>
									Q2
								</div>
								{team.net_q2_record}
							</div>

							<div className="flex items-center gap-1">
								<div
									className={`text-center text-xs! m-auto  w-[1.75lh] py-0.5 px-1 rounded-xl border border-amber-500/80 bg-amber-500/30`}
								>
									Q3
								</div>
								{team.net_q3_record}
							</div>

							<div className="flex items-center gap-1">
								<div
									className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-red-500/80 bg-red-500/30`}
								>
									Q4
								</div>
								{team.net_q4_record}
							</div>
						</div>
					</div>
				</div>
				<div className="ml-auto h-[85%] flex gap-3">
					<div
						className={twMerge(
							`text-center h-full px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(team.avg_zscore_rank)
						)}
					>
						<div className="text-muted-foreground">Composite Rank</div>
						<div className="text-3xl font-bold">#{team.avg_zscore_rank}</div>
					</div>
					<div
						className={twMerge(
							`text-center h-full px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(team.avg_offensive_zscore_rank)
						)}
					>
						<div className="text-muted-foreground">Offensive Rank</div>
						<div className="text-3xl font-bold">#{team.avg_offensive_zscore_rank}</div>
					</div>
					<div
						className={twMerge(
							`text-center h-full px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(team.avg_defensive_zscore_rank)
						)}
					>
						<div className="text-muted-foreground">Defensive Rank</div>
						<div className="text-3xl font-bold">#{team.avg_defensive_zscore_rank}</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
