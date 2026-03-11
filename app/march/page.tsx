import Header from '@/components/Header';
import { getMarchPageData } from '@/lib/rankings/profile';
import MarchPageClient from './components/MarchPageClient';

export default async function MarchPage() {
	const data = await getMarchPageData();

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<div className="flex-1 min-h-0 overflow-hidden">
				<MarchPageClient data={data} />
			</div>
		</div>
	);
}
