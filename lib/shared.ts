export type BaseTeamData = {
	team_key: string;
	team_name: string;
	conference: string;
	kp_rating: number;
	kp_rating_rank: number;
	kp_offensive_rating: number;
	kp_offensive_rating_rank: number;
	kp_defensive_rating: number;
	kp_defensive_rating_rank: number;
	em_rating: number;
	em_rating_rank: number;
	em_offensive_rating: number;
	em_offensive_rating_rank: number;
	em_defensive_rating: number;
	em_defensive_rating_rank: number;
	bt_rating: number;
	bt_rating_rank: number;
	bt_offensive_rating: number;
	bt_offensive_rating_rank: number;
	bt_defensive_rating: number;
	bt_defensive_rating_rank: number;
	net_rank: number;
	net_q1_record: string;
	net_q2_record: string;
	net_q3_record: string;
	net_q4_record: string;
	kp_rating_zscore: number;
	kp_offensive_rating_zscore: number;
	kp_defensive_rating_zscore: number;
	em_rating_zscore: number;
	em_offensive_rating_zscore: number;
	em_defensive_rating_zscore: number;
	bt_rating_zscore: number;
	bt_offensive_rating_zscore: number;
	bt_defensive_rating_zscore: number;
	net_rank_zscore: number;
};

export type CompiledTeamData = BaseTeamData & {
	avg_zscore: number;
	avg_zscore_rank: number;
	avg_offensive_zscore: number;
	avg_offensive_zscore_rank: number;
	avg_defensive_zscore: number;
	avg_defensive_zscore_rank: number;
	net_q1_wins: number;
	net_q2_wins: number;
	net_q3_wins: number;
	net_q4_wins: number;
};

export const sourceSystems = [
	{
		key: 'KenPom',
		overall: 'kp_rating_zscore',
		offensive: 'kp_offensive_rating_zscore',
		defensive: 'kp_defensive_rating_zscore'
	},
	{
		key: 'EvanMiya',
		overall: 'em_rating_zscore',
		offensive: 'em_offensive_rating_zscore',
		defensive: 'em_defensive_rating_zscore'
	},
	{
		key: 'BartTorvik',
		overall: 'bt_rating_zscore',
		offensive: 'bt_offensive_rating_zscore',
		defensive: 'bt_defensive_rating_zscore'
	},
	{ key: 'NET', overall: 'net_rank_zscore', offensive: null, defensive: null }
] as const;

export type SourceSystem = (typeof sourceSystems)[number];

export function computeAverageZScores(teams: CompiledTeamData[], sources: readonly SourceSystem[]): CompiledTeamData[] {
	teams = structuredClone(teams);

	const overallKeys = sources.map(s => s.overall);
	const offensiveKeys = sources.map(s => s.offensive).filter(k => k !== null);
	const defensiveKeys = sources.map(s => s.defensive).filter(k => k !== null);

	teams.forEach(team => {
		team.avg_zscore = overallKeys.length
			? overallKeys.reduce((sum, k) => sum + (team[k as keyof CompiledTeamData] as number), 0) / overallKeys.length
			: 0;
		team.avg_offensive_zscore = offensiveKeys.length
			? offensiveKeys.reduce((sum, k) => sum + (team[k as keyof CompiledTeamData] as number), 0) / offensiveKeys.length
			: 0;
		team.avg_defensive_zscore = defensiveKeys.length
			? defensiveKeys.reduce((sum, k) => sum + (team[k as keyof CompiledTeamData] as number), 0) / defensiveKeys.length
			: 0;
	});

	teams.toSorted((a, b) => b.avg_zscore - a.avg_zscore).forEach((t, i) => (t.avg_zscore_rank = i + 1));
	teams
		.toSorted((a, b) => b.avg_offensive_zscore - a.avg_offensive_zscore)
		.forEach((t, i) => (t.avg_offensive_zscore_rank = i + 1));
	teams
		.toSorted((a, b) => b.avg_defensive_zscore - a.avg_defensive_zscore)
		.forEach((t, i) => (t.avg_defensive_zscore_rank = i + 1));

	return teams;
}

export function rerankColumns(teams: CompiledTeamData[]): CompiledTeamData[] {
	const FLIPPED_COLUMNS = ['kp_defensive_rating', 'bt_defensive_rating'];

	teams = structuredClone(teams);

	const columns = Object.keys(teams[0]).filter(k => k.endsWith('rank') && !k.startsWith('net'));

	columns.forEach(rankCol => {
		const metricCol = rankCol.replace(/_rank$/, '') as keyof CompiledTeamData;
		teams
			.toSorted(
				(a, b) => ((b[metricCol] as number) - (a[metricCol] as number)) * (FLIPPED_COLUMNS.includes(metricCol as string) ? -1 : 1)
			)
			.forEach((t, i) => ((t as Record<string, unknown>)[rankCol] = i + 1));
	});

	return teams;
}
