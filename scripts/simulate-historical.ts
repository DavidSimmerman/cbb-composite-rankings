/**
 * Historical bracket simulation: validates auto-fill against actual past tournament fields.
 * Loads team data from 2015-2024 tournaments, approximates march scores from DB data,
 * runs N simulations per season, and compares aggregate stats to historical averages.
 *
 * Run with: DATABASE_URL="..." npx tsx scripts/simulate-historical.ts
 */

import { Pool } from 'pg';
import { initializeBracket, autoFillBracket, ROUND_NAMES } from '@/lib/bracket/predictions';
import type { BracketTeamSummary, SeedRoundStats, CrossSeedPatterns } from '@/lib/rankings/profile';
import { HISTORICAL_UPSETS, HISTORICAL_DD, HISTORICAL_DEPTH } from './historical-benchmarks';

const SEASONS = [2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024]; // skip 2020 (no tournament)
const SIMS_PER_SEASON = 50;

const BRACKET_ROUNDS = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

interface TourneyTeamRow {
	season: number;
	team_key: string;
	seed: number;
	team_name: string;
	comp_rating: number;
	comp_off_rating: number;
	comp_def_rating: number;
	kp_tempo: number;
	kp_sos: number;
	kp_rank: number;
	bt_3pr: number | null;
	bt_efg_pct: number | null;
	bt_ftr: number | null;
	bt_tor: number | null;
	bt_orb: number | null;
}

interface SeasonSeedOutcome {
	season: number;
	seed: number;
	wins: number;
	maxDepth: number;
}

