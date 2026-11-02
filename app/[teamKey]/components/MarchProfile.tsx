'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { MarchProfileCards } from '@/components/march/MarchCards';
import type { ParsedTeamProfile } from '@/lib/rankings/profile';
import { seasonLabel } from '@/lib/season';
import { Lock } from 'lucide-react';

// Seed projections aren't meaningful until conference play is underway
const MARCH_PROFILE_OPENS = { month: 1, day: 1 }; // Feb 1 (0-based month)

const opensOn = (season: number) => new Date(Date.UTC(2000 + season, MARCH_PROFILE_OPENS.month, MARCH_PROFILE_OPENS.day));

/** hidden: past seasons, or a team with no bracket projection; locked: before Feb 1; ready: show it */
export function marchState(profile: ParsedTeamProfile): 'hidden' | 'locked' | 'ready' {
	if (profile.season !== profile.latest_season) return 'hidden';
	if (new Date() < opensOn(profile.season)) return 'locked';
	const analysis = profile.march_analysis;
	return analysis && analysis.seed_line.avg_seed !== null ? 'ready' : 'hidden';
}

// The shared March cards (also on /march) in the team page's Aurora card style
const AURORA =
	'[&_.border-neutral-800]:border-white/10 [&_.border-neutral-800\\/50]:border-white/[0.05] [&_.rounded-lg]:rounded-xl [&_.rounded-lg]:bg-white/[0.02] ' +
	'[&_.bg-neutral-800]:bg-white/[0.06] [&_.text-neutral-300]:text-slate-300 [&_.text-neutral-400]:text-slate-400 [&_.text-neutral-500]:text-slate-500 ' +
	'[&_.font-bold.text-neutral-600]:text-white [&_.font-bold.text-neutral-600]:font-semibold [&_.font-bold.text-neutral-600]:text-[15px]';

export default function MarchProfile() {
	const profile = useTeamProfile();
	const state = marchState(profile);

	if (state === 'locked') {
		const opens = opensOn(profile.season);
		return (
			<div className="rounded-xl border border-dashed border-white/10 px-4 py-8 flex flex-col items-center text-center gap-2">
				<div className="size-9 grid place-items-center rounded-lg bg-white/[0.04]">
					<Lock className="size-[15px] text-slate-400" />
				</div>
				<div className="text-white font-medium text-[14px]">Come back later in the season</div>
				<div className="max-w-md text-[12.5px] text-slate-500">
					The {seasonLabel(profile.season)} March profile (seed line, historical comps and style factors) opens{' '}
					{opens.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}, once there are
					enough games for seed projections to mean something.
				</div>
			</div>
		);
	}

	if (state !== 'ready') return null;

	return (
		<div className={AURORA}>
			<MarchProfileCards analysis={profile.march_analysis!} factorsHref="/march/factors" />
		</div>
	);
}
