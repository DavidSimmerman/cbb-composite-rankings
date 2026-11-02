'use client';

import { useRankings } from '@/app/context/RankingsContext';
import Fuse from 'fuse.js';
import { CalendarDays, Command, LayoutList, Lock, Search, Trophy, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Logo from './Logo';
import TeamLogo from './TeamLogo';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';

// Upsets and Bracket are hidden until tournament season; March shows locked with a note.
// The pages themselves still exist at their URLs.
const LOCKED_NOTE = 'Available later in the season';
const NAV_LINKS: { href: string; label: string; short: string; Icon: typeof LayoutList; locked?: boolean }[] = [
	{ href: '/', label: 'Rankings', short: 'Rankings', Icon: LayoutList },
	{ href: '/games', label: 'Scoreboard', short: 'Scores', Icon: CalendarDays },
	{ href: '/march', label: 'March', short: 'March', Icon: Trophy, locked: true }
];

export default function Header() {
	const [search, setSearch] = useState('');
	const [open, setOpen] = useState(false);
	const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [lockedNote, setLockedNote] = useState(false);
	const rankings = useRankings();
	const router = useRouter();
	const pathname = usePathname();
	const inputRef = useRef<HTMLInputElement>(null);
	const mobileInputRef = useRef<HTMLInputElement>(null);

	const fuse = useMemo(() => new Fuse(rankings, { keys: ['team_name'], threshold: 0.3 }), [rankings]);

	const results = useMemo(() => {
		if (!search.trim()) return [];
		return fuse.search(search, { limit: 10 }).map(r => r.item);
	}, [fuse, search]);

	const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
	const section = NAV_LINKS.find(link => isActive(link.href))?.label ?? 'CBB Composite';

	function updateSearch(value: string) {
		setSearch(value);
		setSelectedIndex(-1);
		setOpen(true);
	}

	function handleSearchKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedIndex(i => (i < results.length - 1 ? i + 1 : i));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedIndex(i => (i > 0 ? i - 1 : -1));
		} else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
			e.preventDefault();
			selectTeam(results[selectedIndex].team_key);
		}
	}

	function selectTeam(teamKey: string) {
		setOpen(false);
		setSearch('');
		setMobileSearchOpen(false);
		router.push(`/${teamKey}`);
	}

	function closeMobileSearch() {
		setMobileSearchOpen(false);
		setOpen(false);
		setSearch('');
	}

	useEffect(() => {
		if (mobileSearchOpen) {
			mobileInputRef.current?.focus();
		}
	}, [mobileSearchOpen]);

	// Cmd/Ctrl+K jumps to team search from anywhere
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
			e.preventDefault();
			if (inputRef.current?.offsetParent) inputRef.current.focus();
			else setMobileSearchOpen(true);
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	const resultsList = (
		<div className="max-h-75 overflow-y-auto p-1">
			{results.map((team, i) => (
				<button
					key={team.team_key}
					onClick={() => selectTeam(team.team_key)}
					className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer text-slate-200 hover:bg-white/10 ${i === selectedIndex ? 'bg-white/10' : ''}`}
				>
					<TeamLogo teamKey={team.team_key} size={40} className="size-5" />
					<span>
						{team.ap_rank && <span className="text-slate-500 text-xs mr-1">{team.ap_rank}</span>}
						{team.team_name}
					</span>
					<span className="ml-auto text-xs text-slate-500">{team.conference}</span>
				</button>
			))}
		</div>
	);

	const resultsClass = 'w-(--radix-popover-trigger-width) p-0 font-grotesk rounded-xl border-white/10 bg-[#0c0d16]';

	return (
		<>
			<header className="sticky top-0 z-50 w-full shrink-0 font-grotesk text-slate-300 border-b border-white/[0.06] bg-[#07080f]/80 backdrop-blur-md">
				<div className="flex items-center gap-3 h-14 lg:h-16 px-4 lg:px-6">
					<Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
						<span className="size-7 rounded-lg bg-violet-500 grid place-items-center shrink-0">
							<Logo className="size-[18px] text-white" />
						</span>
						<span className="hidden lg:inline text-white font-semibold text-[17px] tracking-tight whitespace-nowrap">
							CBB Composite
						</span>
						{!mobileSearchOpen && (
							<span className="lg:hidden text-white font-semibold whitespace-nowrap truncate">{section}</span>
						)}
					</Link>

					{/* Desktop nav */}
					<nav className="hidden lg:flex ml-6 items-center gap-1 text-[13px] rounded-full border border-white/10 bg-white/[0.03] p-1">
						{NAV_LINKS.map(link =>
							link.locked ? (
								<span key={link.href} className="group relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap text-slate-600 cursor-default" aria-disabled>
									{link.label}
									<Lock className="size-3" />
									<span role="tooltip" className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-lg border border-white/10 bg-[#0d0f18] px-2.5 py-1.5 text-[12px] text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
										{LOCKED_NOTE}
									</span>
								</span>
							) : (
								<Link
									key={link.href}
									href={link.href}
									className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${isActive(link.href) ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
								>
									{link.label}
								</Link>
							)
						)}
					</nav>

					{/* Mobile search: a round button that expands into the input */}
					{!mobileSearchOpen && (
						<button
							aria-label="Search teams"
							className="lg:hidden ml-auto size-9 grid place-items-center rounded-full border border-white/10 cursor-pointer"
							onClick={() => setMobileSearchOpen(true)}
						>
							<Search className="size-4" />
						</button>
					)}
					<Popover open={open && results.length > 0 && mobileSearchOpen} onOpenChange={setOpen}>
						<PopoverAnchor asChild>
							<div
								className={`lg:hidden items-center gap-2 h-9 px-3 rounded-full border border-white/10 bg-white/[0.03] text-sm ${mobileSearchOpen ? 'flex flex-1' : 'hidden'}`}
							>
								<Search className="size-4 shrink-0 text-slate-500" />
								<input
									ref={mobileInputRef}
									placeholder="Search teams"
									value={search}
									onChange={e => updateSearch(e.target.value)}
									onFocus={() => search.trim() && setOpen(true)}
									onBlur={() => {
										setTimeout(closeMobileSearch, 150);
									}}
									onKeyDown={e => {
										if (e.key === 'Escape') closeMobileSearch();
										else handleSearchKeyDown(e);
									}}
									className="flex-1 min-w-0 bg-transparent outline-none text-slate-200 placeholder:text-slate-500"
									tabIndex={mobileSearchOpen ? 0 : -1}
								/>
								<button aria-label="Close search" className="cursor-pointer" onClick={closeMobileSearch}>
									<X className="size-4 text-slate-500" />
								</button>
							</div>
						</PopoverAnchor>
						<PopoverContent
							className={resultsClass}
							align="start"
							sideOffset={6}
							onOpenAutoFocus={e => e.preventDefault()}
						>
							{resultsList}
						</PopoverContent>
					</Popover>

					{/* Desktop search */}
					<Popover open={open && results.length > 0 && !mobileSearchOpen} onOpenChange={setOpen}>
						<PopoverAnchor asChild>
							<div className="hidden lg:flex ml-auto items-center gap-2 h-9 w-56 px-3 rounded-full border border-white/10 bg-white/[0.03] text-[13px] focus-within:border-white/20">
								<Search className="size-3.5 shrink-0 text-slate-500" />
								<input
									ref={inputRef}
									placeholder="Search teams"
									value={search}
									onChange={e => updateSearch(e.target.value)}
									onFocus={() => search.trim() && setOpen(true)}
									onKeyDown={handleSearchKeyDown}
									className="flex-1 min-w-0 bg-transparent outline-none text-slate-200 placeholder:text-slate-500"
								/>
								<span className="flex items-center gap-0.5 text-[11px] text-slate-500">
									<Command className="size-[11px]" />K
								</span>
							</div>
						</PopoverAnchor>
						<PopoverContent
							className={resultsClass}
							align="start"
							sideOffset={6}
							onOpenAutoFocus={e => e.preventDefault()}
						>
							{resultsList}
						</PopoverContent>
					</Popover>
				</div>
			</header>

			{/* Phones: bottom tab bar. The spacer sits last in the page's flex column so content ends above the bar */}
			<div aria-hidden className="lg:hidden order-last shrink-0 h-[calc(3.5rem+env(safe-area-inset-bottom))]" />
			<nav className="lg:hidden fixed inset-x-0 bottom-0 z-50 font-grotesk border-t border-white/10 bg-[#07080f]/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
				<div className="flex justify-around h-14 text-[10px]">
					{NAV_LINKS.map(({ href, short, Icon, locked }) =>
						locked ? (
							<button
								key={href}
								type="button"
								onClick={() => {
									setLockedNote(true);
									setTimeout(() => setLockedNote(false), 2500);
								}}
								className="relative flex flex-1 flex-col items-center justify-center gap-1 text-slate-600"
							>
								<span className="relative">
									<Icon className="size-[18px]" />
									<Lock className="absolute -right-1.5 -bottom-1 size-2.5" />
								</span>
								{short}
								{lockedNote && (
									<span className="absolute bottom-full mb-2 right-2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d0f18] px-2.5 py-1.5 text-[12px] text-slate-300 shadow-lg">
										{LOCKED_NOTE}
									</span>
								)}
							</button>
						) : (
							<Link
								key={href}
								href={href}
								className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${isActive(href) ? 'text-white' : 'text-slate-500'}`}
							>
								<Icon className="size-[18px]" />
								{short}
							</Link>
						)
					)}
				</div>
			</nav>
		</>
	);
}
