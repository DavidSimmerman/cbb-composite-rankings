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

		const { saveScoreboardGames, refreshSlate } = await import('./lib/espn/scoreboard');

		// Current betting lines and pre-game model predictions for today's and tomorrow's games
		// (Eastern dates), so every game has a prediction saved before it tips off
		cron.schedule('20 * * * *', async () => {
			const etDate = (offsetDays: number) => {
				const d = new Date(Date.now() + offsetDays * 86_400_000);
				return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).replace(/-/g, '');
			};
			await refreshSlate(etDate(0));
			if (new Date().getHours() % 6 === 0) await refreshSlate(etDate(1));
		});

		cron.schedule('0 6 * * *', () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const date = yesterday.toISOString().split('T')[0].replace(/-/g, '');
			saveScoreboardGames(date);
		});

		const { updateTeamData } = await import('./lib/espn/espn-team-data');

		cron.schedule('0 0 1 * *', () => {
			updateTeamData();
		});
	}
}
