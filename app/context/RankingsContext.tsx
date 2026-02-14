'use client';

import { CompiledTeamData } from '@/lib/shared';
import { createContext, use, useContext } from 'react';

const RankingsContext = createContext<Promise<CompiledTeamData[]> | null>(null);

export function RankingsPromiseProvider({
	rankingsPromise,
	children
}: {
	rankingsPromise: Promise<CompiledTeamData[]>;
	children: React.ReactNode;
}) {
	return <RankingsContext.Provider value={rankingsPromise}>{children}</RankingsContext.Provider>;
}

export function useRankings(): CompiledTeamData[] {
	const promise = useContext(RankingsContext)!;
	return use(promise);
}
