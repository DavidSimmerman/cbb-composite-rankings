import { ESPN_TEAM_IDS } from '@/lib/espn/espn-team-ids';
import { twMerge } from 'tailwind-merge';

export default function TeamLogo({
	teamKey,
	size = 200,
	className = ''
}: {
	teamKey: string;
	size?: number;
	className?: string;
}) {
	const dropShadowMap: Record<string, string> = {
		iowa: 'drop-shadow-sm drop-shadow-yellow-400',
		ohio_st: 'drop-shadow-xs drop-shadow-white',
		san_diego_st: 'drop-shadow-xs drop-shadow-white/70',
		nevada: 'drop-shadow-xs drop-shadow-white/70',
		cincinnati: 'drop-shadow-xs drop-shadow-white/70',
		wake_forest: 'drop-shadow-xs drop-shadow-yellow-400',
		penn_st: 'drop-shadow-sm drop-shadow-white'
	} as const;

	return (
		<img
			className={twMerge(dropShadowMap[teamKey], className)}
			src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${ESPN_TEAM_IDS[teamKey]}.png&h=${size}&w=${size}`}
		/>
	);
}
