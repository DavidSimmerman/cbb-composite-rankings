import { getRankings } from '@/lib/rankings/rankings';
import { RankingsPromiseProvider } from '../context/RankingsContext';

export default function RankingsLoader({ children }: { children: React.ReactNode }) {
	const rankingsPromise = getRankings();

	return <RankingsPromiseProvider rankingsPromise={rankingsPromise}>{children}</RankingsPromiseProvider>;
}
