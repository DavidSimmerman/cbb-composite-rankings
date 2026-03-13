'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import GamePrediction from '@/components/games/GamePrediction';

interface BracketGamePredictionProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
}

export default function BracketGamePrediction({ teamA, teamB }: BracketGamePredictionProps) {
	return (
		<GamePrediction
			teamAKey={teamA.team_key}
			teamBKey={teamB.team_key}
			teamAName={teamA.team_name}
			teamBName={teamB.team_name}
			teamAAbbr={teamA.abbreviation}
			teamBAbbr={teamB.abbreviation}
			teamAColor={`#${teamA.color}`}
			teamBColor={`#${teamB.color}`}
		/>
	);
}
