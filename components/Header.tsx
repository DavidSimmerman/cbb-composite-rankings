'use client';

import { useRankings } from '@/app/context/RankingsContext';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import Logo from './Logo';
import TeamLogo from './TeamLogo';
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover';

export default function Header() {
	const [search, setSearch] = useState('');
	const [open, setOpen] = useState(false);
	const rankings = useRankings();
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);

	const fuse = useMemo(() => new Fuse(rankings, { keys: ['team_name'], threshold: 0.3 }), [rankings]);

	const results = useMemo(() => {
		if (!search.trim()) return [];
		return fuse.search(search, { limit: 10 }).map(r => r.item);
	}, [fuse, search]);

	function selectTeam(teamKey: string) {
		setOpen(false);
		setSearch('');
		router.push(`/${teamKey}`);
	}

	return (
		<div className="sticky top-0 z-50 w-full bg-neutral-900 flex items-stretch gap-5 border-b border-neutral-700 py-3 px-6">
			<Link href="/" className="cursor-pointer font-kanit font-medium italic text-2xl md:text-4xl flex gap-1">
				<Logo className="h-lh w-auto" />
				CBB Composite
			</Link>
			<Popover open={open && results.length > 0} onOpenChange={setOpen}>
				<PopoverAnchor asChild>
					<div className="relative flex items-center w-96 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
						<input
							ref={inputRef}
							placeholder="Search for teams..."
							value={search}
							onChange={e => {
								setSearch(e.target.value);
								setOpen(true);
							}}
							onFocus={() => search.trim() && setOpen(true)}
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
						{results.map(team => (
							<button
								key={team.team_key}
								onClick={() => selectTeam(team.team_key)}
								className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
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
