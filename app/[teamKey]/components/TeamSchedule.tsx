'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import useScheduleColumns from './useScheduleColumns';

export default function TeamSchedule() {
	const { schedule } = useTeamProfile();
	const { columns } = useScheduleColumns();

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
