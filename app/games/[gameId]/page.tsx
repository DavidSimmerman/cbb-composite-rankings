import { GameContextProvider } from '@/app/context/GameContext';
import Header from '@/components/Header';
import { getGame } from '@/lib/espn/espn-game';
import { getTeamRanksMap } from '@/lib/rankings/ranks-map';
import GameBoxScore from './components/GameBoxScore';
import GameDeltas from './components/GameDeltas';
import GameHeader from './components/GameHeader';
import GameStatsComparison from './components/GameStatsComparison';
import MatchupComparison from './components/MatchupComparison';
import SimilarGames from './components/SimilarGames';

export default async function GamePage({ params }: { params: { gameId: string } }) {
	const { gameId } = await params;

	const [game, ranksMap] = await Promise.all([getGame(gameId), getTeamRanksMap()]);

	console.log(game);

	return (
		<GameContextProvider gameId={gameId} game={game} ranksMap={ranksMap}>
			<div className="h-dvh flex flex-col">
				<Header />

				<div className="max-w-340 w-full mx-auto px-2 md:px-4 pb-4 md:pb-8">
					<GameHeader />
					{game.status === 'final' && <GameDeltas />}
					{game.status !== 'not started' && <GameBoxScore />}
				{game.status !== 'not started' && <GameStatsComparison />}
					<MatchupComparison />
					<SimilarGames />
				</div>
			</div>
		</GameContextProvider>
	);
}
