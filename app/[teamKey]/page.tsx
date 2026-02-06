import TitleBar from '@/components/TitleBar';

export default async function TeamPage({ params }: { params: Promise<{ teamKey: string }> }) {
	const { teamKey } = await params;

	return (
		<div>
			<TitleBar title={teamKey} />
		</div>
	);
}
