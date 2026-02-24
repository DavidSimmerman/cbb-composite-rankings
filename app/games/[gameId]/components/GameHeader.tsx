'use client';

import { useGame } from '@/app/context/GameContext';
import TeamLogo from '@/components/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Game, GameTeam } from '@/lib/espn/espn-game';
import Link from 'next/link';
import { useMemo } from 'react';

export default function GameHeader() {
	const { game } = useGame();

	return (
		<Card className="mt-4 md:mt-8 p-2 md:p-4 md:px-6">
			<CardContent className="flex items-center gap-2 md:gap-0">
				<div className="flex-1 flex justify-start">
					<TeamHeader team={game.teams.away} />
				</div>
				<div className="text-center flex flex-col gap-1 shrink-0">
					{game.status === 'final' && <FinalScore game={game} />}
					{game.status === 'in progress' && <InProgress game={game} />}
					{game.status === 'not started' && <Pregame game={game} />}
				</div>
				<div className="flex-1 flex justify-end">
					<TeamHeader team={game.teams.home} />
				</div>
			</CardContent>
		</Card>
	);
}

function FinalScore({ game }: { game: Game }) {
	const date = useMemo(() => {
		const date = new Date(game.date);
		const mm = String(date.getUTCMonth() + 1);
		const dd = String(date.getUTCDate());
		return `${mm}/${dd}`;
	}, [game]);

	return (
		<>
			<div className="text-muted-foreground text-xs md:text-base">{date}</div>
			<div className="text-3xl md:text-5xl">
				<span className={`font-bold ${game.teams.away.won ? '' : 'text-muted-foreground'}`}>{game.teams.away.score}</span>
				<span className="font-medium text-muted-foreground"> - </span>
				<span className={`font-bold ${game.teams.home.won ? '' : 'text-muted-foreground'}`}>{game.teams.home.score}</span>
			</div>
			<div className="capitalize text-muted-foreground text-xs md:text-base">{game.status}</div>
		</>
	);
}

function InProgress({ game }: { game: Game }) {
	const date = useMemo(() => {
		const date = new Date(game.date);
		const mm = String(date.getUTCMonth() + 1);
		const dd = String(date.getUTCDate());
		return `${mm}/${dd}`;
	}, [game]);

	return (
		<>
			<div className="text-muted-foreground text-xs md:text-base">{date}</div>
			<div className="text-3xl md:text-5xl">
				<span className={`font-bold`}>{game.teams.away.score}</span>
				<span className="font-medium text-muted-foreground"> - </span>
				<span className={`font-bold`}>{game.teams.home.score}</span>
			</div>
			<div className="capitalize text-muted-foreground text-xs md:text-base">{game.is_halftime ? 'Half' : `${game.clock} ${game.half}`}</div>
		</>
	);
}

function Pregame({ game }: { game: Game }) {
	const date = useMemo(() => {
		const date = new Date(game.date);
		const mm = String(date.getUTCMonth() + 1);
		const dd = String(date.getUTCDate());
		return `${mm}/${dd}`;
	}, [game]);

	const time = new Date(game.date).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		timeZone: 'America/New_York',
		timeZoneName: 'short'
	});

	return (
		<div className="text-xs md:text-md text-muted-foreground">
			<div>{date}</div>
			<div>{time}</div>
			<div>{game.broadcast}</div>
		</div>
	);
}

function TeamHeader({ team }: { team: GameTeam }) {
	const fullRatings = useMemo(() => {
		const season = Object.keys(team.profile.full_ratings).sort().at(-1)!;
		return team.profile.full_ratings[season];
	}, [team]);

	const reverse = team.home_away !== 'home';

	return (
		<Link href={`/${team.profile.team_key}`} className={`flex gap-8 group ${reverse && 'flex-row-reverse'}`}>
			{/* <div className="m-auto text-md flex flex-col gap-1.5">
				<div className="flex gap-1 border rounded-md py-1 px-2 w-fit m-auto">
					<span>Rating #</span>
					<span>{fullRatings.comp_avg_zscore_rank}</span>
				</div>
				<div className="flex gap-1 border rounded-md py-1 px-2 w-fit m-auto">
					<span>Offense #</span>
					<span>{fullRatings.comp_avg_offensive_zscore_rank}</span>
				</div>
				<div className="flex gap-1 border rounded-md py-1 px-2 w-fit m-auto">
					<span>Defense #</span>
					<span>{fullRatings.comp_avg_defensive_zscore_rank}</span>
				</div>
			</div> */}
			<div>
				<TeamLogo teamKey={team.profile.team_key} className="h-12 md:h-20 m-auto" />
				<div className="text-center text-sm md:text-2xl font-medium">
					<span className="text-xs md:text-lg text-muted-foreground">{fullRatings.ap_rank ? `#${fullRatings.ap_rank} ` : ''}</span>
					<span className="group-hover:underline hidden md:inline">{team.profile.team_name}</span>
					<span className="group-hover:underline md:hidden">{team.metadata.abbreviation}</span>
				</div>
				<div className="text-center text-xs md:text-base text-muted-foreground">
					{fullRatings.net_conf} • {fullRatings.kp_win_loss}
				</div>
			</div>
		</Link>
	);
}
