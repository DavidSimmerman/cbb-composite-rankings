import { ESPN_TEAM_IDS } from './espn-team-ids';

// Build reverse map: ESPN ID -> team_key
const ESPN_ID_TO_TEAM_KEY: Record<string, string> = {};
for (const [teamKey, espnId] of Object.entries(ESPN_TEAM_IDS)) {
	ESPN_ID_TO_TEAM_KEY[espnId] = teamKey;
}

export interface ScoreboardTeam {
	espnId: string;
	name: string;
	shortName: string;
	abbreviation: string;
	logo: string;
	conferenceId: string;
	color: string;
	score: number | undefined;
	record: string;
	curatedRank: number | undefined;
	teamKey: string | undefined;
}

export interface ScoreboardGame {
	id: string;
	shortName: string;
	date: string;
	startDate: string;
	status: {
		state: 'pre' | 'in' | 'post';
		detail: string;
		shortDetail: string;
		displayClock: string;
		period: number;
	};
	homeTeam: ScoreboardTeam;
	awayTeam: ScoreboardTeam;
	conference: {
		id: string;
		name: string;
		shortName: string;
	};
	broadcast: string;
	odds: { spread: string; overUnder: string } | undefined;
}

export interface ScoreboardGameEnriched extends ScoreboardGame {
	homeTeamRating: number | undefined;
	awayTeamRating: number | undefined;
	highestRating: number;
	averageRating: number;
	spread: number;
}

function parseCompetitor(competitor: any): ScoreboardTeam {
	const team = competitor.team;
	const record = competitor.records?.find((r: any) => r.type === 'total')?.summary ?? '';
	const curatedRank = competitor.curatedRank?.current;
	return {
		espnId: team.id,
		name: team.shortDisplayName || team.location,
		shortName: team.abbreviation,
		abbreviation: team.abbreviation,
		logo: team.logo,
		conferenceId: team.conferenceId || '',
		color: team.color || '333333',
		score: competitor.score ? parseInt(competitor.score, 10) : undefined,
		record,
		curatedRank: curatedRank && curatedRank <= 25 ? curatedRank : undefined,
		teamKey: ESPN_ID_TO_TEAM_KEY[team.id]
	};
}

function parseEvent(event: any): ScoreboardGame {
	const competition = event.competitions[0];
	const status = event.status || competition.status;
	const homeCompetitor = competition.competitors.find((c: any) => c.homeAway === 'home') || competition.competitors[0];
	const awayCompetitor = competition.competitors.find((c: any) => c.homeAway === 'away') || competition.competitors[1];

	const groups = competition.groups || {};
	const odds = competition.odds?.[0];
	let parsedOdds: ScoreboardGame['odds'];
	if (odds) {
		parsedOdds = {
			spread: odds.pointSpread?.home?.close?.line || odds.details || '',
			overUnder: odds.overUnder?.close?.line || odds.overUnder?.toString() || ''
		};
	}

	return {
		id: event.id,
		shortName: event.shortName,
		date: event.date,
		startDate: competition.startDate || event.date,
		status: {
			state: status.type.state,
			detail: status.type.detail,
			shortDetail: status.type.shortDetail,
			displayClock: status.displayClock,
			period: status.period
		},
		homeTeam: parseCompetitor(homeCompetitor),
		awayTeam: parseCompetitor(awayCompetitor),
		conference: {
			id: groups.id || '',
			name: groups.name || '',
			shortName: groups.shortName || ''
		},
		broadcast: competition.broadcast || competition.broadcasts?.[0]?.names?.[0] || '',
		odds: parsedOdds
	};
}

export async function getScoreboard(date: string): Promise<ScoreboardGame[]> {
	const url = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${date}&groups=50&tz=America%2FNew_York`;
	const res = await fetch(url, { next: { revalidate: 30 } });
	if (!res.ok) {
		throw new Error(`Failed to fetch scoreboard: ${res.status}`);
	}
	const data = await res.json();
	return (data.events || []).map(parseEvent);
}
