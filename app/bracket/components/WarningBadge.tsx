'use client';

import type { Warning } from '@/lib/bracket/warnings';
import { AlertTriangle, OctagonAlert, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface WarningsPanelProps {
	warnings: Warning[];
}

export default function WarningsPanel({ warnings }: WarningsPanelProps) {
	const [expanded, setExpanded] = useState(false);

	if (warnings.length === 0) return null;

	const redCount = warnings.filter(w => w.level === 'red').length;
	const yellowCount = warnings.filter(w => w.level === 'yellow').length;

	return (
		<div className="border border-neutral-800 rounded-lg overflow-hidden">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-800/50 transition-colors cursor-pointer"
			>
				<span className="flex items-center gap-1.5">
					{redCount > 0 && (
						<span className="flex items-center gap-0.5 text-red-500">
							<OctagonAlert className="size-3.5" />
							<span className="text-xs font-medium">{redCount}</span>
						</span>
					)}
					{yellowCount > 0 && (
						<span className="flex items-center gap-0.5 text-yellow-500">
							<AlertTriangle className="size-3.5" />
							<span className="text-xs font-medium">{yellowCount}</span>
						</span>
					)}
				</span>
				<span className="text-muted-foreground text-xs">
					{warnings.length} bracket warning{warnings.length !== 1 ? 's' : ''}
				</span>
				<ChevronDown className={`size-3.5 ml-auto text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
			</button>

			{expanded && (
				<div className="border-t border-neutral-800 px-3 py-2 space-y-1.5">
					{warnings.map((w, i) => (
						<div key={i} className="flex items-start gap-2 text-xs">
							{w.level === 'red' ? (
								<OctagonAlert className="size-3.5 text-red-500 shrink-0 mt-0.5" />
							) : (
								<AlertTriangle className="size-3.5 text-yellow-500 shrink-0 mt-0.5" />
							)}
							<div>
								<span className="font-medium">{w.message}</span>
								<span className="text-muted-foreground ml-1">{w.detail}</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
