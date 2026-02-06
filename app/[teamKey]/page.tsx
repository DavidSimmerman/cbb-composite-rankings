import TitleBar from '@/components/TitleBar';
import { getTeamProfile } from '@/lib/rankings/rankings';
import TeamCharts from './components/TeamCharts';

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	const profile = await getTeamProfile(teamKey);

	return (
		<div>
			<TitleBar title={profile.team_name} />
			<div className="w-full mt-12">
				<TeamCharts history={profile.ratings_history} />
			</div>
		</div>
	);
}
