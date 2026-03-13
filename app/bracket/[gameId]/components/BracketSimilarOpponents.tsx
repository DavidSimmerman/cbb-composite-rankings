'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import SimilarOpponents from '@/components/games/SimilarOpponents';
import type { CategoryData } from '@/components/games/SimilarOpponents';
import { useEffect, useState } from 'react';

interface ApiGameResult {
	game_id: string;
	opp_team_key: string;
	opp_abbreviation: string;
	score: number;
	won: boolean | undefined;
	game_score: string | undefined;
	home_away: 'home' | 'away' | 'neutral';
	away_team_key: string;
	home_team_key: string;
	away_score: number | null;
	home_score: number | null;
	away_won: boolean | null;
}

interface ApiCategoryResult {
	key: string;
	label: string;
	games: ApiGameResult[];
	wins: number;
	losses: number;
}

interface ApiTeamResult {
	team_key: string;
	categories: ApiCategoryResult[];
}

interface ApiSimilarData {
	teamA: ApiTeamResult;
	teamB: ApiTeamResult;
}

interface BracketSimilarOpponentsProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
}

function transformCategories(apiCategories: ApiCategoryResult[]): CategoryData[] {
	return apiCategories.map(cat => ({
		key: cat.key,
		label: cat.label,
		wins: cat.wins,
		losses: cat.losses,
		games: cat.games.map(g => ({
			game_id: g.game_id,
			away_team_key: g.away_team_key,
			home_team_key: g.home_team_key,
			away_score: g.away_score ?? 0,
			home_score: g.home_score ?? 0,
			away_won: g.away_won === true,
			score: g.score,
			won: g.won === true,
		})),
	}));
}

export default function BracketSimilarOpponents({ teamA, teamB }: BracketSimilarOpponentsProps) {
	const [data, setData] = useState<ApiSimilarData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const res = await fetch(`/api/games/similar?teamA=${teamA.team_key}&teamB=${teamB.team_key}`);
				if (!res.ok) return;
				const json = await res.json();
				if (json.error) return;
				setData(json);
			} catch {
				// Silently fail
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [teamA.team_key, teamB.team_key]);

	if (loading) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-lg font-bold text-neutral-600 mb-4">Similar Opponents</div>
				<div className="animate-pulse space-y-3">
					<div className="h-6 bg-neutral-800 rounded-full" />
					<div className="h-20 bg-neutral-800 rounded" />
				</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<SimilarOpponents
			teamAName={teamA.team_name}
			teamBName={teamB.team_name}
			teamAAbbr={teamA.abbreviation}
			teamBAbbr={teamB.abbreviation}
			teamAColor={`#${teamA.color}`}
			teamBColor={`#${teamB.color}`}
			teamACategories={transformCategories(data.teamA.categories)}
			teamBCategories={transformCategories(data.teamB.categories)}
		/>
	);
}
