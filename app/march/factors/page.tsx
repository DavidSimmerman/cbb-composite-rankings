import Link from 'next/link';
import Header from '@/components/Header';
import { getMarchPageData } from '@/lib/rankings/profile';
import FactorExplorer from '../components/FactorExplorer';

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
				</div>
				<div className="flex-1 min-h-0">
					<FactorExplorer data={data} />
				</div>
			</div>
		</div>
	);
}
