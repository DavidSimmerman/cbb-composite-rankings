'use client';

import { useGame } from '@/app/context/GameContext';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { GameTeam } from '@/lib/espn/espn-game';
import { FullRatings } from '@/lib/rankings/profile';
import { useMemo, useState } from 'react';

interface StatRow {
	label: string;
	gameKey: string;
	avgKey: string;
	defAvgKey: string;
	format: 'int' | 'pct' | 'dec';
	lowerIsBetter?: boolean;
	defLowerIsBetter?: boolean;
}

const statRows: StatRow[] = [
	{
		label: 'Efficiency',
		gameKey: 'points_per_possession',
		avgKey: 'kp_offensive_rating',
		defAvgKey: 'kp_defensive_rating',
		format: 'int',
		defLowerIsBetter: true
	},
	{
		label: 'FG%',
		gameKey: 'field_goal_pct',
		avgKey: 'espn_off_field_goal_pct',
		defAvgKey: 'espn_opp_off_field_goal_pct',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: '3PT%',
		gameKey: 'three_point_field_goal_pct',
		avgKey: 'espn_off_three_point_field_goal_pct',
		defAvgKey: 'espn_opp_off_three_point_field_goal_pct',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: '3PT Rate',
		gameKey: 'three_point_rate',
		avgKey: 'bt_3pr',
		defAvgKey: 'bt_3prd',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: 'FT%',
		gameKey: 'free_throw_pct',
		avgKey: 'espn_off_free_throw_pct',
		defAvgKey: 'espn_opp_off_free_throw_pct',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: 'FT Rate',
		gameKey: 'free_throw_rate',
		avgKey: 'bt_ftr',
		defAvgKey: 'bt_ftrd',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: 'Assist %',
		gameKey: 'assist_percentage',
		avgKey: 'espn_off_assist_percentage',
		defAvgKey: 'espn_opp_off_assist_percentage',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: 'Turnover %',
		gameKey: 'turnover_percentage',
		avgKey: 'bt_tor',
		defAvgKey: 'bt_tord',
		format: 'pct',
		lowerIsBetter: true,
		defLowerIsBetter: false
	},
	{
		label: 'Def Rebound Rate',
		gameKey: 'defensive_rebound_rate',
		avgKey: 'bt_drb',
		defAvgKey: 'bt_orb',
		format: 'pct',
		defLowerIsBetter: true
	},
	{
		label: 'Off Rebound Rate',
		gameKey: 'offensive_rebound_rate',
		avgKey: 'bt_orb',
		defAvgKey: 'bt_drb',
		format: 'pct',
		defLowerIsBetter: true
	}
];

export default function GameStatsComparison() {
	const { game } = useGame();
	const [viewMode, setViewMode] = useState<'offense' | 'defense'>('offense');
	const [mobileTeam, setMobileTeam] = useState<'away' | 'home'>('away');

	const awayName = game.teams.away.profile?.team_name ?? (game.teams.away.name || 'Away');
	const homeName = game.teams.home.profile?.team_name ?? (game.teams.home.name || 'Home');
	const awayColor = game.teams.away.metadata ? `#${game.teams.away.metadata.color}` : '#6b7280';
	const homeColor = game.teams.home.metadata ? `#${game.teams.home.metadata.color}` : '#ef4444';

	return (
		<div className="mt-4 border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="flex items-center justify-between mb-4">
				<div className="text-2xl font-bold text-neutral-600">Game vs Season Average</div>
				<ToggleGroup
					variant="outline"
					type="single"
					value={viewMode}
					onValueChange={v => v && setViewMode(v as 'offense' | 'defense')}
				>
					<ToggleGroupItem value="offense" className="cursor-pointer text-xs md:text-sm h-7 md:h-9 px-2 md:px-3">
						Offense
					</ToggleGroupItem>
					<ToggleGroupItem value="defense" className="cursor-pointer text-xs md:text-sm h-7 md:h-9 px-2 md:px-3">
						Defense
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
			<div className="md:hidden flex border-b border-neutral-800 mb-4">
				<button
					onClick={() => setMobileTeam('away')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'away' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'away' ? { borderColor: awayColor } : undefined}
				>
					{awayName}
				</button>
				<button
					onClick={() => setMobileTeam('home')}
					className={`flex-1 pb-2 text-sm font-medium text-center cursor-pointer border-b-2 ${mobileTeam === 'home' ? 'text-white' : 'text-neutral-500 border-transparent'}`}
					style={mobileTeam === 'home' ? { borderColor: homeColor } : undefined}
				>
					{homeName}
				</button>
			</div>
			<div className="flex flex-col md:flex-row gap-6">
				<div className={`flex-1 ${mobileTeam !== 'away' ? 'hidden md:block' : ''}`}>
					<TeamStatsSection team={game.teams.away} opponent={game.teams.home} viewMode={viewMode} />
				</div>
				<div className="hidden md:block md:w-px bg-neutral-800 self-stretch" />
				<div className={`flex-1 ${mobileTeam !== 'home' ? 'hidden md:block' : ''}`}>
					<TeamStatsSection team={game.teams.home} opponent={game.teams.away} viewMode={viewMode} />
				</div>
			</div>
		</div>
	);
}

