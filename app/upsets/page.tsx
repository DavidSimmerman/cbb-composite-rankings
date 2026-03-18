import type { Metadata } from 'next';
import Header from '@/components/Header';
import { getMarchPageData, getBracketPageData } from '@/lib/rankings/profile';
import UpsetsClient from './components/UpsetsClient';

export const metadata: Metadata = {
	title: 'Upset Watch — First Round NCAA Tournament Upset Predictions',
	description:
		'Which double-digit seeds are most likely to pull first-round upsets in the NCAA Tournament? Data-driven analysis of every 10-16 seed matchup using ratings, style factors, and historical comps.',
	openGraph: {
		title: 'Upset Watch — NCAA Tournament First Round Upsets',
		description:
			'Data-driven upset predictions for every double-digit seed in the NCAA Tournament bracket.',
	},
};

export default async function UpsetsPage() {
	const [marchData, bracketData] = await Promise.all([
		getMarchPageData(),
		getBracketPageData(),
	]);

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<h1 className="sr-only">Upset Watch — NCAA Tournament First Round Upset Predictions</h1>
			<div className="flex-1 min-h-0 overflow-auto">
				<UpsetsClient marchData={marchData} bracketData={bracketData} />
			</div>
		</div>
	);
}
