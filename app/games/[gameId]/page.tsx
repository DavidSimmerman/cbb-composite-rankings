import type { Metadata } from 'next';
import { cache } from 'react';
import Header from '@/components/Header';
import { getGamePageData } from '@/lib/games/game-page';
import GameView from './components/GameView';

export const dynamic = 'force-dynamic';

// generateMetadata and the page share one load per request
const load = cache(getGamePageData);

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
	const { gameId } = await params;
	const { title } = await load(gameId);
	const { away, home } = title;

	return {
		title: `${away} vs ${home} — Game Prediction & Matchup Analysis`,
		description: `${away} vs ${home} college basketball game prediction and matchup analysis. AI-powered win probability, composite ratings from KenPom, EvanMiya, BartTorvik, and historical matchup data.`,
		openGraph: {
			title: `${away} vs ${home}`,
			description: `Game prediction and matchup analysis for ${away} vs ${home}.`
		}
	};
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
	const { gameId } = await params;
	const data = await load(gameId);

	return (
		<div className="relative h-dvh flex flex-col overflow-hidden bg-[#07080f] text-slate-300 font-grotesk">
			<Header />
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data.jsonLd) }} />
			<div className="relative flex-1 min-h-0 overflow-auto overflow-x-hidden">
				<div className="max-w-[1180px] w-full mx-auto px-3 md:px-6 pb-8 md:pb-12">
					<GameView data={data} />
				</div>
			</div>
		</div>
	);
}
