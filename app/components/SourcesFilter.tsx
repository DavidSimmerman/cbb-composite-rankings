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
import { Layers } from 'lucide-react';
import { GoDotFill } from 'react-icons/go';
import { PiColumnsPlusRightFill } from 'react-icons/pi';
import { twMerge } from 'tailwind-merge';
import { allSources } from './columns';

interface SourcesFilterProps {
	sourcesFilter: string[];
	onChange: (sources: string[]) => void;
	// Rankings page: Aurora-styled trigger, and only the four rating sources (Composite is what they build)
	aurora?: boolean;
	className?: string;
	compact?: boolean;
}

const ratingSources = allSources.filter(s => s !== 'Composite');

// Trigger label: "All models" until one is left out, then what's left out or how many remain
function sourcesLabel(sourcesFilter: string[]) {
	const on = ratingSources.filter(s => sourcesFilter.length === 0 || sourcesFilter.includes(s));
	if (on.length === ratingSources.length) return 'All models';
	if (on.length === ratingSources.length - 1) return `No ${ratingSources.find(s => !on.includes(s))}`;
	return `${on.length} models`;
}

export default function SourcesFilter({ sourcesFilter, onChange, aurora, className, compact }: SourcesFilterProps) {
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

	if (aurora) {
		const isOn = (src: string) => sourcesFilter.length === 0 || sourcesFilter.includes(src);
		const filtered = !ratingSources.every(isOn);
		const colors: Record<string, string> = { KenPom: '#60a5fa', EvanMiya: '#34d399', BartTorvik: '#fb923c', NET: '#f87171' };
		// An empty list means "everything", so expand it before switching one source off
		const toggle = (src: string) => {
			const current = sourcesFilter.length === 0 ? [...allSources] : sourcesFilter;
			const next = current.includes(src) ? current.filter(x => x !== src) : [...current, src];
			// Keep at least one rating source in the composite
			if (ratingSources.some(r => next.includes(r))) onChange(next);
		};

		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					suppressHydrationWarning
					title="Models used in the composite"
					className={twMerge(
						'flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-3 text-slate-400 hover:text-slate-200 transition-colors',
						className
					)}
				>
					<Layers className="size-3.5" />
					<span className={compact ? 'sr-only' : ''}>{sourcesLabel(sourcesFilter)}</span>
					{compact && filtered && <span className="size-1.5 rounded-full bg-violet-400" />}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52 font-grotesk">
					<div className="px-2 pt-1.5 pb-1 text-[11px] text-slate-500">Models in the composite</div>
					<DropdownMenuGroup>
						{ratingSources.map(src => (
							<DropdownMenuCheckboxItem
								key={`source_filter_${src}`}
								checked={isOn(src)}
								onCheckedChange={() => toggle(src)}
								onSelect={e => e.preventDefault()}
								className="cursor-pointer gap-2"
							>
								<span className="size-1.5 rounded-full" style={{ background: colors[src] }} />
								{src}
							</DropdownMenuCheckboxItem>
						))}
					</DropdownMenuGroup>
					{filtered && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="cursor-pointer justify-center" onClick={() => onChange([...allSources])}>
								Use all models
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		);
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
			<DropdownMenuTrigger asChild className="cursor-pointer">
				<Button variant="outline">
					<PiColumnsPlusRightFill /> <span className="hidden md:block">Models</span>
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
