'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { MarchProfileCards } from '@/components/march/MarchCards';

export default function MarchProfile() {
	const profile = useTeamProfile();
	const analysis = profile.march_analysis;

	if (!analysis || analysis.seed_line.avg_seed === null) {
		return null;
	}

	return <MarchProfileCards analysis={analysis} showTitle factorsHref="/march/factors" />;
}
