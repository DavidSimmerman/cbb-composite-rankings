'use client';

import TeamLogo from '@/components/TeamLogo';
import type { FirstFourGame } from '@/lib/rankings/profile';
import type { BracketTeamSummary } from '@/lib/rankings/profile';
import Link from 'next/link';

interface FirstFourSectionProps {
	games: FirstFourGame[];
	getTeamByKey: (teamKey: string) => BracketTeamSummary | undefined;
	compact?: boolean;
}

export default function FirstFourSection({ games, getTeamByKey, compact }: FirstFourSectionProps) {
	if (games.length === 0) return null;

	return (
		<div className={compact ? 'space-y-2' : 'space-y-0'}>
			{!compact && (
				<div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
					First Four
				</div>
			)}
			<div className={compact ? 'flex gap-2 flex-wrap justify-center' : 'space-y-2'}>
				{games.map(game => (
					<FirstFourCard
						key={game.game_id}
						game={game}
						getTeamByKey={getTeamByKey}
						compact={compact}
					/>
				))}
			</div>
		</div>
	);
}

function FirstFourCard({
	game,
	getTeamByKey,
	compact,
}: {
	game: FirstFourGame;
	getTeamByKey: (teamKey: string) => BracketTeamSummary | undefined;
	compact?: boolean;
}) {
	const teamA = getTeamByKey(game.team_a.team_key);
	const teamB = getTeamByKey(game.team_b.team_key);

	return (
		<Link
			href={`/bracket/${game.game_id}`}
			className={`block border border-neutral-800 rounded-lg ${compact ? 'p-1.5 w-40' : 'p-2'} hover:border-neutral-600 transition-colors`}
		>
			<TeamRow
				teamKey={game.team_a.team_key}
				name={teamA?.short_name ?? game.team_a.team_key}
				seed={game.team_a.seed}
				compact={compact}
			/>
			<TeamRow
				teamKey={game.team_b.team_key}
				name={teamB?.short_name ?? game.team_b.team_key}
				seed={game.team_b.seed}
				compact={compact}
			/>
		</Link>
	);
}

function TeamRow({
	teamKey,
	name,
	seed,
	compact,
}: {
	teamKey: string;
	name: string;
	seed: number;
	compact?: boolean;
}) {
	return (
		<div className={`flex items-center gap-1.5 ${compact ? 'py-0.5' : 'py-1'}`}>
			<span className={`${compact ? 'text-[10px] w-4' : 'text-xs w-5'} text-muted-foreground text-right shrink-0`}>
				{seed}
			</span>
			<TeamLogo teamKey={teamKey} size={100} className={compact ? 'size-3.5' : 'size-4'} />
			<span className={`${compact ? 'text-[11px]' : 'text-xs'} truncate`}>
				{name}
			</span>
		</div>
	);
}
