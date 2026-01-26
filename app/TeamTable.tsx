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
		accessorKey: 'team',
		header: () => <div className="px-1">Team</div>,
		cell: ({ row }) => <div className="px-4 truncate max-w-[18ch]">{row.original.team}</div>,
		enableSorting: false,
		enableHiding: false
	},
	{
		id: 'avg_rank',
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
		cell: () => <div className="text-center bg-purple-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'avg_off_rank',
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
		cell: () => <div className="text-center bg-purple-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'avg_def_rank',
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
		cell: () => <div className="text-center bg-purple-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_rating',
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
				{row.original.net_rating} <span className="text-xs text-neutral-400">{row.original.rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'offensive_rating',
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
				{row.original.offensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.offensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'defensive_rating',
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
				{row.original.defensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.defensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_rating',
		id: 'em_net_rating',
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
				{row.original.net_rating} <span className="text-xs text-neutral-400">{row.original.rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'offensive_rating',
		id: 'em_offensive_rating',
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
				{row.original.offensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.offensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'defensive_rating',
		id: 'em_defensive_rating',
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
				{row.original.defensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.defensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'net_rating',
		id: 'bt_net_rating',
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
				{row.original.net_rating} <span className="text-xs text-neutral-400">{row.original.rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'offensive_rating',
		id: 'bt_offensive_rating',
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
				{row.original.offensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.offensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		accessorKey: 'defensive_rating',
		id: 'bt_defensive_rating',
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
				{row.original.defensive_rating}{' '}
				<span className="text-xs text-neutral-400">{row.original.defensive_rating_rank}</span>
			</div>
		),
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'net_rank',
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
		cell: () => <div className="text-center bg-red-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'vs_q1',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					vs Q1
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: () => <div className="text-center bg-red-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'vs_q2',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					vs Q2
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: () => <div className="text-center bg-red-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'vs_q3',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					vs Q3
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: () => <div className="text-center bg-red-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	},
	{
		id: 'vs_q4',
		header: ({ column }) => (
			<div className="flex">
				<Button
					className="m-auto cursor-pointer"
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					vs Q4
					{!column.getIsSorted() && <ArrowUpDown />}
					{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
				</Button>
			</div>
		),
		cell: () => <div className="text-center bg-red-600/15 -my-2 py-2">-</div>,
		enableSorting: true,
		enableHiding: false
	}
];

export default function TeamTable() {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});

	const [teamData, setTeamData] = useState([]);

	useEffect(() => {
		fetch('/api/rankings')
			.then(r => r.json())
			.then(d => {
				setTeamData(Object.values(d));
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
