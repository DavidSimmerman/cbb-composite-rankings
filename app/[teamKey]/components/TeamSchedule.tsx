'use client';

import { useRankings } from '@/app/context/RankingsContext';
import TeamLogo from '@/components/TeamLogo';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ESPN_TO_TEAM_KEY } from '@/lib/schedule/espn-team-ids';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useMemo } from 'react';
import { GoDotFill } from 'react-icons/go';

export default function TeamSchedule({ schedule }) {
	const rankings = useRankings();

	const parsedRankings = useMemo(
		() =>
			schedule.map(g => ({
				...g,
				opp: { ...(rankings.find(r => r.team_key === ESPN_TO_TEAM_KEY[g.opp]) ?? {}), espn_id: g.opp }
			})),
		[rankings, schedule]
	);

	console.log(parsedRankings);

	const table = useReactTable({
		data: parsedRankings,
		columns,
		getCoreRowModel: getCoreRowModel(),
		initialState: {
			pagination: {
				pageSize: 60
			}
		}
	});

	return (
		<div className="flex-1 min-h-0 flex flex-col w-full gap-4 border border-neutral-800 rounded-lg p-4">
			<div className="overflow-x-scroll overflow-y-auto overscroll-none ">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup, groupIndex) => (
							<TableRow key={headerGroup.id} className={'border-b-0!'}>
								{headerGroup.headers.map((header, index) => (
									<TableHead
										className={`sticky bg-background border-t-background z-10 ${groupIndex === 0 ? 'top-0 h-8 align-bottom ' : 'top-9 border-b border-b-border'}`}
										key={header.id}
										colSpan={header.colSpan}
									>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map(row => (
							<TableRow key={row.id}>
								{row.getVisibleCells().map((cell, index) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

const columns = [
	{
		id: 'first_sections',
		header: <div className="text-2xl -ml-2 h-full align-top font-bold text-white/35">Schedule</div>,
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
					<div className="flex items-center pr-1">
						<TeamLogo teamKey={row.original.opp.team_key} className="h-lh" />{' '}
						<span className="truncate">{row.original.opp.team_name}</span>
					</div>
				)
			}
		]
	},
	{
		id: 'opponent_ratings',
		header: () => (
			<ToggleGroup variant="outline" type="single" defaultValue="opponent" className="w-full">
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
					<div className="text-center -my-2 py-2 bg-purple-600/15">
						{Math.round(row.original.opp.avg_zscore * 100) / 100}{' '}
						<span className="text-xs text-neutral-400">{row.original.opp.avg_zscore_rank}</span>
					</div>
				)
			},
			{
				id: 'opp_rating_offense',

				header: () => <div className="text-center">Offense</div>,
				cell: ({ row }) => (
					<div className="text-center -my-2 py-2 bg-purple-600/15">
						{Math.round(row.original.opp.avg_offensive_zscore * 100) / 100}{' '}
						<span className="text-xs text-neutral-400">{row.original.opp.avg_offensive_zscore_rank}</span>
					</div>
				)
			},
			{
				id: 'opp_rating_defense',
				header: () => <div className="text-center">Defense</div>,
				cell: ({ row }) => (
					<div className="text-center -my-2 py-2 bg-purple-600/15">
						{Math.round(row.original.opp.avg_defensive_zscore * 100) / 100}{' '}
						<span className="text-xs text-neutral-400">{row.original.opp.avg_defensive_zscore_rank}</span>
					</div>
				)
			}
		]
	},
	{
		id: 'final_sections',
		header: () => (
			<div className="w-0 min-w-full">
			<Select>
				<SelectTrigger className="w-full">
					<SelectValue className="" />
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectItem value="composite">
							<GoDotFill className="text-purple-500" />
							Composite
						</SelectItem>
						<SelectItem value="kp">
							<GoDotFill className="text-blue-500" />
							KenPom
						</SelectItem>
						<SelectItem value="em">
							<GoDotFill className="text-green-500" />
							EvanMiya
						</SelectItem>
						<SelectItem value="bt">
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
						<div className="text-neutral-400 pl-2">{getLocalTime(row.original.time)}</div>
					)
			}
		]
	}
];

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
