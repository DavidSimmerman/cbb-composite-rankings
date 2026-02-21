import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getRankHeatMap(rank: number): string {
	if (isNaN(rank) || !rank) return '';
	if (rank <= 5) return 'bg-green-500/50';
	if (rank <= 10) return 'bg-green-500/30';
	if (rank <= 20) return 'bg-green-500/20';
	if (rank <= 30) return 'bg-green-500/10';
	if (rank > 150) return 'bg-red-500/30';
	if (rank > 100) return 'bg-red-500/20';
	if (rank > 60) return 'bg-red-500/10';
	return '';
}

export function camelToSnake(str: string) {
	return str.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`);
}
