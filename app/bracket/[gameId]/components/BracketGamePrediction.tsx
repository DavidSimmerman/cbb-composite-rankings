'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import type { BracketPrediction } from '@/lib/rankings/profile';
import { useBracket } from '../../context/BracketContext';
import GamePrediction from '@/components/games/GamePrediction';

interface BracketGamePredictionProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
	round: number;
}

export default function BracketGamePrediction({ teamA, teamB, round }: BracketGamePredictionProps) {
	const { data } = useBracket();
	const pred = lookupPrediction(data.predictions, teamA.team_key, teamB.team_key, round);

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
			preCalculated={pred ? {
				probA: pred.prob_a, probB: pred.prob_b, margin: pred.predicted_margin,
				scoreA: pred.predicted_score_a, scoreB: pred.predicted_score_b,
				keysA: pred.keys_a, keysB: pred.keys_b,
			} : undefined}
		/>
	);
}

function lookupPrediction(
	predictions: Record<string, BracketPrediction>,
	teamAKey: string,
	teamBKey: string,
	round: number,
): BracketPrediction | null {
	const [first, second] = [teamAKey, teamBKey].sort();
	const key = `${first}-vs-${second}-r${round}`;
	const pred = predictions[key];
	if (!pred) return null;
	if (first === teamAKey) return pred;
	return {
		prob_a: pred.prob_b, prob_b: pred.prob_a, predicted_margin: -pred.predicted_margin,
		predicted_score_a: pred.predicted_score_b, predicted_score_b: pred.predicted_score_a,
		keys_a: pred.keys_b, keys_b: pred.keys_a,
	};
}
