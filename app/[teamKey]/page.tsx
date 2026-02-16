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
					<div className="max-w-340 mx-auto px-2 md:px-4 pb-4 md:pb-8">
						<TeamProfileBanner />
						<div className="flex flex-col md:grid md:grid-cols-3 md:auto-rows-[480px] gap-3 md:gap-6 mt-4 md:mt-6">
							<TeamStats className="order-2 md:order-0 md:row-span-2" />
							<TeamCharts className="order-1 md:order-0 md:col-span-2 min-h-76" />
							<TeamSchedule className="order-3 md:order-0 md:col-span-2 min-h-76" />
						</div>
					</div>
				</div>
			</div>
		</TeamProfileProvider>
	);
}
