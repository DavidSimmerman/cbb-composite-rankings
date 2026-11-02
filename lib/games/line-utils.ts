/* eslint-disable @typescript-eslint/no-explicit-any -- parses untyped ESPN API JSON */
// Betting-line helpers shared by server and client code (no database access here).
//
// Conventions used everywhere:
//  - home_spread is the home team's line: negative = home favored (FLA -2.5 at home is -2.5)
//  - a team's own line is home_spread for the home team and -home_spread for the away team
//  - ATS (against the spread) = team margin + team's line; positive = covered by that many points

export interface GameLine {
	homeSpread: number | null;
	overUnder: number | null;
	source: string | null;
}

/** The line from one team's point of view (negative = that team was favored). */
export function teamLine(homeSpread: number, side: 'home' | 'away'): number {
	return side === 'home' ? homeSpread : -homeSpread;
}

/** Result against the spread: team margin plus the team's line. Positive = covered. */
export function ats(teamMargin: number, line: number): number {
	return Math.round((teamMargin + line) * 10) / 10;
}

const num = (v: unknown): number | null => {
	if (v == null || v === '') return null;
	const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/^[ou]/i, ''));
	return Number.isFinite(n) ? n : null;
};

/** "DUKE -5.5" style: the favourite and its line; "Pick'em" when even. */
export function formatLine(homeSpread: number | null | undefined, homeAbbr: string, awayAbbr: string): string | null {
	if (homeSpread == null) return null;
	if (homeSpread === 0) return "Pick'em";
	return homeSpread < 0 ? `${homeAbbr} ${fmtNum(homeSpread)}` : `${awayAbbr} ${fmtNum(-homeSpread)}`;
}

/** A team's own line with its sign: "+3.5", "-7", "PK". */
export function formatTeamLine(line: number): string {
	if (line === 0) return 'PK';
	return line > 0 ? `+${fmtNum(line)}` : fmtNum(line);
}

export function formatAts(v: number): string {
	if (v === 0) return 'Push';
	return v > 0 ? `+${fmtNum(v)}` : fmtNum(v);
}

function fmtNum(n: number): string {
	return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Reads one ESPN odds entry (scoreboard `competitions[0].odds[i]` or summary `pickcenter[i]`).
 * ESPN's numeric `spread` is the home team's line; `pointSpread.home.close.line` is the same as a
 * string ("+7.5"); `details` ("NIU -7.5") is the last resort, matched against the abbreviations.
 */
export function parseEspnOdds(
	odds: any,
	homeAbbr?: string,
	awayAbbr?: string
): { homeSpread: number | null; overUnder: number | null; provider: string | null } | null {
	if (!odds || typeof odds !== 'object') return null;

	let homeSpread = num(odds.pointSpread?.home?.close?.line);
	if (homeSpread == null) homeSpread = num(odds.spread);
	if (homeSpread == null && typeof odds.details === 'string') {
		const details = odds.details.trim();
		if (/^(even|pk|pick)/i.test(details)) homeSpread = 0;
		else {
			const m = details.match(/^(.+?)\s+([+-]?\d+(?:\.\d+)?)$/);
			if (m) {
				const v = parseFloat(m[2]);
				const abbr = m[1].toUpperCase();
				if (homeAbbr && abbr === homeAbbr.toUpperCase()) homeSpread = v;
				else if (awayAbbr && abbr === awayAbbr.toUpperCase()) homeSpread = -v;
			}
		}
	}

	let overUnder = num(odds.overUnder);
	if (overUnder == null) overUnder = num(odds.total?.over?.close?.line);

	if (homeSpread == null && overUnder == null) return null;
	return { homeSpread, overUnder, provider: odds.provider?.name ?? null };
}

/** First usable entry of an ESPN odds list (they come in provider priority order). */
export function pickEspnOdds(list: unknown, homeAbbr?: string, awayAbbr?: string) {
	if (!Array.isArray(list)) return null;
	for (const o of list) {
		const parsed = parseEspnOdds(o, homeAbbr, awayAbbr);
		if (parsed) return parsed;
	}
	return null;
}

/** Win chance as a whole percent, kept between 1 and 99 (a model is never certain). */
export function pctLabel(p: number): number {
	return Math.min(99, Math.max(1, Math.round(p * 100)));
}
