'use client';

import { useCookie } from '@/app/context/CookieContext';
import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ParsedEspnGame } from '@/lib/espn/schedule';
import { CompositeRanking } from '@/lib/rankings/composite';
import { CompiledTeamData } from '@/lib/shared';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useMemo } from 'react';
import { GoDotFill } from 'react-icons/go';

export default function useScheduleColumns() {
	const [ratingSource, setRatingSource] = useCookie<string>('schedule_rating_source', 'composite');
	const [viewMode, setViewMode] = useCookie<string>('schedule_view_mode', 'opponent');

	const columns = useMemo<ColumnDef<ParsedEspnGame, unknown>[]>(
		() => [
			{
				id: 'first_sections',
				header: () => (
					<div className="hidden md:flex text-2xl -ml-2 h-full align-top font-bold text-neutral-600 ">Schedule</div>
				),
				columns: [
					{
						id: 'date',
						header: () => <div className="text-left -ml-2">Date</div>,
						cell: ({ row }) => <div className="pr-2">{row.original.date.replace(/^\d{4}-/, '')}</div>
					},
					{
						id: 'home_away',
						header: () => <div></div>,
						cell: ({ row }) => {
							let homeAway;
							if (row.original.homeAway === 'home') {
								homeAway = 'vs.';
							} else if (row.original.homeAway === 'away') {
								homeAway = '@';
							} else if (row.original.homeAway) {
								homeAway = 'n.';
							}
							return <div className="text-right text-xs text-white/70 pr-1">{homeAway}</div>;
						}
					},
					{
						id: 'opp',
						header: () => <div>Opponent</div>,
						cell: ({ row }) => (
							<Link href={row.original.opp.team_key ?? '/'} className="flex gap-1 items-center pr-1 group">
								{row.original.opp.team_key && <TeamLogo teamKey={row.original.opp.team_key} className="h-lh" />}

								<span className="truncate">
									{row.original.opp.ap_rank && (
										<span className="text-muted-foreground text-xs mr-1">{row.original.opp.ap_rank}</span>
									)}
									<span className="group-hover:underline">
										{row.original.opp.team_name ?? row.original.espn_id}
									</span>
								</span>
								{row.original.opp.team_name && (
									<span className="text-neutral-400">({row.original.opp.record})</span>
								)}
							</Link>
						)
					}
				]
			},
			{
				id: 'opponent_ratings',
				header: () => (
					<ToggleGroup
						variant="outline"
						type="single"
						value={viewMode}
						onValueChange={v => v && setViewMode(v)}
						className="w-full"
					>
						<ToggleGroupItem value="opponent" className="cursor-pointer w-1/2">
							<span className="hidden md:inline">Opponent Ratings</span>
							<span className="md:hidden">Opponent</span>
						</ToggleGroupItem>
						<ToggleGroupItem value="game_delta" className="cursor-pointer w-1/2">
							<span className="hidden md:inline">Game Delta</span>
							<span className="md:hidden">Delta</span>
						</ToggleGroupItem>
					</ToggleGroup>
				),
				columns: [
					{
						id: 'opp_rating',
						header: () => <div className="text-center">Rating</div>,
						cell: ({ row }) => (
							<RatingCell game={row.original} ratingType="rating" viewMode={viewMode} ratingSource={ratingSource} />
						)
					},
					{
						id: 'opp_rating_offense',
						header: () => <div className="text-center">Offense</div>,
						cell: ({ row }) => (
							<RatingCell
								game={row.original}
								ratingType="offensiveRating"
								viewMode={viewMode}
								ratingSource={ratingSource}
							/>
						)
					},
					{
						id: 'opp_rating_defense',
						header: () => <div className="text-center">Defense</div>,
						cell: ({ row }) => (
							<RatingCell
								game={row.original}
								ratingType="defensiveRating"
								viewMode={viewMode}
								ratingSource={ratingSource}
							/>
						)
					}
				]
			},
			{
				id: 'final_sections',
				header: () => (
					<div className="w-0 min-w-full">
						<Select value={ratingSource} onValueChange={setRatingSource}>
							<SelectTrigger className="w-full *:data-[slot=select-value]:hidden *:data-[slot=select-value]:md:flex">
								<SelectValue />
								<span className="md:hidden flex items-center gap-2">
									<GoDotFill
										className={
											{
												composite: 'text-purple-500',
												kenpom: 'text-blue-500',
												evanmiya: 'text-green-500',
												barttorvik: 'text-yellow-500'
											}[ratingSource]
										}
									/>
									{
										{
											composite: 'Comp',
											kenpom: 'KP',
											evanmiya: 'EM',
											barttorvik: 'BT'
										}[ratingSource]
									}
								</span>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="composite">
										<GoDotFill className="text-purple-500" />
										Composite
									</SelectItem>
									<SelectItem value="kenpom">
										<GoDotFill className="text-blue-500" />
										KenPom
									</SelectItem>
									<SelectItem value="evanmiya">
										<GoDotFill className="text-green-500" />
										EvanMiya
									</SelectItem>
									<SelectItem value="barttorvik">
										<GoDotFill className="text-yellow-500" />
										BartTorvik
									</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				),
				columns: [
					{
						id: 'quad',
						header: () => <div className="text-center">Quad</div>,
						cell: ({ row }) => {
							const oppNetRank = row.original.opp.net_rank;
							let quadrant;

							const quadStyles: Record<string, string> = {
								'1': 'border-emerald-500/80 bg-emerald-500/30',
								'2': 'border-blue-500/80 bg-blue-500/30',
								'3': 'border-amber-500/80 bg-amber-500/30',
								'4': 'border-red-500/80 bg-red-500/30'
							} as const;

							if (row.original.homeAway === 'home') {
								if (oppNetRank <= 30) {
									quadrant = 1;
								} else if (oppNetRank <= 75) {
									quadrant = 2;
								} else if (oppNetRank <= 160) {
									quadrant = 3;
								} else {
									quadrant = 4;
								}
							} else if (row.original.homeAway === 'neutral') {
								if (oppNetRank <= 50) {
									quadrant = 1;
								} else if (oppNetRank <= 100) {
									quadrant = 2;
								} else if (oppNetRank <= 200) {
									quadrant = 3;
								} else {
									quadrant = 4;
								}
							} else if (row.original.homeAway === 'away') {
								if (oppNetRank <= 75) {
									quadrant = 1;
								} else if (oppNetRank <= 135) {
									quadrant = 2;
								} else if (oppNetRank >= 240) {
									quadrant = 3;
								} else {
									quadrant = 4;
								}
							}

							return (
								<div
									className={`text-center -my-3.5 md:-my-2 text-xs! m-auto w-[1.75lh] py-0.5 px-1 rounded-xl border   ${quadStyles[String(quadrant!)]}`}
								>
									Q{quadrant}
								</div>
							);
						}
					},
					{
						id: 'score',
						header: () => <div></div>,
						cell: ({ row }) => {
							const { is_live, live_score, won, score, time } = row.original;

							if (is_live && live_score) {
								const diff = live_score.teamScore - live_score.oppScore;
								const scoreStr = `${live_score.teamScore}-${live_score.oppScore}`;

								return (
									<div className="flex gap-1 pl-2">
										<span className="w-[1lh]">
											{diff > 0 ? (
												<span className="font-bold text-green-400/50">up</span>
											) : diff < 0 ? (
												<span className="font-bold text-red-400/50">dn</span>
											) : (
												<span className="font-bold text-neutral-400">tie</span>
											)}
										</span>
										<span>{scoreStr}</span>
									</div>
								);
							}

							if (score) {
								return (
									<div className="flex gap-1 pl-2">
										<span className="w-[1lh]">
											{won ? (
												<span className="font-bold text-green-500">W</span>
											) : (
												<span className="font-bold text-red-500">L</span>
											)}
										</span>
										<span className="w-full">{score}</span>
									</div>
								);
							}

							return <div className="text-neutral-400 pl-2">{time === 'TBD' ? 'TBD' : getLocalTime(time!)}</div>;
						}
					}
				]
			}
		],
		[ratingSource, viewMode]
	);

	return { columns, ratingSource, viewMode };
}

