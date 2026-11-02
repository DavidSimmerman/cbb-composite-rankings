'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { useState } from 'react';
import MarchProfile, { marchState } from './MarchProfile';
import OverviewTab from './OverviewTab';
import StatsTab from './StatsTab';
import TeamHistory from './TeamHistory';
import { type Tab, TABS } from './tabs';
import TeamSchedule from './TeamSchedule';
import { useTeamView } from './useTeamView';

const LABELS: Record<Tab, string> = {
	overview: 'Overview',
	stats: 'Stats',
	schedule: 'Schedule',
	history: 'History',
	march: 'March'
};

// Tab bar (underlined in the team's colour) and the open tab. The tab lives in the URL (?tab=stats)
// so it survives a reload and can be linked; switching only rewrites the URL, no server round trip.
export default function TeamTabs({ initialTab }: { initialTab: Tab }) {
	const profile = useTeamProfile();
	const { tone } = useTeamView();
	const tabs = TABS.filter(t => t !== 'march' || marchState(profile) !== 'hidden');
	const [tab, setTab] = useState<Tab>(tabs.includes(initialTab) ? initialTab : 'overview');

	function select(t: Tab) {
		setTab(t);
		const url = new URL(window.location.href);
		if (t === 'overview') url.searchParams.delete('tab');
		else url.searchParams.set('tab', t);
		window.history.replaceState(null, '', url.pathname + url.search);
	}

	return (
		<>
			<div className="sticky top-0 z-30 mt-4 lg:mt-5 bg-[#07080f]/85 backdrop-blur-md">
				<div
					role="tablist"
					className="flex gap-0.5 lg:gap-1 overflow-x-auto border-b border-white/[0.07] px-2 lg:px-6 text-[13px] lg:text-[13.5px]"
				>
					{tabs.map(t => (
						<button
							key={t}
							role="tab"
							aria-selected={tab === t}
							onClick={() => select(t)}
							className={`shrink-0 px-3 lg:px-3.5 py-2.5 -mb-px border-b-2 cursor-pointer transition-colors ${tab === t ? 'text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
							style={tab === t ? { borderColor: tone } : undefined}
						>
							{LABELS[t]}
						</button>
					))}
				</div>
			</div>
			<div className={tab === 'schedule' ? 'py-4 lg:p-6' : 'p-4 lg:p-6'}>
				{tab === 'overview' && <OverviewTab />}
				{tab === 'stats' && <StatsTab />}
				{tab === 'schedule' && <TeamSchedule />}
				{tab === 'history' && <TeamHistory />}
				{tab === 'march' && <MarchProfile />}
			</div>
		</>
	);
}
