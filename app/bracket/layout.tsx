import Header from '@/components/Header';
import { getBracketPageData } from '@/lib/rankings/profile';
import BracketLayoutClient from './components/BracketLayoutClient';

export default async function BracketLayout({ children }: { children: React.ReactNode }) {
	const data = await getBracketPageData();

	return (
		<div className="h-dvh flex flex-col">
			<Header />
			<div className="flex-1 min-h-0 overflow-hidden">
				<BracketLayoutClient data={data}>
					{children}
				</BracketLayoutClient>
			</div>
		</div>
	);
}