function RatingCell({
	game,
	ratingType,
	viewMode,
	ratingSource
}: {
	game: ParsedEspnGame;
	ratingType: 'rating' | 'offensiveRating' | 'defensiveRating';
	viewMode: string;
	ratingSource: string;
}) {
	const { ratings_history: history } = useTeamProfile();
	const [compositeSources] = useCookie<string[]>('sources_filter', []);

	const compositeKey = useMemo(() => {
		const sourceOrder = ['kp', 'em', 'bt', 'net'];
		const selectedFilters = compositeSources.map(s => s.replaceAll(/[a-z]+/g, '').toLowerCase());
		return selectedFilters.length ? sourceOrder.filter(s => selectedFilters.includes(s)).join(',') : sourceOrder.join(',');
	}, [compositeSources]);

	const ratingBgColors: Record<string, string> = {
		composite: 'bg-purple-600/15',
		kenpom: 'bg-blue-600/15',
		evanmiya: 'bg-green-600/15',
		barttorvik: 'bg-yellow-600/15'
	} as const;

	const keyMap: Record<'rating' | 'offensiveRating' | 'defensiveRating', Record<string, keyof CompiledTeamData>> = {
		rating: {
			composite: 'avg_zscore',
			kenpom: 'kp_rating',
			evanmiya: 'em_rating',
			barttorvik: 'bt_rating'
		},
		offensiveRating: {
			composite: 'avg_offensive_zscore',
			kenpom: 'kp_offensive_rating',
			evanmiya: 'em_offensive_rating',
			barttorvik: 'bt_offensive_rating'
		},
		defensiveRating: {
			composite: 'avg_defensive_zscore',
			kenpom: 'kp_defensive_rating',
			evanmiya: 'em_defensive_rating',
			barttorvik: 'bt_defensive_rating'
		}
	};

	const ratingKey: keyof CompiledTeamData = keyMap[ratingType][ratingSource];

	let displayValue: React.ReactNode | number = Math.round((game.opp[ratingKey] as any) * 100) / 100;
	let displayRank: React.ReactNode | number = game.opp[(ratingKey + '_rank') as keyof CompiledTeamData] as number;

	if (ratingKey.startsWith('avg') && game.opp.team_key) {
		const combo = game.opp.composite_combos[compositeKey];
		displayValue = Math.round((combo[ratingKey as keyof CompositeRanking] as number) * 100) / 100;
		displayRank = combo[(ratingKey + '_rank') as keyof CompositeRanking] as number;
	}

	if (isNaN(displayValue as number)) {
		displayValue = '-';
		displayRank = '';
	}

	let deltaPct: number | undefined;

	if (viewMode === 'game_delta') {
		const { prev, next } = getSurroundDays(game.date);

		const beforeRatings = history[prev];
		const afterRatings = history[next];

		if (!beforeRatings || !afterRatings) {
			displayValue = '-';
			displayRank = '';
		} else {
			let ratingDelta, rankDelta, beforeValue, afterValue, beforeRank, afterRank;

			if (ratingKey.startsWith('avg')) {
				const beforeCombo = beforeRatings.composite_combos[compositeKey] as unknown as Record<string, number>;
				const afterCombo = afterRatings.composite_combos[compositeKey] as unknown as Record<string, number>;
				beforeValue = beforeCombo[ratingKey];
				beforeRank = beforeCombo[ratingKey + '_rank'];
				afterValue = afterCombo[ratingKey];
				afterRank = afterCombo[ratingKey + '_rank'];
			} else {
				const before = beforeRatings as unknown as Record<string, number>;
				const after = afterRatings as unknown as Record<string, number>;
				beforeValue = before[ratingKey];
				beforeRank = before[ratingKey + '_rank'];
				afterValue = after[ratingKey];
				afterRank = after[ratingKey + '_rank'];
			}

			ratingDelta = Math.round((afterValue - beforeValue) * 100) / 100;
			if (['kp_defensive_rating', 'bt_defensive_rating'].includes(ratingKey)) {
				ratingDelta *= -1;
			}
			rankDelta = beforeRank - afterRank;
			deltaPct = beforeValue ? (ratingDelta / Math.abs(beforeValue)) * 100 : 0;

			let ratingColor, rankColor;
			if (ratingDelta > 0) {
				ratingColor = 'text-green-500';
			} else if (ratingDelta < 0) {
				ratingColor = 'text-red-500';
			}

			if (rankDelta > 0) {
				rankColor = 'text-green-500/80';
			} else if (rankDelta < 0) {
				rankColor = 'text-red-500/80';
			}

			displayValue = (
				<span className={ratingColor ? ratingColor : ''}>{ratingDelta >= 0 ? '+' + ratingDelta : ratingDelta}</span>
			);
			displayRank = <span className={rankColor ? rankColor : ''}>{rankDelta >= 0 ? '+' + rankDelta : rankDelta}</span>;
		}
	}

	let heatMapBg = '';
	if (viewMode === 'opponent') {
		heatMapBg = getScheduleHeatMap(displayRank as number);
	} else if (viewMode === 'game_delta' && deltaPct !== undefined) {
		heatMapBg = getDeltaHeatMap(deltaPct);
	}

	return (
		<div className={`text-center -my-3.5 md:-my-2 px-2 py-3.5 md:py-2 ${heatMapBg}`}>
			{displayValue} <span className="text-xs text-neutral-400">{displayRank}</span>
		</div>
	);
}

