'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { allSources } from './columns';
import { PiColumnsPlusRightFill } from 'react-icons/pi';
import { GoDotFill } from 'react-icons/go';

interface SourcesFilterProps {
	sourcesFilter: string[];
	onChange: (sources: string[]) => void;
}

export default function SourcesFilter({ sourcesFilter, onChange }: SourcesFilterProps) {
	function toggleSource(source: string) {
		if (sourcesFilter.includes(source)) {
			onChange(sourcesFilter.filter(s => s !== source));
		} else {
			onChange([...sourcesFilter, source]);
		}
	}

	function toggleAll() {
		if (sourcesFilter.length === allSources.length) {
			onChange([]);
		} else {
			onChange([...allSources]);
		}
	}

	const dotColorClasses = {
		Composite: 'text-purple-500',
		KenPom: 'text-blue-500',
		EvanMiya: 'text-green-500',
		BartTorvik: 'text-yellow-500',
		NET: 'text-red-500'
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					<PiColumnsPlusRightFill /> <span className="hidden md:block">Sources</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="">
				<DropdownMenuGroup>
					{allSources.map(s => (
						<DropdownMenuCheckboxItem
							key={`source_filter_${s}`}
							checked={sourcesFilter.includes(s)}
							onCheckedChange={() => toggleSource(s)}
							className="px-6 flex gap-0 justify-center cursor-pointer"
						>
							<GoDotFill className={dotColorClasses[s]} />
							{s}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="px-2 justify-center cursor-pointer" onClick={toggleAll}>
						Toggle All
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
