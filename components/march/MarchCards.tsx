'use client';

import Link from 'next/link';
import { MarchAnalysis, HistoricalComp, StyleFactor } from '@/lib/rankings/profile';
import { useMemo } from 'react';
import { MarchScoreBadge, getMarchScoreColor } from './MarchScoreBadge';

const ROUND_LABELS = ['R32', 'S16', 'E8', 'F4', 'Finals', 'Champ'];

export function getSeedColor(seed: number): string {
	if (seed <= 4) return 'oklch(0.70 0.22 145)';
	if (seed <= 8) return 'oklch(0.62 0.17 120)';
	if (seed <= 12) return 'oklch(0.60 0.16 70)';
	return 'oklch(0.65 0.20 30)';
}

function getRoundColor(round: string): string {
	switch (round) {
		case 'Champ': return 'oklch(0.75 0.25 145)';
		case 'Finals': return 'oklch(0.70 0.22 145)';
		case 'F4': return 'oklch(0.65 0.18 145)';
		case 'E8': return 'oklch(0.62 0.17 120)';
		case 'S16': return 'oklch(0.60 0.14 90)';
		case 'R32': return 'oklch(0.60 0.12 70)';
		default: return 'oklch(0.55 0.16 30)';
	}
}

// ─── Seed Line Value Card ────────────────────────────────────────────────

