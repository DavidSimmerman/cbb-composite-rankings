'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { MarchProfileCards } from '@/components/march/MarchCards';

export default function MarchProfile() {
	const profile = useTeamProfile();
	const analysis = profile.march_analysis;

	if (!analysis) {
		return (
			<div className="border border-neutral-800 rounded-lg p-4">
				<div className="text-sm text-neutral-500">March analysis unavailable for this team.</div>
			</div>
		);
	}

	return <MarchProfileCards analysis={analysis} showTitle factorsHref="/march/factors" />;
}
