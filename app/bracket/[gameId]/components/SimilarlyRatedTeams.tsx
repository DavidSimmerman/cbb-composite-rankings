'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import type { BracketTeamSummary } from '@/lib/rankings/profile';
import TeamLogo from '@/components/TeamLogo';
import { MarchScoreBadge } from '@/components/march/MarchScoreBadge';
import { useMemo } from 'react';

interface SimilarlyRatedTeamsProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
	allTeams: BracketTeamSummary[];
}

function getRankColor(rank: number): string {
	if (!rank || isNaN(rank)) return 'oklch(0.4 0 0)';
	if (rank <= 36) return 'oklch(0.70 0.22 145)';
	if (rank <= 73) return 'oklch(0.65 0.19 135)';
	if (rank <= 109) return 'oklch(0.62 0.17 120)';
	if (rank <= 146) return 'oklch(0.60 0.16 100)';
	if (rank <= 182) return 'oklch(0.58 0.15 85)';
	if (rank <= 219) return 'oklch(0.58 0.16 70)';
	if (rank <= 256) return 'oklch(0.60 0.17 55)';
	if (rank <= 292) return 'oklch(0.62 0.19 40)';
	if (rank <= 329) return 'oklch(0.65 0.20 30)';
	return 'oklch(0.70 0.22 20)';
}

export default function SimilarlyRatedTeams({ teamA, teamB, allTeams }: SimilarlyRatedTeamsProps) {
	const similarToA = useMemo(() => findSimilar(teamA, allTeams), [teamA, allTeams]);
	const similarToB = useMemo(() => findSimilar(teamB, allTeams), [teamB, allTeams]);

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-1">Similarly Rated Teams</div>
			<div className="text-sm text-neutral-500 mb-4">Bracket teams with similar composite ratings</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<SimilarColumn team={teamA} similar={similarToA} />
				<SimilarColumn team={teamB} similar={similarToB} />
			</div>
		</div>
	);
}

function SimilarColumn({ team, similar }: { team: BracketTeam; similar: SimilarTeamEntry[] }) {
	return (
		<div className="border border-neutral-800 rounded-md p-3">
			<div className="flex items-center gap-2 mb-3">
				<TeamLogo teamKey={team.team_key} size={40} className="size-5" />
				<span className="text-sm font-bold">{team.short_name}</span>
				<span className="text-xs text-neutral-500">#{team.comp_rank}</span>
			</div>
			{similar.length === 0 ? (
				<div className="text-xs text-neutral-600">No similar teams found</div>
			) : (
				<div className="flex flex-col gap-1">
					{similar.map(s => (
						<div key={s.team_key} className="flex items-center gap-2 py-1 border-b border-neutral-800/50 last:border-0">
							<span className="text-[10px] text-neutral-500 tabular-nums w-4 text-right">#{s.seed}</span>
							<TeamLogo teamKey={s.team_key} size={40} className="size-4" />
							<span className="text-xs text-neutral-300 truncate flex-1">{s.team_name}</span>
							<span className="text-[10px] tabular-nums" style={{ color: getRankColor(s.comp_rank) }}>#{s.comp_rank}</span>
							<MarchScoreBadge score={s.march_score} size="sm" />
						</div>
					))}
				</div>
			)}
		</div>
	);
}

interface SimilarTeamEntry {
	team_key: string;
	team_name: string;
	seed: number;
	comp_rank: number;
	march_score: number;
	ratingDiff: number;
}

function findSimilar(team: BracketTeam, allTeams: BracketTeamSummary[]): SimilarTeamEntry[] {
	if (!team.comp_rank) return [];

	return allTeams
		.filter(t => t.team_key !== team.team_key)
		.map(t => ({
			team_key: t.team_key,
			team_name: t.team_name,
			seed: t.projected_seed,
			comp_rank: t.comp_rank,
			march_score: t.march_score,
			ratingDiff: Math.abs((t.comp_rank || 0) - (team.comp_rank || 0)),
		}))
		.sort((a, b) => a.ratingDiff - b.ratingDiff)
		.slice(0, 5);
}