export function SeedLineCard({ analysis, showTitle }: { analysis: MarchAnalysis; showTitle?: boolean }) {
	const { seed_line: sl } = analysis;
	const seedMismatch = sl.implied_seed < sl.projected_seed;

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4 md:col-span-2">
			{showTitle && (
				<div className="text-2xl font-bold text-neutral-600 mb-2">March Profile</div>
			)}
			{/* Header */}
			<div className="flex items-baseline justify-between mb-4">
				<div>
					<div className="text-lg font-bold text-white">
						Projected{' '}
						<span style={{ color: getSeedColor(sl.projected_seed) }}>
							{sl.projected_seed}-seed
						</span>
						{sl.avg_seed != null && (
							<span className="text-sm font-normal text-neutral-500 ml-1.5">
								({sl.avg_seed.toFixed(1)} avg)
							</span>
						)}
					</div>
					<div className="text-sm text-neutral-400">
						Rated better than {sl.rating_percentile}% of historical {sl.projected_seed}-seeds
					</div>
					{seedMismatch && (
						<div className="text-xs mt-1" style={{ color: 'oklch(0.70 0.22 145)' }}>
							Rating of a typical {sl.implied_seed}-seed
						</div>
					)}
				</div>
				<div className="flex flex-col items-center shrink-0">
					<MarchScoreBadge score={analysis.march_score} size="lg" />
					<div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">March Score</div>
				</div>
			</div>

			{/* Rating number line */}
			<div className="mb-5">
				<div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
					<span>Seed {sl.projected_seed} avg: {sl.seed_avg_rating}</span>
					<span>This team: {sl.team_kp_rating}</span>
				</div>
				<RatingBar
					teamRating={sl.team_kp_rating}
					seedAvg={sl.seed_avg_rating}
				/>
			</div>

			{/* Seed outcomes + notable comps side by side */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Round reach rates */}
				<div>
					<div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
						Historical {sl.projected_seed}-seed outcomes
					</div>
					<div className="flex flex-col gap-1.5">
						{sl.seed_outcomes.map(o => (
							<div key={o.round} className="flex items-center gap-2">
								<span className="text-xs text-neutral-400 w-10 text-right tabular-nums">{o.round}</span>
								<div className="flex-1 h-4 rounded bg-neutral-800 overflow-hidden">
									<div
										className="h-full rounded transition-all duration-300"
										style={{
											width: `${o.reach_pct}%`,
											backgroundColor: getSeedColor(sl.projected_seed),
											opacity: 0.6 + (o.reach_pct / 250)
										}}
									/>
								</div>
								<span className="text-xs text-neutral-300 tabular-nums w-8 text-right">{o.reach_pct}%</span>
							</div>
						))}
					</div>
				</div>

				{/* Notable comps at this seed */}
				<div>
					<div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
						Similar-rated {sl.projected_seed}-seeds
					</div>
					{sl.notable_comps.length === 0 ? (
						<div className="text-xs text-neutral-500">No data available.</div>
					) : (
						<div className="flex flex-col gap-1">
							{sl.notable_comps.map((c, i) => (
								<div key={i} className="flex items-center justify-between text-xs py-0.5">
									<span className="text-neutral-300">
										{c.team_name}{' '}
										<span className="text-neutral-500">'{String(c.season).slice(-2)}</span>
									</span>
									<span className="text-neutral-400 tabular-nums">
										{c.deepest_round}
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function RatingBar({ teamRating, seedAvg }: { teamRating: number; seedAvg: number }) {
	const rangeMin = seedAvg - 1;
	const rangeMax = seedAvg + 1;
	const clamp = (v: number) => Math.max(0, Math.min(100, ((v - rangeMin) / (rangeMax - rangeMin)) * 100));

	const avgPos = clamp(seedAvg);
	const teamPos = clamp(teamRating);

	return (
		<div className="relative h-6 rounded bg-neutral-800">
			<div
				className="absolute top-0 bottom-0 w-px bg-neutral-500"
				style={{ left: `${avgPos}%` }}
			/>
			<div
				className="absolute -top-4 text-[9px] text-neutral-500"
				style={{ left: `${avgPos}%`, transform: 'translateX(-50%)' }}
			>
				avg
			</div>
			<div
				className="absolute top-0.5 bottom-0.5 w-3 rounded-sm"
				style={{
					left: `${teamPos}%`,
					transform: 'translateX(-50%)',
					backgroundColor: teamRating >= seedAvg ? 'oklch(0.70 0.22 145)' : 'oklch(0.65 0.20 30)'
				}}
			/>
		</div>
	);
}

// ─── Similar Teams Card ──────────────────────────────────────────────────

export function SimilarTeamsCard({ comps }: { comps: HistoricalComp[] }) {
	const avgWins = useMemo(() => {
		if (comps.length === 0) return 0;
		return Math.round((comps.reduce((s, c) => s + c.wins, 0) / comps.length) * 10) / 10;
	}, [comps]);

	const distribution = useMemo(() => {
		return ROUND_LABELS.map((label, i) => ({
			round: label,
			count: comps.filter(c => c.wins >= i + 1).length,
		}));
	}, [comps]);

	if (comps.length === 0) {
		return (
			<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
				<div className="text-lg font-bold text-neutral-600 mb-3">Historical Comps</div>
				<div className="text-sm text-neutral-500">No similar tournament teams found.</div>
			</div>
		);
	}

	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="text-lg font-bold text-neutral-600 mb-1">Historical Comps</div>
			<div className="text-sm text-neutral-400 mb-3">
				Similar teams typically win <span className="text-white font-medium">{avgWins} games</span>
			</div>

			{/* Distribution bars */}
			<div className="flex flex-col gap-1 mb-4">
				{distribution.map(d => (
					<div key={d.round} className="flex items-center gap-2">
						<span className="text-xs text-neutral-400 w-10 text-right tabular-nums">{d.round}</span>
						<div className="flex-1 h-3 rounded bg-neutral-800 overflow-hidden">
							<div
								className="h-full rounded"
								style={{
									width: `${(d.count / comps.length) * 100}%`,
									backgroundColor: 'oklch(0.55 0.15 250)'
								}}
							/>
						</div>
						<span className="text-xs text-neutral-500 tabular-nums w-6 text-right">
							{d.count}/{comps.length}
						</span>
					</div>
				))}
			</div>

			{/* Comp table */}
			<div className="border-t border-neutral-800 pt-2">
				<div className="grid grid-cols-[1fr_2rem_3rem_2.5rem] gap-x-2 text-[10px] text-neutral-500 uppercase tracking-wider mb-1 px-0.5">
					<span>Team</span>
					<span className="text-right">Seed</span>
					<span className="text-right">Result</span>
					<span className="text-right">Match</span>
				</div>
				{comps.map((c, i) => (
					<div
						key={i}
						className="grid grid-cols-[1fr_2rem_3rem_2.5rem] gap-x-2 py-1 px-0.5 border-b border-neutral-800/50 last:border-0"
					>
						<span className="text-xs text-neutral-300 truncate">
							{c.team_name}{' '}
							<span className="text-neutral-500">'{String(c.season).slice(-2)}</span>
						</span>
						<span className="text-xs tabular-nums text-right text-neutral-500">
							#{c.seed}
						</span>
						<span className="text-xs tabular-nums text-right font-medium" style={{ color: getRoundColor(c.deepest_round) }}>
							{c.deepest_round}
						</span>
						<span className="text-xs text-neutral-500 tabular-nums text-right">
							{c.similarity}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Style Factors Card ──────────────────────────────────────────────────

export function StyleFactorsCard({ factors, marchScore, numFactors, factorsHref }: {
	factors: StyleFactor[];
	marchScore: number;
	numFactors: number;
	factorsHref?: string;
}) {
	return (
		<div className="border border-neutral-800 rounded-lg p-3 md:p-4">
			<div className="flex items-baseline justify-between mb-1">
				<div className="text-lg font-bold text-neutral-600">Style Factors</div>
				{factorsHref && (
					<Link href={factorsHref} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
						View all factors &rarr;
					</Link>
				)}
			</div>
			<div className="text-sm text-neutral-400 mb-3">How this team's traits perform in March</div>

			{factors.length === 0 && numFactors === 0 ? (
				<div className="text-sm text-neutral-500">No strong style factors identified.</div>
			) : (
				<div className="flex flex-col gap-2">
					{factors.map(f => (
						<StyleFactorRow key={f.key} factor={f} />
					))}
					<MarchScoreSummary score={marchScore} numFactors={numFactors} />
				</div>
			)}
		</div>
	);
}

function StyleFactorRow({ factor: f }: { factor: StyleFactor }) {
	return (
		<div className="border border-neutral-800 rounded-md p-2.5">
			<div className="flex items-center justify-between mb-1">
				<div className="flex items-center gap-2">
					<div
						className="w-1.5 h-1.5 rounded-full"
						style={{ backgroundColor: getMarchScoreColor(f.percentile) }}
					/>
					<span className="text-sm font-medium text-white">{f.label}</span>
				</div>
				<span className="text-sm font-bold tabular-nums" style={{ color: getMarchScoreColor(f.percentile) }}>
					{f.percentile}
				</span>
			</div>
			<div className="text-xs text-neutral-500 mb-1.5">{f.description}</div>
			<div className="grid grid-cols-3 gap-2 text-center">
				<div>
					<div className="text-xs font-medium text-neutral-300 tabular-nums">{f.round_32_rate}%</div>
					<div className="text-[9px] text-neutral-500">R32+ Rate</div>
				</div>
				<div>
					<div className="text-xs font-medium text-neutral-300 tabular-nums">{f.deep_run_rate}%</div>
					<div className="text-[9px] text-neutral-500">S16+ Rate</div>
				</div>
				<div>
					<div className="text-xs font-medium text-neutral-300 tabular-nums">{f.final_four_rate}%</div>
					<div className="text-[9px] text-neutral-500">F4 Rate</div>
				</div>
			</div>
			<div className="text-[10px] text-neutral-600 mt-1 text-right">
				n={f.sample_size}
			</div>
		</div>
	);
}

function MarchScoreSummary({ score, numFactors }: { score: number; numFactors: number }) {
	return (
		<div className="border border-neutral-800 rounded-md p-2.5 flex items-center gap-3">
			<MarchScoreBadge score={score} size="lg" />
			<div className="flex-1">
				<div className="text-sm font-medium text-white">March Style Score</div>
				<div className="text-xs text-neutral-500">
					Based on {numFactors} qualifying factor{numFactors !== 1 ? 's' : ''}
				</div>
			</div>
		</div>
	);
}

// ─── Full March Profile Layout ──────────────────────────────────────────

export function MarchProfileCards({ analysis, factorsHref, showTitle }: { analysis: MarchAnalysis; factorsHref?: string; showTitle?: boolean }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
			<SeedLineCard analysis={analysis} showTitle={showTitle} />
			<SimilarTeamsCard comps={analysis.similar_teams} />
			<StyleFactorsCard
				factors={analysis.style_factors}
				marchScore={analysis.style_score}
				numFactors={analysis.num_qualifying_factors}
				factorsHref={factorsHref}
			/>
		</div>
	);
}
