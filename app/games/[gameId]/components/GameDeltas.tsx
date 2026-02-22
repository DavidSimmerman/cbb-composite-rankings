'use client';

import { useCookie } from '@/app/context/CookieContext';
import { useGame } from '@/app/context/GameContext';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfileRatingsHistory } from '@/lib/rankings/profile';
import { useMemo } from 'react';
import { GoDotFill } from 'react-icons/go';

const keyMap: Record<string, Record<string, string>> = {
	rating: {
		composite: 'avg_zscore',
		kenpom: 'kp_rating',
		evanmiya: 'em_rating',
		barttorvik: 'bt_rating'
	},
	offensiveRating: {
		composite: 'avg_offensive_zscore',
		kenpom: 'kp_offensive_rating',
		evanmiya: 'em_offensive_rating',
		barttorvik: 'bt_offensive_rating'
	},
	defensiveRating: {
		composite: 'avg_defensive_zscore',
		kenpom: 'kp_defensive_rating',
		evanmiya: 'em_defensive_rating',
		barttorvik: 'bt_defensive_rating'
	}
};

const zscoreKeyMap: Record<string, Record<string, string>> = {
	rating: {
		composite: 'avg_zscore',
		kenpom: 'kp_rating_zscore',
		evanmiya: 'em_rating_zscore',
		barttorvik: 'bt_rating_zscore'
	},
	offensiveRating: {
		composite: 'avg_offensive_zscore',
		kenpom: 'kp_offensive_zscore',
		evanmiya: 'em_offensive_zscore',
		barttorvik: 'bt_offensive_zscore'
	},
	defensiveRating: {
		composite: 'avg_defensive_zscore',
		kenpom: 'kp_defensive_zscore',
		evanmiya: 'em_defensive_zscore',
		barttorvik: 'bt_defensive_zscore'
	}
};

const FLIPPED_DEFENSE = ['kp_defensive_rating', 'bt_defensive_rating'];

export default function GameDeltas() {
	const { game } = useGame();
	const [ratingSource, setRatingSource] = useCookie<string>('schedule_rating_source', 'composite');
	const [compositeSources] = useCookie<string[]>('sources_filter', []);

	const compositeKey = useMemo(() => {
		const sourceOrder = ['kp', 'em', 'bt', 'net'];
		const selectedFilters = compositeSources.map(s => s.replaceAll(/[a-z]+/g, '').toLowerCase());
		return selectedFilters.length ? sourceOrder.filter(s => selectedFilters.includes(s)).join(',') : sourceOrder.join(',');
	}, [compositeSources]);

	const gameDate = useMemo(() => {
		const d = new Date(game.date);
		return d.toISOString().split('T')[0];
	}, [game.date]);

	return (
		<div className="mt-4 border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="flex items-center justify-between mb-4">
				<div className="text-2xl font-bold text-neutral-600">Rating Changes</div>
				<Select value={ratingSource} onValueChange={setRatingSource}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="composite">
								<GoDotFill className="text-purple-500" />
								Composite
							</SelectItem>
							<SelectItem value="kenpom">
								<GoDotFill className="text-blue-500" />
								KenPom
							</SelectItem>
							<SelectItem value="evanmiya">
								<GoDotFill className="text-green-500" />
								EvanMiya
							</SelectItem>
							<SelectItem value="barttorvik">
								<GoDotFill className="text-yellow-500" />
								BartTorvik
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
			<div className="flex flex-col md:flex-row gap-6">
				<TeamDelta
					teamName={game.teams.away.profile.team_name}
					history={game.teams.away.profile.ratings_history}
					gameDate={gameDate}
					ratingSource={ratingSource}
					compositeKey={compositeKey}
				/>
				<div className="hidden md:block md:w-px bg-neutral-800 self-stretch" />
				<TeamDelta
					teamName={game.teams.home.profile.team_name}
					history={game.teams.home.profile.ratings_history}
					gameDate={gameDate}
					ratingSource={ratingSource}
					compositeKey={compositeKey}
				/>
			</div>
		</div>
	);
}

