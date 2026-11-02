'use client';

import type { ParsedEspnGame } from '@/lib/espn/schedule';
import { useEffect, useState } from 'react';

// Model win chances for upcoming games, from the same ML endpoint the game page uses
// (/api/games/predict). The model takes a home and an away team; neutral-site games are sent with
// this team as home, the same approximation the endpoint has always had for neutral games.
const cache = new Map<string, Promise<number | null>>();

function fetchChance(teamKey: string, game: ParsedEspnGame): Promise<number | null> {
	const opp = game.opp.team_key;
	const key = `${teamKey}:${game.game_id}`;
	if (!cache.has(key)) {
		const [home, away] = game.homeAway === 'away' ? [opp, teamKey] : [teamKey, opp];
		cache.set(
			key,
			fetch(`/api/games/predict?home=${home}&away=${away}`)
				.then(r => (r.ok ? r.json() : null))
				.then(d => {
					if (!d || d.error) return null;
					const p = d.home?.team_key === teamKey ? d.home.win_probability : d.away?.win_probability;
					return typeof p === 'number' ? p : null;
				})
				.catch(() => null)
		);
	}
	return cache.get(key)!;
}

/** game_id -> this team's win chance (null: the model has no answer). Missing key: still loading. */
export function useWinChances(teamKey: string, games: ParsedEspnGame[], enabled = true) {
	const [chances, setChances] = useState<Record<string, number | null>>({});
	const ids = games
		.filter(g => g.opp.team_key)
		.map(g => g.game_id)
		.join(',');

	useEffect(() => {
		if (!enabled || !ids) return;
		let cancelled = false;
		const queue = games.filter(g => g.opp.team_key);
		// A few at a time: each prediction is a database round trip on the ML server
		const worker = async () => {
			while (queue.length && !cancelled) {
				const g = queue.shift()!;
				const p = await fetchChance(teamKey, g);
				if (!cancelled) setChances(c => ({ ...c, [g.game_id]: p }));
			}
		};
		Promise.all([worker(), worker(), worker()]);
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [teamKey, ids, enabled]);

	return chances;
}
