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

// https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=20260224&groups=50&tz=America%2FNew_York

// example response
const _response = {
	events: [
		// ongoing
		{
			id: '401820767',
			uid: 's:40~l:41~e:401820767',
			date: '2026-02-25T00:00Z',
			name: 'Duke Blue Devils at Notre Dame Fighting Irish',
			shortName: 'DUKE @ ND',
			season: {
				year: 2026,
				type: 2,
				slug: 'regular-season'
			},
			competitions: [
				{
					id: '401820767',
					uid: 's:40~l:41~e:401820767~c:401820767',
					date: '2026-02-25T00:00Z',
					attendance: 0,
					type: {
						id: '1',
						abbreviation: 'STD'
					},
					timeValid: true,
					neutralSite: false,
					conferenceCompetition: true,
					playByPlayAvailable: true,
					recent: true,
					venue: {
						id: '282',
						fullName: 'Purcell Pavilion',
						address: {
							city: 'South Bend',
							state: 'IN'
						},
						indoor: true
					},
					competitors: [
						{
							id: '87',
							uid: 's:40~l:41~t:87',
							type: 'team',
							order: 0,
							homeAway: 'home',
							team: {
								id: '87',
								uid: 's:40~l:41~t:87',
								location: 'Notre Dame',
								name: 'Fighting Irish',
								abbreviation: 'ND',
								displayName: 'Notre Dame Fighting Irish',
								shortDisplayName: 'Notre Dame',
								color: '062340',
								alternateColor: 'c99700',
								isActive: true,
								venue: {
									id: '282'
								},
								links: [
									{
										rel: ['clubhouse', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/_/id/87/notre-dame-fighting-irish',
										text: 'Clubhouse',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['roster', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/roster/_/id/87',
										text: 'Roster',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['stats', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/stats/_/id/87',
										text: 'Statistics',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['schedule', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/87',
										text: 'Schedule',
										isExternal: false,
										isPremium: false
									}
								],
								logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/87.png',
								conferenceId: '2'
							},
							score: '55',
							linescores: [
								{
									value: 22,
									displayValue: '22',
									period: 1
								},
								{
									value: 33,
									displayValue: '33',
									period: 2
								}
							],
							statistics: [
								{
									name: 'rebounds',
									abbreviation: 'REB',
									displayValue: '27'
								},
								{
									name: 'avgRebounds',
									abbreviation: 'REB',
									displayValue: '27.0'
								},
								{
									name: 'assists',
									abbreviation: 'AST',
									displayValue: '9'
								},
								{
									name: 'fieldGoalsAttempted',
									abbreviation: 'FGA',
									displayValue: '52'
								},
								{
									name: 'fieldGoalsMade',
									abbreviation: 'FGM',
									displayValue: '19'
								},
								{
									name: 'fieldGoalPct',
									abbreviation: 'FG%',
									displayValue: '36.5'
								},
								{
									name: 'freeThrowPct',
									abbreviation: 'FT%',
									displayValue: '58.8'
								},
								{
									name: 'freeThrowsAttempted',
									abbreviation: 'FTA',
									displayValue: '17'
								},
								{
									name: 'freeThrowsMade',
									abbreviation: 'FTM',
									displayValue: '10'
								},
								{
									name: 'points',
									abbreviation: 'PTS',
									displayValue: '55'
								},
								{
									name: 'threePointFieldGoalsAttempted',
									abbreviation: '3PA',
									displayValue: '26'
								},
								{
									name: 'threePointFieldGoalsMade',
									abbreviation: '3PM',
									displayValue: '7'
								},
								{
									name: 'avgPoints',
									abbreviation: 'PTS',
									displayValue: '55.0'
								},
								{
									name: 'avgAssists',
									abbreviation: 'AST',
									displayValue: '9.0'
								},
								{
									name: 'threePointFieldGoalPct',
									abbreviation: '3P%',
									displayValue: '26.9'
								}
							],
							leaders: [
								{
									name: 'points',
									displayName: 'Points',
									shortDisplayName: 'Pts',
									abbreviation: 'Pts',
									leaders: [
										{
											displayValue: '14',
											value: 14,
											athlete: {
												id: '5312256',
												fullName: 'Brady Koehler',
												displayName: 'Brady Koehler',
												shortName: 'B. Koehler',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5312256/brady-koehler'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5312256.png',
												jersey: '6',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '87'
												},
												active: true
											},
											team: {
												id: '87'
											}
										}
									]
								},
								{
									name: 'rebounds',
									displayName: 'Rebounds',
									shortDisplayName: 'Reb',
									abbreviation: 'Reb',
									leaders: [
										{
											displayValue: '7',
											value: 7,
											athlete: {
												id: '4702120',
												fullName: 'Carson Towt',
												displayName: 'Carson Towt',
												shortName: 'C. Towt',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/4702120/carson-towt'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4702120.png',
												jersey: '33',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '87'
												},
												active: true
											},
											team: {
												id: '87'
											}
										}
									]
								},
								{
									name: 'assists',
									displayName: 'Assists',
									shortDisplayName: 'Ast',
									abbreviation: 'Ast',
									leaders: [
										{
											displayValue: '2',
											value: 2,
											athlete: {
												id: '5137653',
												fullName: 'Sir Mohammed',
												displayName: 'Sir Mohammed',
												shortName: 'S. Mohammed',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5137653/sir-mohammed'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5137653.png',
												jersey: '13',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '87'
												},
												active: true
											},
											team: {
												id: '87'
											}
										}
									]
								},
								{
									name: 'rating',
									displayName: 'Rating',
									shortDisplayName: 'RAT',
									abbreviation: 'RAT',
									leaders: [
										{
											displayValue: '14 PTS',
											value: 22.200000762939453,
											athlete: {
												id: '5312256',
												fullName: 'Brady Koehler',
												displayName: 'Brady Koehler',
												shortName: 'B. Koehler',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5312256/brady-koehler'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5312256.png',
												jersey: '6',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '87'
												},
												active: true
											},
											team: {
												id: '87'
											}
										}
									]
								}
							],
							curatedRank: {
								current: 99
							},
							records: [
								{
									name: 'overall',
									abbreviation: 'Season',
									type: 'total',
									summary: '12-15'
								},
								{
									name: 'Home',
									abbreviation: 'Home',
									type: 'home',
									summary: '9-5'
								},
								{
									name: 'Road',
									abbreviation: 'AWAY',
									type: 'road',
									summary: '2-8'
								},
								{
									name: 'vs. Conf.',
									abbreviation: 'VS CONF',
									type: 'vsconf',
									summary: '3-11'
								}
							]
						},
						{
							id: '150',
							uid: 's:40~l:41~t:150',
							type: 'team',
							order: 1,
							homeAway: 'away',
							team: {
								id: '150',
								uid: 's:40~l:41~t:150',
								location: 'Duke',
								name: 'Blue Devils',
								abbreviation: 'DUKE',
								displayName: 'Duke Blue Devils',
								shortDisplayName: 'Duke',
								color: '00539b',
								alternateColor: 'ffffff',
								isActive: true,
								venue: {
									id: '1914'
								},
								links: [
									{
										rel: ['clubhouse', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/_/id/150/duke-blue-devils',
										text: 'Clubhouse',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['roster', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/roster/_/id/150',
										text: 'Roster',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['stats', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/stats/_/id/150',
										text: 'Statistics',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['schedule', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/150',
										text: 'Schedule',
										isExternal: false,
										isPremium: false
									}
								],
								logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png',
								conferenceId: '2'
							},
							score: '98',
							linescores: [
								{
									value: 54,
									displayValue: '54',
									period: 1
								},
								{
									value: 44,
									displayValue: '44',
									period: 2
								}
							],
							statistics: [
								{
									name: 'rebounds',
									abbreviation: 'REB',
									displayValue: '48'
								},
								{
									name: 'avgRebounds',
									abbreviation: 'REB',
									displayValue: '48.0'
								},
								{
									name: 'assists',
									abbreviation: 'AST',
									displayValue: '20'
								},
								{
									name: 'fieldGoalsAttempted',
									abbreviation: 'FGA',
									displayValue: '59'
								},
								{
									name: 'fieldGoalsMade',
									abbreviation: 'FGM',
									displayValue: '27'
								},
								{
									name: 'fieldGoalPct',
									abbreviation: 'FG%',
									displayValue: '45.8'
								},
								{
									name: 'freeThrowPct',
									abbreviation: 'FT%',
									displayValue: '88.9'
								},
								{
									name: 'freeThrowsAttempted',
									abbreviation: 'FTA',
									displayValue: '36'
								},
								{
									name: 'freeThrowsMade',
									abbreviation: 'FTM',
									displayValue: '32'
								},
								{
									name: 'points',
									abbreviation: 'PTS',
									displayValue: '98'
								},
								{
									name: 'threePointFieldGoalsAttempted',
									abbreviation: '3PA',
									displayValue: '33'
								},
								{
									name: 'threePointFieldGoalsMade',
									abbreviation: '3PM',
									displayValue: '12'
								},
								{
									name: 'avgPoints',
									abbreviation: 'PTS',
									displayValue: '98.0'
								},
								{
									name: 'avgAssists',
									abbreviation: 'AST',
									displayValue: '20.0'
								},
								{
									name: 'threePointFieldGoalPct',
									abbreviation: '3P%',
									displayValue: '36.4'
								}
							],
							leaders: [
								{
									name: 'points',
									displayName: 'Points',
									shortDisplayName: 'Pts',
									abbreviation: 'Pts',
									leaders: [
										{
											displayValue: '24',
											value: 24,
											athlete: {
												id: '5041935',
												fullName: 'Cameron Boozer',
												displayName: 'Cameron Boozer',
												shortName: 'C. Boozer',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5041935/cameron-boozer'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5041935.png',
												jersey: '12',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '150'
												},
												active: true
											},
											team: {
												id: '150'
											}
										}
									]
								},
								{
									name: 'rebounds',
									displayName: 'Rebounds',
									shortDisplayName: 'Reb',
									abbreviation: 'Reb',
									leaders: [
										{
											displayValue: '13',
											value: 13,
											athlete: {
												id: '5041935',
												fullName: 'Cameron Boozer',
												displayName: 'Cameron Boozer',
												shortName: 'C. Boozer',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5041935/cameron-boozer'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5041935.png',
												jersey: '12',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '150'
												},
												active: true
											},
											team: {
												id: '150'
											}
										}
									]
								},
								{
									name: 'assists',
									displayName: 'Assists',
									shortDisplayName: 'Ast',
									abbreviation: 'Ast',
									leaders: [
										{
											displayValue: '4',
											value: 4,
											athlete: {
												id: '5041937',
												fullName: 'Cayden Boozer',
												displayName: 'Cayden Boozer',
												shortName: 'C. Boozer',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5041937/cayden-boozer'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5041937.png',
												jersey: '2',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '150'
												},
												active: true
											},
											team: {
												id: '150'
											}
										}
									]
								},
								{
									name: 'rating',
									displayName: 'Rating',
									shortDisplayName: 'RAT',
									abbreviation: 'RAT',
									leaders: [
										{
											displayValue: '24 PTS, 13 REB, 3 STL',
											value: 47.79999923706055,
											athlete: {
												id: '5041935',
												fullName: 'Cameron Boozer',
												displayName: 'Cameron Boozer',
												shortName: 'C. Boozer',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5041935/cameron-boozer'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5041935.png',
												jersey: '12',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '150'
												},
												active: true
											},
											team: {
												id: '150'
											}
										}
									]
								}
							],
							curatedRank: {
								current: 1
							},
							records: [
								{
									name: 'overall',
									abbreviation: 'Season',
									type: 'total',
									summary: '25-2'
								},
								{
									name: 'Home',
									abbreviation: 'Home',
									type: 'home',
									summary: '13-0'
								},
								{
									name: 'Road',
									abbreviation: 'AWAY',
									type: 'road',
									summary: '8-1'
								},
								{
									name: 'vs. Conf.',
									abbreviation: 'VS CONF',
									type: 'vsconf',
									summary: '13-1'
								}
							]
						}
					],
					notes: [],
					situation: {
						lastPlay: {
							id: '401820767119450643',
							type: {
								id: '598',
								text: 'Lost Ball Turnover'
							},
							text: 'Ryder Frost bad pass\nturnover',
							scoreValue: 0,
							team: {
								id: '87'
							},
							probability: {
								tiePercentage: 0,
								homeWinPercentage: 0.001,
								awayWinPercentage: 0.999
							},
							athletesInvolved: [
								{
									id: '5312257',
									fullName: 'Ryder Frost',
									displayName: 'Ryder Frost',
									shortName: 'R. Frost',
									links: [
										{
											rel: ['playercard', 'desktop', 'athlete'],
											href: 'https://www.espn.com/mens-college-basketball/player/_/id/5312257/ryder-frost'
										}
									],
									headshot:
										'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5312257.png',
									jersey: '7',
									position: 'F',
									team: {
										id: '87'
									}
								}
							]
						}
					},
					status: {
						clock: 37,
						displayClock: '0:37',
						period: 2,
						type: {
							id: '2',
							name: 'STATUS_IN_PROGRESS',
							state: 'in',
							completed: false,
							description: 'In Progress',
							detail: '0:37 - 2nd Half',
							shortDetail: '0:37 - 2nd'
						}
					},
					broadcasts: [
						{
							market: 'national',
							names: ['ESPN']
						}
					],
					groups: {
						id: '2',
						name: 'Atlantic Coast Conference',
						shortName: 'ACC',
						isConference: true
					},
					format: {
						regulation: {
							periods: 2
						}
					},
					startDate: '2026-02-25T00:00Z',
					broadcast: 'ESPN',
					geoBroadcasts: [
						{
							type: {
								id: '1',
								shortName: 'TV'
							},
							market: {
								id: '1',
								type: 'National'
							},
							media: {
								shortName: 'ESPN',
								logo: 'https://a.espncdn.com/guid/335fd2d2-97b9-336b-81ee-573eb6bdcffc/logos/default.png',
								darkLogo: ''
							},
							lang: 'en',
							region: 'us'
						}
					],
					highlights: []
				}
			],
			links: [
				{
					language: 'en-US',
					rel: ['live', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/game?gameId=401820767',
					text: 'Gamecast',
					shortText: 'Gamecast',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['boxscore', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/boxscore/_/gameId/401820767',
					text: 'Box Score',
					shortText: 'Box Score',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['highlights', 'desktop'],
					href: 'https://www.espn.com/mens-college-basketball/video?gameId=401820767',
					text: 'Highlights',
					shortText: 'Highlights',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['pbp', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/playbyplay/_/gameId/401820767',
					text: 'Play-by-Play',
					shortText: 'Play-by-Play',
					isExternal: false,
					isPremium: false
				}
			],
			status: {
				clock: 37,
				displayClock: '0:37',
				period: 2,
				type: {
					id: '2',
					name: 'STATUS_IN_PROGRESS',
					state: 'in',
					completed: false,
					description: 'In Progress',
					detail: '0:37 - 2nd Half',
					shortDetail: '0:37 - 2nd'
				}
			}
		},
		// completed
		{
			id: '401814583',
			uid: 's:40~l:41~e:401814583',
			date: '2026-02-24T23:30Z',
			name: 'Miami (OH) RedHawks at Eastern Michigan Eagles',
			shortName: 'M-OH @ EMU',
			season: {
				year: 2026,
				type: 2,
				slug: 'regular-season'
			},
			competitions: [
				{
					id: '401814583',
					uid: 's:40~l:41~e:401814583~c:401814583',
					date: '2026-02-24T23:30Z',
					attendance: 3136,
					type: {
						id: '1',
						abbreviation: 'STD'
					},
					timeValid: true,
					neutralSite: false,
					conferenceCompetition: true,
					playByPlayAvailable: true,
					recent: true,
					venue: {
						id: '2109',
						fullName: 'Gervin GameAbove Center',
						address: {
							city: 'Ypsilanti',
							state: 'MI'
						},
						indoor: true
					},
					competitors: [
						{
							id: '2199',
							uid: 's:40~l:41~t:2199',
							type: 'team',
							order: 0,
							homeAway: 'home',
							winner: false,
							team: {
								id: '2199',
								uid: 's:40~l:41~t:2199',
								location: 'Eastern Michigan',
								name: 'Eagles',
								abbreviation: 'EMU',
								displayName: 'Eastern Michigan Eagles',
								shortDisplayName: 'E Michigan',
								color: '006938',
								alternateColor: 'ffffff',
								isActive: true,
								venue: {
									id: '2109'
								},
								links: [
									{
										rel: ['clubhouse', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/_/id/2199/eastern-michigan-eagles',
										text: 'Clubhouse',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['roster', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/roster/_/id/2199',
										text: 'Roster',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['stats', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/stats/_/id/2199',
										text: 'Statistics',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['schedule', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/2199',
										text: 'Schedule',
										isExternal: false,
										isPremium: false
									}
								],
								logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2199.png',
								conferenceId: '14'
							},
							score: '64',
							linescores: [
								{
									value: 22,
									displayValue: '22',
									period: 1
								},
								{
									value: 42,
									displayValue: '42',
									period: 2
								}
							],
							statistics: [
								{
									name: 'rebounds',
									abbreviation: 'REB',
									displayValue: '44'
								},
								{
									name: 'avgRebounds',
									abbreviation: 'REB',
									displayValue: '44.0'
								},
								{
									name: 'assists',
									abbreviation: 'AST',
									displayValue: '12'
								},
								{
									name: 'fieldGoalsAttempted',
									abbreviation: 'FGA',
									displayValue: '61'
								},
								{
									name: 'fieldGoalsMade',
									abbreviation: 'FGM',
									displayValue: '21'
								},
								{
									name: 'fieldGoalPct',
									abbreviation: 'FG%',
									displayValue: '34.4'
								},
								{
									name: 'freeThrowPct',
									abbreviation: 'FT%',
									displayValue: '65.2'
								},
								{
									name: 'freeThrowsAttempted',
									abbreviation: 'FTA',
									displayValue: '23'
								},
								{
									name: 'freeThrowsMade',
									abbreviation: 'FTM',
									displayValue: '15'
								},
								{
									name: 'points',
									abbreviation: 'PTS',
									displayValue: '64'
								},
								{
									name: 'threePointFieldGoalsAttempted',
									abbreviation: '3PA',
									displayValue: '22'
								},
								{
									name: 'threePointFieldGoalsMade',
									abbreviation: '3PM',
									displayValue: '7'
								},
								{
									name: 'avgPoints',
									abbreviation: 'PTS',
									displayValue: '64.0'
								},
								{
									name: 'avgAssists',
									abbreviation: 'AST',
									displayValue: '12.0'
								},
								{
									name: 'threePointFieldGoalPct',
									abbreviation: '3P%',
									displayValue: '31.8'
								}
							],
							leaders: [
								{
									name: 'points',
									displayName: 'Points',
									shortDisplayName: 'Pts',
									abbreviation: 'Pts',
									leaders: [
										{
											displayValue: '29',
											value: 29,
											athlete: {
												id: '5313308',
												fullName: 'Gregory Lawson II',
												displayName: 'Gregory Lawson II',
												shortName: 'G. Lawson II',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5313308/gregory-lawson-ii'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5313308.png',
												jersey: '0',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '2199'
												},
												active: true
											},
											team: {
												id: '2199'
											}
										}
									]
								},
								{
									name: 'rebounds',
									displayName: 'Rebounds',
									shortDisplayName: 'Reb',
									abbreviation: 'Reb',
									leaders: [
										{
											displayValue: '10',
											value: 10,
											athlete: {
												id: '5242935',
												fullName: 'Godslove Nwabude',
												displayName: 'Godslove Nwabude',
												shortName: 'G. Nwabude',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5242935/godslove-nwabude'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5242935.png',
												jersey: '13',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '2199'
												},
												active: true
											},
											team: {
												id: '2199'
											}
										}
									]
								},
								{
									name: 'assists',
									displayName: 'Assists',
									shortDisplayName: 'Ast',
									abbreviation: 'Ast',
									leaders: [
										{
											displayValue: '7',
											value: 7,
											athlete: {
												id: '4592404',
												fullName: 'Addison Patterson',
												displayName: 'Addison Patterson',
												shortName: 'A. Patterson',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/4592404/addison-patterson'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4592404.png',
												jersey: '9',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '2199'
												},
												active: true
											},
											team: {
												id: '2199'
											}
										}
									]
								},
								{
									name: 'rating',
									displayName: 'Rating',
									shortDisplayName: 'RAT',
									abbreviation: 'RAT',
									leaders: [
										{
											displayValue: '29 PTS',
											value: 35.849998474121094,
											athlete: {
												id: '5313308',
												fullName: 'Gregory Lawson II',
												displayName: 'Gregory Lawson II',
												shortName: 'G. Lawson II',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5313308/gregory-lawson-ii'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5313308.png',
												jersey: '0',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '2199'
												},
												active: true
											},
											team: {
												id: '2199'
											}
										}
									]
								}
							],
							curatedRank: {
								current: 99
							},
							records: [
								{
									name: 'overall',
									abbreviation: 'Game',
									type: 'total',
									summary: '10-19'
								},
								{
									name: 'Home',
									type: 'home',
									summary: '7-6'
								},
								{
									name: 'Road',
									type: 'road',
									summary: '3-13'
								},
								{
									name: 'vs. Conf.',
									type: 'vsconf',
									summary: '4-12'
								}
							]
						},
						{
							id: '193',
							uid: 's:40~l:41~t:193',
							type: 'team',
							order: 1,
							homeAway: 'away',
							winner: true,
							team: {
								id: '193',
								uid: 's:40~l:41~t:193',
								location: 'Miami (OH)',
								name: 'RedHawks',
								abbreviation: 'M-OH',
								displayName: 'Miami (OH) RedHawks',
								shortDisplayName: 'Miami OH',
								color: 'c41230',
								alternateColor: 'ffffff',
								isActive: true,
								venue: {
									id: '2134'
								},
								links: [
									{
										rel: ['clubhouse', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/_/id/193/miami-oh-redhawks',
										text: 'Clubhouse',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['roster', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/roster/_/id/193',
										text: 'Roster',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['stats', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/stats/_/id/193',
										text: 'Statistics',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['schedule', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/193',
										text: 'Schedule',
										isExternal: false,
										isPremium: false
									}
								],
								logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/193.png',
								conferenceId: '14'
							},
							score: '74',
							linescores: [
								{
									value: 43,
									displayValue: '43',
									period: 1
								},
								{
									value: 31,
									displayValue: '31',
									period: 2
								}
							],
							statistics: [
								{
									name: 'rebounds',
									abbreviation: 'REB',
									displayValue: '46'
								},
								{
									name: 'avgRebounds',
									abbreviation: 'REB',
									displayValue: '46.0'
								},
								{
									name: 'assists',
									abbreviation: 'AST',
									displayValue: '11'
								},
								{
									name: 'fieldGoalsAttempted',
									abbreviation: 'FGA',
									displayValue: '69'
								},
								{
									name: 'fieldGoalsMade',
									abbreviation: 'FGM',
									displayValue: '28'
								},
								{
									name: 'fieldGoalPct',
									abbreviation: 'FG%',
									displayValue: '40.6'
								},
								{
									name: 'freeThrowPct',
									abbreviation: 'FT%',
									displayValue: '68.4'
								},
								{
									name: 'freeThrowsAttempted',
									abbreviation: 'FTA',
									displayValue: '19'
								},
								{
									name: 'freeThrowsMade',
									abbreviation: 'FTM',
									displayValue: '13'
								},
								{
									name: 'points',
									abbreviation: 'PTS',
									displayValue: '74'
								},
								{
									name: 'threePointFieldGoalsAttempted',
									abbreviation: '3PA',
									displayValue: '28'
								},
								{
									name: 'threePointFieldGoalsMade',
									abbreviation: '3PM',
									displayValue: '5'
								},
								{
									name: 'avgPoints',
									abbreviation: 'PTS',
									displayValue: '74.0'
								},
								{
									name: 'avgAssists',
									abbreviation: 'AST',
									displayValue: '11.0'
								},
								{
									name: 'threePointFieldGoalPct',
									abbreviation: '3P%',
									displayValue: '17.9'
								}
							],
							leaders: [
								{
									name: 'points',
									displayName: 'Points',
									shortDisplayName: 'Pts',
									abbreviation: 'Pts',
									leaders: [
										{
											displayValue: '16',
											value: 16,
											athlete: {
												id: '5243053',
												fullName: 'Brant Byers',
												displayName: 'Brant Byers',
												shortName: 'B. Byers',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5243053/brant-byers'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5243053.png',
												jersey: '22',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '193'
												},
												active: true
											},
											team: {
												id: '193'
											}
										}
									]
								},
								{
									name: 'rebounds',
									displayName: 'Rebounds',
									shortDisplayName: 'Reb',
									abbreviation: 'Reb',
									leaders: [
										{
											displayValue: '10',
											value: 10,
											athlete: {
												id: '5106674',
												fullName: 'Peter Suder',
												displayName: 'Peter Suder',
												shortName: 'P. Suder',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5106674/peter-suder'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5106674.png',
												jersey: '5',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '193'
												},
												active: true
											},
											team: {
												id: '193'
											}
										}
									]
								},
								{
									name: 'assists',
									displayName: 'Assists',
									shortDisplayName: 'Ast',
									abbreviation: 'Ast',
									leaders: [
										{
											displayValue: '4',
											value: 4,
											athlete: {
												id: '5101653',
												fullName: 'Luke Skaljac',
												displayName: 'Luke Skaljac',
												shortName: 'L. Skaljac',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5101653/luke-skaljac'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5101653.png',
												jersey: '3',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '193'
												},
												active: true
											},
											team: {
												id: '193'
											}
										}
									]
								},
								{
									name: 'rating',
									displayName: 'Rating',
									shortDisplayName: 'RAT',
									abbreviation: 'RAT',
									leaders: [
										{
											displayValue: '13 PTS, 10 REB, 3 STL',
											value: 32.849998474121094,
											athlete: {
												id: '5106674',
												fullName: 'Peter Suder',
												displayName: 'Peter Suder',
												shortName: 'P. Suder',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5106674/peter-suder'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5106674.png',
												jersey: '5',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '193'
												},
												active: true
											},
											team: {
												id: '193'
											}
										}
									]
								}
							],
							curatedRank: {
								current: 21
							},
							records: [
								{
									name: 'overall',
									abbreviation: 'Game',
									type: 'total',
									summary: '28-0'
								},
								{
									name: 'Home',
									type: 'home',
									summary: '15-0'
								},
								{
									name: 'Road',
									type: 'road',
									summary: '12-0'
								},
								{
									name: 'vs. Conf.',
									type: 'vsconf',
									summary: '15-0'
								}
							]
						}
					],
					notes: [],
					status: {
						clock: 0,
						displayClock: '0:00',
						period: 2,
						type: {
							id: '3',
							name: 'STATUS_FINAL',
							state: 'post',
							completed: true,
							description: 'Final',
							detail: 'Final',
							shortDetail: 'Final'
						}
					},
					broadcasts: [
						{
							market: 'national',
							names: ['ESPN+']
						}
					],
					groups: {
						id: '14',
						name: 'Mid-American Conference',
						shortName: 'MAC',
						isConference: true
					},
					format: {
						regulation: {
							periods: 2
						}
					},
					startDate: '2026-02-24T23:30Z',
					broadcast: 'ESPN+',
					geoBroadcasts: [
						{
							type: {
								id: '4',
								shortName: 'Streaming'
							},
							market: {
								id: '1',
								type: 'National'
							},
							media: {
								shortName: 'ESPN+',
								logo: 'https://a.espncdn.com/guid/322a7e47-3cdb-3b5c-ab1b-678e1f2c27e5/logos/default.png',
								darkLogo: 'https://a.espncdn.com/guid/322a7e47-3cdb-3b5c-ab1b-678e1f2c27e5/logos/default-dark.png'
							},
							lang: 'en',
							region: 'us'
						}
					],
					headlines: [
						{
							type: 'Recap',
							description:
								'— Brant Byers scored 16 points and Antwone Woolfolk added 14 as No. 21 Miami of Ohio beat Eastern Michigan 74-64 on Tuesday night to remain the only undefeated team in Division I men’s basketball.',
							shortLinkText:
								'No. 21 Miami (Ohio) remains only unbeaten Division I team with 74-64 win over Eastern Michigan',
							video: [
								{
									id: 48027074,
									source: 'espn',
									headline: 'Miami (OH) Redhawks vs. Eastern Michigan Eagles: Game Highlights',
									thumbnail:
										'https://a.espncdn.com/media/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.jpg',
									duration: 75,
									tracking: {
										sportName: 'basketball',
										leagueName: "NCAA Men's Basketball",
										coverageType: 'Final Game Highlight',
										trackingName:
											'NCB_One-Play (Miami (OH) Redhawks vs. Eastern Michigan Eagles: Game Highlights) 2026/02/24 ESHEET',
										trackingId:
											'dm_20260224_NCB_miami_oh_redhawks_vs_eastern_michigan_eagles_game_highlights',
										program: 'NCAA Mens Basketball'
									},
									deviceRestrictions: {
										type: 'whitelist',
										devices: ['settop', 'tablet', 'handset', 'ipad', 'desktop']
									},
									links: {
										web: {
											href: 'https://www.espn.com/video/clip?id=48027074',
											self: {
												href: 'https://www.espn.com/video/clip?id=48027074',
												dsi: {
													href: 'https://www.espn.com/video/clip?id=65d5f98d4e51d'
												}
											}
										},
										mobile: {
											source: {
												href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.mp4'
											},
											alert: {
												href: 'https://m.espn.com/general/video/videoAlert?vid=48027074'
											},
											streaming: {
												href: 'https://watch.auth.api.espn.com/video/auth/brightcove/362b6d98-1c98-4794-bcfc-0074957e81df/asset?UMADPARAMreferer=https://www.espn.com/video/clip?id=48027074'
											},
											progressiveDownload: {
												href: 'https://watch.auth.api.espn.com/video/auth/brightcove/362b6d98-1c98-4794-bcfc-0074957e81df/asset?UMADPARAMreferer=https://www.espn.com/video/clip?id=48027074'
											}
										},
										api: {
											self: {
												href: 'https://content.core.api.espn.com/v1/video/clips/48027074'
											},
											artwork: {
												href: 'https://artwork.api.espn.com/artwork/collections/media/362b6d98-1c98-4794-bcfc-0074957e81df'
											}
										},
										source: {
											href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_360p30_1464k.mp4',
											mezzanine: {
												href: 'https://media.video-origin.espn.com/espnvideo/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.mp4'
											},
											flash: {
												href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.smil'
											},
											hds: {
												href: 'https://hds.video-cdn.espn.com/z/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_rel.smil/manifest.f4m'
											},
											HLS: {
												'href': 'https://service-pkgespn.akamaized.net/opp/hls/espn/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8',
												'HD': {
													href: 'https://service-pkgespn.akamaized.net/opp/hls/espn/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8'
												},
												'cmaf': {
													'href': 'https://service-pkgespn.akamaized.net/opp/cmaf/espn/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8',
													'9x16': {
														href: 'https://service-pkgespn.akamaized.net/opp/cmaf/espn/9x16/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8'
													}
												},
												'9x16': {
													href: 'https://service-pkgespn.akamaized.net/opp/hls/espn/9x16/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8'
												},
												'shield': {
													href: 'https://watch.auth.api.espn.com/video/auth/media/362b6d98-1c98-4794-bcfc-0074957e81df/asset'
												}
											},
											HD: {
												href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_720p30_2896k.mp4'
											},
											full: {
												href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_360p30_1464k.mp4'
											}
										},
										sportscenter: {
											href: 'sportscenter://x-callback-url/showVideo?videoID=48027074&videoDSI=65d5f98d4e51d'
										}
									}
								}
							]
						}
					],
					highlights: [
						{
							id: 48027074,
							cerebroId: '699e51e8177b157a4e2613a7',
							source: 'espn',
							headline: 'Miami (OH) Redhawks vs. Eastern Michigan Eagles: Game Highlights',
							description: 'Miami (OH) Redhawks vs. Eastern Michigan Eagles: Game Highlights',
							lastModified: '2026-02-25T01:36:15Z',
							originalPublishDate: '2026-02-25T01:35:36Z',
							duration: 75,
							timeRestrictions: {
								embargoDate: '2026-02-25T01:35:33Z',
								expirationDate: '2038-01-01T04:59:59Z'
							},
							deviceRestrictions: {
								type: 'whitelist',
								devices: ['settop', 'tablet', 'handset', 'ipad', 'desktop']
							},
							thumbnail:
								'https://a.espncdn.com/media/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.jpg',
							links: {
								web: {
									href: 'https://www.espn.com/video/clip?id=48027074',
									self: {
										href: 'https://www.espn.com/video/clip?id=48027074',
										dsi: {
											href: 'https://www.espn.com/video/clip?id=65d5f98d4e51d'
										}
									}
								},
								mobile: {
									source: {
										href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.mp4'
									},
									alert: {
										href: 'https://m.espn.com/general/video/videoAlert?vid=48027074'
									},
									streaming: {
										href: 'https://watch.auth.api.espn.com/video/auth/brightcove/362b6d98-1c98-4794-bcfc-0074957e81df/asset?UMADPARAMreferer=https://www.espn.com/video/clip?id=48027074'
									},
									progressiveDownload: {
										href: 'https://watch.auth.api.espn.com/video/auth/brightcove/362b6d98-1c98-4794-bcfc-0074957e81df/asset?UMADPARAMreferer=https://www.espn.com/video/clip?id=48027074'
									}
								},
								api: {
									self: {
										href: 'https://content.core.api.espn.com/v1/video/clips/48027074'
									},
									artwork: {
										href: 'https://artwork.api.espn.com/artwork/collections/media/362b6d98-1c98-4794-bcfc-0074957e81df'
									}
								},
								source: {
									href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_360p30_1464k.mp4',
									mezzanine: {
										href: 'https://media.video-origin.espn.com/espnvideo/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.mp4'
									},
									flash: {
										href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2.smil'
									},
									hds: {
										href: 'https://hds.video-cdn.espn.com/z/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_rel.smil/manifest.f4m'
									},
									HLS: {
										'href': 'https://service-pkgespn.akamaized.net/opp/hls/espn/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8',
										'HD': {
											href: 'https://service-pkgespn.akamaized.net/opp/hls/espn/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8'
										},
										'cmaf': {
											'href': 'https://service-pkgespn.akamaized.net/opp/cmaf/espn/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8',
											'9x16': {
												href: 'https://service-pkgespn.akamaized.net/opp/cmaf/espn/9x16/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8'
											}
										},
										'9x16': {
											href: 'https://service-pkgespn.akamaized.net/opp/hls/espn/9x16/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2/playlist.m3u8'
										},
										'shield': {
											href: 'https://watch.auth.api.espn.com/video/auth/media/362b6d98-1c98-4794-bcfc-0074957e81df/asset'
										}
									},
									HD: {
										href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_720p30_2896k.mp4'
									},
									full: {
										href: 'https://media.video-cdn.espn.com/motion/wsc/2026/0225/dc8da6b8-de47-4413-a547-e38ffad868d2/dc8da6b8-de47-4413-a547-e38ffad868d2_360p30_1464k.mp4'
									}
								},
								sportscenter: {
									href: 'sportscenter://x-callback-url/showVideo?videoID=48027074&videoDSI=65d5f98d4e51d'
								}
							},
							ad: {
								sport: 'ncb',
								bundle: 'sportscenter'
							},
							tracking: {
								sportName: 'basketball',
								leagueName: "NCAA Men's Basketball",
								coverageType: 'Final Game Highlight',
								trackingName:
									'NCB_One-Play (Miami (OH) Redhawks vs. Eastern Michigan Eagles: Game Highlights) 2026/02/24 ESHEET',
								trackingId: 'dm_20260224_NCB_miami_oh_redhawks_vs_eastern_michigan_eagles_game_highlights',
								program: 'NCAA Mens Basketball'
							}
						}
					]
				}
			],
			links: [
				{
					language: 'en-US',
					rel: ['summary', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/game/_/gameId/401814583/miami-oh-e-michigan',
					text: 'Gamecast',
					shortText: 'Gamecast',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['boxscore', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/boxscore/_/gameId/401814583',
					text: 'Box Score',
					shortText: 'Box Score',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['highlights', 'desktop'],
					href: 'https://www.espn.com/mens-college-basketball/video?gameId=401814583',
					text: 'Highlights',
					shortText: 'Highlights',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['pbp', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/playbyplay/_/gameId/401814583',
					text: 'Play-by-Play',
					shortText: 'Play-by-Play',
					isExternal: false,
					isPremium: false
				},
				{
					language: 'en-US',
					rel: ['recap', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/recap?gameId=401814583',
					text: 'Recap',
					shortText: 'Recap',
					isExternal: false,
					isPremium: false
				}
			],
			status: {
				clock: 0,
				displayClock: '0:00',
				period: 2,
				type: {
					id: '3',
					name: 'STATUS_FINAL',
					state: 'post',
					completed: true,
					description: 'Final',
					detail: 'Final',
					shortDetail: 'Final'
				}
			}
		},
		// later (scheduled)
		{
			id: '401827701',
			uid: 's:40~l:41~e:401827701',
			date: '2026-02-25T04:00Z',
			name: 'UCF Knights at BYU Cougars',
			shortName: 'UCF @ BYU',
			season: {
				year: 2026,
				type: 2,
				slug: 'regular-season'
			},
			competitions: [
				{
					id: '401827701',
					uid: 's:40~l:41~e:401827701~c:401827701',
					date: '2026-02-25T04:00Z',
					attendance: 0,
					type: {
						id: '1',
						abbreviation: 'STD'
					},
					timeValid: true,
					neutralSite: false,
					conferenceCompetition: true,
					playByPlayAvailable: false,
					recent: false,
					venue: {
						id: '2108',
						fullName: 'Marriott Center',
						address: {
							city: 'Provo',
							state: 'UT'
						},
						indoor: true
					},
					competitors: [
						{
							id: '252',
							uid: 's:40~l:41~t:252',
							type: 'team',
							order: 0,
							homeAway: 'home',
							team: {
								id: '252',
								uid: 's:40~l:41~t:252',
								location: 'BYU',
								name: 'Cougars',
								abbreviation: 'BYU',
								displayName: 'BYU Cougars',
								shortDisplayName: 'BYU',
								color: '0047ba',
								alternateColor: '002e5d',
								isActive: true,
								venue: {
									id: '2108'
								},
								links: [
									{
										rel: ['clubhouse', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/_/id/252/byu-cougars',
										text: 'Clubhouse',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['roster', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/roster/_/id/252',
										text: 'Roster',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['stats', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/stats/_/id/252',
										text: 'Statistics',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['schedule', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/252',
										text: 'Schedule',
										isExternal: false,
										isPremium: false
									}
								],
								logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/252.png',
								conferenceId: '8'
							},
							score: '0',
							curatedRank: {
								current: 19
							},
							statistics: [
								{
									name: 'rebounds',
									abbreviation: 'REB',
									displayValue: '1059',
									rankDisplayValue: '3rd'
								},
								{
									name: 'avgRebounds',
									abbreviation: 'REB',
									displayValue: '39.2',
									rankDisplayValue: '48th'
								},
								{
									name: 'assists',
									abbreviation: 'AST',
									displayValue: '388',
									rankDisplayValue: 'Tied-189th'
								},
								{
									name: 'fieldGoalsAttempted',
									abbreviation: 'FGA',
									displayValue: '1682',
									rankDisplayValue: 'Tied-127th'
								},
								{
									name: 'fieldGoalsMade',
									abbreviation: 'FGM',
									displayValue: '813',
									rankDisplayValue: 'Tied-44th'
								},
								{
									name: 'fieldGoalPct',
									abbreviation: 'FG%',
									displayValue: '48.3',
									rankDisplayValue: '45th'
								},
								{
									name: 'freeThrowPct',
									abbreviation: 'FT%',
									displayValue: '74.3',
									rankDisplayValue: '215th'
								},
								{
									name: 'freeThrowsAttempted',
									abbreviation: 'FTA',
									displayValue: '599',
									rankDisplayValue: 'Tied-135th'
								},
								{
									name: 'freeThrowsMade',
									abbreviation: 'FTM',
									displayValue: '445',
									rankDisplayValue: 'Tied-112th'
								},
								{
									name: 'points',
									abbreviation: 'PTS',
									displayValue: '2309',
									rankDisplayValue: '52nd'
								},
								{
									name: 'threePointFieldGoalsAttempted',
									abbreviation: '3PA',
									displayValue: '675',
									rankDisplayValue: 'Tied-140th'
								},
								{
									name: 'threePointFieldGoalsMade',
									abbreviation: '3PM',
									displayValue: '238',
									rankDisplayValue: 'Tied-125th'
								},
								{
									name: 'avgPoints',
									abbreviation: 'PTS',
									displayValue: '85.5',
									rankDisplayValue: '24th'
								},
								{
									name: 'avgAssists',
									abbreviation: 'AST',
									displayValue: '14.4',
									rankDisplayValue: 'Tied-202nd'
								},
								{
									name: 'threePointFieldGoalPct',
									abbreviation: '3P%',
									displayValue: '35.3',
									rankDisplayValue: '186th'
								}
							],
							records: [
								{
									name: 'overall',
									abbreviation: 'Season',
									type: 'total',
									summary: '20-7'
								},
								{
									name: 'Home',
									abbreviation: 'Home',
									type: 'home',
									summary: '13-2'
								},
								{
									name: 'Road',
									abbreviation: 'AWAY',
									type: 'road',
									summary: '3-4'
								},
								{
									name: 'vs. Conf.',
									abbreviation: 'VS CONF',
									type: 'vsconf',
									summary: '8-6'
								}
							],
							leaders: [
								{
									name: 'pointsPerGame',
									displayName: 'Points Per Game',
									shortDisplayName: 'PPG',
									abbreviation: 'PTS',
									leaders: [
										{
											displayValue: '24.9',
											value: 24.925926208496094,
											athlete: {
												id: '5142718',
												fullName: 'AJ Dybantsa',
												displayName: 'AJ Dybantsa',
												shortName: 'A. Dybantsa',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5142718/aj-dybantsa'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5142718.png',
												jersey: '3',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '252'
												},
												active: true
											},
											team: {
												id: '252'
											}
										}
									]
								},
								{
									name: 'reboundsPerGame',
									displayName: 'Rebounds Per Game',
									shortDisplayName: 'RPG',
									abbreviation: 'REB',
									leaders: [
										{
											displayValue: '7.1',
											value: 7.119999885559082,
											athlete: {
												id: '5105647',
												fullName: 'Keba Keita',
												displayName: 'Keba Keita',
												shortName: 'K. Keita',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5105647/keba-keita'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5105647.png',
												jersey: '13',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '252'
												},
												active: true
											},
											team: {
												id: '252'
											}
										}
									]
								},
								{
									name: 'assistsPerGame',
									displayName: 'Assists Per Game',
									shortDisplayName: 'APG',
									abbreviation: 'AST',
									leaders: [
										{
											displayValue: '4.8',
											value: 4.777777671813965,
											athlete: {
												id: '5060709',
												fullName: 'Robert Wright III',
												displayName: 'Robert Wright III',
												shortName: 'R. Wright III',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5060709/robert-wright-iii'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5060709.png',
												jersey: '1',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '252'
												},
												active: true
											},
											team: {
												id: '252'
											}
										}
									]
								}
							]
						},
						{
							id: '2116',
							uid: 's:40~l:41~t:2116',
							type: 'team',
							order: 1,
							homeAway: 'away',
							team: {
								id: '2116',
								uid: 's:40~l:41~t:2116',
								location: 'UCF',
								name: 'Knights',
								abbreviation: 'UCF',
								displayName: 'UCF Knights',
								shortDisplayName: 'UCF',
								color: '000000',
								alternateColor: 'b4a169',
								isActive: true,
								venue: {
									id: '4484'
								},
								links: [
									{
										rel: ['clubhouse', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/_/id/2116/ucf-knights',
										text: 'Clubhouse',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['roster', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/roster/_/id/2116',
										text: 'Roster',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['stats', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/stats/_/id/2116',
										text: 'Statistics',
										isExternal: false,
										isPremium: false
									},
									{
										rel: ['schedule', 'desktop', 'team'],
										href: 'https://www.espn.com/mens-college-basketball/team/schedule/_/id/2116',
										text: 'Schedule',
										isExternal: false,
										isPremium: false
									}
								],
								logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2116.png',
								conferenceId: '8'
							},
							score: '0',
							curatedRank: {
								current: 99
							},
							statistics: [
								{
									name: 'rebounds',
									abbreviation: 'REB',
									displayValue: '957',
									rankDisplayValue: '159th'
								},
								{
									name: 'avgRebounds',
									abbreviation: 'REB',
									displayValue: '36.8',
									rankDisplayValue: '129th'
								},
								{
									name: 'assists',
									abbreviation: 'AST',
									displayValue: '415',
									rankDisplayValue: 'Tied-118th'
								},
								{
									name: 'fieldGoalsAttempted',
									abbreviation: 'FGA',
									displayValue: '1623',
									rankDisplayValue: 'Tied-219th'
								},
								{
									name: 'fieldGoalsMade',
									abbreviation: 'FGM',
									displayValue: '769',
									rankDisplayValue: 'Tied-117th'
								},
								{
									name: 'fieldGoalPct',
									abbreviation: 'FG%',
									displayValue: '47.4',
									rankDisplayValue: '69th'
								},
								{
									name: 'freeThrowPct',
									abbreviation: 'FT%',
									displayValue: '75.0',
									rankDisplayValue: 'Tied-166th'
								},
								{
									name: 'freeThrowsAttempted',
									abbreviation: 'FTA',
									displayValue: '488',
									rankDisplayValue: '311th'
								},
								{
									name: 'freeThrowsMade',
									abbreviation: 'FTM',
									displayValue: '366',
									rankDisplayValue: '278th'
								},
								{
									name: 'points',
									abbreviation: 'PTS',
									displayValue: '2117',
									rankDisplayValue: 'Tied-199th'
								},
								{
									name: 'threePointFieldGoalsAttempted',
									abbreviation: '3PA',
									displayValue: '569',
									rankDisplayValue: 'Tied-273rd'
								},
								{
									name: 'threePointFieldGoalsMade',
									abbreviation: '3PM',
									displayValue: '213',
									rankDisplayValue: 'Tied-189th'
								},
								{
									name: 'avgPoints',
									abbreviation: 'PTS',
									displayValue: '81.4',
									rankDisplayValue: '75th'
								},
								{
									name: 'avgAssists',
									abbreviation: 'AST',
									displayValue: '16.0',
									rankDisplayValue: '102nd'
								},
								{
									name: 'threePointFieldGoalPct',
									abbreviation: '3P%',
									displayValue: '37.4',
									rankDisplayValue: '75th'
								}
							],
							records: [
								{
									name: 'overall',
									abbreviation: 'Season',
									type: 'total',
									summary: '19-7'
								},
								{
									name: 'Home',
									abbreviation: 'Home',
									type: 'home',
									summary: '14-3'
								},
								{
									name: 'Road',
									abbreviation: 'AWAY',
									type: 'road',
									summary: '4-4'
								},
								{
									name: 'vs. Conf.',
									abbreviation: 'VS CONF',
									type: 'vsconf',
									summary: '8-6'
								}
							],
							leaders: [
								{
									name: 'pointsPerGame',
									displayName: 'Points Per Game',
									shortDisplayName: 'PPG',
									abbreviation: 'PTS',
									leaders: [
										{
											displayValue: '14.0',
											value: 14.039999961853027,
											athlete: {
												id: '5105529',
												fullName: 'Riley Kugel',
												displayName: 'Riley Kugel',
												shortName: 'R. Kugel',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5105529/riley-kugel'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5105529.png',
												jersey: '2',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '2116'
												},
												active: true
											},
											team: {
												id: '2116'
											}
										}
									]
								},
								{
									name: 'reboundsPerGame',
									displayName: 'Rebounds Per Game',
									shortDisplayName: 'RPG',
									abbreviation: 'REB',
									leaders: [
										{
											displayValue: '7.8',
											value: 7.791666507720947,
											athlete: {
												id: '5241667',
												fullName: 'Jamichael Stillwell',
												displayName: 'Jamichael Stillwell',
												shortName: 'J. Stillwell',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/5241667/jamichael-stillwell'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/5241667.png',
												jersey: '4',
												position: {
													abbreviation: 'F'
												},
												team: {
													id: '2116'
												},
												active: true
											},
											team: {
												id: '2116'
											}
										}
									]
								},
								{
									name: 'assistsPerGame',
									displayName: 'Assists Per Game',
									shortDisplayName: 'APG',
									abbreviation: 'AST',
									leaders: [
										{
											displayValue: '6.7',
											value: 6.692307472229004,
											athlete: {
												id: '4704078',
												fullName: 'Themus Fulks',
												displayName: 'Themus Fulks',
												shortName: 'T. Fulks',
												links: [
													{
														rel: ['playercard', 'desktop', 'athlete'],
														href: 'https://www.espn.com/mens-college-basketball/player/_/id/4704078/themus-fulks'
													}
												],
												headshot:
													'https://a.espncdn.com/i/headshots/mens-college-basketball/players/full/4704078.png',
												jersey: '1',
												position: {
													abbreviation: 'G'
												},
												team: {
													id: '2116'
												},
												active: true
											},
											team: {
												id: '2116'
											}
										}
									]
								}
							]
						}
					],
					notes: [],
					status: {
						clock: 0,
						displayClock: '0:00',
						period: 0,
						type: {
							id: '1',
							name: 'STATUS_SCHEDULED',
							state: 'pre',
							completed: false,
							description: 'Scheduled',
							detail: 'Tue, February 24th at 11:00 PM EST',
							shortDetail: '2/24 - 11:00 PM EST'
						}
					},
					broadcasts: [
						{
							market: 'national',
							names: ['ESPN2']
						}
					],
					groups: {
						id: '8',
						name: 'Big 12 Conference',
						shortName: 'Big 12',
						isConference: true
					},
					format: {
						regulation: {
							periods: 2
						}
					},
					tickets: [
						{
							summary: 'Tickets as low as $43',
							numberAvailable: 24,
							links: [
								{
									href: 'https://www.vividseats.com/byu-cougars-mens-basketball-tickets-marriott-center-10-2-2025--sports-ncaa-basketball/production/5815797?wsUser=717'
								},
								{
									href: 'https://www.vividseats.com/venues/marriott-center-tickets.html?wsUser=717'
								}
							]
						}
					],
					startDate: '2026-02-25T04:00Z',
					broadcast: 'ESPN2',
					geoBroadcasts: [
						{
							type: {
								id: '1',
								shortName: 'TV'
							},
							market: {
								id: '1',
								type: 'National'
							},
							media: {
								shortName: 'ESPN2',
								logo: 'https://a.espncdn.com/guid/4bab8fd8-cd13-379f-9558-c3614851bf91/logos/default.png',
								darkLogo: ''
							},
							lang: 'en',
							region: 'us'
						}
					],
					odds: [
						{
							provider: {
								id: '100',
								name: 'Draft Kings',
								priority: 1,
								logos: [
									{
										href: 'https://a.espncdn.com/i/betting/Draftkings_Light.svg',
										rel: ['light']
									},
									{
										href: 'https://a.espncdn.com/i/betting/Draftkings_Dark.svg',
										rel: ['dark']
									}
								]
							},
							details: 'BYU -13.5',
							overUnder: 162.5,
							spread: -13.5,
							awayTeamOdds: {
								favorite: false,
								underdog: true,
								team: {
									id: '2116',
									uid: 's:40~l:41~t:2116',
									abbreviation: 'UCF',
									name: 'Knights',
									displayName: 'UCF Knights',
									logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2116.png'
								},
								favoriteAtOpen: false
							},
							homeTeamOdds: {
								favorite: true,
								underdog: false,
								team: {
									id: '252',
									uid: 's:40~l:41~t:252',
									abbreviation: 'BYU',
									name: 'Cougars',
									displayName: 'BYU Cougars',
									logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/252.png'
								},
								favoriteAtOpen: true
							},
							moneyline: {
								displayName: 'Moneyline',
								shortDisplayName: 'ML',
								home: {
									close: {
										odds: '-1050',
										link: {
											language: 'en-US',
											rel: ['home', 'desktop', 'bets', 'draft-kings'],
											href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196%3Foutcomes%3D0ML83564772_1',
											text: 'Home Bet',
											shortText: 'Home Bet',
											isExternal: true,
											isPremium: false,
											tracking: {
												campaign: 'betting-integrations',
												tags: {
													league: 'mens-college-basketball',
													sport: 'basketball',
													gameId: 401827701,
													betSide: 'home',
													betType: 'straight'
												}
											}
										}
									},
									open: {
										odds: '-800'
									}
								},
								away: {
									close: {
										odds: '+675',
										link: {
											language: 'en-US',
											rel: ['away', 'desktop', 'bets', 'draft-kings'],
											href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196%3Foutcomes%3D0ML83564772_3',
											text: 'Away Bet',
											shortText: 'Away Bet',
											isExternal: true,
											isPremium: false,
											tracking: {
												campaign: 'betting-integrations',
												tags: {
													league: 'mens-college-basketball',
													sport: 'basketball',
													gameId: 401827701,
													betSide: 'away',
													betType: 'straight'
												}
											}
										}
									},
									open: {
										odds: '+550'
									}
								}
							},
							pointSpread: {
								displayName: 'Spread',
								shortDisplayName: 'Spread',
								home: {
									close: {
										line: '-13.5',
										odds: '-108',
										link: {
											language: 'en-US',
											rel: ['homeSpread', 'desktop', 'bets'],
											href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196%3Foutcomes%3D0HC83564772N1350_1',
											text: 'Home Point Spread',
											shortText: 'Home Point Spread',
											isExternal: true,
											isPremium: false,
											tracking: {
												campaign: 'betting-integrations',
												tags: {
													league: 'mens-college-basketball',
													sport: 'basketball',
													gameId: 401827701,
													betSide: 'none',
													betType: 'straight',
													betDetails: 'Spread:BYU-13.5'
												}
											}
										}
									},
									open: {
										line: '-9.5',
										odds: '-110'
									}
								},
								away: {
									close: {
										line: '+13.5',
										odds: '-112',
										link: {
											language: 'en-US',
											rel: ['awaySpread', 'desktop', 'bets'],
											href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196%3Foutcomes%3D0HC83564772P1350_3',
											text: 'Away Point Spread',
											shortText: 'Away Point Spread',
											isExternal: true,
											isPremium: false,
											tracking: {
												campaign: 'betting-integrations',
												tags: {
													league: 'mens-college-basketball',
													sport: 'basketball',
													gameId: 401827701,
													betSide: 'none',
													betType: 'straight',
													betDetails: 'Spread:UCF+13.5'
												}
											}
										}
									},
									open: {
										line: '+9.5',
										odds: '-110'
									}
								}
							},
							total: {
								displayName: 'Total',
								shortDisplayName: 'Total',
								over: {
									close: {
										line: 'o162.5',
										odds: '-105',
										link: {
											language: 'en-US',
											rel: ['over', 'desktop', 'bets'],
											href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196%3Foutcomes%3D0OU83564772O16250_1',
											text: 'Over Odds',
											shortText: 'Over Odds',
											isExternal: true,
											isPremium: false,
											tracking: {
												campaign: 'betting-integrations',
												tags: {
													league: 'mens-college-basketball',
													sport: 'basketball',
													gameId: 401827701,
													betSide: 'over',
													betType: 'straight',
													betDetails: 'Over:162.5'
												}
											}
										}
									},
									open: {
										line: 'o167.5',
										odds: '-110'
									}
								},
								under: {
									close: {
										line: 'u162.5',
										odds: '-115',
										link: {
											language: 'en-US',
											rel: ['under', 'desktop', 'bets'],
											href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196%3Foutcomes%3D0OU83564772U16250_3',
											text: 'Under Odds',
											shortText: 'Under Odds',
											isExternal: true,
											isPremium: false,
											tracking: {
												campaign: 'betting-integrations',
												tags: {
													league: 'mens-college-basketball',
													sport: 'basketball',
													gameId: 401827701,
													betSide: 'under',
													betType: 'straight',
													betDetails: 'Under:162.5'
												}
											}
										}
									},
									open: {
										line: 'u167.5',
										odds: '-110'
									}
								}
							},
							link: {
								language: 'en-US',
								rel: ['game', 'desktop', 'bets'],
								href: 'https://sportsbook.draftkings.com/gateway?s=__s__&wpcid=__wpcid__&wpsrc=413&wpcn=ESPN&wpscn=Widget&wpcrn=BetSlipDeepLink&wpscid=__wpscid__&wpcrid=xx&preurl=https%3A%2F%2Fsportsbook.draftkings.com%2Fevent%2F33695196',
								text: 'See More Odds',
								shortText: 'Game',
								isExternal: true,
								isPremium: false,
								tracking: {
									campaign: 'betting-integrations',
									tags: {
										league: 'mens-college-basketball',
										sport: 'basketball',
										gameId: 401827701,
										betSide: 'none',
										betType: 'straight'
									}
								}
							},
							header: {
								logo: {
									dark: 'https://a.espncdn.com/i/espnbet/dark/espn-bet-square-off.svg',
									light: 'https://a.espncdn.com/i/espnbet/espn-bet-square-off.svg',
									exclusivesLogoDark: 'https://a.espncdn.com/i/espnbet/espn-bet-square-mint.svg',
									exclusivesLogoLight: 'https://a.espncdn.com/i/espnbet/espn-bet-square-mint.svg'
								},
								text: 'Game Odds'
							},
							footer: {
								disclaimer:
									'Odds by DraftKings\nGAMBLING PROBLEM? CALL 1-800-GAMBLER, (800) 327-5050 or visit gamblinghelplinema.org (MA). Call 877-8-HOPENY/text HOPENY (467369) (NY).\nPlease Gamble Responsibly. 888-789-7777/visit ccpg.org (CT), or visit www.mdgamblinghelp.org (MD).\n21+ and present in most states. (18+ DC/KY/NH/WY). Void in ONT/OR/NH. Eligibility restrictions apply. On behalf of Boot Hill Casino & Resort (KS). Terms: sportsbook.draftkings.com/promos.'
							}
						}
					],
					highlights: []
				}
			],
			links: [
				{
					language: 'en-US',
					rel: ['summary', 'desktop', 'event'],
					href: 'https://www.espn.com/mens-college-basketball/game/_/gameId/401827701/ucf-byu',
					text: 'Gamecast',
					shortText: 'Gamecast',
					isExternal: false,
					isPremium: false
				}
			],
			status: {
				clock: 0,
				displayClock: '0:00',
				period: 0,
				type: {
					id: '1',
					name: 'STATUS_SCHEDULED',
					state: 'pre',
					completed: false,
					description: 'Scheduled',
					detail: 'Tue, February 24th at 11:00 PM EST',
					shortDetail: '2/24 - 11:00 PM EST'
				}
			}
		}
	]
};
