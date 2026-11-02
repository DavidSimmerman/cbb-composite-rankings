'use client';

import { useCookie } from '@/app/context/CookieContext';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CardPrediction, ScoreboardCard, ScoreboardData } from '@/lib/games/scoreboard-data';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import GameCard, { getGameTag } from './GameCard';

const P5_CONFERENCES = ['ACC', 'B10', 'B12', 'BE', 'SEC'];
const RATING_PRESETS = [
	{ label: 'All', value: '0' },
	{ label: 'Top 25', value: '25' },
	{ label: 'Top 50', value: '50' },
	{ label: 'Top 100', value: '100' }
];
const ONE_MONTH = 60 * 60 * 24 * 30;

type View = 'all' | 'top25' | 'conference' | 'watching';
const VIEWS: { key: View; label: string; title: string; phone: boolean }[] = [
	{ key: 'all', label: 'All', title: 'Every game', phone: true },
	{ key: 'top25', label: 'Top 25', title: 'Games with a composite top-25 team', phone: true },
	{ key: 'conference', label: 'Conference', title: 'Group games by conference', phone: false },
	{ key: 'watching', label: 'Watching', title: 'Games you are watching', phone: true }
];

// Date params are YYYYMMDD; all date math is done in UTC so server and client agree
const parseParam = (p: string) => new Date(Date.UTC(+p.slice(0, 4), +p.slice(4, 6) - 1, +p.slice(6, 8)));
const toParam = (d: Date) =>
	`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
const fmt = (p: string, o: Intl.DateTimeFormatOptions) => parseParam(p).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });

function sortByStart(games: ScoreboardCard[]) {
	return [...games].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function groupByConference(games: ScoreboardCard[]) {
	const map = new Map<string, ScoreboardCard[]>();
	for (const g of games) {
		const key = g.conference || 'Other';
		if (!map.has(key)) map.set(key, []);
		map.get(key)!.push(g);
	}
	return [...map.entries()].sort(([a], [b]) => {
		const ap = P5_CONFERENCES.includes(a), bp = P5_CONFERENCES.includes(b);
		if (ap !== bp) return ap ? -1 : 1;
		return a.localeCompare(b);
	});
}

export default function ScoreboardView({ data }: { data: ScoreboardData }) {
	const { games, date: currentDate, days } = data;
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [view, setView] = useCookie<View>('sb_view', 'all');
	const [filtersOpen, setFiltersOpen] = useCookie<boolean>('sb_filters_open', false);
	const [ratingFilter, setRatingFilter] = useCookie<string>('sb_rating', '0');
	const [conferenceFilter, setConferenceFilter] = useCookie<string>('sb_conf', 'all');
	const [avgRatingFilter, setAvgRatingFilter] = useCookie<string>('sb_avg', '0');
	const [alwaysShowClose, setAlwaysShowClose] = useCookie<boolean>('sb_show_close', false);
	const [alwaysShowTagged, setAlwaysShowTagged] = useCookie<boolean>('sb_show_highlighted', false);
	const [sectionState, setSectionState] = useCookie<Record<string, boolean>>('sb_sections', {});
	const [watchedGames, setWatchedGames] = useCookie<string[]>('sb_watched', [], ONE_MONTH);
	const [calendarOpen, setCalendarOpen] = useState(false);

	const watchedSet = useMemo(() => new Set(watchedGames), [watchedGames]);
	const toggleWatch = useCallback(
		(id: string) => setWatchedGames(watchedSet.has(id) ? watchedGames.filter(g => g !== id) : [...watchedGames, id]),
		[watchedGames, watchedSet, setWatchedGames]
	);

	// ── Model picks for upcoming games that have none saved yet ──
	const [fetched, setFetched] = useState<Record<string, CardPrediction>>({});
	const [settled, setSettled] = useState<Set<string>>(new Set());
	const missing = useMemo(
		() => games.filter(g => g.state === 'pre' && !g.prediction && g.home.teamKey && g.away.teamKey),
		[games]
	);
	useEffect(() => {
		if (missing.length === 0) return;
		const ids = missing.map(g => g.id);
		fetch('/api/games/predictions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ games: missing.map(g => ({ id: g.id, home: g.home.teamKey, away: g.away.teamKey, start: g.start })) })
		})
			.then(r => (r.ok ? r.json() : { predictions: {} }))
			.then(res => setFetched(f => ({ ...f, ...(res.predictions ?? {}) })))
			.catch(() => {})
			.finally(() => setSettled(s => new Set([...s, ...ids])));
	}, [missing]);
	const loadingIds = useMemo(() => new Set(missing.filter(g => !settled.has(g.id)).map(g => g.id)), [missing, settled]);

	const withPredictions = useMemo(
		() => games.map(g => (g.prediction || !fetched[g.id] ? g : { ...g, prediction: fetched[g.id] })),
		[games, fetched]
	);

	// ── Live scores: refresh the server data every 30s while a game is in progress ──
	const anyLive = games.some(g => g.state === 'in');
	useEffect(() => {
		if (!anyLive) return;
		const t = setInterval(() => {
			if (document.visibilityState === 'visible') router.refresh();
		}, 30_000);
		return () => clearInterval(t);
	}, [anyLive, router]);

	function go(param: string) {
		startTransition(() => router.push(`/games?date=${param}`));
	}
	function shift(days: number) {
		go(toParam(new Date(parseParam(currentDate).getTime() + days * 86_400_000)));
	}

	const conferences = useMemo(() => {
		const all = [...new Set(games.map(g => g.conference).filter(Boolean))];
		return [...all.filter(c => P5_CONFERENCES.includes(c)).sort(), ...all.filter(c => !P5_CONFERENCES.includes(c)).sort()];
	}, [games]);

	const filtered = useMemo(() => {
		return withPredictions.filter(g => {
			const tag = getGameTag(g, watchedSet.has(g.id));
			const close = g.state === 'in' && g.home.score != null && g.away.score != null && Math.abs(g.home.score - g.away.score) <= 9;
			if ((alwaysShowTagged && tag) || (alwaysShowClose && close)) return true;

			const ranks = [g.home.rank, g.away.rank];
			const known = ranks.every(r => r != null);
			const best = known ? Math.min(g.home.rank!, g.away.rank!) : 999;
			const avg = known ? (g.home.rank! + g.away.rank!) / 2 : 999;

			if (view === 'top25' && !ranks.some(r => r != null && r <= 25)) return false;
			if (view === 'watching' && !watchedSet.has(g.id)) return false;

			const maxBest = parseInt(ratingFilter);
			if (maxBest > 0 && best > maxBest) return false;
			const maxAvg = parseInt(avgRatingFilter);
			if (maxAvg > 0 && avg > maxAvg) return false;

			if (conferenceFilter === 'p5' && !P5_CONFERENCES.includes(g.conference)) return false;
			if (conferenceFilter === 'mid' && (!g.conference || P5_CONFERENCES.includes(g.conference))) return false;
			if (!['all', 'p5', 'mid'].includes(conferenceFilter) && g.conference !== conferenceFilter) return false;
			return true;
		});
	}, [withPredictions, view, watchedSet, ratingFilter, avgRatingFilter, conferenceFilter, alwaysShowClose, alwaysShowTagged]);

	const sections = useMemo(
		() =>
			[
				{ key: 'live', label: 'Live', games: sortByStart(filtered.filter(g => g.state === 'in')) },
				{ key: 'upcoming', label: 'Upcoming', games: sortByStart(filtered.filter(g => g.state === 'pre')) },
				{ key: 'final', label: 'Final', games: sortByStart(filtered.filter(g => g.state === 'post')) }
			].filter(s => s.games.length > 0),
		[filtered]
	);

	// Live and upcoming start open; Final starts open only when nothing else is on
	const nothingElse = !sections.some(s => s.key !== 'final');
	const isOpen = (key: string) => (key in sectionState ? sectionState[key] : key !== 'final' || nothingElse);
	const toggleSection = (key: string) => setSectionState({ ...sectionState, [key]: !isOpen(key) });

	const activeFilters =
		(ratingFilter !== '0' ? 1 : 0) +
		(conferenceFilter !== 'all' ? 1 : 0) +
		(avgRatingFilter !== '0' ? 1 : 0) +
		(alwaysShowClose ? 1 : 0) +
		(alwaysShowTagged ? 1 : 0);

	const liveCount = games.filter(g => g.state === 'in').length;
	const groupConf = view === 'conference';

	const renderCard = (g: ScoreboardCard) => (
		<GameCard
			key={g.id}
			game={g}
			tag={getGameTag(g, watchedSet.has(g.id))}
			isWatched={watchedSet.has(g.id)}
			onToggleWatch={toggleWatch}
			loadingPrediction={loadingIds.has(g.id)}
		/>
	);
	const grid = (list: ScoreboardCard[]) => <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3">{list.map(renderCard)}</div>;

	return (
		<div className="py-4 md:py-6 space-y-4 md:space-y-5">
			{/* Title + view controls */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<div className="text-[11px] md:text-[12px] text-violet-300/80 font-medium tracking-wide uppercase">
						{fmt(currentDate, { weekday: 'long', month: 'short', day: 'numeric' })} · {games.length} game{games.length === 1 ? '' : 's'}
						{liveCount > 0 && ` · ${liveCount} live`}
					</div>
					<h1 className="text-[24px] md:text-[30px] font-semibold tracking-tight text-white leading-tight mt-1">Scoreboard</h1>
				</div>
				<div className="flex gap-2 text-[12px] md:text-[13px]">
					<div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
						{VIEWS.map(v => (
							<button
								key={v.key}
								title={v.title}
								onClick={() => setView(v.key)}
								className={`${v.phone ? '' : 'hidden md:block'} px-2.5 md:px-3 py-1.5 rounded-lg cursor-pointer whitespace-nowrap transition-colors ${view === v.key ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
							>
								{v.label}
								{v.key === 'watching' && watchedGames.length > 0 && <span className="ml-1 text-[10px] text-slate-500">{watchedGames.length}</span>}
							</button>
						))}
					</div>
					<button
						onClick={() => setFiltersOpen(!filtersOpen)}
						className={`flex items-center gap-1.5 rounded-xl border px-3 cursor-pointer transition-colors ${filtersOpen || activeFilters > 0 ? 'border-violet-400/40 bg-violet-500/10 text-white' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
					>
						<Filter className="size-[13px]" />
						Filters
						{activeFilters > 0 && (
							<span className="rounded-full bg-violet-500 text-white size-4 text-[10px] grid place-items-center">{activeFilters}</span>
						)}
					</button>
				</div>
			</div>

			{/* Day strip */}
			<div className="flex items-center gap-1.5 md:gap-2">
				<button
					onClick={() => shift(-1)}
					aria-label="Previous day"
					className="size-9 shrink-0 grid place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
				>
					<ChevronLeft className="size-4" />
				</button>
				<div className="flex-1 min-w-0 flex gap-1.5 md:gap-2">
					{days.map((d, i) => {
						const active = d.date === currentDate;
						// phones show the selected day and two either side
						const phoneHidden = i === 0 || i === days.length - 1;
						return (
							<button
								key={d.date}
								onClick={() => !active && go(d.date)}
								className={`${phoneHidden ? 'hidden md:block' : ''} flex-1 min-w-0 rounded-xl border px-2 md:px-3 py-1.5 md:py-2 text-center md:text-left cursor-pointer transition-colors ${active ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]'}`}
							>
								<div className="flex justify-center md:justify-between gap-1 text-[10px] md:text-[11px]">
									<span className={active ? 'text-violet-200' : 'text-slate-500'}>{fmt(d.date, { weekday: 'short' })}</span>
									<span className="md:hidden text-slate-600">·</span>
									<span className="text-slate-500 tabular-nums">{d.count ?? ''}</span>
								</div>
								<div className={`text-[12.5px] md:text-[14px] font-medium whitespace-nowrap ${active ? 'text-white' : 'text-slate-300'}`}>
									{fmt(d.date, { month: 'short', day: 'numeric' })}
								</div>
							</button>
						);
					})}
				</div>
				<button
					onClick={() => shift(1)}
					aria-label="Next day"
					className="size-9 shrink-0 grid place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
				>
					<ChevronRight className="size-4" />
				</button>
				<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
					<PopoverTrigger asChild>
						<button
							aria-label="Pick a date"
							title="Pick a date"
							className="size-9 shrink-0 grid place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
						>
							<CalendarDays className="size-4" />
						</button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="single"
							selected={new Date(+currentDate.slice(0, 4), +currentDate.slice(4, 6) - 1, +currentDate.slice(6, 8))}
							defaultMonth={new Date(+currentDate.slice(0, 4), +currentDate.slice(4, 6) - 1, 1)}
							onSelect={d => {
								if (!d) return;
								setCalendarOpen(false);
								go(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
							}}
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Filters */}
			{filtersOpen && (
				<div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 md:p-4 flex flex-col gap-3 text-[12px]">
					<div className="flex flex-wrap items-end gap-3">
						<FilterSelect label="Best team" value={ratingFilter} onChange={setRatingFilter} options={RATING_PRESETS} />
						<FilterSelect
							label="Conference"
							value={conferenceFilter}
							onChange={setConferenceFilter}
							options={[{ label: 'All', value: 'all' }, { label: 'Power 5', value: 'p5' }, { label: 'Mid-major', value: 'mid' }, ...conferences.map(c => ({ label: c, value: c }))]}
						/>
						<FilterSelect label="Average rank of both teams" value={avgRatingFilter} onChange={setAvgRatingFilter} options={RATING_PRESETS} />
					</div>
					<div className="flex flex-col md:flex-row gap-2 md:gap-5">
						<ToggleRow id="sb-close" label="Always show close live games" checked={alwaysShowClose} onChange={setAlwaysShowClose} />
						<ToggleRow id="sb-tagged" label="Always show tagged games" checked={alwaysShowTagged} onChange={setAlwaysShowTagged} />
						<div className="md:hidden">
							<ToggleRow
								id="sb-group"
								label="Group by conference"
								checked={groupConf}
								onChange={v => setView(v ? 'conference' : 'all')}
							/>
						</div>
					</div>
					{activeFilters > 0 && (
						<button
							className="self-start text-slate-400 hover:text-white cursor-pointer"
							onClick={() => {
								setRatingFilter('0');
								setConferenceFilter('all');
								setAvgRatingFilter('0');
								setAlwaysShowClose(false);
								setAlwaysShowTagged(false);
							}}
						>
							Clear filters
						</button>
					)}
				</div>
			)}

			{/* Games */}
			<div className={`relative transition-opacity ${isPending ? 'opacity-40 pointer-events-none' : ''}`}>
				{isPending && <Loader2 className="absolute left-1/2 top-10 -translate-x-1/2 size-6 animate-spin text-violet-300 z-10" />}
				{filtered.length === 0 ? (
					<div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center text-[13px] text-slate-500">
						{games.length === 0
							? 'No games scheduled for this date.'
							: view === 'watching'
								? 'You are not watching any games on this date. Tap the eye on a game to watch it.'
								: 'No games match the current filters.'}
					</div>
				) : (
					<div className="space-y-6">
						{sections.map(s => {
							const open = isOpen(s.key);
							return (
								<section key={s.key}>
									<button onClick={() => toggleSection(s.key)} className="w-full flex items-center gap-2 mb-3 cursor-pointer group">
										{s.key === 'live' && <span className="size-1.5 rounded-full bg-rose-400 animate-pulse" />}
										<h2 className="text-[15px] font-semibold text-white">{s.label}</h2>
										<span className="text-[12px] text-slate-500">{s.games.length} shown</span>
										<div className="flex-1 h-px bg-white/[0.06] ml-2" />
										<ChevronDown className={`size-4 text-slate-500 group-hover:text-slate-300 transition-transform ${open ? '' : '-rotate-90'}`} />
									</button>
									{open &&
										(groupConf ? (
											<div className="space-y-4">
												{groupByConference(s.games).map(([conf, list]) => (
													<div key={conf}>
														<h3 className="text-[11px] uppercase tracking-wider text-slate-500 mb-1.5 px-0.5">{conf}</h3>
														{grid(list)}
													</div>
												))}
											</div>
										) : (
											grid(s.games)
										))}
								</section>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

function FilterSelect({
	label,
	value,
	onChange,
	options
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { label: string; value: string }[];
}) {
	return (
		<label className="flex flex-col gap-1">
			<span className="text-[11px] text-slate-500">{label}</span>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger className="w-36 h-8 text-xs border-white/10 bg-white/[0.03]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map(o => (
						<SelectItem key={o.value} value={o.value}>
							{o.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</label>
	);
}

function ToggleRow({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<div className="flex items-center gap-2 h-8">
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
			<label htmlFor={id} className="text-slate-300 cursor-pointer">
				{label}
			</label>
		</div>
	);
}
