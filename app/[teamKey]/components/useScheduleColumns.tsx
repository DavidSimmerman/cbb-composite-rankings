'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLocalStorage } from 'usehooks-ts';
import { CompositeRanking } from '@/lib/rankings/composite';
import { ParsedEspnGame } from '@/lib/schedule/schedule';
import { CompiledTeamData } from '@/lib/shared';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { useMemo } from 'react';
import { GoDotFill } from 'react-icons/go';
import { PiQuestion } from 'react-icons/pi';

export default function useScheduleColumns() {
	const [ratingSource, setRatingSource] = useLocalStorage<string>('schedule_rating_source', 'composite');
	const [viewMode, setViewMode] = useLocalStorage<string>('schedule_view_mode', 'opponent');

	const columns = useMemo<ColumnDef<ParsedEspnGame, unknown>[]>(
		() => [
			{
				id: 'first_sections',
				header: () => <div className="text-2xl -ml-2 h-full align-top font-bold text-white/35">Schedule</div>,
				columns: [
					{
						id: 'date',
						header: () => <div className="text-left -ml-2">Date</div>,
						cell: ({ row }) => <div>{row.original.date.replace(/^\d{4}-/, '')}</div>
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
							<Link href={row.original.opp.team_key ?? '/'} className="flex gap-1 items-center pr-1">
								{row.original.opp.team_key && <TeamLogo teamKey={row.original.opp.team_key} className="h-lh" />}
								<span className="truncate">{row.original.opp.team_name ?? row.original.espn_id}</span>
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
							Opponent Ratings
						</ToggleGroupItem>
						<ToggleGroupItem value="game_delta" className="cursor-pointer w-1/2">
							Game Delta
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
							<SelectTrigger className="w-full">
								<SelectValue />
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

							return <div className="text-center -my-2 py-2 bg-red-600/15">Q{quadrant}</div>;
						}
					},
					// TODO: handle live games
					{
						id: 'score',
						header: () => <div></div>,
						cell: ({ row }) =>
							row.original.score ? (
								<div className="flex gap-1 pl-2">
									<span className="w-[1lh]">
										{row.original.won ? (
											<span className="font-bold text-green-500">W</span>
										) : (
											<span className="font-bold text-red-500">L</span>
										)}
									</span>
									<span className="w-full">{row.original.score}</span>
								</div>
							) : (
								<div className="text-neutral-400 pl-2">{getLocalTime(row.original.time!)}</div>
							)
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
	const [compositeSources] = useLocalStorage<string[]>('sources_filter', []);

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

	if (ratingKey.startsWith('avg')) {
		const combo = game.opp.composite_combos[compositeKey];
		displayValue = Math.round((combo[ratingKey as keyof CompositeRanking] as number) * 100) / 100;
		displayRank = combo[(ratingKey + '_rank') as keyof CompositeRanking] as number;
	}

	if (isNaN(displayValue as number)) {
		displayValue = '-';
		displayRank = '';
	}

	if (viewMode === 'game_delta') {
		const { prev, next } = getSurroundDays(game.date);

		const beforeRatings = history[prev];
		const afterRatings = history[next];

		if (!beforeRatings || !afterRatings) {
			if (!game.time && !beforeRatings && ratingType === 'offensiveRating') {
				displayValue = (
					<Tooltip>
						<TooltipTrigger>
							<PiQuestion />
						</TooltipTrigger>
						<TooltipContent>Data tracking began on 2/1. Previous history not included.</TooltipContent>
					</Tooltip>
				);
				displayRank = '';
			} else {
				displayValue = '-';
				displayRank = '';
			}
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

	return (
		<div className={`text-center -my-2 py-2 ${ratingBgColors[ratingSource]}`}>
			{displayValue} <span className="text-xs text-neutral-400">{displayRank}</span>
		</div>
	);
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
