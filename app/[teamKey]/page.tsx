import type { Metadata } from 'next';
import Header from '@/components/Header';
import { getTeamProfile } from '@/lib/rankings/profile';
import { getTeamData } from '@/lib/espn/espn-team-data';
import { TeamProfileProvider } from '../context/TeamProfileContext';
import TeamCharts from './components/TeamCharts';
import TeamProfileBanner from './components/TeamProfileBanner';
import BottomSection from './components/BottomSection';
import TeamSchedule from './components/TeamSchedule';
import TeamStats from './components/TeamStats';

export async function generateMetadata({ params }: { params: Promise<{ teamKey: string }> }): Promise<Metadata> {
	const { teamKey } = await params;
	const teamData = await getTeamData(teamKey);
	const name = teamData?.name ?? teamKey;

	return {
		title: `${name} Basketball Rankings — KenPom, EvanMiya, BartTorvik Ratings`,
		description: `${name} college basketball ratings and rankings from KenPom, Evan Miya, Bart Torvik, and NET. View rating trends, schedule, stats, and March Madness tournament profile.`,
		openGraph: {
			title: `${name} — CBB Composite Rankings`,
			description: `${name} composite basketball ratings from KenPom, EvanMiya, BartTorvik, and NET.`,
		},
	};
}

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	const profile = await getTeamProfile(teamKey);

	const teamJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'SportsTeam',
		name: profile.team_name,
		sport: 'Basketball',
		url: `https://cbbcomposite.com/${teamKey}`,
		memberOf: {
			'@type': 'SportsOrganization',
			name: 'NCAA Division I Men\'s Basketball',
		},
	};

	return (
		<TeamProfileProvider profile={profile}>
			<div className="h-dvh flex flex-col">
				<Header />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }}
				/>
				<div className="flex-1 min-h-0 overflow-auto">
					<div className="max-w-340 mx-auto px-2 md:px-4 pb-4 md:pb-8">
						<TeamProfileBanner />
						<div className="flex flex-col md:grid md:grid-cols-3 md:auto-rows-[480px] gap-3 md:gap-6 mt-4 md:mt-6">
							<TeamStats className="order-2 md:order-0 md:row-span-2" />
							<TeamCharts className="order-1 md:order-0 md:col-span-2 min-h-76" />
							<TeamSchedule className="order-3 md:order-0 md:col-span-2 min-h-76" />
						</div>
						<BottomSection className="mt-3 md:mt-6" />
					</div>
				</div>
			</div>
		</TeamProfileProvider>
	);
}
