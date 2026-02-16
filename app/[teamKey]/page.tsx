import Header from '@/components/Header';
import { getTeamProfile } from '@/lib/rankings/profile';
import { TeamProfileProvider } from '../context/TeamProfileContext';
import TeamCharts from './components/TeamCharts';
import TeamProfileBanner from './components/TeamProfileBanner';
import TeamSchedule from './components/TeamSchedule';
import TeamStats from './components/TeamStats';

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	const profile = await getTeamProfile(teamKey);

	return (
		<TeamProfileProvider profile={profile}>
			<div className="h-dvh flex flex-col">
				<Header />
				<div className="flex-1 min-h-0 overflow-auto">
					<div className="max-w-340 mx-auto px-4 pb-8">
						<TeamProfileBanner />
						<div className="grid grid-cols-3 auto-rows-[480px] gap-6 mt-6">
							<TeamStats className="row-span-2" />
							<TeamCharts className="col-span-2 min-h-76" />
							<TeamSchedule className="col-span-2 min-h-76" />
						</div>
					</div>
				</div>
			</div>
		</TeamProfileProvider>
	);
}
