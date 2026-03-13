'use client';

import { useGame } from '@/app/context/GameContext';
import { pickBarColors } from '@/app/games/[gameId]/components/GameBoxScore';
import GamePredictionShared from '@/components/games/GamePrediction';

export default function GamePrediction() {
	const { game } = useGame();

	const awayKey = game.teams.away.team_key;
	const homeKey = game.teams.home.team_key;
	const awayAbbr = game.teams.away.metadata?.abbreviation ?? (game.teams.away.name || 'Away');
	const homeAbbr = game.teams.home.metadata?.abbreviation ?? (game.teams.home.name || 'Home');
	const awayName = game.teams.away.profile?.team_name ?? (game.teams.away.name || 'Away');
	const homeName = game.teams.home.profile?.team_name ?? (game.teams.home.name || 'Home');
	const awayPrimary = game.teams.away.metadata ? `#${game.teams.away.metadata.color}` : '#6b7280';
	const homePrimary = game.teams.home.metadata ? `#${game.teams.home.metadata.color}` : '#ef4444';
	const awaySecondary = game.teams.away.metadata ? `#${game.teams.away.metadata.secondary_color}` : '#9ca3af';
	const homeSecondary = game.teams.home.metadata ? `#${game.teams.home.metadata.secondary_color}` : '#fca5a5';
	const isFinal = game.status === 'final';

	return (
		<div className="mt-4">
			<GamePredictionShared
				teamAKey={homeKey}
				teamBKey={awayKey}
				teamAName={awayName}
				teamBName={homeName}
				teamAAbbr={awayAbbr}
				teamBAbbr={homeAbbr}
				teamAColor={awayPrimary}
				teamBColor={homePrimary}
				isFinal={isFinal}
				pickColors={(a, b) => pickBarColors(a, awaySecondary, b, homeSecondary)}
			/>
		</div>
	);
}
