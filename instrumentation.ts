export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const cron = await import('node-cron');
		const { updateRankings } = await import('./lib/rankings/rankings');

		cron.schedule('0 6 * * *', () => {
			updateRankings(['kenpom', 'evanmiya', 'barttorvik', 'net']);
		});

		cron.schedule('0 12 * * 1', () => {
			updateRankings(['net']);
		});

		cron.schedule('0 14,17,19,20,21,22,23,12,2 * * *', () => {
			updateRankings(['kenpom', 'evanmiya', 'barttorvik']);
		});

		cron.schedule('0 15,16 * * 0,6', () => {
			updateRankings(['kenpom', 'evanmiya', 'barttorvik']);
		});
	}
}
