export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { updateRankings } = await import('./lib/rankings/rankings');
		// updateRankings(['kenpom', 'evanmiya', 'barttorvik', 'net']);
	}
}
