'use client';

import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export interface KenpomTeam {
	rank: number;
	name: string;
	team: string;
	team_key: string;
	conference: string;
	win_loss: WinLossRecord;
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
	price: number;
	history: TeamHistoryEntry[];
	trend?: 'up' | 'down' | undefined;
}

export interface TeamHistoryEntry {
	date: string;
	net_rating: number;
	price: number;
	rank: number;
}

export type WinLossRecord = `${number}-${number}`;

const columns: ColumnDef<KenpomTeam>[] = [
	{
		accessorKey: 'team_name',
		header: () => <div className="px-1">Team</div>,
		cell: ({ row }) => <div className="px-4 truncate max-w-[18ch]">{row.original.team_name}</div>,
		enableSorting: false,
		enableHiding: false
	},
	{
		accessorKey: 'avg_rank_order',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Avg Rank
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-purple-600/15 -my-2 py-2">
				{row.original.avg_rank} <span className="text-xs text-neutral-400">{row.original.avg_rank_order}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'avg_offensive_rank_order',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Avg Off Rank
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-purple-600/15 -my-2 py-2">
				{row.original.avg_offensive_rank}{' '}
				<span className="text-xs text-neutral-400">{row.original.avg_offensive_rank_order}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'avg_defensive_rank_order',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Avg Def Rank
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-purple-600/15 -my-2 py-2">
				{row.original.avg_defensive_rank}{' '}
				<span className="text-xs text-neutral-400">{row.original.avg_defensive_rank_order}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'kp_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					KP Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-blue-600/15 -my-2 py-2">
				{row.original.kp_rating} <span className="text-xs text-neutral-400">{row.original.kp_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'kp_offensive_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					KP Off Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-blue-600/15 -my-2 py-2">
				{row.original.kp_offensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.kp_offensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'kp_defensive_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					KP Def Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-blue-600/15 -my-2 py-2">
				{row.original.kp_defensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.kp_defensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'em_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					EM Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-green-600/15 -my-2 py-2">
				{row.original.em_rating} <span className="text-xs text-neutral-400">{row.original.em_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'em_offensive_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					EM Off Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-green-600/15 -my-2 py-2">
				{row.original.em_offensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.em_offensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'em_defensive_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					EM Def Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-green-600/15 -my-2 py-2">
				{row.original.em_defensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.em_defensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'bt_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					BT Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-yellow-600/15 -my-2 py-2">
				{row.original.bt_rating} <span className="text-xs text-neutral-400">{row.original.bt_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'bt_offensive_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					BT Off Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-yellow-600/15 -my-2 py-2">
				{row.original.bt_offensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.bt_offensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'bt_defensive_rating_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					BT Def Rating
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-center bg-yellow-600/15 -my-2 py-2">
				{row.original.bt_defensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.bt_defensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_rank',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					NET Rank
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => <div className="text-center bg-red-600/15 -my-2 py-2">{row.original.net_rank}</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_q1_wins',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}
				>
					vs Q1
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => <div className="text-center bg-red-600/15 -my-2 py-2">{row.original.net_q1_record}</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_q2_wins',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}
				>
					vs Q2
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => <div className="text-center bg-red-600/15 -my-2 py-2">{row.original.net_q2_record}</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_q3_wins',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}
				>
					vs Q3
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => <div className="text-center bg-red-600/15 -my-2 py-2">{row.original.net_q3_record}</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_q4_wins',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}
				>
					vs Q4
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: ({ row }) => <div className="text-center bg-red-600/15 -my-2 py-2">{row.original.net_q4_record}</div>,
		enableSorting: true,
		enableHiding: false
	}
];

export default function TeamTable() {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'avg_rank_order' }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	const [teamData, setTeamData] = useState([]);

	useEffect(() => {
		fetch('/api/rankings')
			.then(r => r.json())
			.then(d => {
				const teams = Object.values(d);
				teams.map(team => {
					team.avg_rank =
						Math.round(
							((team.kp_rating_rank + team.em_rating_rank + team.bt_rating_rank + team.net_rank) / 4) * 100
						) / 100;
					team.avg_offensive_rank =
						Math.round(
							((team.kp_offensive_rating_rank + team.em_offensive_rating_rank + team.bt_offensive_rating_rank) /
								3) *
								100
						) / 100;
					team.avg_defensive_rank =
						Math.round(
							((team.kp_defensive_rating_rank + team.em_defensive_rating_rank + team.bt_defensive_rating_rank) /
								3) *
								100
						) / 100;

					team.net_q1_wins = parseInt(team.net_q1_record.split('-')[0]);
					team.net_q2_wins = parseInt(team.net_q2_record.split('-')[0]);
					team.net_q3_wins = parseInt(team.net_q3_record.split('-')[0]);
					team.net_q4_wins = parseInt(team.net_q4_record.split('-')[0]);
				});

				[...teams].sort((a, b) => a.avg_rank - b.avg_rank).forEach((team, i) => (team.avg_rank_order = i + 1));
				[...teams]
					.sort((a, b) => a.avg_offensive_rank - b.avg_offensive_rank)
					.forEach((team, i) => (team.avg_offensive_rank_order = i + 1));
				[...teams]
					.sort((a, b) => a.avg_defensive_rank - b.avg_defensive_rank)
					.forEach((team, i) => (team.avg_defensive_rank_order = i + 1));

				setTeamData(teams);
			});
	}, []);

	const table = useReactTable({
		data: teamData,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection
		},
		initialState: {
			pagination: {
				pageSize: 365
			}
		}
	});

	return (
		<>
			{teamData.length ? (
				<div className="overflow-x-scroll overflow-y-auto overscroll-none rounded-md border mx-2 md:mx-8 my-8 max-h-[calc(100vh-4rem)] always-show-scrollbar">
					<Table>
						<TableHeader className="bg-neutral-800">
							{table.getHeaderGroups().map(headerGroup => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header, index) => {
										const isSticky = index === 0;
										return (
											<TableHead
												key={header.id}
												className={`sticky top-0 bg-neutral-800 ${isSticky ? 'left-0 z-20' : 'z-10'}`}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map(row => (
									<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
										{row.getVisibleCells().map((cell, index) => {
											const isSticky = index === 0;
											return (
												<TableCell
													key={cell.id}
													className={isSticky ? 'sticky left-0 bg-neutral-900 z-10' : ''}
												>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											);
										})}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										No results.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			) : (
				<div>loading...</div>
			)}
		</>
	);
}
