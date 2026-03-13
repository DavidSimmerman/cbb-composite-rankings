'use client';

import { useEffect, useState } from 'react';

// ─── Data interfaces ────────────────────────────────────────────────────────

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

export interface GamePredictionProps {
	/** Team shown on left / "away" side */
	teamAKey: string;
	/** Team shown on right / "home" side */
	teamBKey: string;
	teamAName: string;
	teamBName: string;
	teamAAbbr: string;
	teamBAbbr: string;
	teamAColor: string;
	teamBColor: string;
	/** If true, show "Pre-Game Prediction" instead of "Game Prediction" */
	isFinal?: boolean;
	/** Optional color picker to resolve clashing team colors */
	pickColors?: (aColor: string, bColor: string) => [string, string];
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function GamePrediction({
	teamAKey,
	teamBKey,
	teamAName,
	teamBName,
	teamAAbbr,
	teamBAbbr,
	teamAColor,
	teamBColor,
	isFinal,
	pickColors,
}: GamePredictionProps) {
	const [prediction, setPrediction] = useState<PredictionData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [mobileTeam, setMobileTeam] = useState<'a' | 'b'>('a');

	const [barColorA, barColorB] = pickColors
		? pickColors(teamAColor, teamBColor)
		: [teamAColor, teamBColor];

	useEffect(() => {
		if (!teamAKey || !teamBKey) return;

		const fetchPrediction = async () => {
			try {
				const res = await fetch(`/api/games/predict?home=${teamAKey}&away=${teamBKey}`);
				if (!res.ok) {
					setError('Prediction unavailable');
					return;
				}
				const data = await res.json();
				if (data.error) {
					setError(data.error);
					return;
				}
				setPrediction(data);
			} catch {
				setError('Prediction service unavailable');
			} finally {
				setLoading(false);
			}
		};

		fetchPrediction();
	}, [teamAKey, teamBKey]);

	if (loading) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-2xl font-bold text-neutral-600 mb-4">Game Prediction</div>
				<div className="animate-pulse space-y-3">
					<div className="h-8 bg-neutral-800 rounded-full" />
					<div className="h-4 bg-neutral-800 rounded w-1/2 mx-auto" />
					<div className="grid grid-cols-2 gap-4 mt-4">
						<div className="h-24 bg-neutral-800 rounded" />
						<div className="h-24 bg-neutral-800 rounded" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !prediction) return null;

	// teamA = home (first param), teamB = away (second param) in the API call
	const pctA = Math.round(prediction.home.win_probability * 100);
	const pctB = Math.round(prediction.away.win_probability * 100);

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-2xl font-bold text-neutral-600 mb-4">
				{isFinal ? 'Pre-Game Prediction' : 'Game Prediction'}
			</div>

			{/* Win probability bar */}
			<div className="mb-1">
				<div className="flex justify-between text-sm font-medium text-white mb-2">
					<span>{teamAAbbr} {pctA}%</span>
					<span>{pctB}% {teamBAbbr}</span>
				</div>
				<div className="h-6 rounded-full overflow-hidden flex">
					<div className="h-full transition-all duration-500" style={{ width: `${pctA}%`, backgroundColor: barColorA }} />
					<div className="h-full transition-all duration-500" style={{ width: `${pctB}%`, backgroundColor: barColorB }} />
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
					<div className="text-lg font-bold text-neutral-500 mb-3">Keys to the Game</div>

					{/* Mobile toggle */}
					<div className="md:hidden flex border-b border-neutral-800 mb-4">
						<button
							onClick={() => setMobileTeam('a')}
							className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'a' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
							style={mobileTeam === 'a' ? { borderColor: teamAColor } : undefined}
						>
							{teamAName}
						</button>
						<button
							onClick={() => setMobileTeam('b')}
							className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'b' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
							style={mobileTeam === 'b' ? { borderColor: teamBColor } : undefined}
						>
							{teamBName}
						</button>
					</div>

					<div className="flex flex-col md:flex-row md:w-full gap-4 md:gap-8">
						<div className={`flex-1 ${mobileTeam !== 'a' ? 'hidden md:block' : ''}`}>
							<div className="hidden md:block text-sm font-semibold text-neutral-400 mb-2">{teamAName}</div>
							<KeysList keys={prediction.home.keys_to_game} />
						</div>
						<div className="hidden md:block md:h-auto md:w-px bg-neutral-800" />
						<div className={`flex-1 ${mobileTeam !== 'b' ? 'hidden md:block' : ''}`}>
							<div className="hidden md:block text-sm font-semibold text-neutral-400 mb-2">{teamBName}</div>
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

// ─── Keys list ──────────────────────────────────────────────────────────────

function KeysList({ keys }: { keys: KeyToGame[] }) {
	return (
		<div className="flex flex-col gap-2 h-full">
			{keys.map((key, i) => (
				<div key={i} className="bg-neutral-900 rounded-lg p-3 border border-neutral-800 flex-1 flex flex-col">
					<div className="flex items-center gap-2 mb-1">
						<ImpactIndicator advantage={key.advantage} />
						<span className="text-sm font-medium text-white">{key.label}</span>
					</div>
					<p className="text-xs text-neutral-400 leading-relaxed">{key.description}</p>
				</div>
			))}
		</div>
	);
}

function ImpactIndicator({ advantage }: { advantage: 'team' | 'opponent' | 'neutral' }) {
	const color = advantage === 'team' ? '#22c55e' : advantage === 'opponent' ? '#ef4444' : '#eab308';
	return <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}
