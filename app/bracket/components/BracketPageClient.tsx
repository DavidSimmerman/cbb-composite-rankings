'use client';

import dynamic from 'next/dynamic';

const BracketClient = dynamic(() => import('./BracketClient'), { ssr: false });

export default function BracketPageClient() {
	return (
		<div className="h-full flex flex-col">
			<div className="flex-1 min-h-0">
				<BracketClient />
			</div>
		</div>
	);
}
