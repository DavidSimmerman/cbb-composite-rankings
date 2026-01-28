'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type CompiledTeamData } from '@/lib/rankings';

export const columns: ColumnDef<CompiledTeamData>[] = [
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

export const allMetrics = ['Composite', 'KenPom', 'EvanMiya', 'BartTorvik', 'NET'] as const;

export const metricColumns: Record<string, string[]> = {
	Composite: ['avg_rank_order', 'avg_offensive_rank_order', 'avg_defensive_rank_order'],
	KenPom: ['kp_rating_rank', 'kp_offensive_rating_rank', 'kp_defensive_rating_rank'],
	EvanMiya: ['em_rating_rank', 'em_offensive_rating_rank', 'em_defensive_rating_rank'],
	BartTorvik: ['bt_rating_rank', 'bt_offensive_rating_rank', 'bt_defensive_rating_rank'],
	NET: ['net_rank', 'net_q1_wins', 'net_q2_wins', 'net_q3_wins', 'net_q4_wins']
};

export const p5Conferences = ['B10', 'SEC', 'B12', 'ACC', 'BE'];
