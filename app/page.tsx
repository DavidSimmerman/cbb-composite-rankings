import Header from '@/components/Header';
import TeamTable from './components/TeamTable';
import BrandLogo from '@/components/BrandLogo';
import { RankingsGate } from './context/RankingsContext';

export default async function Home() {
	return (
		<div className="relative h-dvh flex flex-col overflow-hidden bg-[#07080f] text-slate-300 font-grotesk">
			{/* One faint violet wash at the top, nothing else */}
			<div className="pointer-events-none absolute -top-48 left-1/3 w-[700px] h-[300px] rounded-full bg-violet-500/[0.07] blur-[120px]" />
			<Header />
			{/* The page frame arrives at once; the loader shows while the rankings load in the browser */}
			<RankingsGate
				fallback={
					<div className="flex-1 grid place-items-center" aria-label="Loading rankings">
						<BrandLogo animated className="w-[min(340px,72vw)]" />
					</div>
				}
			>
				<TeamTable />
			</RankingsGate>
		</div>
	);
}
