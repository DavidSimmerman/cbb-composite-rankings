import Header from '@/components/Header';
import { getTeamProfile } from '@/lib/rankings/rankings';
import { TeamProfileProvider } from '../context/TeamProfileContext';
import TeamCharts from './components/TeamCharts';
import TeamProfileBanner from './components/TeamProfileBanner';
import TeamSchedule from './components/TeamSchedule';

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	const profile = await getTeamProfile(teamKey);

	return (
		<TeamProfileProvider profile={profile}>
			<Header />
			<div className="h-dvh flex flex-col overflow-hidden max-w-340 mx-auto">
				<TeamProfileBanner />
				<div className="grid grid-cols-2 gap-3 min-h-0 overflow-auto mb-4">
					<TeamCharts className="w-full mt-8 col-span-3" />
					<TeamSchedule />
				</div>
			</div>
		</TeamProfileProvider>
	);
}
