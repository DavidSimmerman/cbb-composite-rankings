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
import { RiBarChart2Fill } from 'react-icons/ri';
import { allMetrics } from './columns';

interface MetricsFilterProps {
	metricsFilter: string[];
	onChange: (metrics: string[]) => void;
}

export default function MetricsFilter({ metricsFilter, onChange }: MetricsFilterProps) {
	function toggleMetric(metric: string) {
		if (metricsFilter.includes(metric)) {
			onChange(metricsFilter.filter(s => s !== metric));
		} else {
			onChange([...metricsFilter, metric]);
		}
	}

	function toggleAll() {
		if (metricsFilter.length === allMetrics.length) {
			onChange([]);
		} else {
			onChange([...allMetrics]);
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild className="cursor-pointer">
				<Button variant="outline">
					<RiBarChart2Fill /> <span className="hidden md:block">Metrics</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="">
				<DropdownMenuGroup>
					{allMetrics.map((m: string) => (
						<DropdownMenuCheckboxItem
							key={`metric_filter_${m}`}
							checked={metricsFilter.includes(m)}
							onCheckedChange={() => toggleMetric(m)}
							className="px-6 flex gap-0 justify-center cursor-pointer capitalize"
						>
							{m}
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
