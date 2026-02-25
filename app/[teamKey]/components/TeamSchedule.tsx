'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useRef } from 'react';
import { GoDotFill } from 'react-icons/go';
import { twMerge } from 'tailwind-merge';
import useScheduleColumns from './useScheduleColumns';

export default function TeamSchedule({ className }: { className: string }) {
	const { schedule } = useTeamProfile();
	const { columns, ratingSource, setRatingSource, viewMode, setViewMode } = useScheduleColumns();
	const router = useRouter();

	const scrollRef = useRef<HTMLDivElement>(null);
	const scrollTargetRef = useRef<HTMLTableRowElement>(null);

	useLayoutEffect(() => {
		if (scrollRef.current && scrollTargetRef.current) {
			const container = scrollRef.current;
			const targetRect = scrollTargetRef.current.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			container.scrollTop += targetRect.bottom - containerRect.bottom;
		}
	}, []);

	const lastPlayedIndex = schedule.findLastIndex(g => g.score != null);
	const scrollToIndex = Math.min(schedule.length - 1, lastPlayedIndex + 3);

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
			<div className="md:hidden flex items-center gap-2 mt-2">
				<ToggleGroup
					variant="outline"
					type="single"
					value={viewMode}
					onValueChange={v => v && setViewMode(v)}
					className="flex-1"
				>
					<ToggleGroupItem value="opponent" className="cursor-pointer flex-1">
						Opponent
					</ToggleGroupItem>
					<ToggleGroupItem value="game_delta" className="cursor-pointer flex-1">
						Delta
					</ToggleGroupItem>
				</ToggleGroup>
				<Select value={ratingSource} onValueChange={setRatingSource}>
					<SelectTrigger className="w-fit h-8 text-xs *:data-[slot=select-value]:hidden">
						<span className="flex items-center gap-1.5">
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
			<div ref={scrollRef} className="overflow-x-auto overflow-y-auto overscroll-x-none md:overscroll-none ">
				<Table className="[&_td]:py-3.5 [&_td]:md:py-2">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup, groupIndex) => (
							<TableRow key={headerGroup.id} className={`border-b-0! ${groupIndex === 0 ? 'hidden md:table-row' : ''}`}>
								{headerGroup.headers.map((header, index) => (
									<TableHead
										className={`sticky bg-background border-t-background z-10 ${groupIndex === 0 ? 'top-0 h-8 align-bottom ' : 'top-0 md:top-9 border-b border-b-border'}`}
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
						{table.getRowModel().rows.map((row, rowIndex) => (
							<TableRow
								key={row.id}
								ref={rowIndex === scrollToIndex ? scrollTargetRef : undefined}
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
