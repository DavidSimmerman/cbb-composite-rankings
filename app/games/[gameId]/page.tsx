import { GameContextProvider } from '@/app/context/GameContext';
import Header from '@/components/Header';
import { getGame } from '@/lib/espn/espn-game';
import GameDeltas from './components/GameDeltas';
import GameHeader from './components/GameHeader';
import GameStatsComparison from './components/GameStatsComparison';
import MatchupComparison from './components/MatchupComparison';

export default async function GamePage({ params }: { params: { gameId: string } }) {
	const { gameId } = await params;

	const game = await getGame(gameId);

	console.log(game);

	return (
		<GameContextProvider game={game}>
			<div className="h-dvh flex flex-col">
				<Header />

				<div className="max-w-340 w-full mx-auto px-2 md:px-4 pb-4 md:pb-8">
					<GameHeader />
					{game.status === 'final' && (
						<>
							<GameDeltas />
							<GameStatsComparison />
						</>
					)}
					<MatchupComparison />
				</div>
			</div>
		</GameContextProvider>
	);
}