async function main() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	console.log('Loading tournament dataset from DB...');

	// Get all tournament games for seed outcomes (2002+)
	const gamesResult = await pool.query(`
		SELECT tg.season, tg.round,
			tg.team_a_key, tg.team_b_key, tg.team_a_seed, tg.team_b_seed,
			eg.home_team_key, eg.away_team_key, eg.home_score, eg.away_score
		FROM tournament_games tg
		LEFT JOIN espn_games eg ON eg.game_id = tg.game_id
		WHERE tg.season >= 2002
	`);

	const ROUND_DEPTH: Record<string, number> = {
		'First Four': 0, 'Round of 64': 1, 'Round of 32': 2,
		'Sweet 16': 3, 'Elite 8': 4, 'Final Four': 5, 'Championship': 6,
	};

	// Build per-team-season outcomes
	const teamSeasons = new Map<string, { seed: number; wins: number; maxDepth: number }>();
	for (const g of gamesResult.rows) {
		if (!g.home_team_key || !g.away_team_key || g.home_score == null || g.away_score == null) continue;
		for (const side of ['a', 'b'] as const) {
			const teamKey = side === 'a' ? g.team_a_key : g.team_b_key;
			const seed = side === 'a' ? g.team_a_seed : g.team_b_seed;
			if (!teamKey) continue;
			const key = `${g.season}-${teamKey}`;
			if (!teamSeasons.has(key)) teamSeasons.set(key, { seed, wins: 0, maxDepth: 0 });
			const ts = teamSeasons.get(key)!;
			const isHome = g.home_team_key === teamKey;
			const won = isHome ? g.home_score > g.away_score : g.away_score > g.home_score;
			if (won) {
				ts.wins++;
				const isFirstFour = g.round === 'First Four' ||
					(g.round === 'Final Four' && g.team_a_seed === g.team_b_seed && g.season >= 2011);
				const depth = isFirstFour ? 0 : (ROUND_DEPTH[g.round] ?? 0);
				if (depth > ts.maxDepth) ts.maxDepth = depth;
			}
		}
	}

	const seasonSeedOutcomes: SeasonSeedOutcome[] = [];
	for (const [key, ts] of teamSeasons) {
		const season = parseInt(key.split('-', 1)[0]);
		seasonSeedOutcomes.push({ season, seed: ts.seed, wins: ts.wins, maxDepth: ts.maxDepth });
	}

	// Compute seed_round_stats
	const seedRoundStats: SeedRoundStats = {};
	const roundDepthThresholds: Record<string, number> = {
		'Round of 64': 1, 'Round of 32': 2, 'Sweet 16': 3,
		'Elite 8': 4, 'Final Four': 5, 'Championship': 6,
	};
	const allSeasons = [...new Set(seasonSeedOutcomes.map(s => s.season))].sort();

	for (let seed = 1; seed <= 16; seed++) {
		seedRoundStats[seed] = {};
		const seedOutcomes = seasonSeedOutcomes.filter(s => s.seed === seed);
		for (const [roundName, minDepth] of Object.entries(roundDepthThresholds)) {
			const total = seedOutcomes.length;
			const won = seedOutcomes.filter(s => s.maxDepth >= minDepth).length;
			const winsPerYear: number[] = [];
			for (const season of allSeasons) {
				const seasonTeams = seedOutcomes.filter(s => s.season === season);
				if (seasonTeams.length === 0) continue;
				winsPerYear.push(seasonTeams.filter(s => s.maxDepth >= minDepth).length);
			}
			seedRoundStats[seed][roundName] = { win_pct: total > 0 ? won / total : 0, sample_size: total, wins_per_year: winsPerYear };
		}
	}

	// Compute cross_seed_patterns
	const distributions: CrossSeedPatterns['distributions'] = {};
	for (let seed = 1; seed <= 16; seed++) {
		distributions[seed] = {};
		for (const roundName of BRACKET_ROUNDS) {
			const stat = seedRoundStats[seed]?.[roundName];
			if (!stat || stat.wins_per_year.length === 0) continue;
			const arr = stat.wins_per_year;
			const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
			const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
			distributions[seed][roundName] = {
				mean, stddev: Math.sqrt(variance),
				min: Math.min(...arr), max: Math.max(...arr),
			};
		}
	}
	const crossSeedPatterns: CrossSeedPatterns = { unprecedented: [], distributions };

	// Get historical team data for each season (composite ratings + barttorvik stats)
	const compositeTeamFilter = `
		SELECT season, team_a_key AS team_key FROM tournament_games WHERE season >= 2010 AND team_a_key IS NOT NULL
		UNION SELECT season, team_b_key FROM tournament_games WHERE season >= 2010 AND team_b_key IS NOT NULL
	`;

	const [kenpomResult, compositeResult, btResult, teamDataResult] = await Promise.all([
		pool.query(`
			SELECT DISTINCT ON (k.season, k.team_key)
				k.season + 2000 AS season, k.team_key, k.rank,
				k.net_rating, k.offensive_rating, k.defensive_rating,
				k.adjusted_tempo, k.sos_net_rating
			FROM kenpom_rankings k
			JOIN LATERAL (
				SELECT MIN(eg.date::date) AS first_game
				FROM tournament_games tg
				JOIN espn_games eg ON eg.game_id = tg.game_id
				WHERE tg.season = k.season + 2000 AND tg.round != 'First Four'
			) tourney ON true
			WHERE (k.season + 2000, k.team_key) IN (${compositeTeamFilter})
				AND k.date < tourney.first_game
			ORDER BY k.season, k.team_key, k.date DESC
		`),
		pool.query(`
			SELECT DISTINCT ON (c.season, c.team_key)
				c.season + 2000 AS season, c.team_key,
				c.avg_zscore, c.avg_offensive_zscore, c.avg_defensive_zscore
			FROM composite_rankings c
			WHERE c.sources = 'kp,em,bt'
				AND (c.season + 2000, c.team_key) IN (${compositeTeamFilter})
			ORDER BY c.season, c.team_key, c.date DESC
		`),
		pool.query(`
			SELECT DISTINCT ON (season, team_key)
				season + 2000 AS season, team_key,
				"3pr", efg_pct, ftr, tor, orb
			FROM barttorvik_rankings
			WHERE (season + 2000, team_key) IN (${compositeTeamFilter})
			ORDER BY season, team_key, date DESC
		`),
		pool.query(`SELECT team_key, name, short_name, abbreviation, color, secondary_color, espn_id FROM team_data`),
	]);

	// Build lookups
	const kpMap = new Map<string, any>();
	for (const r of kenpomResult.rows) kpMap.set(`${r.season}-${r.team_key}`, r);
	const compMap = new Map<string, any>();
	for (const r of compositeResult.rows) compMap.set(`${r.season}-${r.team_key}`, r);
	const btMap = new Map<string, any>();
	for (const r of btResult.rows) btMap.set(`${r.season}-${r.team_key}`, r);
	const teamDataMap = new Map<string, any>();
	for (const r of teamDataResult.rows) teamDataMap.set(r.team_key, r);

	// Precompute seed-line rating stats for rating_score computation
	const allDataset: { season: number; team_key: string; seed: number; comp_rating: number }[] = [];
	for (const [key, ts] of teamSeasons) {
		const [seasonStr, teamKey] = key.split('-', 2);
		const season = parseInt(seasonStr);
		const comp = compMap.get(key);
		if (!comp) continue;
		allDataset.push({ season, team_key: teamKey, seed: ts.seed, comp_rating: comp.avg_zscore });
	}

	// Precompute global style factor bounds (simplified: use comp_rating percentile within seed as proxy)
	// For historical sims, approximate march_score from:
	// - rating_score: percentile of comp_rating within seed line
	// - comps_score: similar teams' tournament performance (simplified)
	// - style_score: approximate from barttorvik stats relative to tournament averages
	const seedBaselineWins = new Map<number, number>();
	for (let s = 1; s <= 16; s++) {
		const teams = seasonSeedOutcomes.filter(t => t.seed === s);
		seedBaselineWins.set(s, teams.length > 0 ? teams.reduce((sum, t) => sum + t.wins, 0) / teams.length : 0);
	}

	// Stats for z-score normalization of similar teams
	const statKeys = ['comp_rating', 'comp_off_rating', 'comp_def_rating'] as const;
	const statMeans: Record<string, number> = {};
	const statStds: Record<string, number> = {};
	for (const stat of statKeys) {
		const vals = allDataset.map(t => {
			const comp = compMap.get(`${t.season}-${t.team_key}`);
			return stat === 'comp_rating' ? comp?.avg_zscore :
				stat === 'comp_off_rating' ? comp?.avg_offensive_zscore :
				comp?.avg_defensive_zscore;
		}).filter((v): v is number => v != null);
		statMeans[stat] = vals.reduce((s, v) => s + v, 0) / vals.length;
		statStds[stat] = Math.sqrt(vals.reduce((s, v) => s + (v - statMeans[stat]) ** 2, 0) / vals.length) || 1;
	}

	console.log(`Loaded data for ${allDataset.length} tournament teams across ${allSeasons.length} seasons\n`);

	// Build bracket_teams for a given season
	function buildSeasonField(season: number): BracketTeamSummary[] {
		// Get unique teams from tournament_games for this season
		const seasonTeams = new Map<string, number>(); // team_key → seed
		for (const g of gamesResult.rows) {
			if (g.season !== season) continue;
			if (g.team_a_key) seasonTeams.set(g.team_a_key, g.team_a_seed);
			if (g.team_b_key) seasonTeams.set(g.team_b_key, g.team_b_seed);
		}

		// Filter to seeds 1-16 (skip First Four extras)
		const seedCounts = new Map<number, string[]>();
		for (const [tk, seed] of seasonTeams) {
			if (seed < 1 || seed > 16) continue;
			if (!seedCounts.has(seed)) seedCounts.set(seed, []);
			seedCounts.get(seed)!.push(tk);
		}

		// For seeds with >4 teams (First Four), keep best 4 by composite rating
		const finalTeams: { team_key: string; seed: number }[] = [];
		for (const [seed, teams] of seedCounts) {
			if (teams.length <= 4) {
				for (const tk of teams) finalTeams.push({ team_key: tk, seed });
			} else {
				// Keep best 4 by composite rating
				const rated = teams
					.map(tk => ({ tk, rating: compMap.get(`${season}-${tk}`)?.avg_zscore ?? -999 }))
					.sort((a, b) => b.rating - a.rating)
					.slice(0, 4);
				for (const r of rated) finalTeams.push({ team_key: r.tk, seed });
			}
		}

		// Build BracketTeamSummary for each team
		const bracketTeams: BracketTeamSummary[] = [];
		const seedLineRatings = new Map<number, number[]>();
		for (const t of allDataset) {
			if (!seedLineRatings.has(t.seed)) seedLineRatings.set(t.seed, []);
			seedLineRatings.get(t.seed)!.push(t.comp_rating);
		}
		// Sort for percentile computation
		for (const [, ratings] of seedLineRatings) ratings.sort((a, b) => a - b);

		for (const { team_key, seed } of finalTeams) {
			const comp = compMap.get(`${season}-${team_key}`);
			const kp = kpMap.get(`${season}-${team_key}`);
			const bt = btMap.get(`${season}-${team_key}`);
			const td = teamDataMap.get(team_key);

			const compRating = comp?.avg_zscore ?? 0;

			// rating_score: percentile within historical seed line
			const seedRatings = seedLineRatings.get(seed) ?? [];
			const ratingScore = seedRatings.length > 0
				? Math.round((seedRatings.filter(r => r <= compRating).length / seedRatings.length) * 100)
				: 50;

			// comps_score: find similar teams and check their tournament performance
			let compsScore = 50;
			if (comp) {
				const similarities = allDataset
					.filter(t => !(t.season === season && t.team_key === team_key)) // exclude self
					.map(t => {
						const tComp = compMap.get(`${t.season}-${t.team_key}`);
						if (!tComp) return { team_key: t.team_key, season: t.season, seed: t.seed, distance: Infinity, wins: 0 };
						const tOutcome = teamSeasons.get(`${t.season}-${t.team_key}`);
						const diffs = [
							((compRating - tComp.avg_zscore) / statStds.comp_rating) * 3,
							(((comp.avg_offensive_zscore ?? 0) - (tComp.avg_offensive_zscore ?? 0)) / statStds.comp_off_rating) * 2,
							(((comp.avg_defensive_zscore ?? 0) - (tComp.avg_defensive_zscore ?? 0)) / statStds.comp_def_rating) * 2,
						];
						const distance = Math.sqrt(diffs.reduce((s, d) => s + d * d, 0) / 7);
						return { team_key: t.team_key, season: t.season, seed: t.seed, distance, wins: tOutcome?.wins ?? 0 };
					})
					.sort((a, b) => a.distance - b.distance)
					.slice(0, 12);

				const avgWins = similarities.reduce((s, t) => s + t.wins, 0) / similarities.length;
				const baseline = seedBaselineWins.get(seed) ?? 0;
				const winsAbove = avgWins - baseline;
				// Convert to 0-100: -2 → 0, 0 → 50, +2 → 100
				compsScore = Math.round(Math.max(0, Math.min(100, 50 + winsAbove * 25)));
			}

			// style_score: approximate from barttorvik stats (simplified)
			let styleScore = 50;
			if (bt) {
				// Teams with good 3pt rate, FT rate, low turnover rate tend to do well in March
				// Simple heuristic: average of percentile ranks
				const ranks = [bt['3pr_rank'] ?? null, bt.ftr_rank ?? null, bt.tor_rank ?? null].filter((v): v is number => v != null);
				if (ranks.length > 0) {
					const avgRank = ranks.reduce((s, r) => s + r, 0) / ranks.length;
					// Lower rank = better, convert to 0-100 score (363 teams)
					styleScore = Math.round(Math.max(0, Math.min(100, (1 - avgRank / 363) * 100)));
				}
			}

			const marchScore = Math.round(compsScore * 0.45 + styleScore * 0.30 + ratingScore * 0.25);

			bracketTeams.push({
				team_key,
				team_name: td?.name ?? team_key,
				short_name: td?.short_name ?? team_key,
				abbreviation: td?.abbreviation ?? team_key.slice(0, 4).toUpperCase(),
				projected_seed: seed,
				avg_seed: seed,
				march_score: marchScore,
				march_analysis: {
					seed_line: {} as any,
					similar_teams: [],
					style_factors: [],
					march_score: marchScore,
					style_score: styleScore,
					comps_score: compsScore,
					rating_score: ratingScore,
					num_qualifying_factors: 0,
					expected_wins: 0,
				},
				comp_rating: comp?.avg_zscore ?? 0,
				comp_rank: comp?.avg_zscore_rank ?? 0,
				comp_off_rank: comp?.avg_offensive_zscore_rank ?? 0,
				comp_def_rank: comp?.avg_defensive_zscore_rank ?? 0,
				color: td?.color ?? '333333',
				secondary_color: td?.secondary_color ?? '666666',
				logo_url: td?.espn_id ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${td.espn_id}.png` : '',
			});
		}

		return bracketTeams;
	}

	// Run simulations across all seasons
	const upsetsByRound: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
	const ddByRound: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
	const ffSeeds: number[] = [];
	const champSeeds: number[] = [];
	const seedDeepest: Record<number, number[]> = {};
	for (let s = 1; s <= 16; s++) seedDeepest[s] = [];
	let totalOneSeedsInFF = 0;
	let totalBrackets = 0;
	let chalky = 0, mildChaos = 0, wild = 0;
	const champSeedDist: Record<number, number> = {};

	const start = Date.now();

	for (const season of SEASONS) {
		const bracketTeams = buildSeasonField(season);
		if (bracketTeams.length < 60) {
			console.log(`Season ${season}: only ${bracketTeams.length} teams, skipping`);
			continue;
		}
		// Pad to exactly 64 if needed (First Four filtering may leave fewer)
		while (bracketTeams.length < 64) {
			// Duplicate a random team from the lowest seed to fill gaps
			const lowest = bracketTeams.filter(t => t.projected_seed === 16);
			if (lowest.length > 0) {
				const clone = { ...lowest[0], team_key: `filler_${bracketTeams.length}` };
				bracketTeams.push(clone);
			} else break;
		}

		console.log(`Season ${season}: ${bracketTeams.length} teams, running ${SIMS_PER_SEASON} sims...`);

		for (let sim = 0; sim < SIMS_PER_SEASON; sim++) {
			const bracketState = initializeBracket(bracketTeams);
			const filled = autoFillBracket(bracketState, seedRoundStats, crossSeedPatterns);
			const games = [...filled.values()];
			totalBrackets++;

			// Count upsets per round
			for (let round = 1; round <= 6; round++) {
				const roundGames = games.filter(g => g.round === round && g.winner);
				let upsets = 0, ddWins = 0;
				for (const g of roundGames) {
					if (!g.teamA || !g.teamB) continue;
					const winnerSeed = g.teamA.team_key === g.winner ? g.teamA.seed : g.teamB.seed;
					const loserSeed = g.teamA.team_key === g.winner ? g.teamB.seed : g.teamA.seed;
					if (winnerSeed > loserSeed) upsets++;
					if (winnerSeed >= 10 && round <= 4) ddWins++;
				}
				upsetsByRound[round].push(upsets);
				if (round <= 4) ddByRound[round].push(ddWins);
			}

			// Track deepest round for each seed
			const seedMaxRound: Record<number, number> = {};
			for (const g of games) {
				if (!g.winner || !g.teamA || !g.teamB) continue;
				const winnerSeed = g.teamA.team_key === g.winner ? g.teamA.seed : g.teamB.seed;
				seedMaxRound[winnerSeed] = Math.max(seedMaxRound[winnerSeed] ?? 0, g.round);
			}
			for (const [seed, maxRound] of Object.entries(seedMaxRound)) {
				seedDeepest[Number(seed)].push(maxRound);
			}

			// FF + Champion tracking
			const ffGames = games.filter(g => g.round === 5 && g.teamA && g.teamB);
			const ffSeedList: number[] = [];
			for (const g of ffGames) {
				if (g.teamA) { ffSeeds.push(g.teamA.seed); ffSeedList.push(g.teamA.seed); }
				if (g.teamB) { ffSeeds.push(g.teamB.seed); ffSeedList.push(g.teamB.seed); }
			}
			totalOneSeedsInFF += ffSeedList.filter(s => s === 1).length;

			const ffHas5Plus = ffSeedList.some(s => s >= 5);
			const ffHas7Plus = ffSeedList.some(s => s >= 7);
			if (!ffHas5Plus) chalky++;
			if (ffHas5Plus) mildChaos++;
			if (ffHas7Plus) wild++;

			const champGame = games.find(g => g.round === 6 && g.winner);
			if (champGame) {
				const cs = champGame.teamA?.team_key === champGame.winner
					? champGame.teamA?.seed : champGame.teamB?.seed;
				if (cs) {
					champSeeds.push(cs);
					champSeedDist[cs] = (champSeedDist[cs] ?? 0) + 1;
				}
			}
		}
	}

	const elapsed = Date.now() - start;
	console.log(`\nDone: ${totalBrackets} brackets across ${SEASONS.length} seasons in ${(elapsed / 1000).toFixed(1)}s\n`);

	const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
	const stddev = (arr: number[]) => { const m = avg(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length); };

	// === Summary ===
	console.log(`=== ${totalBrackets}-BRACKET SUMMARY (${SEASONS.length} seasons × ${SIMS_PER_SEASON} sims) ===`);
	console.log(`Chalky Final Fours (all seeds 1-4): ${chalky}/${totalBrackets} (${(chalky / totalBrackets * 100).toFixed(0)}%)`);
	console.log(`Mild chaos (at least one seed 5+):  ${mildChaos}/${totalBrackets} (${(mildChaos / totalBrackets * 100).toFixed(0)}%)`);
	console.log(`Wild (at least one seed 7+):         ${wild}/${totalBrackets} (${(wild / totalBrackets * 100).toFixed(0)}%)`);
	console.log(`Avg 1-seeds in Final Four: ${(totalOneSeedsInFF / totalBrackets).toFixed(2)} (historical ~1.7)`);

	console.log('\nChampion seed distribution:');
	const sortedChampDist = Object.entries(champSeedDist).sort((a, b) => Number(a[0]) - Number(b[0]));
	for (const [seed, count] of sortedChampDist) {
		console.log(`  Seed ${seed}: ${count}/${totalBrackets} (${(count / totalBrackets * 100).toFixed(1)}%)`);
	}
	console.log('  Historical: 1-seed ~70%, 3-seed ~13%, 2-seed ~9%, 4/7 ~4% each');

	// Total upsets
	const totalUpsets: number[] = [];
	for (let i = 0; i < totalBrackets; i++) {
		let total = 0;
		for (let round = 1; round <= 6; round++) total += upsetsByRound[round][i];
		totalUpsets.push(total);
	}
	totalUpsets.sort((a, b) => a - b);
	console.log(`\n=== TOTAL UPSETS PER BRACKET ===`);
	console.log(`Min: ${totalUpsets[0]}, P5: ${totalUpsets[Math.floor(totalBrackets * 0.05)]}, ` +
		`Avg: ${avg(totalUpsets).toFixed(1)}, P95: ${totalUpsets[Math.floor(totalBrackets * 0.95)]}, ` +
		`Max: ${totalUpsets[totalUpsets.length - 1]}`);

	// Upsets per round
	console.log('\n=== UPSETS PER ROUND ===');
	console.log('Round     | Simulated (avg ± std) | Historical (avg ± std)');
	console.log('----------|----------------------|----------------------');
	for (let round = 1; round <= 6; round++) {
		const sim = upsetsByRound[round];
		const [hAvg, hStd] = HISTORICAL_UPSETS[round];
		const roundName = ['', 'R64', 'R32', 'S16', 'E8', 'FF', 'Champ'][round];
		console.log(
			`${roundName.padEnd(10)}| ${avg(sim).toFixed(1)} ± ${stddev(sim).toFixed(1)}`.padEnd(35) +
			`| ${hAvg.toFixed(1)} ± ${hStd.toFixed(1)}`
		);
	}

	// Double-digit seeds
	console.log('\n=== DOUBLE-DIGIT SEEDS (10+) PER ROUND ===');
	console.log('Round     | Simulated (avg ± std) | Historical (avg ± std)');
	console.log('----------|----------------------|----------------------');
	for (let round = 1; round <= 4; round++) {
		const sim = ddByRound[round];
		const [hAvg, hStd] = HISTORICAL_DD[round];
		const roundName = ['', 'R64', 'R32', 'S16', 'E8'][round];
		console.log(
			`${roundName.padEnd(10)}| ${avg(sim).toFixed(1)} ± ${stddev(sim).toFixed(1)}`.padEnd(35) +
			`| ${hAvg.toFixed(1)} ± ${hStd.toFixed(1)}`
		);
	}

	// Deepest round by seed
	console.log('\n=== AVG DEEPEST ROUND BY SEED ===');
	console.log('Seed | Simulated | Historical | Diff');
	console.log('-----|-----------|------------|-----');
	for (let seed = 1; seed <= 16; seed++) {
		const depths = seedDeepest[seed];
		const simAvg = depths.length > 0 ? avg(depths) : 0;
		const hAvg = HISTORICAL_DEPTH[seed];
		const diff = simAvg - hAvg;
		const flag = Math.abs(diff) > 0.5 ? (diff > 0 ? ' ⚠️ TOO DEEP' : ' ⚠️ TOO SHALLOW') : '';
		console.log(`  ${String(seed).padStart(2)} | ${simAvg.toFixed(2).padStart(9)} | ${hAvg.toFixed(2).padStart(10)} | ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}${flag}`);
	}

	// FF seed distribution
	console.log('\n=== FINAL FOUR SEED DISTRIBUTION ===');
	const ffSeedCounts: Record<number, number> = {};
	for (const s of ffSeeds) ffSeedCounts[s] = (ffSeedCounts[s] ?? 0) + 1;
	const ffTotal = ffSeeds.length;
	const sortedFF = Object.entries(ffSeedCounts).sort((a, b) => Number(a[0]) - Number(b[0]));
	// Historical FF appearance rates (2002-2025, 23 tournaments, 92 FF spots)
	const historicalFFPct: Record<number, number> = {
		1: 41.3, 2: 15.2, 3: 14.1, 4: 8.7, 5: 7.6, 6: 2.2, 7: 3.3, 8: 4.3,
		9: 1.1, 10: 0, 11: 2.2, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0,
	};
	console.log('Seed | Simulated | Historical');
	for (const [seed, count] of sortedFF) {
		const simPct = (count / ffTotal) * 100;
		const hPct = historicalFFPct[Number(seed)] ?? 0;
		console.log(`  ${seed.padStart(2)} | ${simPct.toFixed(1).padStart(7)}% | ${hPct.toFixed(1).padStart(7)}%`);
	}

	await pool.end();
}

main().catch(console.error);
