'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import TeamComparison from '@/components/games/TeamComparison';
import { useEffect, useState } from 'react';

interface BracketTeamComparisonProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
}

export default function BracketTeamComparison({ teamA, teamB }: BracketTeamComparisonProps) {
	const [ratings, setRatings] = useState<Record<string, Record<string, number>> | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchRatings = async () => {
			try {
				const res = await fetch(`/api/teams/ratings?teams=${teamA.team_key},${teamB.team_key}`);
				if (!res.ok) return;
				const json = await res.json();
				if (json.error) return;
				setRatings(json);
			} catch {
				// Silently fail
			} finally {
				setLoading(false);
			}
		};
		fetchRatings();
	}, [teamA.team_key, teamB.team_key]);

	if (loading) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-2xl font-bold text-neutral-600 mb-4">Team Comparison</div>
				<div className="animate-pulse space-y-3">
					<div className="h-6 bg-neutral-800 rounded-full" />
					<div className="h-40 bg-neutral-800 rounded" />
				</div>
			</div>
		);
	}

	if (!ratings || !ratings[teamA.team_key] || !ratings[teamB.team_key]) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-2xl font-bold text-neutral-600 mb-4">Team Comparison</div>
				<div className="text-sm text-neutral-500">No data available for one or both teams</div>
			</div>
		);
	}

	return (
		<TeamComparison
			teamAName={teamA.team_name}
			teamBName={teamB.team_name}
			teamAAbbr={teamA.abbreviation}
			teamBAbbr={teamB.abbreviation}
			teamAColor={`#${teamA.color}`}
			teamBColor={`#${teamB.color}`}
			teamASecondaryColor={`#${teamA.secondary_color}`}
			teamBSecondaryColor={`#${teamB.secondary_color}`}
			teamARatings={ratings[teamA.team_key]}
			teamBRatings={ratings[teamB.team_key]}
		/>
	);
}
