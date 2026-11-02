// Letter grades for the team page Stats tab.
//
// Every stat is measured against all D1 teams that season (the teams KenPom lists on its last
// snapshot of the season). A team's percentile on a stat is the share of the other teams it beats:
// 1.00 = best in the country, 0.50 = middle of the pack, 0.00 = worst. "Beats" follows the stat's
// direction, so for turnovers or opponent shooting the lower number wins.
//
// A section's grade is the average percentile of its graded stats, mapped to a letter with the cut-offs
// below. Offense and defense grades average just that side. Style stats (3pt rate, tempo, possession
// length...) describe how a team plays rather than how well, so they're shown but left out of grades.
// A stat a team has no number for yet (early season, or a model that hasn't published) is skipped.

export type StatSide = {
	value: number;
	display: string;
	/** 1 = best among the n teams with a number (for style stats: 1 = most) */
	rank: number;
	n: number;
	/** 0-1, see above */
	pct: number;
};

export type StatRow = {
	id: string;
	name: string;
	/** undefined: this row has no offense/defense side at all; null: no number yet */
	off?: StatSide | null;
	def?: StatSide | null;
	/** Longer names for lists that show one side alone (strengths, gauges) */
	offLabel?: string;
	defLabel?: string;
	style?: boolean;
	note?: string;
};

export type StatSection = { key: string; title: string; blurb: string; rows: StatRow[] };

export type Grade = { letter: string; pct: number };

const CUTS: [number, string][] = [
	[0.97, 'A+'],
	[0.93, 'A'],
	[0.89, 'A-'],
	[0.85, 'B+'],
	[0.8, 'B'],
	[0.75, 'B-'],
	[0.7, 'C+'],
	[0.6, 'C'],
	[0.5, 'C-'],
	[0.4, 'D'],
	[0, 'F']
];

/** Percentile from a rank among n teams (rank 1 = best). */
export function percentileFromRank(rank: number, n: number) {
	return n > 1 ? Math.max(0, Math.min(1, (n - rank) / (n - 1))) : 1;
}

export function gradeOf(pcts: number[]): Grade | null {
	if (!pcts.length) return null;
	const pct = pcts.reduce((a, b) => a + b, 0) / pcts.length;
	return { letter: CUTS.find(([cut]) => pct >= cut)![1], pct };
}

export function sectionGrades(section: StatSection) {
	const graded = section.rows.filter(r => !r.style);
	const off = graded.flatMap(r => (r.off ? [r.off.pct] : []));
	const def = graded.flatMap(r => (r.def ? [r.def.pct] : []));
	return { all: gradeOf([...off, ...def]), off: gradeOf(off), def: gradeOf(def) };
}

export function gradeColor(letter: string) {
	if (letter.startsWith('A')) return '#4ade80';
	if (letter.startsWith('B')) return '#a3e635';
	if (letter.startsWith('C')) return '#fbbf24';
	if (letter === 'D') return '#fb923c';
	return '#f87171';
}
