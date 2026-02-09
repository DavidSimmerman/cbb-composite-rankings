'use client';

import { CompiledTeamData } from '@/lib/shared';
import { createContext, useContext } from 'react';

const RankingsContext = createContext<CompiledTeamData[] | null>(null);

export function RankingsProvider({ rankings, children }: { rankings: CompiledTeamData[]; children: React.ReactNode }) {
	return <RankingsContext.Provider value={rankings}>{children}</RankingsContext.Provider>;
}

export function useRankings(): CompiledTeamData[] {
	return useContext(RankingsContext)!;
}
