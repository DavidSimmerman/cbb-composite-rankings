/* eslint-disable @typescript-eslint/no-explicit-any -- parses untyped ESPN API JSON */
// One-off: fill game_lines with closing lines for a season's finished games, from ESPN game
// summaries (pickcenter). ESPN drops pickcenter for older games, so this mostly helps the
// current and just-finished season; games with no odds are counted and skipped.
//
// Needs the tables from scripts/migrations/2026-11-game-lines-predictions.sql.
//
//   DATABASE_URL="..." npx tsx scripts/backfill-game-lines.ts 27            # season 2026-27
//   DATABASE_URL="..." npx tsx scripts/backfill-game-lines.ts 27 --overwrite # refetch games that have a line
//
// Rate-limited to one ESPN request every DELAY_MS.
import { PostgresService } from '../lib/database';
import { pickEspnOdds } from '../lib/games/line-utils';
import { saveLines } from '../lib/games/store';

const DELAY_MS = 600;
const db = PostgresService.getInstance();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
	const season = parseInt(process.argv[2] ?? '', 10);
	const overwrite = process.argv.includes('--overwrite');
	if (!Number.isFinite(season)) {
		console.error('Usage: npx tsx scripts/backfill-game-lines.ts <season, e.g. 27> [--overwrite]');
		process.exit(1);
	}

	// espn_games.season has been written both as 27 and as 2027
	const rows = await db.query<{ game_id: string }>(
		`SELECT g.game_id FROM espn_games g
		WHERE g.season::int IN ($1, $2) AND g.status = 'final'
			${overwrite ? '' : 'AND NOT EXISTS (SELECT 1 FROM game_lines l WHERE l.game_id = g.game_id AND l.home_spread IS NOT NULL)'}
		ORDER BY g.date`,
		[season, 2000 + season]
	);
	console.log(`${rows.length} finished games to check for season ${season}`);

	let saved = 0;
	let noOdds = 0;
	let failed = 0;
	for (const [i, { game_id }] of rows.entries()) {
		try {
			const res = await fetch(
				`https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/summary?event=${game_id}`,
				{ signal: AbortSignal.timeout(15000) }
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			const comps = data?.header?.competitions?.[0]?.competitors ?? [];
			const homeAbbr = comps.find((c: any) => c.homeAway === 'home')?.team?.abbreviation;
			const awayAbbr = comps.find((c: any) => c.homeAway === 'away')?.team?.abbreviation;
			const odds = pickEspnOdds(data?.pickcenter, homeAbbr, awayAbbr) ?? pickEspnOdds(data?.odds, homeAbbr, awayAbbr);
			if (odds) {
				await saveLines([
					{ gameId: game_id, homeSpread: odds.homeSpread, overUnder: odds.overUnder, source: `${odds.provider ?? 'ESPN'} close` }
				]);
				saved++;
			} else {
				noOdds++;
			}
		} catch (err) {
			failed++;
			console.error(`game ${game_id}:`, (err as Error).message);
		}
		if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${rows.length}: ${saved} saved, ${noOdds} without odds, ${failed} failed`);
		await sleep(DELAY_MS);
	}

	console.log(`Done: ${saved} lines saved, ${noOdds} games without odds, ${failed} failed`);
	await db.close();
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
