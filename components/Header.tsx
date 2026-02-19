'use client';

import { useRankings } from '@/app/context/RankingsContext';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Logo from './Logo';
import TeamLogo from './TeamLogo';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';

export default function Header() {
	const [search, setSearch] = useState('');
	const [open, setOpen] = useState(false);
	const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const rankings = useRankings();
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const mobileInputRef = useRef<HTMLInputElement>(null);

	const fuse = useMemo(() => new Fuse(rankings, { keys: ['team_name'], threshold: 0.3 }), [rankings]);

	const results = useMemo(() => {
		if (!search.trim()) return [];
		return fuse.search(search, { limit: 10 }).map(r => r.item);
	}, [fuse, search]);

	useEffect(() => {
		setSelectedIndex(-1);
	}, [results]);

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

	return (
		<div className="sticky top-0 z-50 w-full bg-neutral-900 flex items-stretch gap-3 md:gap-5 border-b border-neutral-700 py-3 px-4 md:px-6">
			<Link
				href="/"
				className={`cursor-pointer font-kanit font-medium italic text-2xl md:text-4xl flex gap-1 shrink-0 transition-all duration-200 overflow-hidden ${mobileSearchOpen ? 'max-w-10' : 'max-w-80'}`}
			>
				<Logo className="h-lh w-auto shrink-0" />
				<span
					className={`transition-opacity duration-200 whitespace-nowrap ${mobileSearchOpen ? 'opacity-0' : 'opacity-100'}`}
				>
					CBB Composite
				</span>
			</Link>

			{/* Mobile search icon */}
			<button
				className="md:hidden ml-auto flex items-center cursor-pointer"
				onClick={() => {
					setMobileSearchOpen(true);
					mobileInputRef.current?.focus();
				}}
				style={{ display: mobileSearchOpen ? 'none' : undefined }}
			>
				<Search className="size-5 text-muted-foreground" />
			</button>

			{/* Mobile search bar */}
			<Popover open={open && results.length > 0 && mobileSearchOpen} onOpenChange={setOpen}>
				<PopoverAnchor asChild>
					<div
						className={`md:hidden relative flex items-center rounded-md border bg-transparent text-sm transition-all duration-200 ${mobileSearchOpen ? 'flex-1 opacity-100 px-3 py-1 border-input' : 'w-0 opacity-0 border-transparent pointer-events-none p-0 overflow-hidden'}`}
					>
						<input
							ref={mobileInputRef}
							placeholder="Search for teams..."
							value={search}
							onChange={e => {
								setSearch(e.target.value);
								setOpen(true);
							}}
							onFocus={() => search.trim() && setOpen(true)}
							onBlur={() => {
								setTimeout(closeMobileSearch, 150);
							}}
							onKeyDown={e => {
								if (e.key === 'Escape') closeMobileSearch();
								else handleSearchKeyDown(e);
							}}
							className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
							tabIndex={mobileSearchOpen ? 0 : -1}
						/>
						<Search className="size-4 text-muted-foreground" />
					</div>
				</PopoverAnchor>
				<PopoverContent
					className="w-(--radix-popover-trigger-width) p-0"
					align="start"
					sideOffset={4}
					onOpenAutoFocus={e => e.preventDefault()}
				>
					<div className="max-h-75 overflow-y-auto p-1">
						{results.map((team, i) => (
							<button
								key={team.team_key}
								onClick={() => selectTeam(team.team_key)}
								className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${i === selectedIndex ? 'bg-accent text-accent-foreground' : ''}`}
							>
								<TeamLogo teamKey={team.team_key} size={40} className="size-5" />
								<span>
									{team.ap_rank && <span className="text-muted-foreground text-xs mr-1">{team.ap_rank}</span>}
									{team.team_name}
								</span>
								<span className="ml-auto text-xs text-muted-foreground">{team.conference}</span>
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>

			{/* Desktop search bar */}
			<Popover open={open && results.length > 0 && !mobileSearchOpen} onOpenChange={setOpen}>
				<PopoverAnchor asChild>
					<div className="hidden md:flex relative items-center w-96 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
						<input
							ref={inputRef}
							placeholder="Search for teams..."
							value={search}
							onChange={e => {
								setSearch(e.target.value);
								setOpen(true);
							}}
							onFocus={() => search.trim() && setOpen(true)}
							onKeyDown={handleSearchKeyDown}
							className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
						/>
						<Search className="size-4 text-muted-foreground" />
					</div>
				</PopoverAnchor>
				<PopoverContent
					className="w-(--radix-popover-trigger-width) p-0"
					align="start"
					sideOffset={4}
					onOpenAutoFocus={e => e.preventDefault()}
				>
					<div className="max-h-75 overflow-y-auto p-1">
						{results.map((team, i) => (
							<button
								key={team.team_key}
								onClick={() => selectTeam(team.team_key)}
								className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${i === selectedIndex ? 'bg-accent text-accent-foreground' : ''}`}
							>
								<TeamLogo teamKey={team.team_key} size={40} className="size-5" />
								<span>
									{team.ap_rank && <span className="text-muted-foreground text-xs mr-1">{team.ap_rank}</span>}
									{team.team_name}
								</span>
								<span className="ml-auto text-xs text-muted-foreground">{team.conference}</span>
							</button>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
