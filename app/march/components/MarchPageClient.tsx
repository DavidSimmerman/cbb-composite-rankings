'use client';

import { MarchPageData } from '@/lib/rankings/profile';
import dynamic from 'next/dynamic';

const TournamentTeams = dynamic(() => import('./TournamentTeams'), { ssr: false });

export default function MarchPageClient({ data }: { data: MarchPageData }) {
	return (
		<div className="h-full flex flex-col">
			<div className="flex-1 min-h-0">
				<TournamentTeams data={data} />
			</div>
		</div>
	);
}
