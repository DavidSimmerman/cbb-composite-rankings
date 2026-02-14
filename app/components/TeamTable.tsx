'use client';

import SearchBar from '@/components/SearchBar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { sourceSystems as allSources, computeAverageZScores, rerankColumns } from '@/lib/shared';
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
import Fuse from 'fuse.js';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { useRankings } from '../context/RankingsContext';
import { allMetrics as allMetricToggles, allSources as allSourceToggles, columns, p5Conferences, sourceColumns } from './columns';
import ConferenceFilter from './ConferenceFilter';
import MetricsFilter from './MetricsFilter';
import SourcesFilter from './SourcesFilter';

export default function TeamTable() {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'avg_zscore_rank', desc: false }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const [searchQuery, setSearchQuery] = useState('');
	const [conferenceFilter, setConferenceFilter] = useLocalStorage<string[]>('conference_filter', []);
	const [sourcesFilter, setSourcesFilter] = useLocalStorage<string[]>('sources_filter', [...allSourceToggles]);
	const [metricsFilter, setMetricsFilter] = useLocalStorage<string[]>('metrics_filter', [...allMetricToggles]);
	const [relativeRankings, setOnRelativeRankings] = useLocalStorage<boolean>('relative_rankings', true);

	const data = useRankings();

	const router = useRouter();

	const activeSources = useMemo(() => allSources.filter(s => sourcesFilter.includes(s.key)), [sourcesFilter]);

	const adjustedData = useMemo(() => {
		if (activeSources.length === allSources.length || activeSources.length === 0) return data;
		return computeAverageZScores(data, activeSources);
	}, [data, activeSources]);

	const midMajorConferences = useMemo(() => {
		const conferences = Array.from(new Set(data.map(t => t.conference)));
		return conferences.filter(c => !p5Conferences.includes(c)).sort();
	}, [data]);

	useEffect(() => {
		const visibility: VisibilityState = {};
		const showAllSources = sourcesFilter.length === 0 || sourcesFilter.length === allSourceToggles.length;
		const showAllMetrics = metricsFilter.length === 0 || metricsFilter.length === allMetricToggles.length;

		for (const [source, cols] of Object.entries(sourceColumns)) {
			const isSourceVisible = showAllSources || sourcesFilter.includes(source);
			for (const col of cols) {
				let metric: string;
				if (col.includes('off')) metric = 'offense';
				else if (col.includes('def')) metric = 'defense';
				else if (col.includes('_q')) metric = 'quad record';
				else metric = 'rating';

				const isMetricVisible = showAllMetrics || metricsFilter.includes(metric);
				visibility[col] = isSourceVisible && isMetricVisible;
			}
		}

		setColumnVisibility(visibility);
	}, [sourcesFilter, metricsFilter]);

	const fuse = useMemo(
		() =>
			new Fuse(adjustedData, {
				keys: ['team_name'],
				threshold: 0.3
			}),
		[adjustedData]
	);

	const filteredData = useMemo(() => {
		let result = adjustedData;

		if (conferenceFilter.length > 0 && conferenceFilter.length !== 6) {
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
	}, [searchQuery, fuse, adjustedData, conferenceFilter, midMajorConferences]);

	const rerankedData = useMemo(() => {
		if (conferenceFilter.length === 6 || conferenceFilter.length === 0 || !relativeRankings) return filteredData;
		return rerankColumns(filteredData);
	}, [filteredData, relativeRankings]);

	const table = useReactTable({
		data: rerankedData,
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
		<div className="mt-8 md:mb-8 flex flex-col flex-1 min-h-0">
			<div className="mb-4 flex gap-2 justify-between">
				<SearchBar
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					placeholder="Search teams..."
					className="md:w-1/3"
				/>

				<div className="flex gap-2">
					<MetricsFilter metricsFilter={metricsFilter} onChange={setMetricsFilter} />
					<SourcesFilter sourcesFilter={sourcesFilter} onChange={setSourcesFilter} />
					<ConferenceFilter
						conferenceFilter={conferenceFilter}
						onChange={setConferenceFilter}
						relativeRankings={relativeRankings}
						onRelRankChange={setOnRelativeRankings}
					/>
				</div>
			</div>
			<div className="overflow-x-auto overflow-y-auto overscroll-none rounded-md border flex-1 min-h-0 always-show-scrollbar">
				{table.getRowModel().rows?.length ? (
					<Table>
						<TableHeader className="bg-neutral-800">
							{table.getHeaderGroups().map((headerGroup, groupIndex) => (
								<TableRow key={headerGroup.id} className={groupIndex === 0 ? '!border-b-0' : ''}>
									{headerGroup.headers.map((header, index) => {
										const isSticky = index === 0;
										return (
											<TableHead
												key={header.id}
												colSpan={header.colSpan}
												className={`sticky bg-neutral-800 ${groupIndex === 0 ? 'top-0 h-8 align-bottom ' : 'top-8'} ${isSticky ? 'left-0 z-20' : 'z-10'}`}
											>
												{header.isPlaceholder
													? null
													: flexRender(header.column.columnDef.header, header.getContext())}
											</TableHead>
										);
									})}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && 'selected'}
									className="cursor-pointer group"
									onClick={() => router.push(`/${row.original.team_key}`)}
								>
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
