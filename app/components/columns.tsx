'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type CompiledTeamData } from '@/lib/shared';
import { ESPN_TEAM_IDS } from '@/lib/schedule/espn-team-ids';

const headerBtn =
	'inline-flex items-center justify-center gap-1 m-auto cursor-pointer rounded-md px-0 py-1 text-xs md:text-sm font-medium hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 [&_svg]:size-3 [&_svg]:md:size-4 [&_svg]:shrink-0';

export const columns: ColumnDef<CompiledTeamData, unknown>[] = [
	{
		accessorKey: 'team_name',
		header: () => <div className="px-1">Team</div>,
		cell: ({ row }) => (
			<div className="px-1 flex items-center gap-1">
				<img
					className="h-lh"
					src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${ESPN_TEAM_IDS[row.original.team_key]}.png&h=200&w=200`}
				/>
				<span className="truncate max-w-[12ch]">{row.original.team_name}</span>
			</div>
		),
		enableSorting: false,
		enableHiding: false
	},
	{
		id: 'composite_group',
		header: () => <div className="text-center font-bold">Composite Average</div>,
		columns: [
			{
				accessorKey: 'avg_zscore_rank',
				header: ({ column }) => (
					<div className="flex pt-0">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Z-Score
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
					</div>
				),
				cell: ({ row }) => (
					<div className="text-center bg-purple-600/15 -my-2 py-2">
						{Math.round(row.original.avg_zscore * 100) / 100}{' '}
						<span className="text-xs text-neutral-400">{row.original.avg_zscore_rank}</span>
					</div>
				),
				enableSorting: true,
				enableHiding: false
			},
			{
				accessorKey: 'avg_offensive_zscore_rank',
				header: ({ column }) => (
					<div className="flex">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Off Z-Score
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
					</div>
				),
				cell: ({ row }) => (
					<div className="text-center bg-purple-600/15 -my-2 py-2">
						{Math.round(row.original.avg_offensive_zscore * 100) / 100}{' '}
						<span className="text-xs text-neutral-400">{row.original.avg_offensive_zscore_rank}</span>
					</div>
				),
				enableSorting: true,
				enableHiding: false
			},
			{
				accessorKey: 'avg_defensive_zscore_rank',
				header: ({ column }) => (
					<div className="flex">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Def Z-Score
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
					</div>
				),
				cell: ({ row }) => (
					<div className="text-center bg-purple-600/15 -my-2 py-2">
						{Math.round(row.original.avg_defensive_zscore * 100) / 100}{' '}
						<span className="text-xs text-neutral-400">{row.original.avg_defensive_zscore_rank}</span>
					</div>
				),
				enableSorting: true,
				enableHiding: false
			}
		]
	},
	{
		id: 'kenpom_group',
		header: () => <div className="text-center font-bold">KenPom</div>,
		columns: [
			{
				accessorKey: 'kp_rating_rank',
				header: ({ column }) => (
					<div className="flex">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Off Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Def Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
			}
		]
	},
	{
		id: 'evanmiya_group',
		header: () => <div className="text-center font-bold">EvanMiya</div>,
		columns: [
			{
				accessorKey: 'em_rating_rank',
				header: ({ column }) => (
					<div className="flex">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Off Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Def Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
			}
		]
	},
	{
		id: 'barttorvik_group',
		header: () => <div className="text-center font-bold">BartTorvik</div>,
		columns: [
			{
				accessorKey: 'bt_rating_rank',
				header: ({ column }) => (
					<div className="flex">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Off Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Def Rating
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
			}
		]
	},
	{
		id: 'net_group',
		header: () => <div className="text-center font-bold">NET</div>,
		columns: [
			{
				accessorKey: 'net_rank',
				header: ({ column }) => (
					<div className="flex">
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
							Rank
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'asc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}>
							vs Q1
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}>
							vs Q2
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}>
							vs Q3
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
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
						<div className={headerBtn} onClick={() => column.toggleSorting(column.getIsSorted() !== 'desc')}>
							vs Q4
							{!column.getIsSorted() && <ArrowUpDown />}
							{column.getIsSorted() && (column.getIsSorted() === 'desc' ? <ArrowUp /> : <ArrowDown />)}
						</div>
					</div>
				),
				cell: ({ row }) => <div className="text-center bg-red-600/15 -my-2 py-2">{row.original.net_q4_record}</div>,
				enableSorting: true,
				enableHiding: false
			}
		]
	}
];

export const allSources = ['Composite', 'KenPom', 'EvanMiya', 'BartTorvik', 'NET'] as const;
export const allMetrics = ['rating', 'offense', 'defense', 'quad record'];

export const sourceColumns: Record<string, string[]> = {
	Composite: ['avg_zscore_rank', 'avg_offensive_zscore_rank', 'avg_defensive_zscore_rank'],
	KenPom: ['kp_rating_rank', 'kp_offensive_rating_rank', 'kp_defensive_rating_rank'],
	EvanMiya: ['em_rating_rank', 'em_offensive_rating_rank', 'em_defensive_rating_rank'],
	BartTorvik: ['bt_rating_rank', 'bt_offensive_rating_rank', 'bt_defensive_rating_rank'],
	NET: ['net_rank', 'net_q1_wins', 'net_q2_wins', 'net_q3_wins', 'net_q4_wins']
};

export const p5Conferences = ['B10', 'SEC', 'B12', 'ACC', 'BE'];
