import TitleBar from '@/components/TitleBar';
import { getTeamProfile } from '@/lib/rankings/rankings';
import TeamCharts from './components/TeamCharts';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	const profile = await getTeamProfile(teamKey);

	return (
		<div>
			<div className="relative flex items-center justify-center">
				<Link href="/" className="absolute left-4 mt-10 cursor-pointer group">
					< className="transition-transform duration-200 group-hover:-translate-x-1 size-6 text-neutral-400 hover:text-white" />
				</Link>
				<TitleBar title={profile.team_name} />
			</div>
			<div className="w-full mt-12">
				<TeamCharts history={profile.ratings_history} />
			</div>
		</div>
	);
}
