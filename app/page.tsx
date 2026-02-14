import TitleBar from '@/components/TitleBar';
import TeamTable from './components/TeamTable';

export default async function Home() {
	return (
		<div className="h-dvh flex flex-col overflow-hidden mx-2 md:mx-8 ">
			<TitleBar title="CBB Composite Rankings" />
			<TeamTable />
		</div>
	);
}
