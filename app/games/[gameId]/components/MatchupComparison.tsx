'use client';

import { useGame } from '@/app/context/GameContext';
import TeamComparison from '@/components/games/TeamComparison';
import { useMemo } from 'react';

export default function MatchupComparison() {
	const { game } = useGame();

	const { awayRatings, homeRatings } = useMemo(() => {
		const awayRatings = (() => {
			if (!game.teams.away.profile) return undefined;
			const season = Object.keys(game.teams.away.profile.full_ratings).sort().at(-1)!;
			return game.teams.away.profile.full_ratings[season];
		})();
		const homeRatings = (() => {
			if (!game.teams.home.profile) return undefined;
			const season = Object.keys(game.teams.home.profile.full_ratings).sort().at(-1)!;
			return game.teams.home.profile.full_ratings[season];
		})();
		return { awayRatings, homeRatings };
	}, [game]);

	const awayName = game.teams.away.profile?.team_name ?? (game.teams.away.name || 'Away');
	const homeName = game.teams.home.profile?.team_name ?? (game.teams.home.name || 'Home');
	const awayAbbr = game.teams.away.metadata?.abbreviation ?? (game.teams.away.name || 'Away');
	const homeAbbr = game.teams.home.metadata?.abbreviation ?? (game.teams.home.name || 'Home');
	const awayMetadata = game.teams.away.metadata;
	const homeMetadata = game.teams.home.metadata;

	if (!awayRatings || !homeRatings || !awayMetadata || !homeMetadata) {
		return (
			<div className="mt-4 border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-2xl font-bold text-neutral-600 mb-4">Team Comparison</div>
				<div className="text-sm text-neutral-500">No data available for one or both teams</div>
			</div>
		);
	}

	return (
		<div className="mt-4">
			<TeamComparison
				teamAName={awayName}
				teamBName={homeName}
				teamAAbbr={awayAbbr}
				teamBAbbr={homeAbbr}
				teamAColor={`#${awayMetadata.color}`}
				teamBColor={`#${homeMetadata.color}`}
				teamASecondaryColor={`#${awayMetadata.secondary_color}`}
				teamBSecondaryColor={`#${homeMetadata.secondary_color}`}
				teamARatings={awayRatings as unknown as Record<string, number>}
				teamBRatings={homeRatings as unknown as Record<string, number>}
			/>
		</div>
	);
}
