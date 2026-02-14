import { getRankings } from '@/lib/rankings/rankings';
import { RankingsPromiseProvider } from '../context/RankingsContext';

export default function RankingsLoader({ isNewSession, children }: { isNewSession: boolean; children: React.ReactNode }) {
	// This timeout is just to show off the loading animation cuz I think it looks really cool :)
	const rankingsPromise = isNewSession
		? Promise.all([getRankings(), new Promise(res => setTimeout(res, 1500))]).then(([rankings]) => rankings)
		: getRankings();

	return <RankingsPromiseProvider rankingsPromise={rankingsPromise}>{children}</RankingsPromiseProvider>;
}
