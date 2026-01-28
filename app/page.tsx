import { fetchRankings } from '@/lib/rankings';
import TeamTable from './TeamTable';

export default async function Home() {
	const rankings = await fetchRankings();

	return (
		<div className="">
			<TeamTable data={rankings} />
		</div>
	);
}
