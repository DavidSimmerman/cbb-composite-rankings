'use client';

import { useTeamProfile } from '@/app/context/TeamProfileContext';
import TeamLogo from '@/components/TeamLogo';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { seasonLabel } from '@/lib/season';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTeamView } from './useTeamView';

// Team header: identity, the record bar, and Composite / Offense / Defense tiles with every model's rank
export default function TeamHero() {
	const profile = useTeamProfile();
	const view = useTeamView();

	const recordCells: [string, string | null | undefined][] = [
		['Record', view.record],
		[view.conference ?? 'Conf', view.confRecord],
		...view.quads.map((q, i) => [`Quad ${i + 1}`, q] as [string, string | null | undefined])
	];

	const recordBar = (
		<div className="grid grid-cols-6 rounded-lg border border-white/10 bg-white/[0.035] divide-x divide-white/10 text-center">
			{recordCells.map(([label, val], i) => (
				<div key={i} className="py-1.5 min-w-0">
					<div className="text-[9.5px] uppercase tracking-wider text-slate-500 whitespace-nowrap truncate px-0.5">{label}</div>
					<div
						className={`text-[13px] lg:text-[14px] font-semibold leading-tight tabular-nums whitespace-nowrap ${i === 0 ? 'text-white' : 'text-slate-200'}`}
					>
						{val || '—'}
					</div>
				</div>
			))}
		</div>
	);

	return (
		<div className="px-4 lg:px-6 pt-4 lg:pt-7">
			<div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-5">
				<div className="flex items-center gap-4 flex-1 min-w-0">
					<TeamLogo teamKey={profile.team_key} size={150} className="size-[52px] lg:size-[72px] shrink-0 object-contain" />
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 whitespace-nowrap">
							{view.conference && <span>{view.conference}</span>}
							{view.conference && view.apRank && <span>·</span>}
							{view.apRank && <span>AP #{view.apRank}</span>}
							{(view.conference || view.apRank) && <span>·</span>}
							<SeasonPicker />
						</div>
						<h1 className="text-[26px] lg:text-[38px] font-semibold text-white tracking-tight leading-tight truncate">
							{profile.team_name}
							{view.meta?.mascot && (
								<span className="ml-2 text-slate-500 font-normal text-[17px] lg:text-[24px]">{view.meta.mascot}</span>
							)}
						</h1>
						<div className="hidden lg:block mt-2.5 w-[420px]">{recordBar}</div>
					</div>
				</div>
				<div className="lg:hidden">{recordBar}</div>
				<div className="grid grid-cols-3 gap-2 lg:gap-2.5">
					{view.tiles.map(t => {
						const models = t.models.filter(m => m.rank != null);
						return (
							<div key={t.label} className="lg:w-[172px] rounded-xl border border-white/10 bg-white/[0.035] px-2.5 lg:px-3 py-2.5 min-w-0">
								<div className="text-[10.5px] uppercase tracking-wider text-slate-500">{t.label}</div>
								<div className="flex items-baseline gap-1.5 mt-0.5 whitespace-nowrap">
									<span className="text-[22px] lg:text-[26px] font-semibold text-white leading-none tabular-nums">
										{t.rank != null ? `#${t.rank}` : '—'}
									</span>
									{t.value != null && <span className="text-[11.5px] text-slate-400 tabular-nums">{t.value}</span>}
								</div>
								{models.length > 0 && (
									<div
										className="grid gap-1 mt-2 text-center"
										style={{ gridTemplateColumns: `repeat(${Math.max(3, models.length)}, minmax(0, 1fr))` }}
									>
										{models.map(m => (
											<div key={m.short} title={`${m.short} rank`}>
												<div className="text-[9.5px] font-semibold" style={{ color: m.color }}>
													{m.short}
												</div>
												<div
													className="rounded text-[10px] lg:text-[11px] font-medium tabular-nums"
													style={{ background: `${m.color}26`, color: m.color }}
												>
													{m.rank}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
			{!view.isLatest && (
				<div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[12.5px] text-slate-400">
					Viewing the {seasonLabel(profile.season)} season: final ratings and record.{' '}
					<Link href={`/${profile.team_key}`} className="text-slate-200 underline underline-offset-2">
						Back to {seasonLabel(profile.latest_season)}
					</Link>
				</div>
			)}
		</div>
	);
}

function SeasonPicker() {
	const profile = useTeamProfile();
	const router = useRouter();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				suppressHydrationWarning
				className="inline-flex items-center gap-0.5 rounded-md border border-white/10 px-1.5 py-0.5 text-slate-300 hover:text-white cursor-pointer"
			>
				{seasonLabel(profile.season)}
				<ChevronDown className="size-3" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="max-h-72 overflow-auto font-grotesk">
				{profile.available_seasons.map(s => (
					<DropdownMenuCheckboxItem
						key={s}
						checked={s === profile.season}
						onCheckedChange={() =>
							router.push(s === profile.latest_season ? `/${profile.team_key}` : `/${profile.team_key}?season=${s}`)
						}
						className="cursor-pointer"
					>
						{seasonLabel(s)}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
