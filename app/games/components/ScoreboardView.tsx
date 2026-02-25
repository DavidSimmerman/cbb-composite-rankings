'use client';

import { useCookie } from '@/app/context/CookieContext';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ScoreboardGameEnriched } from '@/lib/espn/scoreboard';
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Eye, Filter, LayoutGrid, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import GameCard, { getGameHighlight } from './GameCard';

const P5_CONFERENCES = ['ACC', 'B10', 'B12', 'BE', 'SEC'];
const RATING_PRESETS = [
	{ label: 'All', value: '0' },
	{ label: 'Top 25', value: '25' },
	{ label: 'Top 50', value: '50' },
	{ label: 'Top 100', value: '100' }
];

const ONE_MONTH = 60 * 60 * 24 * 30;

type GroupOption = 'all' | 'conference';

function parseDateParam(dateStr: string): Date {
	const y = parseInt(dateStr.slice(0, 4));
	const m = parseInt(dateStr.slice(4, 6)) - 1;
	const d = parseInt(dateStr.slice(6, 8));
	return new Date(y, m, d);
}

function toDateParam(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}${m}${d}`;
}

function formatDisplayDate(dateStr: string): string {
	const date = parseDateParam(dateStr);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const dateOnly = new Date(date);
	dateOnly.setHours(0, 0, 0, 0);
	const diffDays = Math.round((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

	let prefix = '';
	if (diffDays === 0) prefix = 'Today - ';
	else if (diffDays === -1) prefix = 'Yesterday - ';
	else if (diffDays === 1) prefix = 'Tomorrow - ';

	return prefix + date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getConferences(games: ScoreboardGameEnriched[]): string[] {
	const set = new Set<string>();
	for (const g of games) {
		if (g.conference.shortName) set.add(g.conference.shortName);
	}
	const all = Array.from(set);
	const p5 = all.filter(c => P5_CONFERENCES.includes(c)).sort();
	const rest = all.filter(c => !P5_CONFERENCES.includes(c)).sort();
	return [...p5, ...rest];
}

function sortByStartTime(games: ScoreboardGameEnriched[]): ScoreboardGameEnriched[] {
	return [...games].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
}

function GameSection({
	title,
	badge,
	count,
	open,
	onToggle,
	children
}: {
	title: string;
	badge?: React.ReactNode;
	count: number;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<div>
			<button onClick={onToggle} className="flex items-center gap-2 w-full px-1 py-2 cursor-pointer group">
				<ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
				<h3 className="text-sm font-semibold">{title}</h3>
				{badge}
				<span className="text-xs text-muted-foreground ml-auto">
					{count} game{count !== 1 ? 's' : ''}
				</span>
			</button>
			{open && <div className="mt-1">{children}</div>}
		</div>
	);
}

export default function ScoreboardView({ games, currentDate }: { games: ScoreboardGameEnriched[]; currentDate: string }) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	// Persisted settings
	const [groupBy, setGroupBy] = useCookie<GroupOption>('sb_group', 'all');
	const [filtersOpen, setFiltersOpen] = useCookie<boolean>('sb_filters_open', false);
	const [ratingFilter, setRatingFilter] = useCookie<string>('sb_rating', '0');
	const [conferenceFilter, setConferenceFilter] = useCookie<string>('sb_conf', 'all');
	const [avgRatingFilter, setAvgRatingFilter] = useCookie<string>('sb_avg', '0');
	const [alwaysShowClose, setAlwaysShowClose] = useCookie<boolean>('sb_show_close', false);
	const [alwaysShowHighlighted, setAlwaysShowHighlighted] = useCookie<boolean>('sb_show_highlighted', false);
	const [watchingOnly, setWatchingOnly] = useCookie<boolean>('sb_watching_only', false);
	const [sectionState, setSectionState] = useCookie<Record<string, boolean>>('sb_sections', {});

	// Watched games with 1 month expiration
	const [watchedGames, setWatchedGames] = useCookie<string[]>('sb_watched', [], ONE_MONTH);

	const [calendarOpen, setCalendarOpen] = useState(false);

	const selectedDate = parseDateParam(currentDate);
	const conferences = useMemo(() => getConferences(games), [games]);
	const watchedSet = useMemo(() => new Set(watchedGames), [watchedGames]);

	const toggleWatch = useCallback(
		(gameId: string) => {
			if (watchedSet.has(gameId)) {
				setWatchedGames(watchedGames.filter(id => id !== gameId));
			} else {
				setWatchedGames([...watchedGames, gameId]);
			}
		},
		[watchedGames, watchedSet, setWatchedGames]
	);

	function navigateDate(offset: number) {
		const date = parseDateParam(currentDate);
		date.setDate(date.getDate() + offset);
		startTransition(() => router.push(`/games?date=${toDateParam(date)}`));
	}

	function selectDate(date: Date | undefined) {
		if (!date) return;
		setCalendarOpen(false);
		startTransition(() => router.push(`/games?date=${toDateParam(date)}`));
	}

	function toggleSection(key: string) {
		setSectionState({ ...sectionState, [key]: !getSectionOpen(key) });
	}

	function getSectionOpen(key: string): boolean {
		if (key in sectionState) return sectionState[key];
		if (key === 'live' || key === 'upcoming') return true;
		return false;
	}

	// Check if a game is "highlighted" (has any non-null highlight)
	const isHighlighted = useCallback(
		(game: ScoreboardGameEnriched) => {
			return getGameHighlight(game, watchedSet.has(game.id)) !== null;
		},
		[watchedSet]
	);

	const filtered = useMemo(() => {
		let result = [...games];

		// Apply filters, but if alwaysShowHighlighted is on, keep highlighted games regardless
		result = result.filter(g => {
			const passesHighlight = alwaysShowHighlighted && isHighlighted(g);
			const passesClose = alwaysShowClose && g.status.state === 'in' && g.spread <= 9;
			if (passesHighlight || passesClose) return true;

			// Filter by highest team rating
			const maxRating = parseInt(ratingFilter);
			if (maxRating > 0 && g.highestRating > maxRating) return false;

			// Filter by conference
			if (conferenceFilter === 'p5' && !P5_CONFERENCES.includes(g.conference.shortName)) return false;
			if (conferenceFilter === 'mid' && (!g.conference.shortName || P5_CONFERENCES.includes(g.conference.shortName)))
				return false;
			if (
				conferenceFilter !== 'all' &&
				conferenceFilter !== 'p5' &&
				conferenceFilter !== 'mid' &&
				g.conference.shortName !== conferenceFilter
			)
				return false;

			// Filter by average rating
			const maxAvg = parseInt(avgRatingFilter);
			if (maxAvg > 0 && g.averageRating > maxAvg) return false;

			// Filter by watching only (lowest priority)
			if (watchingOnly && !watchedSet.has(g.id)) return false;

			return true;
		});

		return result;
	}, [
		games,
		ratingFilter,
		conferenceFilter,
		avgRatingFilter,
		watchingOnly,
		watchedSet,
		alwaysShowClose,
		alwaysShowHighlighted,
		isHighlighted
	]);

	// Split into sections: live, upcoming, finished — always sorted by start time
	const { liveGames, upcomingGames, finishedGames } = useMemo(() => {
		const live: ScoreboardGameEnriched[] = [];
		const upcoming: ScoreboardGameEnriched[] = [];
		const finished: ScoreboardGameEnriched[] = [];

		for (const game of filtered) {
			if (game.status.state === 'in') live.push(game);
			else if (game.status.state === 'pre') upcoming.push(game);
			else finished.push(game);
		}

		return {
			liveGames: sortByStartTime(live),
			upcomingGames: sortByStartTime(upcoming),
			finishedGames: sortByStartTime(finished)
		};
	}, [filtered]);

	// Resolve section open states with smart defaults
	const noLiveOrUpcoming = liveGames.length === 0 && upcomingGames.length === 0;

	const liveOpen = liveGames.length > 0 ? getSectionOpen('live') || !('live' in sectionState) : false;
	const upcomingOpen = upcomingGames.length > 0 ? ('upcoming' in sectionState ? sectionState['upcoming'] : true) : false;
	const finishedOpen = finishedGames.length > 0 ? ('final' in sectionState ? sectionState['final'] : noLiveOrUpcoming) : false;

	// Conference grouping within each section
	const groupSection = (sectionGames: ScoreboardGameEnriched[]) => {
		const map = new Map<string, ScoreboardGameEnriched[]>();
		for (const game of sectionGames) {
			const key = game.conference.shortName || 'Other';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(game);
		}
		return Array.from(map.entries()).sort(([a], [b]) => {
			const aP5 = P5_CONFERENCES.includes(a);
			const bP5 = P5_CONFERENCES.includes(b);
			if (aP5 && !bP5) return -1;
			if (!aP5 && bP5) return 1;
			return a.localeCompare(b);
		});
	};

	const renderCard = (game: ScoreboardGameEnriched) => {
		const isWatched = watchedSet.has(game.id);
		const highlight = getGameHighlight(game, isWatched);
		return <GameCard key={game.id} game={game} highlight={highlight} isWatched={isWatched} onToggleWatch={toggleWatch} />;
	};

	const renderGames = (sectionGames: ScoreboardGameEnriched[]) => {
		if (groupBy === 'conference') {
			const grouped = groupSection(sectionGames);
			return (
				<div className="space-y-4">
					{grouped.map(([conf, confGames]) => (
						<div key={conf}>
							<h4 className="text-xs font-medium text-muted-foreground mb-1.5 px-1">{conf}</h4>
							<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
								{confGames.map(renderCard)}
							</div>
						</div>
					))}
				</div>
			);
		}
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">{sectionGames.map(renderCard)}</div>
		);
	};

	const activeFilters =
		(ratingFilter !== '0' ? 1 : 0) +
		(conferenceFilter !== 'all' ? 1 : 0) +
		(avgRatingFilter !== '0' ? 1 : 0) +
		(alwaysShowClose ? 1 : 0) +
		(watchingOnly ? 1 : 0);
	const totalFiltered = filtered.length;

	return (
		<div className="py-4 md:py-6">
			{/* Date Navigation */}
			<div className="flex items-center justify-between mb-4 md:mb-6">
				<div className="flex items-center gap-1 md:gap-2">
					<Button variant="ghost" size="icon-sm" onClick={() => navigateDate(-1)}>
						<ChevronLeft />
					</Button>

					<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
						<PopoverTrigger asChild>
							<Button variant="outline" className="gap-2 font-medium">
								<CalendarIcon className="size-4" />
								<span className="hidden sm:inline">{formatDisplayDate(currentDate)}</span>
								<span className="sm:hidden">
									{parseDateParam(currentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
								</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<Calendar mode="single" selected={selectedDate} onSelect={selectDate} defaultMonth={selectedDate} />
						</PopoverContent>
					</Popover>

					<Button variant="ghost" size="icon-sm" onClick={() => navigateDate(1)}>
						<ChevronRight />
					</Button>
				</div>

				<div className="text-sm text-muted-foreground">
					{totalFiltered} game{totalFiltered !== 1 ? 's' : ''}
				</div>
			</div>

			{/* Controls */}
			<div className="flex flex-wrap items-center gap-2 mb-4">
				{/* Group toggle */}
				<ToggleGroup type="single" value={groupBy} onValueChange={v => v && setGroupBy(v as GroupOption)} className="h-8">
					<ToggleGroupItem value="all" className="h-8 px-2 text-xs gap-1">
						<List className="size-3.5" />
						<span className="hidden sm:inline">All</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="conference" className="h-8 px-2 text-xs gap-1">
						<LayoutGrid className="size-3.5" />
						<span className="hidden sm:inline">Conference</span>
					</ToggleGroupItem>
				</ToggleGroup>

				{/* Watch filter */}
				<Button
					variant={watchingOnly ? 'secondary' : 'ghost'}
					size="sm"
					onClick={() => setWatchingOnly(!watchingOnly)}
					className="h-8 gap-1.5 text-xs"
				>
					<Eye className={`size-3.5 ${watchingOnly ? 'text-blue-500' : ''}`} />
					<span className="hidden sm:inline">Watching</span>
					{watchedGames.length > 0 && <span className="text-[10px] text-muted-foreground">{watchedGames.length}</span>}
				</Button>

				{/* Filter toggle */}
				<Button
					variant={filtersOpen || activeFilters > (watchingOnly ? 1 : 0) ? 'secondary' : 'ghost'}
					size="sm"
					onClick={() => setFiltersOpen(!filtersOpen)}
					className="h-8 gap-1.5 text-xs"
				>
					<Filter className="size-3.5" />
					Filters
					{activeFilters > 0 && (
						<span className="bg-primary text-primary-foreground rounded-full size-4 text-[10px] flex items-center justify-center">
							{activeFilters}
						</span>
					)}
				</Button>

				{activeFilters > 0 && (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 text-xs text-muted-foreground"
						onClick={() => {
							setRatingFilter('0');
							setConferenceFilter('all');
							setAvgRatingFilter('0');
							setAlwaysShowClose(false);
							setWatchingOnly(false);
						}}
					>
						Clear
					</Button>
				)}
			</div>

			{/* Filter Panel */}
			{filtersOpen && (
				<div className="flex flex-col gap-3 mb-4 p-3 rounded-lg border border-border bg-card">
					<div className="flex flex-wrap items-end gap-3">
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Best Team</label>
							<Select value={ratingFilter} onValueChange={v => setRatingFilter(v)}>
								<SelectTrigger className="w-28 h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RATING_PRESETS.map(p => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Conference</label>
							<Select value={conferenceFilter} onValueChange={v => setConferenceFilter(v)}>
								<SelectTrigger className="w-32 h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="p5">Power 5</SelectItem>
									<SelectItem value="mid">Mid-Major</SelectItem>
									{conferences.map(c => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1">
							<label className="text-xs text-muted-foreground">Avg Rating</label>
							<Select value={avgRatingFilter} onValueChange={v => setAvgRatingFilter(v)}>
								<SelectTrigger className="w-28 h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{RATING_PRESETS.map(p => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex flex-col md:flex-row gap-3">
						<div className="flex items-center gap-2 h-8">
							<Switch id="close-games" checked={alwaysShowClose} onCheckedChange={v => setAlwaysShowClose(v)} />
							<label htmlFor="close-games" className="text-xs cursor-pointer">
								Always show close games
							</label>
						</div>
						<div className="flex items-center gap-2 h-8">
							<Switch
								id="show-highlighted"
								checked={alwaysShowHighlighted}
								onCheckedChange={v => setAlwaysShowHighlighted(v)}
							/>
							<label htmlFor="show-highlighted" className="text-xs cursor-pointer">
								Always show highlighted
							</label>
						</div>
					</div>
				</div>
			)}

			{/* Games - Sections */}
			{isPending ? (
				<div className="flex justify-center py-12">
					<div className="relative flex h-24 w-24 items-center justify-center">
						<div className="absolute inset-5 animate-spin rounded-full border-2 border-transparent border-t-neutral-600 border-r-neutral-600 border-b-neutral-600" />
						<svg viewBox="0 0 794 632" className="h-16 w-16 fill-neutral-600" preserveAspectRatio="xMidYMid meet">
							<g transform="translate(0.000000,632.000000) scale(0.100000,-0.100000)">
								<path d="M3740 5999 c-387 -31 -798 -155 -1135 -340 -774 -427 -1304 -1175 -1445 -2040 -72 -440 -36 -900 102 -1329 353 -1094 1316 -1859 2469 -1961 165 -14 483 -6 629 16 343 53 695 170 976 326 440 245 785 572 1049 998 298 480 439 1007 422 1581 -19 631 -231 1205 -632 1703 -580 721 -1509 1120 -2435 1046z m575 -174 c221 -29 419 -81 642 -167 101 -39 102 -40 108 -76 33 -202 118 -448 237 -686 38 -76 68 -139 66 -141 -2 -2 -51 -13 -109 -24 -58 -12 -148 -33 -198 -46 -51 -14 -94 -25 -95 -25 -2 0 -27 34 -56 76 -285 412 -733 849 -1085 1057 l-70 42 50 7 c80 10 379 1 510 -17z m-781 -52 c362 -160 853 -594 1195 -1056 41 -54 69 -102 65 -107 -5 -4 -49 -22 -99 -40 -49 -18 -163 -64 -253 -102 l-163 -70 -99 101 c-240 243 -530 403 -882 485 -186 44 -260 51 -528 51 -199 -1 -276 -5 -350 -18 -149 -28 -306 -71 -419 -116 -57 -23 -106 -40 -107 -38 -8 8 183 210 280 296 226 200 421 328 686 450 163 76 511 188 589 190 13 1 51 -11 85 -26z m1775 -285 c243 -137 523 -372 707 -593 46 -55 84 -102 84 -105 0 -3 -127 -5 -282 -4 l-282 1 -72 139 c-84 159 -160 346 -198 484 -14 52 -26 98 -26 103 0 12 10 8 69 -25z m-2237 -624 c301 -37 596 -152 818 -319 100 -75 230 -195 230 -213 0 -6 -28 -26 -62 -43 -35 -17 -124 -65 -198 -107 -914 -509 -1755 -1236 -2278 -1970 l-81 -113 -20 46 c-65 148 -144 442 -170 640 -21 154 -25 218 -24 395 2 438 91 808 293 1210 69 138 70 140 141 189 135 95 361 197 537 242 255 65 520 79 814 43z m3098 -258 c79 -18 85 -25 173 -194 154 -298 248 -601 291 -937 14 -109 22 -355 12 -355 -3 0 -21 31 -41 69 -82 164 -243 412 -440 681 -274 374 -525 735 -525 754 0 19 434 4 530 -18z m-651 -90 c65 -107 241 -358 451 -646 405 -555 554 -811 625 -1075 l22 -80 -23 -110 c-85 -402 -270 -794 -526 -1114 -83 -104 -311 -337 -316 -322 -2 6 4 45 12 88 47 232 68 650 47 930 -59 784 -276 1508 -645 2148 -57 99 -101 183 -97 186 6 7 194 51 286 68 109 19 107 20 164 -73z m-576 -113 c75 -118 137 -231 228 -416 241 -489 395 -1020 466 -1607 25 -205 25 -731 0 -914 -21 -154 -58 -328 -89 -422 -23 -68 -24 -70 -108 -126 -309 -206 -710 -356 -1105 -415 -208 -31 -763 -20 -797 15 -3 4 31 54 77 111 391 484 749 1208 920 1856 101 386 138 770 100 1059 -30 225 -83 390 -196 605 -33 63 -56 118 -52 122 20 18 465 195 501 198 6 1 31 -29 55 -66z m-649 -319 c202 -362 248 -774 145 -1300 -121 -621 -433 -1343 -811 -1877 -63 -88 -167 -221 -255 -325 l-28 -32 -122 34 c-673 193 -1274 670 -1607 1277 l-36 66 99 149 c372 556 1049 1194 1781 1679 254 168 720 435 760 435 9 0 40 -44 74 -106z" />
							</g>
						</svg>
					</div>
				</div>
			) : totalFiltered === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					{games.length === 0 ? 'No games scheduled for this date.' : 'No games match the current filters.'}
				</div>
			) : (
				<div className="space-y-4">
					{liveGames.length > 0 && (
						<GameSection
							title="Live"
							badge={<span className="size-2 rounded-full bg-red-500 animate-pulse" />}
							count={liveGames.length}
							open={liveOpen}
							onToggle={() => toggleSection('live')}
						>
							{renderGames(liveGames)}
						</GameSection>
					)}
					{upcomingGames.length > 0 && (
						<GameSection
							title="Upcoming"
							count={upcomingGames.length}
							open={upcomingOpen}
							onToggle={() => toggleSection('upcoming')}
						>
							{renderGames(upcomingGames)}
						</GameSection>
					)}
					{finishedGames.length > 0 && (
						<GameSection
							title="Final"
							count={finishedGames.length}
							open={finishedOpen}
							onToggle={() => toggleSection('final')}
						>
							{renderGames(finishedGames)}
						</GameSection>
					)}
				</div>
			)}
		</div>
	);
}