function TeamStatsSection({ team, opponent, viewMode }: { team: GameTeam; opponent: GameTeam; viewMode: 'offense' | 'defense' }) {
	const fullRatings = useMemo(() => {
		if (!team.profile) return undefined;
		const season = Object.keys(team.profile.full_ratings).sort().at(-1)!;
		return team.profile.full_ratings[season];
	}, [team]);

	const teamAbbr = team.metadata?.abbreviation ?? (team.name || 'Team');
	const oppAbbr = opponent.metadata?.abbreviation ?? (opponent.name || 'Opp');
	const isDefense = viewMode === 'defense';
	const gameTeam = isDefense ? opponent : team;
	const headerLabel = isDefense ? `${teamAbbr} Defense` : teamAbbr;
	const gameColLabel = isDefense ? `${oppAbbr} Game` : 'Game';

	if (!fullRatings) {
		return (
			<div className="flex-1">
				<div className="hidden md:block text-lg font-bold text-neutral-400 mb-3">{headerLabel}</div>
				<div className="text-sm text-neutral-500">No data available</div>
			</div>
		);
	}

	return (
		<div className="flex-1">
			<div className="hidden md:block text-lg font-bold text-neutral-400 mb-3">{headerLabel}</div>
			<div className="flex justify-between text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 px-1">
				<span>Stat</span>
				<div className="flex gap-3 md:gap-6">
					<span className="w-11 md:w-16 text-right text-nowrap">{gameColLabel}</span>
					<span className="w-9 md:w-12 text-right">Avg</span>
					<span className="w-12 text-right">Diff</span>
				</div>
			</div>
			<div className="flex flex-col">
				{statRows.map(row => {
					let gameValue = (gameTeam.stats as unknown as Record<string, number>)[row.gameKey];
					const avgKey = isDefense ? row.defAvgKey : row.avgKey;
					let avgValue = getStatValue(fullRatings, avgKey);
					const lowerIsBetter = isDefense ? row.defLowerIsBetter : row.lowerIsBetter;

					if (row.gameKey === 'points_per_possession') {
						gameValue = Math.round(gameValue * 1000) / 10;
					}

					if (row.gameKey.includes('rebound_rate')) {
						gameValue = Math.round(gameValue * 1000) / 10;
						if (avgKey === 'bt_drb') {
							avgValue = 100 - avgValue;
						}
					}

					if (gameValue == null || avgValue == null) return null;

					const diff = gameValue - avgValue;
					const isPositive = lowerIsBetter ? diff < 0 : diff > 0;
					const isNeutral = Math.abs(diff) < 0.1;

					return (
						<div
							key={row.label}
							className="flex items-center justify-between py-2 not-last-of-type:border-b border-neutral-800"
						>
							<span className="text-xs md:text-sm text-neutral-500 shrink min-w-0 truncate">{row.label}</span>
							<div className="flex items-center gap-3 md:gap-6 shrink-0">
								<span className="text-xs md:text-sm font-medium text-white tabular-nums w-11 md:w-16 text-right">
									{formatGameValue(gameValue, row.format)}
								</span>
								<span className="text-xs md:text-sm text-neutral-500 tabular-nums w-9 md:w-12 text-right">
									{formatAvgValue(avgValue, row.format)}
								</span>
								<span
									className={`text-xs md:text-sm font-medium tabular-nums w-12 text-right text-nowrap ${
										isNeutral ? 'text-neutral-400' : isPositive ? 'text-green-500' : 'text-red-500'
									}`}
								>
									{isNeutral ? (
										'-'
									) : (
										<>
											{isPositive ? '\u25B2' : '\u25BC'} {formatDiff(Math.abs(diff), row.format)}
										</>
									)}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function getStatValue(ratings: FullRatings, key: string): number {
	return (ratings as unknown as Record<string, number>)[key] ?? 0;
}

function formatGameValue(value: number, format: string): string {
	if (format === 'pct') return value + '%';
	return String(value);
}

function formatAvgValue(value: number, format: string): string {
	if (format === 'pct') return round1(value) + '%';
	if (format === 'int') return round1(value);
	return round1(value);
}

function formatDiff(value: number, format: string): string {
	if (format === 'pct') return round1(value) + '%';
	return round1(value);
}

function round1(n: number): string {
	return (Math.round(n * 10) / 10).toString();
}
