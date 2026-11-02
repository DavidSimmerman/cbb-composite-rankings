'use client';

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Filter } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { p5Conferences } from './columns';

interface ConferenceFilterProps {
	conferenceFilter: string[];
	onChange: (conferences: string[]) => void;
	relativeRankings: boolean;
	onRelRankChange: (arg0: boolean) => void;
	className?: string;
	// Phones: icon only, with a dot while a filter is on
	compact?: boolean;
}

// Trigger label: "All conferences" until a subset is picked, then the picks themselves
function filterLabel(conferenceFilter: string[]) {
	if (conferenceFilter.length === 0 || conferenceFilter.length === 6) return 'All conferences';
	if (conferenceFilter.length > 2) return `${conferenceFilter.length} conferences`;
	return conferenceFilter.map(c => (c === 'mid-major' ? 'Mid-Major' : c)).join(', ');
}

export default function ConferenceFilter({
	conferenceFilter,
	onChange,
	relativeRankings,
	onRelRankChange,
	className,
	compact
}: ConferenceFilterProps) {
	function toggleConference(conference: string) {
		if (conferenceFilter.includes(conference)) {
			onChange(conferenceFilter.filter(f => f !== conference));
		} else {
			onChange([...conferenceFilter, conference]);
		}
	}

	function toggleAll() {
		if (conferenceFilter.length === 6) {
			onChange([]);
		} else {
			onChange([...p5Conferences, 'mid-major']);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				suppressHydrationWarning
				className={twMerge(
					'flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-3 text-slate-400 hover:text-slate-200 transition-colors',
					className
				)}
			>
				<Filter className="size-3.5" />
				<span className={compact ? 'sr-only' : ''}>{filterLabel(conferenceFilter)}</span>
				{compact && conferenceFilter.length > 0 && conferenceFilter.length !== 6 && (
					<span className="size-1.5 rounded-full bg-violet-400" />
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-36 font-grotesk">
				<DropdownMenuGroup>
					{p5Conferences.map(c => (
						<DropdownMenuCheckboxItem
							key={`conference_filter_${c}`}
							checked={conferenceFilter.includes(c)}
							onCheckedChange={() => toggleConference(c)}
							className="px-2 justify-center cursor-pointer"
						>
							{c}
						</DropdownMenuCheckboxItem>
					))}

					<DropdownMenuCheckboxItem
						checked={conferenceFilter.includes('mid-major')}
						onCheckedChange={() => toggleConference('mid-major')}
						className="px-2 justify-center cursor-pointer"
					>
						Mid-Major
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="px-2 justify-center cursor-pointer" onClick={toggleAll}>
						Toggle All
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuCheckboxItem
						checked={relativeRankings}
						onCheckedChange={() => onRelRankChange(!relativeRankings)}
						className="px-2 justify-center cursor-pointer flex flex-col"
					>
						<span>Relative</span>
						<span>Rankings</span>
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
