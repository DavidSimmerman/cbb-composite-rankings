import * as cheerio from 'cheerio';
import { CompiledTeamData } from '../shared';
import { ESPN_TEAM_IDS } from './espn-team-ids';

export interface EspnGame {
	game_id: string;
	date: string;
	homeAway: 'home' | 'away' | 'neutral';
	opp: string;
	won: boolean | undefined;
	score: string | undefined;
	time: string | undefined;
	is_live: boolean;
}

export type ParsedEspnGame = Omit<EspnGame, 'opp'> & { opp: CompiledTeamData; espn_id: string };

export async function getSchedule(teamKey: string) {
	const teamId = ESPN_TEAM_IDS[teamKey];

	const games = await fetchEspnSchedule(teamId);

	return games;
}

async function fetchEspnSchedule(teamId: string): Promise<EspnGame[]> {
	const res = await fetch(`https://www.espn.com/mens-college-basketball/team/schedule/_/id/${teamId}`);
	const html = await res.text();
	const $ = cheerio.load(html);

	return $('.Table__TR.Table__TR--sm')
		.toArray()
		.slice(2)
		.filter(r => $(r).find('.opponent-logo').length > 0)
		.map(r => {
			const $r = $(r);

			const gameId = $r
				.find('[href*="/gameId/"], [href*="gameId="]')
				.attr('href')
				?.match(/[?&/]gameId[/=](?<id>[^/&]+)/)?.groups?.id;

			const dateString = $r.find('[data-testid="date"]').text();
			const year = new Date().getFullYear();
			const dateObj = new Date(`${dateString}, ${year}`);
			const date = dateObj.toISOString().split('T')[0];

			const opp =
				$r
					.find('.opponent-logo a')
					.attr('href')
					?.match(/\/id\/(?<id>[^/]+)/)?.groups?.id ?? $r.find('.opponent-logo span:last-of-type').text();

			const vsAt = $r.find('.opponent-logo .pr2').text().trim();

			const neutNode = $r.find('.opponent-logo span:last-of-type').contents().last().text();

			let homeAway;

			if (vsAt === '@') {
				homeAway = 'away';
			} else if (neutNode === '*') {
				homeAway = 'neutral';
			} else {
				homeAway = 'home';
			}

			const score = $r.find('.ml4').text().trim() || undefined;
			const winLoss = $r.find('.fw-bold.clr-positive, .fw-bold.clr-negative').text();

			let won;

			if (winLoss === 'W') {
				won = true;
			} else if (winLoss === 'L') {
				won = false;
			}

			const timeText = $r.find('[data-testid="time"]').text().trim();
			const isLive = timeText === 'LIVE';
			const time = !isLive ? timeText : undefined;

			return { game_id: gameId, date, homeAway, opp, won, score, time, is_live: isLive } as EspnGame;
		});
}