function TeamDelta({
	teamName,
	history,
	gameDate,
	ratingSource,
	compositeKey
}: {
	teamName: string;
	history: ProfileRatingsHistory;
	gameDate: string;
	ratingSource: string;
	compositeKey: string;
}) {
	const deltas = useMemo(() => {
		const { prev, next } = getSurroundDays(gameDate);
		const before = history[prev];
		const after = history[next];

		if (!before || !after) return null;

		return (['rating', 'offensiveRating', 'defensiveRating'] as const).map(ratingType => {
			const ratingKey = keyMap[ratingType][ratingSource];
			const zscoreKey = zscoreKeyMap[ratingType][ratingSource];

			let beforeValue: number, afterValue: number, beforeRank: number, afterRank: number;
			let beforeZscore: number, afterZscore: number;

			if (ratingKey.startsWith('avg')) {
				const beforeCombo = before.composite_combos[compositeKey] as unknown as Record<string, number>;
				const afterCombo = after.composite_combos[compositeKey] as unknown as Record<string, number>;
				if (!beforeCombo || !afterCombo) return null;
				beforeValue = beforeCombo[ratingKey];
				beforeRank = beforeCombo[ratingKey + '_rank'];
				afterValue = afterCombo[ratingKey];
				afterRank = afterCombo[ratingKey + '_rank'];
				beforeZscore = beforeValue;
				afterZscore = afterValue;
			} else {
				const b = before as unknown as Record<string, number>;
				const a = after as unknown as Record<string, number>;
				beforeValue = b[ratingKey];
				beforeRank = b[ratingKey + '_rank'];
				afterValue = a[ratingKey];
				afterRank = a[ratingKey + '_rank'];
				beforeZscore = b[zscoreKey];
				afterZscore = a[zscoreKey];
			}

			let ratingDelta = Math.round((afterValue - beforeValue) * 100) / 100;
			if (FLIPPED_DEFENSE.includes(ratingKey)) {
				ratingDelta *= -1;
			}
			const rankDelta = beforeRank - afterRank;

			const zscoreDeltaPct = ((afterZscore - beforeZscore) / 5) * 100;

			return {
				label: { rating: 'Rating', offensiveRating: 'Offense', defensiveRating: 'Defense' }[ratingType],
				ratingDelta,
				rankDelta,
				zscoreDeltaPct
			};
		});
	}, [history, gameDate, ratingSource, compositeKey]);

	if (!deltas) {
		return (
			<div className="flex-1">
				<div className="text-lg font-bold text-neutral-400 mb-3">{teamName}</div>
				<div className="text-sm text-neutral-500">No rating data available for this game</div>
			</div>
		);
	}

	return (
		<div className="flex-1">
			<div className="text-lg font-bold text-neutral-400 mb-3">{teamName}</div>
			<div className="flex gap-2">
				{deltas.map(delta => {
					if (!delta) return null;

					const ratingColor =
						delta.ratingDelta > 0 ? 'text-green-500' : delta.ratingDelta < 0 ? 'text-red-500' : 'text-neutral-400';
					const rankColor =
						delta.rankDelta > 0 ? 'text-green-500/80' : delta.rankDelta < 0 ? 'text-red-500/80' : 'text-neutral-400';
					const { bg, border } = getDeltaHeatMap(delta.zscoreDeltaPct);

					return (
						<div
							key={delta.label}
							className={`flex-1 text-center px-3 py-2 rounded-lg flex flex-col items-center justify-center ${bg} ${border}`}
						>
							<div className="text-muted-foreground text-xs">{delta.label}</div>
							<div className={`text-xl font-bold tabular-nums ${ratingColor}`}>
								{delta.ratingDelta >= 0 ? '+' : ''}
								{delta.ratingDelta}
							</div>
							<div className={`text-sm tabular-nums ${rankColor}`}>
								{delta.rankDelta >= 0 ? '+' : ''}
								{delta.rankDelta}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function getDeltaHeatMap(pct: number): { bg: string; border: string } {
	const abs = Math.abs(pct);
	if (abs === 0) return { bg: 'bg-white/5', border: 'border border-white/10' };
	const positive = pct > 0;
	if (abs >= 1.67)
		return {
			bg: positive ? 'bg-green-500/45' : 'bg-red-500/45',
			border: positive ? 'border border-green-500/70' : 'border border-red-500/70'
		};
	if (abs >= 1.33)
		return {
			bg: positive ? 'bg-green-500/35' : 'bg-red-500/35',
			border: positive ? 'border border-green-500/55' : 'border border-red-500/55'
		};
	if (abs >= 1)
		return {
			bg: positive ? 'bg-green-500/25' : 'bg-red-500/25',
			border: positive ? 'border border-green-500/40' : 'border border-red-500/40'
		};
	if (abs >= 0.67)
		return {
			bg: positive ? 'bg-green-500/15' : 'bg-red-500/15',
			border: positive ? 'border border-green-500/25' : 'border border-red-500/25'
		};
	if (abs >= 0.33)
		return {
			bg: positive ? 'bg-green-500/8' : 'bg-red-500/8',
			border: positive ? 'border border-green-500/15' : 'border border-red-500/15'
		};
	return {
		bg: positive ? 'bg-green-500/5' : 'bg-red-500/5',
		border: positive ? 'border border-green-500/10' : 'border border-red-500/10'
	};
}

function getSurroundDays(date: string) {
	const d = new Date(date + 'T00:00:00');

	const prev = new Date(d);
	prev.setDate(d.getDate() - 1);

	const next = new Date(d);
	next.setDate(d.getDate() + 1);

	return { prev: prev.toISOString().split('T')[0], next: next.toISOString().split('T')[0] };
}
