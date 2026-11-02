'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import { gradeColor, sectionGrades, type StatSide } from '@/lib/grades';
import { CARD, GradeBadge, ordinal, RankChip } from './ui';

// Stats tab: a report card of eight grades, then each part of the game with offense and defense side by side
export default function StatsTab() {
	const { stat_sections: sections } = useTeamProfile();

	const jump = (key: string) => document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

	return (
		<div>
			<div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
				{sections.map(sec => {
					const g = sectionGrades(sec);
					return (
						<button
							key={sec.key}
							onClick={() => jump(sec.key)}
							className={`${CARD} bg-white/[0.025] px-1.5 lg:px-2 py-2.5 text-center hover:bg-white/[0.05] transition-colors cursor-pointer min-w-0`}
						>
							<div className="text-[10px] lg:text-[10.5px] text-slate-400 truncate">{sec.title}</div>
							<div className="mt-1.5">
								<GradeBadge letter={g.all?.letter} size="lg" />
							</div>
							<div className="hidden lg:block mt-1.5 text-[10px] text-slate-500 tabular-nums whitespace-nowrap">
								{g.off && g.def ? (
									<>
										O <span style={{ color: gradeColor(g.off.letter) }}>{g.off.letter}</span> · D{' '}
										<span style={{ color: gradeColor(g.def.letter) }}>{g.def.letter}</span>
									</>
								) : g.all ? (
									`${ordinal(Math.round(g.all.pct * 100))} pct`
								) : (
									'not graded'
								)}
							</div>
						</button>
					);
				})}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
				{sections.map(sec => {
					const g = sectionGrades(sec);
					return (
						<section key={sec.key} id={`sec-${sec.key}`} className={`${CARD} p-3.5 lg:p-4 scroll-mt-16`}>
							<div className="flex items-start justify-between gap-3 mb-2">
								<div className="min-w-0">
									<h3 className="text-[14px] font-semibold text-white">{sec.title}</h3>
									<div className="text-[11.5px] text-slate-500 truncate">{sec.blurb}</div>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									{g.off && g.def && (
										<div className="flex flex-col items-end gap-0.5 text-[10px] text-slate-500">
											<span className="flex items-center gap-1">
												Off <GradeBadge letter={g.off.letter} size="sm" />
											</span>
											<span className="flex items-center gap-1">
												Def <GradeBadge letter={g.def.letter} size="sm" />
											</span>
										</div>
									)}
									<GradeBadge letter={g.all?.letter} size="lg" />
								</div>
							</div>
							<div className="grid grid-cols-[1fr_84px_84px] lg:grid-cols-[1fr_96px_96px] gap-x-2 lg:gap-x-3 text-[10px] uppercase tracking-wider text-slate-500 pb-1">
								<span />
								<span className="text-right text-sky-300/70">Offense</span>
								<span className="text-right text-rose-300/70">Defense</span>
							</div>
							{sec.rows.map(row => (
								<div
									key={row.id}
									className="grid grid-cols-[1fr_84px_84px] lg:grid-cols-[1fr_96px_96px] gap-x-2 lg:gap-x-3 items-center min-h-[34px] py-1 text-[12.5px] border-t border-white/[0.05]"
								>
									<span className="min-w-0 leading-tight">
										<span className="text-slate-300">{row.name}</span>
										{row.note && <span className="block text-[10.5px] text-slate-600 truncate">{row.note}</span>}
									</span>
									<StatCell side={row.off} style={!!row.style} />
									<StatCell side={row.def} style={!!row.style} />
								</div>
							))}
						</section>
					);
				})}
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
				<span>
					Grade = average percentile of the section&apos;s stats against every D1 team this season. Chip = national
					rank.
				</span>
				<span className="flex items-center gap-1.5">
					<RankChip rank={88} small neutral /> style stat: shows how they play (1 = most), not graded
				</span>
			</div>
		</div>
	);
}

function StatCell({ side, style }: { side: StatSide | null | undefined; style: boolean }) {
	if (side === undefined) return <span />;
	if (side === null) return <span className="text-right text-slate-700">—</span>;
	return (
		<span className="flex items-center justify-end gap-1.5 tabular-nums" title={`#${side.rank} of ${side.n}`}>
			<span className="text-white">{side.display}</span>
			<RankChip rank={side.rank} small neutral={style} />
		</span>
	);
}
