'use client';

import { useGame } from '@/app/context/GameContext';
import { GameTeamStats } from '@/lib/espn/espn-game';

interface StatRow {
	label: string;
	keys: string[];
	format: 'made_attempted' | 'number' | 'pct';
	lowerIsBetter?: boolean;
}

const statRows: StatRow[] = [
	{ label: 'FG%', keys: ['field_goal_pct'], format: 'pct' },
	{
		label: '3-Pointers',
		keys: ['three_point_field_goals_made', 'three_point_field_goals_attempted'],
		format: 'made_attempted'
	},
	{ label: 'Free Throws', keys: ['free_throws_made', 'free_throws_attempted'], format: 'made_attempted' },
	{ label: 'Rebounds', keys: ['total_rebounds'], format: 'number' },
	{ label: 'Off. Rebounds', keys: ['offensive_rebounds'], format: 'number' },
	{ label: 'Assists', keys: ['assists'], format: 'number' },
	{ label: 'Steals', keys: ['steals'], format: 'number' },
	{ label: 'Blocks', keys: ['blocks'], format: 'number' },
	{ label: 'Turnovers', keys: ['total_turnovers'], format: 'number', lowerIsBetter: true },
	{ label: 'Fouls', keys: ['fouls'], format: 'number', lowerIsBetter: true },
	{ label: 'Points in Paint', keys: ['points_in_paint'], format: 'number' },
	{ label: 'Fast Break Pts', keys: ['fast_break_points'], format: 'number' }
];

function getStat(stats: GameTeamStats, key: string): number {
	return (stats as unknown as Record<string, number>)[key] ?? 0;
}

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance([r, g, b]: [number, number, number]): number {
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
	return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

const MIN_LUMINANCE = 0.15;
const MIN_DISTANCE = 69;

function isVisible(hex: string): boolean {
	return luminance(hexToRgb(hex)) >= MIN_LUMINANCE;
}

function dist(a: string, b: string): number {
	return colorDistance(hexToRgb(a), hexToRgb(b));
}

function pickBarColors(awayPrimary: string, awaySecondary: string, homePrimary: string, homeSecondary: string): [string, string] {
	// First: fix any colors that are too dark for the background (independent of each other)
	const away = isVisible(awayPrimary) ? awayPrimary : isVisible(awaySecondary) ? awaySecondary : awayPrimary;
	const home = isVisible(homePrimary) ? homePrimary : isVisible(homeSecondary) ? homeSecondary : homePrimary;

	// If the resulting colors are distinct enough, done
	if (dist(away, home) >= MIN_DISTANCE) return [away, home];

	// Try switching home to secondary first (matches home uniform idea)
	if (isVisible(homeSecondary) && dist(away, homeSecondary) >= MIN_DISTANCE) {
		return [away, homeSecondary];
	}

	// Try switching away to secondary instead
	if (isVisible(awaySecondary) && dist(awaySecondary, home) >= MIN_DISTANCE) {
		return [awaySecondary, home];
	}

	// Pick the combo with the biggest distance
	const combos: [string, string][] = [
		[awayPrimary, homePrimary],
		[awayPrimary, homeSecondary],
		[awaySecondary, homePrimary],
		[awaySecondary, homeSecondary]
	];
	return combos.reduce((best, combo) => (dist(combo[0], combo[1]) > dist(best[0], best[1]) ? combo : best));
}

export default function GameBoxScore() {
	const { game } = useGame();

	const awayStats = game.teams.away.stats;
	const homeStats = game.teams.home.stats;
	const awayAbbr = game.teams.away.metadata.abbreviation;
	const homeAbbr = game.teams.home.metadata.abbreviation;

	const awayPrimary = `#${game.teams.away.metadata.color}`;
	const awaySecondary = `#${game.teams.away.metadata.secondary_color}`;
	const homePrimary = `#${game.teams.home.metadata.color}`;
	const homeSecondary = `#${game.teams.home.metadata.secondary_color}`;

	const [awayColor, homeColor] = pickBarColors(awayPrimary, awaySecondary, homePrimary, homeSecondary);

	return (
		<div className="mt-4 border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-2xl font-bold text-neutral-600 mb-4">Box Score</div>
			<div className=" mx-auto">
				<div className="flex justify-between text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 px-1">
					<span>{awayAbbr}</span>
					<span>{homeAbbr}</span>
				</div>
				<div className="flex flex-col">
					{statRows.map(row => {
						const awayVal = getStat(awayStats, row.keys[0]);
						const homeVal = getStat(homeStats, row.keys[0]);

						let awayDisplay: string;
						let homeDisplay: string;
						if (row.format === 'made_attempted') {
							awayDisplay = `${awayVal}-${getStat(awayStats, row.keys[1])}`;
							homeDisplay = `${homeVal}-${getStat(homeStats, row.keys[1])}`;
						} else if (row.format === 'pct') {
							awayDisplay = `${awayVal}%`;
							homeDisplay = `${homeVal}%`;
						} else {
							awayDisplay = String(awayVal);
							homeDisplay = String(homeVal);
						}

						// For lowerIsBetter stats, invert the bar so fewer = bigger bar
						const awayBarVal = row.lowerIsBetter ? homeVal : awayVal;
						const homeBarVal = row.lowerIsBetter ? awayVal : homeVal;
						const total = awayBarVal + homeBarVal;
						const awayPct = total > 0 ? (awayBarVal / total) * 100 : 50;

						const awayWins = row.lowerIsBetter ? awayVal < homeVal : awayVal > homeVal;
						const homeWins = row.lowerIsBetter ? homeVal < awayVal : homeVal > awayVal;
						const tied = awayVal === homeVal;

						return (
							<div key={row.label} className="py-2 not-last-of-type:border-b border-neutral-800">
								<div className="text-xs text-neutral-500 text-center mb-1.5">{row.label}</div>
								<div className="flex items-center gap-2 md:gap-3">
									<span
										className={`text-xs md:text-sm tabular-nums w-12 text-right ${
											awayWins || tied ? 'font-medium text-white' : 'text-neutral-500'
										}`}
									>
										{awayDisplay}
									</span>
									<div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden flex">
										<div
											className="h-full rounded-l-full transition-all duration-300"
											style={{
												width: `${awayPct}%`,
												backgroundColor: awayColor
											}}
										/>
										<div
											className="h-full rounded-r-full transition-all duration-300"
											style={{
												width: `${100 - awayPct}%`,
												backgroundColor: homeColor
											}}
										/>
									</div>
									<span
										className={`text-xs md:text-sm tabular-nums w-12 text-left ${
											homeWins || tied ? 'font-medium text-white' : 'text-neutral-500'
										}`}
									>
										{homeDisplay}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