function getScheduleHeatMap(rank: number): string {
	if (isNaN(rank) || !rank) return '';
	if (rank <= 5) return 'bg-green-500/35';
	if (rank <= 10) return 'bg-green-500/20';
	if (rank <= 20) return 'bg-green-500/15';
	if (rank <= 30) return 'bg-green-500/8';
	if (rank > 150) return 'bg-red-500/20';
	if (rank > 100) return 'bg-red-500/15';
	if (rank > 60) return 'bg-red-500/8';
	return '';
}

function getDeltaHeatMap(pct: number): string {
	const abs = Math.abs(pct);
	if (abs === 0) return '';
	const positive = pct > 0;
	if (abs >= 7.5) return positive ? 'bg-green-500/20' : 'bg-red-500/20';
	if (abs >= 5) return positive ? 'bg-green-500/15' : 'bg-red-500/15';
	if (abs >= 2.5) return positive ? 'bg-green-500/10' : 'bg-red-500/10';
	if (abs >= 1) return positive ? 'bg-green-500/8' : 'bg-red-500/8';
	if (abs > 0) return positive ? 'bg-green-500/5' : 'bg-red-500/5';
	return '';
}

function getLocalTime(timeString: string) {
	const today = new Date();
	const dateStr = `${today.toDateString()} ${timeString + ' GMT-0500'}`;
	const date = new Date(dateStr);

	return date.toLocaleString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});
}

function getSurroundDays(date: string) {
	const d = new Date(date + 'T00:00:00');

	const prev = new Date(d);
	prev.setDate(d.getDate() - 1);

	const next = new Date(d);
	next.setDate(d.getDate() + 1);

	return { prev: prev.toISOString().split('T')[0], next: next.toISOString().split('T')[0] };
}
