import Header from '@/components/Header';
import { getBracketPageData } from '@/lib/rankings/profile';
import BracketPageClient from './components/BracketPageClient';

export default async function BracketPage() {
	const data = await getBracketPageData();

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<div className="flex-1 min-h-0 overflow-hidden">
				<BracketPageClient data={data} />
			</div>
		</div>
	);
}
