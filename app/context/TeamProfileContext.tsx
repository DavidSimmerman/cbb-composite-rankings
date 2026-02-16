'use client';

import { ESPN_TO_TEAM_KEY } from '@/lib/espn/espn-team-ids';
import { ParsedTeamProfile, TeamProfile } from '@/lib/rankings/profile';
import { createContext, useContext, useMemo } from 'react';
import { useRankings } from './RankingsContext';

const TeamProfileContext = createContext<ParsedTeamProfile | null>(null);

export function TeamProfileProvider({ profile, children }: { profile: TeamProfile; children: React.ReactNode }) {
	const rankings = useRankings();

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
