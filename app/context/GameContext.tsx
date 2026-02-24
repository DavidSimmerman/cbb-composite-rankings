'use client';

import type { Game } from '@/lib/espn/espn-game';
import type { RanksMap } from '@/lib/rankings/ranks-map';
import { createContext, useContext } from 'react';

interface GameContextValue {
	gameId: string;
	game: Game;
	ranksMap: RanksMap;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameContextProvider({
	gameId,
	game,
	ranksMap,
	children
}: {
	gameId: string;
	game: Game;
	ranksMap: RanksMap;
	children: React.ReactNode;
}) {
	return <GameContext.Provider value={{ gameId, game, ranksMap }}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
	const context = useContext(GameContext);
	if (!context) throw new Error('useGame must be used within GameContextProvider');
	return context;
}
