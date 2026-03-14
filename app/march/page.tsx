import type { Metadata } from 'next';
import Header from '@/components/Header';
import { getMarchPageData } from '@/lib/rankings/profile';
import MarchPageClient from './components/MarchPageClient';

export const metadata: Metadata = {
	title: 'March Madness Tournament Analysis — NCAA Tournament Team Profiles & Style Factors',
	description:
		'March Madness tournament analysis tool. See which NCAA tournament teams have the style factors that historically win in the bracket. Combines KenPom, Evan Miya, and Bart Torvik data with historical tournament outcomes.',
	openGraph: {
		title: 'March Madness Tournament Analysis',
		description:
			'NCAA tournament team profiles and style factor analysis. Discover which teams have what it takes to win in March Madness.',
	},
};

export default async function MarchPage() {
	const data = await getMarchPageData();

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<h1 className="sr-only">March Madness Tournament Analysis — NCAA Tournament Team Profiles</h1>
			<p className="sr-only">
				Analyze NCAA tournament teams with style factor profiles that predict March Madness success.
				Combines KenPom, Evan Miya, and Bart Torvik data with historical tournament outcomes
				to identify which teams have the traits that win in the bracket.
			</p>
			<div className="flex-1 min-h-0 overflow-hidden">
				<MarchPageClient data={data} />
			</div>
		</div>
	);
}
