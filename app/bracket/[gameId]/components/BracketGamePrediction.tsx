'use client';

import type { BracketTeam } from '@/lib/bracket/predictions';
import TeamLogo from '@/components/TeamLogo';
import { useEffect, useState } from 'react';

interface KeyToGame {
	label: string;
	description: string;
	impact: number;
	advantage: 'team' | 'opponent' | 'neutral';
}

interface TeamPrediction {
	team_key: string;
	win_probability: number;
	predicted_score: number;
	keys_to_game: KeyToGame[];
}

interface PredictionData {
	home: TeamPrediction;
	away: TeamPrediction;
	predicted_spread: number;
	predicted_total: number;
	model_version: string;
}

interface BracketGamePredictionProps {
	teamA: BracketTeam;
	teamB: BracketTeam;
}

export default function BracketGamePrediction({ teamA, teamB }: BracketGamePredictionProps) {
	const [prediction, setPrediction] = useState<PredictionData | null>(null);
	const [loading, setLoading] = useState(true);
	const [mobileTeam, setMobileTeam] = useState<'a' | 'b'>('a');

	const colorA = `#${teamA.color}`;
	const colorB = `#${teamB.color}`;

	useEffect(() => {
		const fetchPrediction = async () => {
			try {
				const res = await fetch(`/api/games/predict?home=${teamA.team_key}&away=${teamB.team_key}`);
				if (!res.ok) return;
				const data = await res.json();
				if (data.error) return;
				setPrediction(data);
			} catch {
				// Silently fail
			} finally {
				setLoading(false);
			}
		};
		fetchPrediction();
	}, [teamA.team_key, teamB.team_key]);

	if (loading) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-lg font-bold text-neutral-600 mb-4">Game Prediction</div>
				<div className="animate-pulse space-y-3">
					<div className="h-6 bg-neutral-800 rounded-full" />
					<div className="h-4 bg-neutral-800 rounded w-1/2 mx-auto" />
				</div>
			</div>
		);
	}

	if (!prediction) return null;

	// teamA = home (first param), teamB = away (second param) in the API call
	const pctA = Math.round(prediction.home.win_probability * 100);
	const pctB = Math.round(prediction.away.win_probability * 100);

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-4">Game Prediction</div>

			{/* Win probability bar */}
			<div className="mb-1">
				<div className="flex justify-between text-sm font-medium text-white mb-2">
					<span>{teamA.abbreviation} {pctA}%</span>
					<span>{pctB}% {teamB.abbreviation}</span>
				</div>
				<div className="h-6 rounded-full overflow-hidden flex">
					<div className="h-full transition-all duration-500" style={{ width: `${pctA}%`, backgroundColor: colorA }} />
					<div className="h-full transition-all duration-500" style={{ width: `${pctB}%`, backgroundColor: colorB }} />
				</div>
			</div>

			{/* Predicted score */}
			<div className="flex justify-center mt-3 mb-4">
				<div className="text-center">
					<div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Predicted Score</div>
					<div className="text-xl font-bold text-white tabular-nums">
						{prediction.home.predicted_score} - {prediction.away.predicted_score}
					</div>
				</div>
			</div>

			{/* Keys to the Game */}
			{(prediction.away.keys_to_game.length > 0 || prediction.home.keys_to_game.length > 0) && (
				<div className="border-t border-neutral-800 pt-4">
					<div className="text-base font-bold text-neutral-500 mb-3">Keys to the Game</div>

					{/* Mobile toggle */}
					<div className="md:hidden flex border-b border-neutral-800 mb-4">
						<button
							onClick={() => setMobileTeam('a')}
							className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'a' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
							style={mobileTeam === 'a' ? { borderColor: colorA } : undefined}
						>
							{teamA.team_name}
						</button>
						<button
							onClick={() => setMobileTeam('b')}
							className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'b' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
							style={mobileTeam === 'b' ? { borderColor: colorB } : undefined}
						>
							{teamB.team_name}
						</button>
					</div>

					<div className="flex flex-col md:flex-row md:w-full gap-4 md:gap-8">
						<div className={`flex-1 ${mobileTeam !== 'a' ? 'hidden md:block' : ''}`}>
							<div className="hidden md:block text-sm font-semibold text-neutral-400 mb-2">{teamA.team_name}</div>
							<KeysList keys={prediction.home.keys_to_game} />
						</div>
						<div className="hidden md:block md:h-auto md:w-px bg-neutral-800" />
						<div className={`flex-1 ${mobileTeam !== 'b' ? 'hidden md:block' : ''}`}>
							<div className="hidden md:block text-sm font-semibold text-neutral-400 mb-2">{teamB.team_name}</div>
							<KeysList keys={prediction.away.keys_to_game} />
						</div>
					</div>
				</div>
			)}

			<div className="text-[10px] text-neutral-700 text-right mt-3">
				Model v{prediction.model_version}
			</div>
		</div>
	);
}

function KeysList({ keys }: { keys: KeyToGame[] }) {
	return (
		<div className="flex flex-col gap-2 h-full">
			{keys.map((key, i) => (
				<div key={i} className="bg-neutral-900 rounded-lg p-3 border border-neutral-800 flex-1 flex flex-col">
					<div className="flex items-center gap-2 mb-1">
						<div
							className="w-2 h-2 rounded-full shrink-0"
							style={{ backgroundColor: key.advantage === 'team' ? '#22c55e' : key.advantage === 'opponent' ? '#ef4444' : '#eab308' }}
						/>
						<span className="text-sm font-medium text-white">{key.label}</span>
					</div>
					<p className="text-xs text-neutral-400 leading-relaxed">{key.description}</p>
				</div>
			))}
		</div>
	);
}
