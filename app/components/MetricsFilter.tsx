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
import { allMetrics } from './columns';

interface MetricsFilterProps {
	metricsFilter: string[];
	onChange: (metrics: string[]) => void;
}

export default function MetricsFilter({ metricsFilter, onChange }: MetricsFilterProps) {
	function toggleMetric(metric: string) {
		if (metricsFilter.includes(metric)) {
			onChange(metricsFilter.filter(m => m !== metric));
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
			<DropdownMenuTrigger asChild>
				<Button variant="outline">Metrics</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-30">
				<DropdownMenuGroup>
					{allMetrics.map(m => (
						<DropdownMenuCheckboxItem
							key={`metric_filter_${m}`}
							checked={metricsFilter.includes(m)}
							onCheckedChange={() => toggleMetric(m)}
							className="px-2 justify-center"
						>
							{m}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="px-2 justify-center" onClick={toggleAll}>
						Enable All
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
