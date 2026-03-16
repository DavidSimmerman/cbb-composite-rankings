import type { Metadata } from 'next';
import { GameContextProvider } from '@/app/context/GameContext';
import Header from '@/components/Header';
import { getGame } from '@/lib/espn/espn-game';
import { getTeamRanksMap } from '@/lib/rankings/ranks-map';
import GameBoxScore from './components/GameBoxScore';
import GameDeltas from './components/GameDeltas';
import GameHeader from './components/GameHeader';
import GamePrediction from './components/GamePrediction';
import GameStatsComparison from './components/GameStatsComparison';
import MatchupComparison from './components/MatchupComparison';
import SimilarGames from './components/SimilarGames';

export async function generateMetadata({ params }: { params: { gameId: string } }): Promise<Metadata> {
	const { gameId } = await params;
	const game = await getGame(gameId);
	const away = game.teams.away.name;
	const home = game.teams.home.name;

	return {
		title: `${away} vs ${home} — Game Prediction & Matchup Analysis`,
		description: `${away} vs ${home} college basketball game prediction and matchup analysis. AI-powered win probability, composite ratings from KenPom, EvanMiya, BartTorvik, and historical matchup data.`,
		openGraph: {
			title: `${away} vs ${home}`,
			description: `Game prediction and matchup analysis for ${away} vs ${home}.`,
		},
	};
}

export default async function GamePage({ params }: { params: { gameId: string } }) {
	const { gameId } = await params;

	const [game, ranksMap] = await Promise.all([getGame(gameId), getTeamRanksMap()]);

	console.log(game);

	const gameJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'SportsEvent',
		name: `${game.teams.away.name} vs ${game.teams.home.name}`,
		url: `https://cbbcomposite.com/games/${gameId}`,
		startDate: game.date,
		homeTeam: { '@type': 'SportsTeam', name: game.teams.home.name },
		awayTeam: { '@type': 'SportsTeam', name: game.teams.away.name },
		sport: 'Basketball',
		...(game.status === 'final' && {
			eventStatus: 'https://schema.org/EventScheduled',
		}),
	};

	return (
		<GameContextProvider gameId={gameId} game={game} ranksMap={ranksMap}>
			<div className="h-dvh flex flex-col">
				<Header />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd) }}
				/>
				<div className="max-w-340 w-full mx-auto px-2 md:px-4 pb-4 md:pb-8">
					<GameHeader />
					{game.status !== 'final' && <GamePrediction />}
					{game.status === 'final' && <GameDeltas />}
					{game.status !== 'not started' && <GameBoxScore />}
					{game.status !== 'not started' && <GameStatsComparison />}
					<MatchupComparison />
					<SimilarGames />
					{game.status === 'final' && <GamePrediction />}
				</div>
			</div>
		</GameContextProvider>
	);
}
