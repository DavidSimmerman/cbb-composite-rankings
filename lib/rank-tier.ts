// Rank tier colours (CLAUDE.md): top 10, 11-25, 26-100, 101-200, 200+.
// Chips use a tinted fill of the tier colour with brightened text so they read on the dark canvas.
import type { CSSProperties } from 'react';

export const tierColor = (rk: number) =>
	rk <= 10 ? '#16a34a' : rk <= 25 ? '#86efac' : rk <= 100 ? '#fbbf24' : rk <= 200 ? '#f97316' : '#ef4444';

export const tierText = (rk: number) =>
	rk <= 10 ? '#4ade80' : rk <= 25 ? '#bbf7d0' : rk <= 100 ? '#fcd34d' : rk <= 200 ? '#fb923c' : '#f87171';

export const tierChipStyle = (rk: number): CSSProperties =>
	rk <= 10 ? { background: '#16a34acc', color: '#fff' } : { background: `${tierColor(rk)}29`, color: tierText(rk) };
