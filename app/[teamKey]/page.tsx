import TitleBar from '@/components/TitleBar';
import { getTeamProfile } from '@/lib/rankings/rankings';
import TeamCharts from './components/TeamCharts';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import TeamLogo from '@/components/TeamLogo';
import TeamSchedule from './components/TeamSchedule';
import { TeamProfileProvider } from '../context/TeamProfileContext';

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	const profile = await getTeamProfile(teamKey);

	return (
		<TeamProfileProvider profile={profile}>
			<div className="h-dvh flex flex-col overflow-hidden">
				<div className="relative flex items-center justify-center">
					<Link href="/" className="absolute left-4 mt-10 cursor-pointer group">
						<ArrowLeft className="transition-transform duration-200 group-hover:-translate-x-1 size-6 text-neutral-400 hover:text-white" />
					</Link>
					<img />
					<TitleBar
						className="mt-8"
						title={
							<div className="flex items-center gap-3">
								<TeamLogo teamKey={teamKey} className="h-[1.5lh]" />
								{profile.team_name}
							</div>
						}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3 min-h-0 overflow-auto mb-4">
					<TeamCharts className="w-full mt-8 col-span-3" />
					<TeamSchedule />
				</div>
			</div>
		</TeamProfileProvider>
	);
}
