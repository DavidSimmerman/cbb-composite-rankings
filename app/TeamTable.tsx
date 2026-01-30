'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState
} from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { type CompiledTeamData } from '@/lib/rankings';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import Fuse from 'fuse.js';
import { columns, allMetrics, metricColumns, p5Conferences } from './components/columns';
import MetricsFilter from './components/MetricsFilter';
import ConferenceFilter from './components/ConferenceFilter';

interface TeamTableProps {
	data: CompiledTeamData[];
}

export default function TeamTable({ data }: TeamTableProps) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'avg_zscore_rank', desc: false }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const [searchQuery, setSearchQuery] = useState('');
	const [conferenceFilter, setConferenceFilter] = useState<string[]>([]);
	const [metricsFilter, setMetricsFilter] = useState<string[]>([...allMetrics]);

	const midMajorConferences = useMemo(() => {
		const conferences = Array.from(new Set(data.map(t => t.conference)));
		return conferences.filter(c => !p5Conferences.includes(c)).sort();
	}, [data]);

	useEffect(() => {
		const visibility: VisibilityState = {};
		const showAll = metricsFilter.length === 0 || metricsFilter.length === allMetrics.length;

		for (const [metric, cols] of Object.entries(metricColumns)) {
			const isVisible = showAll || metricsFilter.includes(metric);
			for (const col of cols) {
				visibility[col] = isVisible;
			}
		}

		setColumnVisibility(visibility);
	}, [metricsFilter]);

	const fuse = useMemo(
		() =>
			new Fuse(data, {
				keys: ['team_name'],
				threshold: 0.3
			}),
		[data]
	);

	const filteredData = useMemo(() => {
		let result = data;

		if (conferenceFilter.length > 0) {
			result = result.filter(
				team =>
					conferenceFilter.includes(team.conference) ||
					(conferenceFilter.includes('mid-major') && midMajorConferences.includes(team.conference))
			);
		}

		if (searchQuery.trim()) {
			const searchResults = fuse.search(searchQuery).map(r => r.item);
			result = result.filter(team => searchResults.includes(team));
		}

		return result;
	}, [searchQuery, fuse, data, conferenceFilter, midMajorConferences]);

	const table = useReactTable({
		data: filteredData,
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
		<div className="mx-2 md:mx-8 my-8 ">
			<div className="mb-4 flex justify-between">
				<InputGroup className="md:w-1/4">
					<InputGroupInput
						placeholder="Search teams..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
					/>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
				</InputGroup>

				<div className="flex gap-2">
					<MetricsFilter metricsFilter={metricsFilter} onChange={setMetricsFilter} />
					<ConferenceFilter conferenceFilter={conferenceFilter} onChange={setConferenceFilter} />
				</div>
			</div>
			<div className="overflow-x-scroll overflow-y-auto overscroll-none rounded-md border max-h-[calc(100vh-4rem)] always-show-scrollbar">
				{table.getRowModel().rows?.length ? (
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
							{table.getRowModel().rows.map(row => (
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
							))}
						</TableBody>
					</Table>
				) : (
					<div className="my-20 text-center">No results.</div>
				)}
			</div>
		</div>
	);
}
