'use client';

// Team rankings for client components.
//
// The full list (365 teams, every model, every composite variant) is about 1 MB, so it is no longer
// embedded in every page. Instead:
//  - Pages that need a few teams pass them from the server: <RankingsProvider initial={subset}>
//    (team pages: the team and its opponents). useRankings() returns that subset, no waiting.
//  - Pages that need everything (the rankings table) render inside <RankingsGate>, which shows a
//    loader, fetches /api/rankings once in the browser (cached), then renders its children.
//  - useAllRankings() never waits: [] until the full list has loaded (header search, abbreviations).
import { CompiledTeamData } from '@/lib/shared';
import { createContext, Suspense, use, useContext, useSyncExternalStore } from 'react';

const RankingsContext = createContext<CompiledTeamData[] | null>(null);

let allPromise: Promise<CompiledTeamData[]> | null = null;
let allLoaded: CompiledTeamData[] | null = null;
/** Fetches the full rankings once per page load (the response is HTTP-cached too). */
export function loadAllRankings(): Promise<CompiledTeamData[]> {
	allPromise ??= fetch('/api/rankings')
		.then(r => {
			if (!r.ok) throw new Error(`rankings ${r.status}`);
			return r.json() as Promise<CompiledTeamData[]>;
		})
		.then(data => (allLoaded = data))
		.catch(e => {
			allPromise = null; // let a later render retry
			throw e;
		});
	return allPromise;
}

export function RankingsProvider({ initial, children }: { initial?: CompiledTeamData[]; children: React.ReactNode }) {
	return <RankingsContext.Provider value={initial ?? null}>{children}</RankingsContext.Provider>;
}

/** Rankings for this page: the server-provided subset if there is one, else the full list (waits). */
export function useRankings(): CompiledTeamData[] {
	const initial = useContext(RankingsContext);
	if (initial) return initial;
	return use(loadAllRankings());
}

/** The full list without waiting: [] until it has loaded. Starts the load on first use. */
const EMPTY: CompiledTeamData[] = [];
const listeners = new Set<() => void>();
function subscribeAll(cb: () => void) {
	listeners.add(cb);
	if (!allLoaded) loadAllRankings().then(() => listeners.forEach(l => l()), () => {});
	return () => listeners.delete(cb);
}
export function useAllRankings(): CompiledTeamData[] {
	return useSyncExternalStore(subscribeAll, () => allLoaded ?? EMPTY, () => EMPTY);
}

const subscribe = () => () => {};
/** Renders `fallback` on the server and until the full rankings have loaded in the browser. */
export function RankingsGate({ fallback, children }: { fallback: React.ReactNode; children: React.ReactNode }) {
	const isClient = useSyncExternalStore(subscribe, () => true, () => false);
	if (!isClient) return fallback;
	return (
		<Suspense fallback={fallback}>
			<FullRankings>{children}</FullRankings>
		</Suspense>
	);
}
function FullRankings({ children }: { children: React.ReactNode }) {
	const data = use(loadAllRankings());
	return <RankingsProvider initial={data}>{children}</RankingsProvider>;
}
