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
import { p5Conferences } from './columns';

interface ConferenceFilterProps {
	conferenceFilter: string[];
	onChange: (conferences: string[]) => void;
}

export default function ConferenceFilter({ conferenceFilter, onChange }: ConferenceFilterProps) {
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
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Conferences</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-30">
				<DropdownMenuGroup>
					{p5Conferences.map(c => (
						<DropdownMenuCheckboxItem
							key={`conference_filter_${c}`}
							checked={conferenceFilter.includes(c)}
							onCheckedChange={() => toggleConference(c)}
							className="px-2 justify-center"
						>
							{c}
						</DropdownMenuCheckboxItem>
					))}

					<DropdownMenuCheckboxItem
						checked={conferenceFilter.includes('mid-major')}
						onCheckedChange={() => toggleConference('mid-major')}
						className="px-2 justify-center"
					>
						Mid-Major
					</DropdownMenuCheckboxItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="px-2 justify-center" onClick={toggleAll}>
						Toggle All
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
