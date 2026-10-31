'use client';

import { useRankings } from '@/app/context/RankingsContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { TeamData } from '@/lib/espn/espn-team-data';
import { seasonLabel } from '@/lib/season';
import { getRankHeatMap } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

export default function TeamProfileBanner() {
	const rankings = useRankings();
	const profile = useTeamProfile();

	const team = useMemo(() => rankings.find(r => r.team_key === profile.team_key), [profile.team_key]);

	const metadata = (team as unknown as { metadata?: TeamData } | undefined)?.metadata;

	// Live rankings cover only the latest season; past seasons (or a team the live composite had to
	// skip) read from that season's final snapshot
	const isLatestSeason = profile.season === profile.latest_season;
	const seasonRatings = profile.full_ratings[profile.season];
	const view =
		isLatestSeason && team
			? {
					apRank: team.ap_rank,
					record: team.record,
					quads: [team.net_q1_record, team.net_q2_record, team.net_q3_record, team.net_q4_record],
					compRank: team.avg_zscore_rank,
					offRank: team.avg_offensive_zscore_rank,
					defRank: team.avg_defensive_zscore_rank
				}
			: {
					apRank: isLatestSeason ? seasonRatings?.ap_rank : undefined,
					record: seasonRatings?.kp_win_loss,
					quads: [
						seasonRatings?.net_quad_1,
						seasonRatings?.net_quad_2,
						seasonRatings?.net_quad_3,
						seasonRatings?.net_quad_4
					],
					compRank: seasonRatings?.comp_avg_zscore_rank,
					offRank: seasonRatings?.comp_avg_offensive_zscore_rank,
					defRank: seasonRatings?.comp_avg_defensive_zscore_rank
				};
	const hasQuads = view.quads.some(q => q != null);

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
							{view.apRank && (
								<span className="text-muted-foreground text-2xl md:text-4xl mr-1">{view.apRank}</span>
							)}
							{profile.team_name}
						</h1>
						<div className="flex flex-wrap gap-2 md:gap-3 text-sm md:text-base items-center">
							<SeasonPicker />
							<div className="text-xs md:text-xl text-muted-foreground whitespace-nowrap">{view.record}</div>
							{hasQuads && (
							<div className="flex gap-2 md:gap-3">
								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-emerald-500/80 bg-emerald-500/30`}
									>
										Q1
									</div>
									{view.quads[0]}
								</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-blue-500/80 bg-blue-500/30`}
									>
										Q2
									</div>
									{view.quads[1]}
								</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-amber-500/80 bg-amber-500/30`}
									>
										Q3
									</div>
									{view.quads[2]}
								</div>

								<div className="flex items-center gap-1 whitespace-nowrap">
									<div
										className={`text-center text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border border-red-500/80 bg-red-500/30`}
									>
										Q4
									</div>
									{view.quads[3]}
								</div>
							</div>
							)}
						</div>
					</div>
				</div>
				<div className="md:ml-auto md:h-[85%] flex gap-2 md:gap-3 w-full md:w-auto">
					<div
						className={twMerge(
							`text-center h-full flex-1 md:flex-none px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(view.compRank)
						)}
					>
						<div className="text-muted-foreground text-xs md:text-base">
							<span className="md:hidden">Composite</span>
							<span className="hidden md:inline">Composite Rank</span>
						</div>
						<div className="text-2xl md:text-3xl font-bold">{rankLabel(view.compRank)}</div>
					</div>
					<div
						className={twMerge(
							`text-center h-full flex-1 md:flex-none px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(view.offRank)
						)}
					>
						<div className="text-muted-foreground text-xs md:text-base">
							<span className="md:hidden">Offense</span>
							<span className="hidden md:inline">Offensive Rank</span>
						</div>
						<div className="text-2xl md:text-3xl font-bold">{rankLabel(view.offRank)}</div>
					</div>
					<div
						className={twMerge(
							`text-center h-full flex-1 md:flex-none px-3 py-1 border border-white/10 bg-white/5 rounded-lg flex flex-col items-center justify-center`,
							getRankHeatMap(view.defRank)
						)}
					>
						<div className="text-muted-foreground text-xs md:text-base">
							<span className="md:hidden">Defense</span>
							<span className="hidden md:inline">Defensive Rank</span>
						</div>
						<div className="text-2xl md:text-3xl font-bold">{rankLabel(view.defRank)}</div>
					</div>
				</div>
			</CardContent>
			{!isLatestSeason && (
				<div className="mx-4 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-muted-foreground">
					Viewing the {seasonLabel(profile.season)} season: final ratings and record.{' '}
					<Link href={`/${profile.team_key}`} className="text-foreground underline underline-offset-2">
						Back to {seasonLabel(profile.latest_season)}
					</Link>
				</div>
			)}
		</Card>
	);
}

function rankLabel(rank: number | null | undefined) {
	return rank == null ? '—' : `#${rank}`;
}

function SeasonPicker() {
	const profile = useTeamProfile();
	const router = useRouter();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild suppressHydrationWarning>
				<Button variant="outline" size="sm" className="cursor-pointer h-7 px-2 text-xs md:text-sm gap-1">
					{seasonLabel(profile.season)}
					<ChevronDown className="size-3.5 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="max-h-72 overflow-auto">
				{profile.available_seasons.map(s => (
					<DropdownMenuCheckboxItem
						key={s}
						checked={s === profile.season}
						onCheckedChange={() =>
							router.push(s === profile.latest_season ? `/${profile.team_key}` : `/${profile.team_key}?season=${s}`)
						}
						className="cursor-pointer"
					>
						{seasonLabel(s)}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
