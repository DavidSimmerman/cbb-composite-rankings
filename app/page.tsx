import { cookies } from 'next/headers';
import { getRankings } from '@/lib/rankings/rankings';
import TeamTable from './TeamTable';
import TitleBar from '@/components/TitleBar';

export default async function Home() {
	const cookieStore = await cookies();
	const trackingCookie = cookieStore.get('__tracking')?.value;
	const isNewSession = trackingCookie ? JSON.parse(trackingCookie).isNewSession : false;

	// This timeout is just to show off the loading animation cuz I think it looks really cool :)
	const [rankings] = await Promise.all([getRankings(), ...(isNewSession ? [new Promise(res => setTimeout(res, 1500))] : [])]);

	return (
		<div className="h-dvh flex flex-col overflow-hidden">
			<TitleBar title="CBB Composite Rankings" />
			<TeamTable data={rankings} />
		</div>
	);
}
