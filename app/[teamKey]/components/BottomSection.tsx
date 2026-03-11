'use client';

import dynamic from 'next/dynamic';
import { twMerge } from 'tailwind-merge';
import TeamHistory from './TeamHistory';

const MarchProfile = dynamic(() => import('./MarchProfile'), { ssr: false });

export default function BottomSection({ className }: { className?: string }) {
	return (
		<div className={twMerge('flex flex-col gap-3 md:gap-6', className)}>
			<TeamHistory />
			<MarchProfile />
		</div>
	);
}
