import TeamTable from './TeamTable';
import TitleBar from '@/components/TitleBar';

export default async function Home() {
	return (
		<div className="h-dvh flex flex-col overflow-hidden">
			<TitleBar title="CBB Composite Rankings" />
			<TeamTable />
		</div>
	);
}
