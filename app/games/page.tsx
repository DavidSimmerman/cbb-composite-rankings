import type { Metadata } from 'next';
import Header from '@/components/Header';
import { getScoreboardData } from '@/lib/games/scoreboard-data';
import ScoreboardView from './components/ScoreboardView';

export const metadata: Metadata = {
	title: 'College Basketball Scoreboard — NCAA Game Scores & Predictions',
	description:
		'Live college basketball scoreboard with NCAA game scores, AI-powered predictions, and matchup analysis. Powered by KenPom, Evan Miya, Bart Torvik, and NET ratings.',
	openGraph: {
		title: 'College Basketball Scoreboard',
		description: 'NCAA basketball scores with AI game predictions and composite ratings analysis.'
	}
};

export const dynamic = 'force-dynamic';

function formatDateParam(date?: string): string {
	if (date && /^\d{8}$/.test(date)) return date;
	// Before 3 AM ET, show the previous day's games
	const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
	if (now.getHours() < 3) {
		now.setDate(now.getDate() - 1);
	}
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}${m}${d}`;
}

export default async function GamesPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
	const { date } = await searchParams;
	const data = await getScoreboardData(formatDateParam(date));

	return (
		<div className="relative h-dvh flex flex-col overflow-hidden bg-[#07080f] text-slate-300 font-grotesk">
			<div className="pointer-events-none absolute -top-48 left-1/3 w-[700px] h-[300px] rounded-full bg-violet-500/[0.07] blur-[120px]" />
			<Header />
			<div className="relative flex-1 min-h-0 overflow-auto">
				<div className="max-w-340 w-full mx-auto px-3 md:px-6 pb-6 md:pb-10">
					<ScoreboardView data={data} />
				</div>
			</div>
		</div>
	);
}
