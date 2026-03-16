import { chromium, type Page, type Locator } from 'playwright';
import { getPartialGames } from '../lib/espn/espn-game';
import { PostgresService } from '../lib/database';

const db = PostgresService.getInstance();

interface TournamentGame {
	game_id: string;
	team_a_key: string | null;
	team_a_score: number | null;
	team_a_seed: number;
	team_b_key: string | null;
	team_b_score: number | null;
	team_b_seed: number;
	region: string;
	round: string;
	/** Which renderRegion element (0-3) this game was scraped from */
	_regionIndex?: number;
}

const ROUND_NAMES = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8'];
const VALID_REGIONS = ['SOUTH', 'EAST', 'WEST', 'MIDWEST'];


async function extractTeam(competitor: Locator) {
	const seedText = await competitor.locator('.BracketCell__Rank').textContent({ timeout: 2000 }).catch(() => null);
	const scoreText = await competitor.locator('.BracketCell__Score div').first().textContent({ timeout: 2000 }).catch(() => null);
	const score = scoreText?.trim() ? parseInt(scoreText.trim(), 10) : null;
	return {
		seed: seedText?.trim() ? parseInt(seedText.trim(), 10) : 0,
		score: score !== null && !isNaN(score) ? score : null
	};
}

async function parseMatchup(wrapper: Locator, region: string, round: string): Promise<TournamentGame | null> {
	const links = wrapper.locator('a[data-game-link]');
	if (await links.count() === 0) return null;
	const href = await links.first().getAttribute('href', { timeout: 2000 }).catch(() => null);
	if (!href) return null;

	const gameIdMatch = href.match(/gameId\/(\d+)/);
	if (!gameIdMatch) return null;

	const competitors = wrapper.locator('.BracketCell__CompetitorItem');
	const count = await competitors.count();
	if (count < 2) return null;

	const teamA = await extractTeam(competitors.nth(0));
	const teamB = await extractTeam(competitors.nth(1));

	return {
		game_id: gameIdMatch[1],
		team_a_key: null,
		team_a_score: teamA.score,
		team_a_seed: teamA.seed,
		team_b_key: null,
		team_b_score: teamB.score,
		team_b_seed: teamB.seed,
		region,
		round
	};
}


async function saveTournamentGames(season: number, games: TournamentGame[]) {
	for (const game of games) {
		await db.query(
			`INSERT INTO tournament_games (game_id, season, region, round, team_a_key, team_a_seed, team_b_key, team_b_seed)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT (game_id) DO UPDATE SET
				season = EXCLUDED.season,
				region = EXCLUDED.region,
				round = EXCLUDED.round,
				team_a_key = COALESCE(EXCLUDED.team_a_key, tournament_games.team_a_key),
				team_a_seed = EXCLUDED.team_a_seed,
				team_b_key = COALESCE(EXCLUDED.team_b_key, tournament_games.team_b_key),
				team_b_seed = EXCLUDED.team_b_seed`,
			[game.game_id, season, game.region, game.round, game.team_a_key, game.team_a_seed, game.team_b_key, game.team_b_seed]
		);
	}
}


