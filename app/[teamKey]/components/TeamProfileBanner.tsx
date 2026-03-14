'use client';

import { useRankings } from '@/app/context/RankingsContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import type { TeamData } from '@/lib/espn/espn-team-data';
import { getRankHeatMap } from '@/lib/utils';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

export default function TeamProfileBanner() {
	const rankings = useRankings();
	const profile = useTeamProfile();

	const team = useMemo(() => rankings.find(r => r.team_key === profile.team_key)!, [profile.team_key]);

	const metadata = (team as unknown as { metadata?: TeamData }).metadata;

	const pickColor = () => {
		if (!metadata?.color) return undefined;
		const primary = metadata.color;
		const secondary = metadata.secondary_color || primary;

		const isNearBlack = (hex: string) => {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			return r + g + b < 80;
		};
		const isNearWhite = (hex: string) => {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			return r + g + b > 680;
		};

		if (isNearBlack(primary)) return secondary;
		if (isNearWhite(primary)) {
			return !isNearBlack(secondary) ? secondary : primary;
		}
		return primary;
	};

	const bannerColor = pickColor();

	return (
		<Card
			className="w-full mt-4 md:mt-8 py-3"
			style={bannerColor ? {
				background: `linear-gradient(135deg, #${bannerColor}40 0%, #${bannerColor}20 50%, transparent 100%)`,
				borderColor: `#${bannerColor}60`,
			} : undefined}
		>
			<CardContent className="flex flex-col md:flex-row gap-3 md:gap-4 items-center px-4">
				<div className="flex gap-3 md:gap-4 items-center w-full md:w-auto">
					<TeamLogo teamKey={profile.team_key} className="h-14 md:h-22" />
					<div className="flex flex-col gap-1 md:gap-2">
						<h1 className="text-3xl md:text-5xl font-kanit font-medium">
							{team.ap_rank && (
								<span className="text-muted-foreground text-2xl md:text-4xl mr-1">{team.ap_rank}</span>
							)}
							{profile.team_name}
						</h1>
						<div className="flex flex-wrap gap-2 md:gap-3 text-sm md:text-base items-center">
							<div className="text-xs md:text-xl text-muted-foreground whitespace-nowrap">{team.record}</div>
							<div className="flex gap-2 md:gap-3">
								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-emerald-500/80 bg-emerald-500/30`}
									>
										Q1
									</div>
									{team.net_q1_record}
								</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-blue-500/80 bg-blue-500/30`}
									>
										Q2
									</div>
									{team.net_q2_record}
								</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-amber-500/80 bg-amber-500/30`}
									>
										Q3
									</div>
									{team.net_q3_record}
								</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
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
				</div>
				<div className="md:ml-auto md:h-[85%] flex gap-2 md:gap-3 w-full md:w-auto">
					<div
						className={twMerge(
							`text-center h-full flex-1 md:flex-none px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(team.avg_zscore_rank)
						)}
					>
						<div className="text-muted-foreground text-xs md:text-base">
							<span className="md:hidden">Composite</span>
							<span className="hidden md:inline">Composite Rank</span>
						</div>
						<div className="text-2xl md:text-3xl font-bold">#{team.avg_zscore_rank}</div>
					</div>
					<div
						className={twMerge(
							`text-center h-full flex-1 md:flex-none px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(team.avg_offensive_zscore_rank)
						)}
					>
						<div className="text-muted-foreground text-xs md:text-base">
							<span className="md:hidden">Offense</span>
							<span className="hidden md:inline">Offensive Rank</span>
						</div>
						<div className="text-2xl md:text-3xl font-bold">#{team.avg_offensive_zscore_rank}</div>
					</div>
					<div
						className={twMerge(
							`text-center h-full flex-1 md:flex-none px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(team.avg_defensive_zscore_rank)
						)}
					>
						<div className="text-muted-foreground text-xs md:text-base">
							<span className="md:hidden">Defense</span>
							<span className="hidden md:inline">Defensive Rank</span>
						</div>
						<div className="text-2xl md:text-3xl font-bold">#{team.avg_defensive_zscore_rank}</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
