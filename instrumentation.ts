export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const cron = await import('node-cron');
		const { updateRankings } = await import('./lib/rankings/rankings');

		cron.schedule('0 0,2,6,12,14,17,19,20,21,22,23 * * *', () => {
			updateRankings(['kenpom', 'evanmiya', 'barttorvik', 'net']);
		});

		cron.schedule('0 15,16 * * 0,6', () => {
			updateRankings(['kenpom', 'evanmiya', 'barttorvik', 'net']);
		});

		const { updateApPollRankings } = await import('./lib/espn/ap-poll');

		cron.schedule('0 14,15,16,17 * * 1', () => {
			updateApPollRankings();
		});

		const { updateEspnStats } = await import('./lib/espn/espn-stats');

		cron.schedule('0 6 * * *', () => {
			updateEspnStats();
		});
	}
}