async function scrapeSeason(page: Page, season: number) {
	const url = `https://www.espn.com/mens-college-basketball/bracket/_/season/${season}`;
	console.log(`TOURNAMENT: Scraping season ${season}...`);

	await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForSelector('.BracketMatchup__Wrapper', { timeout: 30000 });
	await new Promise(res => setTimeout(res, 2000));
	console.log('TOURNAMENT: Page loaded');

	const games: TournamentGame[] = [];
	const regionGameIds = new Set<string>();

	// Extract region games — track which renderRegion index each game belongs to
	const regionEls = page.locator('[data-testid="renderRegion"]');
	const regionCount = await regionEls.count();
	console.log(`TOURNAMENT: Found ${regionCount} regions`);

	for (let r = 0; r < regionCount; r++) {
		const regionEl = regionEls.nth(r);

		// Preliminary region name from page text
		let regionName = `Region ${r}`;
		const allText = await regionEl.innerText().catch(() => '');
		const textLines = allText.split('\n').map(l => l.trim());
		const regionLine = textLines.find(l => VALID_REGIONS.includes(l));
		if (regionLine) {
			regionName = regionLine;
		} else {
			const regionMatch = allText.match(/\b(SOUTH|EAST|WEST|MIDWEST)\b/);
			if (regionMatch) regionName = regionMatch[1];
		}
		console.log(`TOURNAMENT: Processing region ${r}: ${regionName}`);

		const roundEls = regionEl.locator('[data-testid="regionRound"]');
		const roundCount = await roundEls.count();

		const firstRoundMatchupCount = await roundEls.nth(0).locator('.BracketMatchup__Wrapper').count();
		const isReversed = firstRoundMatchupCount <= 2;

		for (let rd = 0; rd < roundCount; rd++) {
			const roundIdx = isReversed ? (roundCount - 1 - rd) : rd;
			const roundName = roundIdx < ROUND_NAMES.length ? ROUND_NAMES[roundIdx] : `Round ${roundIdx + 1}`;

			// Only scrape R64 for now (later rounds are TBD)
			if (roundName !== 'Round of 64') continue;

			const matchups = roundEls.nth(rd).locator('.BracketMatchup__Wrapper');
			const matchupCount = await matchups.count();
			console.log(`TOURNAMENT:   ${roundName}: ${matchupCount} matchups`);

			for (let m = 0; m < matchupCount; m++) {
				const game = await parseMatchup(matchups.nth(m), regionName, roundName);
				if (game) {
					game._regionIndex = r;
					games.push(game);
					regionGameIds.add(game.game_id);
				}
			}
		}
	}

	// Fix region names (trim trailing text from Playwright extraction)
	for (const game of games) {
		if (game.region !== 'Final Four' && game.region !== 'First Four') {
			const match = VALID_REGIONS.find(r => game.region.startsWith(r));
			if (match) game.region = match;
		}
	}

	// Extract First Four play-in games (outside renderRegion elements)
	const allMatchups = page.locator('.BracketMatchup__Wrapper');
	const allCount = await allMatchups.count();
	for (let i = 0; i < allCount; i++) {
		const wrapper = allMatchups.nth(i);
		const links = wrapper.locator('a[data-game-link]');
		if (await links.count() === 0) continue;
		const href = await links.first().getAttribute('href', { timeout: 2000 }).catch(() => null);
		if (!href) continue;

		const gameIdMatch = href.match(/gameId\/(\d+)/);
		if (!gameIdMatch || regionGameIds.has(gameIdMatch[1])) continue;

		const game = await parseMatchup(wrapper, 'First Four', 'First Four');
		if (game) games.push(game);
	}

	// Fetch games from ESPN API (saves to espn_games DB) and resolve team_keys
	const gameIds = games.map(g => g.game_id);
	console.log(`TOURNAMENT: Fetching ${gameIds.length} games from ESPN API for season ${season}...`);

	const espnGames = new Map<string, any>();
	const BATCH_SIZE = 5;
	for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
		const batch = gameIds.slice(i, i + BATCH_SIZE);
		console.log(`TOURNAMENT: Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(gameIds.length / BATCH_SIZE)} (${batch.length} games)...`);
		try {
			const results = await Promise.race([
				getPartialGames(batch),
				new Promise<Map<string, any>>((_, reject) => setTimeout(() => reject(new Error('Batch timeout')), 30000)),
			]);
			for (const [id, game] of results) {
				espnGames.set(id, game);
			}
		} catch (e: any) {
			console.warn(`TOURNAMENT: Batch failed: ${e.message}, skipping...`);
		}
		if (i + BATCH_SIZE < gameIds.length) {
			await new Promise(res => setTimeout(res, 300));
		}
	}

	// Map team_keys from ESPN game data by matching scores
	let resolved = 0;
	for (const game of games) {
		const espnGame = espnGames.get(game.game_id);
		if (!espnGame?.teams) continue;

		const home = espnGame.teams.home;
		const away = espnGame.teams.away;
		if (!home || !away) continue;

		if (game.team_a_score === home.score && game.team_b_score === away.score) {
			game.team_a_key = home.team_key || null;
			game.team_b_key = away.team_key || null;
		} else if (game.team_a_score === away.score && game.team_b_score === home.score) {
			game.team_a_key = away.team_key || null;
			game.team_b_key = home.team_key || null;
		} else {
			// Scores don't match (possibly null) — assign based on position
			game.team_a_key = home.team_key || away.team_key || null;
			game.team_b_key = away.team_key || home.team_key || null;
		}

		if (game.team_a_key) resolved++;
		if (game.team_b_key) resolved++;
	}

	// Resolve First Four target regions: find which R64 game each FF game feeds into
	const ffGames = games.filter(g => g.round === 'First Four');
	const r64Games = games.filter(g => g.round === 'Round of 64');
	const consumedR64Ids = new Set<string>();

	for (const ff of ffGames) {
		const ffKeys = [ff.team_a_key, ff.team_b_key].filter(Boolean) as string[];
		// Find R64 game where one of the FF team keys appears
		let match = r64Games.find(r =>
			!consumedR64Ids.has(r.game_id) &&
			(ffKeys.includes(r.team_a_key!) || ffKeys.includes(r.team_b_key!))
		);
		// Fallback: R64 with same team_a_key and team_b_key (ESPN placeholder)
		if (!match) {
			match = r64Games.find(r =>
				!consumedR64Ids.has(r.game_id) &&
				r.team_a_key && r.team_a_key === r.team_b_key &&
				r.team_b_seed === ff.team_a_seed
			);
		}
		if (match) {
			consumedR64Ids.add(match.game_id);
			ff.region = match.region;
			console.log(`TOURNAMENT: First Four ${ff.team_a_key} vs ${ff.team_b_key} → region ${match.region}`);
		}
	}

	// Save to tournament_games table
	await saveTournamentGames(season, games);

	// Log summary
	const regionCounts: Record<string, number> = {};
	for (const g of games) regionCounts[g.region] = (regionCounts[g.region] ?? 0) + 1;
	console.log(`TOURNAMENT: Season ${season} - ${games.length} games saved, ${resolved}/${games.length * 2} team_keys resolved`);
	console.log(`TOURNAMENT: Region breakdown:`, regionCounts);
}

async function main() {
	const args = process.argv.slice(2);
	const startSeason = args[0] ? parseInt(args[0], 10) : 2002;
	const endSeason = args[1] ? parseInt(args[1], 10) : 2025;

	const browser = await chromium.launch();
	const context = await browser.newContext({
		userAgent:
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
	});
	await context.addInitScript(() => {
		Object.defineProperty(navigator, 'webdriver', { get: () => false });
		Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
		Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
		(window as any).chrome = { runtime: {} };
	});

	const page = await context.newPage();

	for (let season = startSeason; season <= endSeason; season++) {
		if (season === 2020) {
			console.log(`TOURNAMENT: Skipping season 2020 (cancelled due to COVID)`);
			continue;
		}

		try {
			await scrapeSeason(page, season);
		} catch (e: any) {
			console.error(`TOURNAMENT: Error scraping season ${season}: ${e.message}`);
		}

		if (season < endSeason) {
			await new Promise(res => setTimeout(res, 2000));
		}
	}

	await page.close();
	await context.close();
	await browser.close();
	await db.close();
	process.exit(0);
}

main().catch(console.error);
