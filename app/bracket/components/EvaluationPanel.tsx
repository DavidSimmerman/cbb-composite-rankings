'use client';

import type { BracketEvaluation, FindingSeverity } from '@/lib/bracket/evaluation';
import { X } from 'lucide-react';

interface EvaluationPanelProps {
	evaluation: BracketEvaluation;
	onClose: () => void;
}

const SEVERITY_STYLES: Record<FindingSeverity, { border: string; dot: string; label: string }> = {
	wild: { border: 'border-l-red-500', dot: 'bg-red-500', label: 'Historically Rare' },
	bold: { border: 'border-l-orange-400', dot: 'bg-orange-400', label: 'Bold Pick' },
	mild: { border: 'border-l-yellow-400', dot: 'bg-yellow-400', label: 'Noteworthy' },
	info: { border: 'border-l-blue-400', dot: 'bg-blue-400', label: 'Interesting' },
};

function getScoreColor(score: number): string {
	if (score >= 80) return 'text-green-400';
	if (score >= 60) return 'text-yellow-400';
	if (score >= 40) return 'text-orange-400';
	return 'text-red-400';
}

export default function EvaluationPanel({ evaluation, onClose }: EvaluationPanelProps) {
	const { realismScore, bracketStyle, findings } = evaluation;

	const wildCount = findings.filter(f => f.severity === 'wild').length;
	const boldCount = findings.filter(f => f.severity === 'bold').length;

	return (
		<div className="border border-neutral-800 rounded-lg bg-neutral-900 overflow-hidden max-h-[70vh] flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
				<div className="flex items-center gap-4">
					<div className="text-center">
						<div className={`text-3xl font-bold tabular-nums ${getScoreColor(realismScore)}`}>
							{realismScore}
						</div>
						<div className="text-[10px] text-muted-foreground uppercase tracking-wide">Realism</div>
					</div>
					<div>
						<div className="text-sm font-medium">{bracketStyle}</div>
						<div className="text-xs text-muted-foreground">
							{findings.length === 0
								? 'No notable findings — historically realistic bracket.'
								: `${findings.length} finding${findings.length !== 1 ? 's' : ''}`
							}
							{wildCount > 0 && ` · ${wildCount} historically rare`}
							{boldCount > 0 && ` · ${boldCount} bold`}
						</div>
					</div>
				</div>
				<button
					onClick={onClose}
					className="p-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</div>

			{/* Findings list */}
			{findings.length > 0 && (
				<div className="flex-1 overflow-auto p-3 space-y-2">
					{findings.map((f, i) => {
						const style = SEVERITY_STYLES[f.severity];
						return (
							<div
								key={i}
								className={`border-l-2 ${style.border} pl-3 py-1.5`}
							>
								<div className="flex items-center gap-2">
									<span className={`size-1.5 rounded-full ${style.dot} shrink-0`} />
									<span className="text-sm font-medium">{f.title}</span>
								</div>
								<div className="text-xs text-muted-foreground mt-0.5 ml-3.5">
									{f.detail}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
