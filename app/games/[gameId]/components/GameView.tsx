'use client';

import type { GamePageData } from '@/lib/games/game-page';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import BoxScoreTab from './BoxScoreTab';
import GameHeader from './GameHeader';
import MatchupTab from './MatchupTab';
import PreviewTab from './PreviewTab';
import SimilarTab from './SimilarTab';

type Tab = 'Preview' | 'Box score' | 'Matchup' | 'Similar';

export default function GameView({ data }: { data: GamePageData }) {
	const router = useRouter();
	const tabs: Tab[] = data.phase === 'pre' ? ['Preview', 'Matchup', 'Similar'] : ['Preview', 'Box score', 'Matchup', 'Similar'];
	const [picked, setTab] = useState<Tab>('Preview');
	const tab = tabs.includes(picked) ? picked : 'Preview';

	// Live games: refresh the server data every 30 seconds while the tab is visible
	useEffect(() => {
		if (data.phase !== 'live') return;
		const t = setInterval(() => {
			if (document.visibilityState === 'visible') router.refresh();
		}, 30_000);
		return () => clearInterval(t);
	}, [data.phase, router]);

	return (
		<div className="relative">
			<div
				className="pointer-events-none absolute -top-40 -left-16 md:left-0 w-[260px] h-[200px] md:w-[520px] md:h-[300px] rounded-full blur-[110px]"
				style={{ background: `${data.away.color}30` }}
			/>
			<div
				className="pointer-events-none absolute -top-40 -right-16 md:right-0 w-[260px] h-[200px] md:w-[520px] md:h-[300px] rounded-full blur-[110px]"
				style={{ background: `${data.home.color}26` }}
			/>
			<div className="relative">
				<GameHeader data={data} />
				<div role="tablist" className="mt-4 md:mt-5 flex gap-1 text-[13.5px] border-b border-white/[0.06] overflow-x-auto">
					{tabs.map(t => (
						<button
							key={t}
							role="tab"
							aria-selected={tab === t}
							onClick={() => setTab(t)}
							className={`shrink-0 px-3 md:px-3.5 py-2.5 -mb-px border-b-2 cursor-pointer transition-colors ${tab === t ? 'border-violet-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
						>
							{t}
						</button>
					))}
				</div>
				<div className="pt-3 md:pt-6">
					{tab === 'Preview' && <PreviewTab data={data} />}
					{tab === 'Box score' && <BoxScoreTab data={data} />}
					{tab === 'Matchup' && <MatchupTab data={data} />}
					{tab === 'Similar' && <SimilarTab data={data} />}
				</div>
			</div>
		</div>
	);
}
