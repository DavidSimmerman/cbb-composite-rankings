import Header from '@/components/Header';
import TitleBar from '@/components/TitleBar';
import TeamTable from './components/TeamTable';

export default async function Home() {
	return (
		<div className="h-dvh flex flex-col overflow-hidden">
			<Header />
			<div className="flex flex-col overflow-hidden mx-2 md:mx-8">
				<TitleBar title="CBB Composite Rankings" />
				<div className="flex justify-center items-center gap-2 text-xs md:text-base text-muted-foreground mt-2 md:mt-1">
					<a
						href="https://kenpom.com"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline hover:underline cursor-pointer"
					>
						KenPom
					</a>
					<span>&#x2022;</span>
					<a
						href="https://evanmiya.com"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline hover:underline cursor-pointer"
					>
						EvanMiya
					</a>
					<span>&#x2022;</span>
					<a
						href="https://barttorvik.com"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline hover:underline cursor-pointer"
					>
						BartTorvik
					</a>
					<span>&#x2022;</span>
					<a
						href="https://www.ncaa.com/rankings/basketball-men/d1/ncaa-mens-basketball-net-rankings"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline hover:underline cursor-pointer"
					>
						NET
					</a>
				</div>
				<TeamTable />
			</div>
		</div>
	);
}
