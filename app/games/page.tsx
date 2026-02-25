import Header from '@/components/Header';
import { getScoreboard, type ScoreboardGame, type ScoreboardGameEnriched } from '@/lib/espn/scoreboard';
import { getRankings } from '@/lib/rankings/rankings';
import ScoreboardView from './components/ScoreboardView';

function formatDateParam(date?: string): string {
	if (date && /^\d{8}$/.test(date)) return date;
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}${m}${d}`;
}

function enrichGames(games: ScoreboardGame[], rankings: any[]): ScoreboardGameEnriched[] {
	const ratingMap = new Map<string, number>();
	for (const team of rankings) {
		ratingMap.set(team.team_key, team.avg_zscore_rank);
	}

	return games.map(game => {
		const homeRating = game.homeTeam.teamKey ? ratingMap.get(game.homeTeam.teamKey) : undefined;
		const awayRating = game.awayTeam.teamKey ? ratingMap.get(game.awayTeam.teamKey) : undefined;

		const ratingsAvailable = homeRating !== undefined && awayRating !== undefined;
		const highestRating = ratingsAvailable ? Math.min(homeRating, awayRating) : 999;
		const averageRating = ratingsAvailable ? (homeRating + awayRating) / 2 : 999;

		let spread = 999;
		if (game.status.state !== 'pre' && game.homeTeam.score !== undefined && game.awayTeam.score !== undefined) {
			spread = Math.abs(game.homeTeam.score - game.awayTeam.score);
		} else if (ratingsAvailable) {
			spread = Math.abs(homeRating - awayRating);
		}

		return {
			...game,
			homeTeamRating: homeRating,
			awayTeamRating: awayRating,
			highestRating,
			averageRating,
			spread,
		};
	});
}

export default async function GamesPage({ searchParams }: { searchParams: { date?: string } }) {
	const { date } = await searchParams;
	const dateParam = formatDateParam(date);

	const [games, rankings] = await Promise.all([getScoreboard(dateParam), getRankings()]);

	const enrichedGames = enrichGames(games, rankings);

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<div className="max-w-340 w-full mx-auto px-2 md:px-4 pb-4 md:pb-8">
				<ScoreboardView games={enrichedGames} currentDate={dateParam} />
			</div>
		</div>
	);
}
