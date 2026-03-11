'use client';

/** Get oklch color for a 0-100 march score */
export function getMarchScoreColor(score: number): string {
	// 0-30 = red (most saturated at 30), 45-55 = grey, 70-100 = green (most saturated at 70)
	if (score <= 30) {
		// Deep red → red: full chroma, slight lightness increase
		const t = score / 30;
		const lightness = 0.58 + 0.07 * t;
		return `oklch(${lightness.toFixed(3)} 0.200 30)`;
	}
	if (score <= 45) {
		// Red → grey: chroma fades out
		const t = (score - 30) / 15;
		const chroma = 0.20 * (1 - t);
		return `oklch(0.65 ${chroma.toFixed(3)} 30)`;
	}
	if (score >= 70) {
		// Full green: max chroma
		const lightness = 0.70;
		return `oklch(${lightness.toFixed(3)} 0.220 145)`;
	}
	if (score >= 55) {
		// Grey → green: chroma grows
		const t = (score - 55) / 15;
		const chroma = 0.22 * t;
		const lightness = 0.65 + 0.05 * t;
		return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 145)`;
	}
	// 45-55: Neutral grey zone
	return 'oklch(0.65 0 0)';
}

export function MarchScoreBadge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
	const color = getMarchScoreColor(score);

	if (size === 'sm') {
		return (
			<span
				className="text-xs font-bold tabular-nums"
				style={{ color }}
			>
				{score}
			</span>
		);
	}

	if (size === 'lg') {
		return (
			<div
				className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold tabular-nums shrink-0"
				style={{ color, backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}
			>
				{score}
			</div>
		);
	}

	// md (default)
	return (
		<div
			className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold tabular-nums shrink-0"
			style={{ color, backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}
		>
			{score}
		</div>
	);
}
