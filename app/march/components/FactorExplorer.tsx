'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MarchPageData, FactorMatrixCell } from '@/lib/rankings/profile';
import { MarchScoreBadge, getMarchScoreColor } from '@/components/march/MarchScoreBadge';

const TIERS = [5, 10, 15, 25, 35, 50, 75, 100];
const SEEDS = Array.from({ length: 16 }, (_, i) => i + 1);

// Get unique factor keys/labels in order
function getFactorList(matrix: FactorMatrixCell[]): { key: string; label: string }[] {
	const seen = new Map<string, string>();
	for (const c of matrix) {
		if (!seen.has(c.factor_key)) seen.set(c.factor_key, c.factor_label);
	}
	return Array.from(seen, ([key, label]) => ({ key, label }));
}

export default function FactorExplorer({ data }: { data: MarchPageData }) {
	const [selectedSeed, setSelectedSeed] = useState<number | 'all'>('all');
	const [expandedCell, setExpandedCell] = useState<string | null>(null);

	const factors = useMemo(() => getFactorList(data.factor_matrix), [data.factor_matrix]);

	// Build lookup: factor_key → seed → tier → cell
	const cellLookup = useMemo(() => {
		const map = new Map<string, FactorMatrixCell>();
		for (const c of data.factor_matrix) {
			map.set(`${c.factor_key}-${c.seed}-${c.tier}`, c);
		}
		return map;
	}, [data.factor_matrix]);

	const visibleSeeds = selectedSeed === 'all' ? SEEDS : [selectedSeed];

	return (
		<div className="h-full overflow-auto px-2 md:px-4 pb-4 max-w-340 w-full mx-auto">
			{/* Seed filter */}
			<div className="flex items-center gap-1.5 flex-wrap mb-4 py-2 sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
				<span className="text-xs text-neutral-500 mr-1">Seed:</span>
				<SeedChip
					label="All"
					active={selectedSeed === 'all'}
					onClick={() => setSelectedSeed('all')}
				/>
				{SEEDS.map(s => (
					<SeedChip
						key={s}
						label={String(s)}
						active={selectedSeed === s}
						onClick={() => setSelectedSeed(s)}
					/>
				))}
			</div>

			{/* Factor × Tier matrix */}
			{visibleSeeds.map(seed => (
				<div key={seed} className="mb-6">
					{selectedSeed === 'all' && (
						<div className="text-sm font-bold text-neutral-400 mb-2">{seed}-seeds</div>
					)}
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-xs">
							<thead>
								<tr>
									<th className="text-left text-neutral-500 font-normal pb-1 pr-2 min-w-32">Factor</th>
									{TIERS.map(tier => (
										<th key={tier} className="text-center text-neutral-500 font-normal pb-1 px-1 min-w-14">
											Top {tier}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{factors.map(f => (
									<FactorRow
										key={f.key}
										factor={f}
										seed={seed}
										tiers={TIERS}
										cellLookup={cellLookup}
										expandedCell={expandedCell}
										onToggleCell={setExpandedCell}
										bracketTeams={data.bracket_teams}
									/>
								))}
							</tbody>
						</table>
					</div>
				</div>
			))}
		</div>
	);
}

function SeedChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className={`px-2 py-0.5 rounded text-xs transition-colors ${
				active
					? 'bg-neutral-700 text-white'
					: 'bg-neutral-800/50 text-neutral-500 hover:text-neutral-300'
			}`}
		>
			{label}
		</button>
	);
}

function FactorRow({ factor, seed, tiers, cellLookup, expandedCell, onToggleCell, bracketTeams }: {
	factor: { key: string; label: string };
	seed: number;
	tiers: number[];
	cellLookup: Map<string, FactorMatrixCell>;
	expandedCell: string | null;
	onToggleCell: (key: string | null) => void;
	bracketTeams: MarchPageData['bracket_teams'];
}) {
	return (
		<>
			<tr className="border-b border-neutral-800/30">
				<td className="py-1.5 pr-2 text-neutral-300">{factor.label}</td>
				{tiers.map(tier => {
					const cellKey = `${factor.key}-${seed}-${tier}`;
					const cell = cellLookup.get(cellKey);
					const isExpanded = expandedCell === cellKey;

					if (!cell || cell.sample_size < 20) {
						return (
							<td key={tier} className="text-center py-1.5 px-1">
								<span className="text-neutral-700">-</span>
							</td>
						);
					}

					return (
						<td key={tier} className="text-center py-1.5 px-1">
							<button
								onClick={() => onToggleCell(isExpanded ? null : cellKey)}
								className={`cursor-pointer inline-flex flex-col items-center gap-0.5 rounded px-1.5 py-0.5 transition-colors ${
									isExpanded ? 'bg-neutral-700' : 'hover:bg-neutral-800'
								}`}
							>
								<span className="font-medium tabular-nums" style={{ color: getMarchScoreColor(cell.percentile) }}>
									{cell.percentile}
								</span>
								<span className="text-[9px] text-neutral-600 tabular-nums">
									n={cell.sample_size}
								</span>
								{cell.current_team_keys.length > 0 && (
									<span className="text-[9px] font-medium tabular-nums text-amber-500/80">
										{cell.current_team_keys.length} in bracket
									</span>
								)}
							</button>
						</td>
					);
				})}
			</tr>
			{/* Expanded cell detail */}
			{tiers.map(tier => {
				const cellKey = `${factor.key}-${seed}-${tier}`;
				if (expandedCell !== cellKey) return null;
				const cell = cellLookup.get(cellKey);
				if (!cell) return null;

				return (
					<tr key={`${tier}-detail`}>
						<td colSpan={tiers.length + 1} className="pb-2">
							<div className="border border-neutral-800 rounded-md p-2 mt-1 mb-1">
								<div className="flex items-center gap-3 mb-2">
									<MarchScoreBadge score={cell.percentile} size="md" />
									<div>
										<div className="text-sm text-white">{factor.label} &middot; {seed}-seeds &middot; Top-{tier}</div>
										<div className="text-xs text-neutral-500">
											R32+ {cell.round_32_rate}%
											&middot; S16+ {cell.deep_run_rate}% &middot; F4 {cell.final_four_rate}%
											&middot; n={cell.sample_size}
										</div>
									</div>
								</div>
								{cell.current_team_keys.length > 0 && (
									<div>
										<div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">
											Current bracket teams ({cell.current_team_keys.length})
										</div>
										<div className="flex flex-wrap gap-1">
											{cell.current_team_keys.map(tk => {
												const team = bracketTeams.find(t => t.team_key === tk);
												return (
													<Link
														key={tk}
														href={`/${tk}`}
														className="text-xs bg-neutral-800 rounded px-1.5 py-0.5 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
													>
														{team?.team_name ?? tk}
													</Link>
												);
											})}
										</div>
									</div>
								)}
							</div>
						</td>
					</tr>
				);
			})}
		</>
	);
}
