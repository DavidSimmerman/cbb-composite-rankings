'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { MarchProfileCards } from '@/components/march/MarchCards';
import { seasonLabel } from '@/lib/season';

// Seed projections aren't meaningful until conference play is underway
const MARCH_PROFILE_OPENS = { month: 1, day: 1 }; // Feb 1 (0-based month)

export default function MarchProfile() {
	const profile = useTeamProfile();
	const analysis = profile.march_analysis;

	if (profile.season !== profile.latest_season) return null;

	const opens = new Date(Date.UTC(2000 + profile.season, MARCH_PROFILE_OPENS.month, MARCH_PROFILE_OPENS.day));
	if (new Date() < opens) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-2xl font-bold text-neutral-600">March Profile</div>
				<div className="mt-3 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-800 py-10 text-center">
					<div className="text-base font-medium text-neutral-300">Come back later in the season</div>
					<div className="max-w-md text-sm text-muted-foreground">
						The {seasonLabel(profile.season)} March profile opens{' '}
						{opens.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}, once there are enough
						games for seed projections to mean something.
					</div>
				</div>
			</div>
		);
	}

	if (!analysis || analysis.seed_line.avg_seed === null) {
		return null;
	}

	return <MarchProfileCards analysis={analysis} showTitle factorsHref="/march/factors" />;
}
