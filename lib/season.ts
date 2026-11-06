// Seasons are stored as two-digit end years: the 2026-27 season is 27.

// August onward belongs to the season that ends the following spring
export function getSeasonForDate(date: Date | string = new Date()): number {
	const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T12:00:00Z`) : date;
	const year = d.getUTCFullYear() % 100;
	return d.getUTCMonth() >= 7 ? year + 1 : year;
}

export function getCurrentSeason(): number {
	return getSeasonForDate(new Date());
}

export function seasonLabel(season: number | string): string {
	const s = Number(season);
	return `20${String(s - 1).padStart(2, '0')}-${String(s).padStart(2, '0')}`;
}

export function seasonFullYear(season: number | string): number {
	return 2000 + Number(season);
}

// Window the rating charts draw for a season. Starts Nov 1 so October preseason rows and
// last season's numbers re-scraped over the summer never show up as part of a season.
export function seasonChartWindow(season: number | string): { start: string; end: string } {
	const s = Number(season);
	return { start: `20${String(s - 1).padStart(2, '0')}-11-01`, end: `20${String(s).padStart(2, '0')}-07-31` };
}

// A season whose games are still being played (through the title game in early April). Its
// ratings rows are live: a team that hasn't played for a few days still gets a row each day.
export function isSeasonInProgress(season: number | string, now = new Date()): boolean {
	const s = Number(season);
	const today = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
	return s === getCurrentSeason() && today <= `20${String(s).padStart(2, '0')}-04-15`;
}

// The scrapers keep saving a row every day even when nothing changed (all summer, or before
// the first game). Collapse a trailing run of identical rows down to its first row.
export function trimStaticTail<T extends { date: string }>(rows: T[], valueOf: (row: T) => unknown): T[] {
	if (rows.length < 2) return rows;

	const key = (row: T) => JSON.stringify(valueOf(row));
	const last = key(rows[rows.length - 1]);
	let i = rows.length - 1;
	while (i > 0 && key(rows[i - 1]) === last) i--;

	return rows.slice(0, i + 1);
}
