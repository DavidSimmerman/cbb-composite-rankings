'use client';

import { ESPN_TO_TEAM_KEY } from '@/lib/espn/espn-team-ids';
import { ParsedTeamProfile, TeamProfile } from '@/lib/rankings/profile';
import type { CompiledTeamData } from '@/lib/shared';
import { createContext, useContext, useMemo } from 'react';
import { useRankings } from './RankingsContext';

const TeamProfileContext = createContext<ParsedTeamProfile | null>(null);

export function TeamProfileProvider({
	profile,
	seasonRankings,
	children
}: {
	profile: TeamProfile;
	/** Opponents' ratings for a past season; the current season uses the global rankings */
	seasonRankings?: CompiledTeamData[];
	children: React.ReactNode;
}) {
	const globalRankings = useRankings();
	const rankings = seasonRankings ?? globalRankings;

	const parsedProfile = useMemo<ParsedTeamProfile>(
		() =>
			({
				...profile,
				schedule: profile.schedule.map(g => ({
					...g,
					espn_id: g.opp,
					opp: rankings.find(r => r.team_key === ESPN_TO_TEAM_KEY[g.opp]) ?? {}
				}))
			}) as ParsedTeamProfile,
		[profile, rankings]
	);

	return <TeamProfileContext.Provider value={parsedProfile}>{children}</TeamProfileContext.Provider>;
}

export function useTeamProfile(): ParsedTeamProfile {
	return useContext(TeamProfileContext)!;
}
