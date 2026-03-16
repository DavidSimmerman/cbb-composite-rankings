import type { Metadata } from 'next';
import Header from '@/components/Header';
import { getBracketPageData } from '@/lib/rankings/profile';
import BracketLayoutClient from './components/BracketLayoutClient';

export const metadata: Metadata = {
	title: 'NCAA Tournament Bracket Predictor — AI-Powered March Madness Bracket Builder',
	description:
		'Build your NCAA tournament bracket with AI-powered predictions. Get bracket suggestions using machine learning, historical seed matchup data, KenPom and BartTorvik ratings, and March Madness style analysis. Simulate brackets and optimize for realism.',
	openGraph: {
		title: 'NCAA Tournament Bracket Predictor — AI Bracket Builder',
		description:
			'AI-powered March Madness bracket predictor. Get bracket suggestions based on ML predictions, historical seed data, and team ratings from KenPom, EvanMiya, and BartTorvik.',
	},
};

export default async function BracketLayout({ children }: { children: React.ReactNode }) {
	const data = await getBracketPageData();

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<h1 className="sr-only">NCAA Tournament Bracket Predictor — AI-Powered March Madness Bracket Builder</h1>
			<p className="sr-only">
				Build your March Madness bracket with AI-powered predictions and bracket suggestions.
				Uses machine learning trained on historical NCAA tournament data, combined with KenPom,
				Evan Miya, and Bart Torvik ratings to generate realistic bracket predictions.
			</p>
			<div className="flex-1 min-h-0 overflow-hidden">
				<BracketLayoutClient data={data}>
					{children}
				</BracketLayoutClient>
			</div>
		</div>
	);
}
