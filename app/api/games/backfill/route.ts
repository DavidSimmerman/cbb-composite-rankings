import { saveScoreboardGames } from '@/lib/espn/scoreboard';
import { NextResponse } from 'next/server';

const SEASON_START = '2025-11-03';

function formatDate(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}${m}${day}`;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET() {
	try {
		const start = new Date(SEASON_START);
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		const dates: string[] = [];
		for (let d = new Date(start); d <= yesterday; d.setDate(d.getDate() + 1)) {
			dates.push(formatDate(d));
		}

		console.log(`Backfilling ${dates.length} days from ${dates[0]} to ${dates[dates.length - 1]}`);

		let saved = 0;
		let failed = 0;

		for (const date of dates) {
			try {
				await saveScoreboardGames(date);
				saved++;
			} catch (err) {
				console.error(`Failed to process ${date}:`, err);
				failed++;
			}
			await sleep(1000);
		}

		return NextResponse.json({
			msg: `Backfill complete. Processed ${saved} days, ${failed} failures.`,
			daysProcessed: saved,
			daysFailed: failed
		});
	} catch (err: any) {
		console.error('BACKFILL ERROR:', err);
		return NextResponse.json({ error: err.toString() }, { status: 500 });
	}
}
