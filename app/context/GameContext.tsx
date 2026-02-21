'use client';

import { createContext, useContext } from 'react';
import type { Game } from '@/lib/espn/espn-game';

interface GameContextValue {
	game: Game;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameContextProvider({ game, children }: { game: Game; children: React.ReactNode }) {
	return <GameContext.Provider value={{ game }}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
	const context = useContext(GameContext);
	if (!context) throw new Error('useGame must be used within GameContextProvider');
	return context;
}
