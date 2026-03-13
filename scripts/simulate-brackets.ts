/**
 * Quick simulation to validate bracket auto-fill against historical tournament data.
 * Run with: npx tsx scripts/simulate-brackets.ts
 *
 * Generates N brackets and reports:
 * - Average upsets per round vs historical
 * - Average double-digit seeds per round vs historical
 * - Deepest run frequency by seed
 * - Final Four seed distribution
 */

import { getBracketPageData } from '@/lib/rankings/profile';
import { initializeBracket, autoFillBracket, ROUND_NAMES } from '@/lib/bracket/predictions';
import { HISTORICAL_UPSETS, HISTORICAL_DD, HISTORICAL_DEPTH } from './historical-benchmarks';

const NUM_SIMULATIONS = 20;

// Per-bracket detail storage
interface BracketDetail {
	simNum: number;
	upsetsByRound: Record<number, Array<{ winnerSeed: number; loserSeed: number }>>;
	ffSeedList: number[];
	champSeed: number | null;
}

async function main() {
	console.log('Loading bracket data...');
	const data = await getBracketPageData();
	console.log(`Loaded ${data.bracket_teams.length} teams\n`);

	// Tracking stats
	const upsetsByRound: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
	const ddByRound: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
	const seedDeepest: Record<number, number[]> = {};
	const ffSeeds: number[] = [];
	const champSeeds: number[] = [];
	for (let s = 1; s <= 16; s++) seedDeepest[s] = [];

	const bracketDetails: BracketDetail[] = [];

	console.log(`Running ${NUM_SIMULATIONS} simulations...\n`);
	const start = Date.now();

	for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
		// Initialize with random region assignments
		const state = initializeBracket(data.bracket_teams);

		// Auto-fill entire bracket
		const filled = autoFillBracket(
			state,
			data.seed_round_stats,
			data.cross_seed_patterns,
		);

		// Analyze results
		const games = [...filled.values()];

		// Per-bracket detail
		const detail: BracketDetail = {
			simNum: sim + 1,
			upsetsByRound: { 1: [], 2: [], 3: [], 4: [] },
			ffSeedList: [],
			champSeed: null,
		};

		// Count upsets per round
		for (let round = 1; round <= 6; round++) {
			const roundGames = games.filter(g => g.round === round && g.winner);
			let upsets = 0;
			let ddWins = 0;
			for (const g of roundGames) {
				if (!g.teamA || !g.teamB) continue;
				const winnerSeed = g.teamA.team_key === g.winner ? g.teamA.seed : g.teamB.seed;
				const loserSeed = g.teamA.team_key === g.winner ? g.teamB.seed : g.teamA.seed;
				if (winnerSeed > loserSeed) {
					upsets++;
					if (round <= 4) {
						detail.upsetsByRound[round].push({ winnerSeed, loserSeed });
					}
				}
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

		// Track Final Four and Championship seeds
		const ffGames = games.filter(g => g.round === 5 && g.teamA && g.teamB);
		for (const g of ffGames) {
			if (g.teamA) {
				ffSeeds.push(g.teamA.seed);
				detail.ffSeedList.push(g.teamA.seed);
			}
			if (g.teamB) {
				ffSeeds.push(g.teamB.seed);
				detail.ffSeedList.push(g.teamB.seed);
			}
		}
		const champGame = games.find(g => g.round === 6 && g.winner);
		if (champGame) {
			const champSeed = champGame.teamA?.team_key === champGame.winner
				? champGame.teamA?.seed : champGame.teamB?.seed;
			if (champSeed) {
				champSeeds.push(champSeed);
				detail.champSeed = champSeed;
			}
		}

		bracketDetails.push(detail);

		// Print per-bracket detail
		const roundNames: Record<number, string> = { 1: 'R64', 2: 'R32', 3: 'S16', 4: 'E8' };
		console.log(`--- Bracket #${sim + 1} ---`);
		for (const round of [1, 2, 3, 4]) {
			const ups = detail.upsetsByRound[round];
			const matchupStr = ups.length > 0
				? ups.map(u => `${u.winnerSeed}>${u.loserSeed}`).join(', ')
				: 'none';
			console.log(`  ${roundNames[round]} upsets (${ups.length}): ${matchupStr}`);
		}
		const ffSorted = [...detail.ffSeedList].sort((a, b) => a - b);
		console.log(`  Final Four seeds: ${ffSorted.join(', ')}`);
		console.log(`  Champion seed: ${detail.champSeed ?? '?'}`);
		console.log();
	}

	const elapsed = Date.now() - start;
	console.log(`Done in ${(elapsed / 1000).toFixed(1)}s\n`);

	// === PER-20-BRACKETS SUMMARY ===
	let chalky = 0;   // all seeds 1-4
	let mildChaos = 0; // at least one seed 5+
	let wild = 0;     // at least one seed 7+
	let totalOneSeedsInFF = 0;
	const champSeedDist: Record<number, number> = {};

	for (const d of bracketDetails) {
		const ffMax = Math.max(...d.ffSeedList);
		const ffHas5Plus = d.ffSeedList.some(s => s >= 5);
		const ffHas7Plus = d.ffSeedList.some(s => s >= 7);
		const oneSeeds = d.ffSeedList.filter(s => s === 1).length;
		totalOneSeedsInFF += oneSeeds;
		if (!ffHas5Plus) chalky++;
		if (ffHas5Plus) mildChaos++;
		if (ffHas7Plus) wild++;
		if (d.champSeed != null) {
			champSeedDist[d.champSeed] = (champSeedDist[d.champSeed] ?? 0) + 1;
		}
	}

	console.log('=== 20-BRACKET SUMMARY ===');
	console.log(`Chalky Final Fours (all seeds 1-4): ${chalky}/${NUM_SIMULATIONS} (${(chalky / NUM_SIMULATIONS * 100).toFixed(0)}%)`);
	console.log(`Mild chaos (at least one seed 5+):  ${mildChaos}/${NUM_SIMULATIONS} (${(mildChaos / NUM_SIMULATIONS * 100).toFixed(0)}%)`);
	console.log(`Wild (at least one seed 7+):         ${wild}/${NUM_SIMULATIONS} (${(wild / NUM_SIMULATIONS * 100).toFixed(0)}%)`);
	console.log(`Avg 1-seeds in Final Four: ${(totalOneSeedsInFF / NUM_SIMULATIONS).toFixed(2)} (historical ~1.7)`);
	console.log('\nChampion seed distribution:');
	const sortedChampDist = Object.entries(champSeedDist).sort((a, b) => Number(a[0]) - Number(b[0]));
	for (const [seed, count] of sortedChampDist) {
		console.log(`  Seed ${seed}: ${count}/${NUM_SIMULATIONS} (${(count / NUM_SIMULATIONS * 100).toFixed(0)}%)`);
	}
	console.log();

	// Report
	const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
	const stddev = (arr: number[]) => {
		const m = avg(arr);
		return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
	};

	// Track total upsets per bracket to find extremes
	const totalUpsets: number[] = [];
	for (let i = 0; i < NUM_SIMULATIONS; i++) {
		let total = 0;
		for (let round = 1; round <= 6; round++) {
			total += upsetsByRound[round][i];
		}
		totalUpsets.push(total);
	}
	totalUpsets.sort((a, b) => a - b);
	console.log(`=== TOTAL UPSETS PER BRACKET ===`);
	console.log(`Min: ${totalUpsets[0]}, P5: ${totalUpsets[Math.floor(NUM_SIMULATIONS * 0.05)]}, ` +
		`Avg: ${avg(totalUpsets).toFixed(1)}, P95: ${totalUpsets[Math.floor(NUM_SIMULATIONS * 0.95)]}, ` +
		`Max: ${totalUpsets[totalUpsets.length - 1]}\n`);

	console.log('=== UPSETS PER ROUND ===');
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

	console.log('\n=== AVG DEEPEST ROUND BY SEED ===');
	console.log('Seed | Simulated | Historical');
	console.log('-----|-----------|----------');
	for (let seed = 1; seed <= 16; seed++) {
		const depths = seedDeepest[seed];
		const simAvg = depths.length > 0 ? avg(depths) : 0;
		const hAvg = HISTORICAL_DEPTH[seed];
		const diff = simAvg - hAvg;
		const flag = Math.abs(diff) > 0.5 ? (diff > 0 ? ' ⚠️ TOO DEEP' : ' ⚠️ TOO SHALLOW') : '';
		console.log(`  ${String(seed).padStart(2)} | ${simAvg.toFixed(2).padStart(9)} | ${hAvg.toFixed(2).padStart(9)}${flag}`);
	}

	console.log('\n=== FINAL FOUR SEED DISTRIBUTION ===');
	const ffSeedCounts: Record<number, number> = {};
	for (const s of ffSeeds) ffSeedCounts[s] = (ffSeedCounts[s] ?? 0) + 1;
	const ffTotal = ffSeeds.length;
	const sortedFF = Object.entries(ffSeedCounts).sort((a, b) => Number(a[0]) - Number(b[0]));
	for (const [seed, count] of sortedFF) {
		console.log(`  Seed ${seed.padStart(2)}: ${((count / ffTotal) * 100).toFixed(1)}% (${count}/${ffTotal})`);
	}

	console.log('\n=== CHAMPION SEED DISTRIBUTION ===');
	const champCounts: Record<number, number> = {};
	for (const s of champSeeds) champCounts[s] = (champCounts[s] ?? 0) + 1;
	const sortedChamp = Object.entries(champCounts).sort((a, b) => Number(a[0]) - Number(b[0]));
	for (const [seed, count] of sortedChamp) {
		console.log(`  Seed ${seed.padStart(2)}: ${((count / champSeeds.length) * 100).toFixed(1)}% (${count}/${champSeeds.length})`);
	}

	// Historical from DB (2002-2025): 1-seed ~70%, 2 ~9%, 3 ~13%, 4 ~4%, 7 ~4%
	console.log('\n  Historical (DB 2002-2025): 1-seed ~70%, 3-seed ~13%, 2-seed ~9%, 4/7 ~4% each');

	// Compute actual historical benchmarks from loaded data
	console.log('\n=== SEED ROUND STATS (from DB) ===');
	console.log('Seed | R64 win% | R32 win% | S16 win% | E8 win% | FF win% | Champ win%');
	for (let seed = 1; seed <= 16; seed++) {
		const stats = data.seed_round_stats[seed];
		if (!stats) continue;
		const rounds = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];
		const pcts = rounds.map(r => {
			const s = stats[r];
			return s ? (s.win_pct * 100).toFixed(1).padStart(6) : '   N/A';
		});
		console.log(`  ${String(seed).padStart(2)} | ${pcts.join(' | ')}`);
	}

	console.log('\n=== CROSS SEED PATTERNS (favorites winning per round, out of ~4 games) ===');
	console.log('Seed | R64 mean | R32 mean | S16 mean | E8 mean');
	for (let seed = 1; seed <= 8; seed++) {
		const dist = data.cross_seed_patterns.distributions[seed];
		if (!dist) continue;
		const rounds = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8'];
		const means = rounds.map(r => {
			const d = dist[r];
			return d ? d.mean.toFixed(2).padStart(8) : '     N/A';
		});
		console.log(`  ${String(seed).padStart(2)} | ${means.join(' | ')}`);
	}
}

main().catch(console.error);
