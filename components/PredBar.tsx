// Model win-chance bar in the two teams' Aurora tones ("soft glow"): each side is brightest at its
// own end and fades toward the split, with a faint glow. Used by the scoreboard, team and game pages.
export default function PredBar({ pAway, colors, height = 6, className = '' }: { pAway: number; colors: [string, string]; height?: number; className?: string }) {
	const w = Math.round(Math.min(1, Math.max(0, pAway)) * 1000) / 10;
	const [a, h] = colors;
	return (
		<div className={`flex gap-[3px] ${className}`} style={{ height }}>
			<div className="rounded-l-full" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${a}, ${a}b3)`, boxShadow: `0 0 10px -1px ${a}80` }} />
			<div className="flex-1 rounded-r-full" style={{ background: `linear-gradient(270deg, ${h}, ${h}b3)`, boxShadow: `0 0 10px -1px ${h}80` }} />
		</div>
	);
}
