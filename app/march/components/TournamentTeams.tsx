'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MarchPageData, BracketTeamSummary } from '@/lib/rankings/profile';
import { MarchScoreBadge } from '@/components/march/MarchScoreBadge';
import { MarchProfileCards } from '@/components/march/MarchCards';
import { getSeedColor } from '@/components/march/MarchCards';

type SortMode = 'seed' | 'score';

export default function TournamentTeams({ data }: { data: MarchPageData }) {
	const [selectedKey, setSelectedKey] = useState<string | null>(
		data.bracket_teams[0]?.team_key ?? null
	);
	const [sortMode, setSortMode] = useState<SortMode>('seed');

	const sortedTeams = useMemo(() => {
		const teams = [...data.bracket_teams];
		switch (sortMode) {
			case 'seed': return teams.sort((a, b) => a.projected_seed - b.projected_seed || b.march_score - a.march_score);
			case 'score': return teams.sort((a, b) => b.march_score - a.march_score);
		}
	}, [data.bracket_teams, sortMode]);

	const selected = data.bracket_teams.find(t => t.team_key === selectedKey) ?? null;

	return (
		<div className="h-full flex flex-col md:flex-row">
			{/* Team list */}
			<div className={`md:w-80 md:shrink-0 md:border-r md:border-neutral-800 overflow-auto ${
				selectedKey && 'hidden md:block'
			}`}>
				{/* Sort controls */}
				<div className="flex items-center gap-1 px-3 py-2 border-b border-neutral-800 sticky top-0 bg-neutral-950/95 backdrop-blur z-10">
					<span className="text-xs text-neutral-500 mr-1">Sort:</span>
					{(['seed', 'score'] as const).map(mode => (
						<button
							key={mode}
							onClick={() => setSortMode(mode)}
							className={`px-2 py-0.5 rounded text-xs transition-colors ${
								sortMode === mode
									? 'bg-neutral-700 text-white'
									: 'bg-neutral-800/50 text-neutral-500 hover:text-neutral-300'
							}`}
						>
							{mode === 'seed' ? 'Seed' : 'Score'}
						</button>
					))}
				</div>
				<div className="px-2 md:px-0">
					{sortedTeams.map(team => (
						<TeamRow
							key={team.team_key}
							team={team}
							isSelected={team.team_key === selectedKey}
							onSelect={() => setSelectedKey(team.team_key)}
						/>
					))}
				</div>
			</div>

			{/* Detail panel */}
			{selected && (
				<div className="flex-1 min-h-0 overflow-auto">
					{/* Mobile back button */}
					<div className="md:hidden px-3 py-2 border-b border-neutral-800">
						<button
							onClick={() => setSelectedKey(null)}
							className="text-sm text-neutral-400 hover:text-white"
						>
							&larr; Back to list
						</button>
					</div>
					<div className="p-3 md:p-4 max-w-4xl mx-auto">
						<div className="flex items-center gap-3 mb-4">
							{selected.logo_url && (
								<img src={selected.logo_url} alt="" className="w-8 h-8" />
							)}
							<div>
								<Link href={`/${selected.team_key}`} className="text-lg font-bold text-white hover:underline">{selected.team_name}</Link>
								<div className="text-sm text-neutral-400">
									Projected <span style={{ color: getSeedColor(selected.projected_seed) }}>
										{selected.projected_seed}-seed
									</span>
								</div>
							</div>
						</div>
						<MarchProfileCards analysis={selected.march_analysis} factorsHref="/march/factors" />
					</div>
				</div>
			)}

			{/* Empty state on desktop when nothing selected */}
			{!selected && (
				<div className="hidden md:flex flex-1 items-center justify-center text-neutral-500">
					Select a team to view their March profile
				</div>
			)}
		</div>
	);
}

function TeamRow({ team, isSelected, onSelect }: {
	team: BracketTeamSummary;
	isSelected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			onClick={onSelect}
			className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-neutral-800/50 hover:bg-neutral-800/50 transition-colors ${
				isSelected ? 'bg-neutral-800/70' : ''
			}`}
		>
			<div
				className="w-1 h-8 rounded-full shrink-0"
				style={{ backgroundColor: `#${team.color}` }}
			/>
			{team.logo_url && (
				<img src={team.logo_url} alt="" className="w-5 h-5 shrink-0" />
			)}
			<div className="flex-1 min-w-0">
				<div className="text-sm text-white truncate">{team.team_name}</div>
				<div className="text-xs text-neutral-500">
					<span style={{ color: getSeedColor(team.projected_seed) }}>
						{team.projected_seed}-seed
					</span>
					{team.avg_seed != null && (
						<span className="ml-1">({team.avg_seed.toFixed(1)})</span>
					)}
				</div>
			</div>
			<MarchScoreBadge score={team.march_score} size="md" />
		</button>
	);
}
