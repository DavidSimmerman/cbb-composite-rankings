import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { getMarchPageData } from '@/lib/rankings/profile';
import FactorExplorer from '../components/FactorExplorer';

export const metadata: Metadata = {
	title: 'March Madness Style Factors — What Wins in the NCAA Tournament',
	description:
		'Explore which style factors predict NCAA tournament success. Analyze 3-point rate, turnover rate, defensive efficiency, tempo, and more across historical March Madness brackets.',
	openGraph: {
		title: 'March Madness Style Factors',
		description: 'Which style factors predict NCAA tournament success? Explore historical March Madness data to find out.',
	},
};

export default async function FactorsPage() {
	const data = await getMarchPageData();

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
				<div className="px-2 md:px-4 pt-3 pb-2 max-w-340 w-full mx-auto">
					<Link
						href="/march"
						className="text-sm text-neutral-400 hover:text-white transition-colors"
					>
						&larr; Back to teams
					</Link>
					<h1 className="sr-only">March Madness Style Factors — What Wins in the NCAA Tournament</h1>
				</div>
				<div className="flex-1 min-h-0">
					<FactorExplorer data={data} />
				</div>
			</div>
		</div>
	);
}
