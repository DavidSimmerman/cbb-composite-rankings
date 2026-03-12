'use client';

import type { BracketPageData } from '@/lib/rankings/profile';
import dynamic from 'next/dynamic';

const BracketClient = dynamic(() => import('./BracketClient'), { ssr: false });

export default function BracketPageClient({ data }: { data: BracketPageData }) {
	return (
		<div className="h-full flex flex-col">
			<div className="flex-1 min-h-0">
				<BracketClient data={data} />
			</div>
		</div>
	);
}
