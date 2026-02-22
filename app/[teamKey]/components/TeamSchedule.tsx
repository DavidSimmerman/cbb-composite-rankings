'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import useScheduleColumns from './useScheduleColumns';

export default function TeamSchedule({ className }: { className: string }) {
	const { schedule } = useTeamProfile();
	const { columns } = useScheduleColumns();
	const router = useRouter();

	console.log(schedule);

	const table = useReactTable({
		data: schedule,
		columns,
		getCoreRowModel: getCoreRowModel(),
		initialState: {
			pagination: {
				pageSize: 60
			}
		}
	});

	return (
		<div
			className={twMerge(
				'flex-1 max-h-[70dvh]! md:max-h-auto flex flex-col w-full gap-1 md:gap-4 border border-neutral-800 rounded-lg p-3 md:p-4',
				className
			)}
		>
			<div className="text-2xl align-top font-bold text-neutral-600 md:hidden">Schedule</div>
			<div className="overflow-x-auto overflow-y-auto overscroll-x-none md:overscroll-none ">
				<Table className="[&_td]:py-3.5 [&_td]:md:py-2">
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
							<TableRow
								key={row.id}
								className="cursor-pointer"
								onClick={() => router.push(`/games/${row.original.game_id}`)}
							>
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
