import type { Metadata } from 'next';
import Header from '@/components/Header';
import { getTeamProfile } from '@/lib/rankings/profile';
import { getTeamData } from '@/lib/espn/espn-team-data';
import { getRankings } from '@/lib/rankings/rankings';
import { teamTone } from '@/lib/team-colors';
import { TeamProfileProvider } from '../context/TeamProfileContext';
import TeamHero from './components/TeamHero';
import { type Tab, TABS } from './components/tabs';
import TeamTabs from './components/TeamTabs';

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

export default async function TeamPage({
	params,
	searchParams
}: {
	params: Promise<{ teamKey: string }>;
	searchParams: Promise<{ season?: string; tab?: string }>;
}) {
	const { teamKey } = await params;
	const { season, tab } = await searchParams;

	const profile = await getTeamProfile(teamKey, { season: season ? parseInt(season) : undefined });
	// Viewing a past season: opponents' records, ranks and quadrants come from that season
	const seasonRankings = profile.season !== profile.latest_season ? await getRankings(profile.season) : undefined;
	const initialTab: Tab = TABS.includes(tab as Tab) ? (tab as Tab) : 'overview';
	const glow = teamTone(profile.team_data?.color, profile.team_data?.secondary_color);

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
		<TeamProfileProvider profile={profile} seasonRankings={seasonRankings}>
			<div className="relative h-dvh flex flex-col overflow-hidden bg-[#07080f] text-slate-300 font-grotesk">
				{/* One faint wash of the team's colour at the top */}
				<div
					className="pointer-events-none absolute -top-40 left-0 lg:left-[10%] w-[340px] lg:w-[700px] h-[220px] lg:h-[300px] rounded-full blur-[90px] lg:blur-[120px] opacity-[0.13]"
					style={{ background: glow }}
				/>
				<Header />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }}
				/>
				<div className="relative flex-1 min-h-0 overflow-auto">
					<div className="max-w-340 mx-auto pb-6 lg:pb-10">
						<TeamHero />
						<TeamTabs initialTab={initialTab} />
					</div>
				</div>
			</div>
		</TeamProfileProvider>
	);
}
