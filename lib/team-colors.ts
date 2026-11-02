// Team colours on the dark Aurora canvas.
// Raw team colours are saturated print colours and shout next to the soft model colours, so every
// bar, dot and accent uses the "Aurora tone": the team's hue, moved into the lightness band the
// model colours sit in (Tailwind 400s). Rules:
//  - a near-black primary falls back to the secondary (navy and dark purple tone into soft shades)
//  - two teams in one bar never share a colour family (two reds can't both show red); the clash
//    check runs on the toned colours, since toning pulls colours closer together
// Inputs are team_data.color / secondary_color: hex with or without '#'.

const norm = (hex: string | null | undefined) => {
	const h = (hex ?? '').replace('#', '').trim();
	return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toLowerCase()}` : null;
};
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function lab(hex: string) {
	const [r, g, b] = rgb(hex).map(v => toLin(v / 255));
	const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
	const X = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
	const Y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
	const Z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
	return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}

function oklch(hex: string): [number, number, number] {
	const [r, g, b] = rgb(hex).map(v => toLin(v / 255));
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
	return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function hexFromOklch(L: number, C: number, h: number): string {
	for (let c = C; c >= 0; c -= 0.005) {
		const A = c * Math.cos(h), B = c * Math.sin(h);
		const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
		const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
		const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
		const out = [
			4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
			-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
			-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
		];
		if (out.every(v => v >= -0.0005 && v <= 1.0005)) {
			return '#' + out.map(v => Math.round(Math.min(1, Math.max(0, fromLin(v))) * 255).toString(16).padStart(2, '0')).join('');
		}
	}
	return '#a1a1aa';
}


/** Two colours a fan would call the same: close overall, or the same hue family. */
export function clash(a: string, b: string) {
	const [L1, a1, b1] = lab(a), [L2, a2, b2] = lab(b);
	if (Math.hypot(L1 - L2, a1 - a2, b1 - b2) < 30) return true;
	const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2);
	if (c1 < 20 || c2 < 20) return c1 < 20 && c2 < 20 && Math.abs(L1 - L2) < 25; // greys / whites / blacks
	const dh = (Math.abs(Math.atan2(b1, a1) - Math.atan2(b2, a2)) * 180) / Math.PI;
	return Math.min(dh, 360 - dh) < 25;
}

/** Same hue, lightness 0.72-0.80, chroma capped at 0.15. Neutrals stay neutral. */
export function tone(hex: string) {
	const [L, C, h] = oklch(hex);
	if (C < 0.03) return hexFromOklch(Math.min(0.86, Math.max(0.72, L)), 0, 0);
	return hexFromOklch(Math.min(0.8, Math.max(0.72, L)), Math.min(C, 0.15), h);
}

const FALLBACK = '#a78bfa';

/** Black or close to it: toning can't turn it into a colour, so the team's secondary is used. */
const nearBlack = (hex: string) => oklch(hex)[0] < 0.25 && oklch(hex)[1] < 0.06;
/** Usable as a team colour once toned: anything but near-black. Toning lifts dark navies and
 *  purples into soft, readable shades of the same hue, so they keep their identity. */
const usable = (hex: string | null): hex is string => !!hex && !nearBlack(hex);

/** One team's colour: the primary unless it's near-black, else the secondary; toned. */
export function teamTone(primary?: string | null, secondary?: string | null) {
	const p = norm(primary), s = norm(secondary);
	const pick = usable(p) ? p : usable(s) ? s : (p ?? s);
	return pick ? tone(pick) : FALLBACK;
}

/** Away and home colours for a shared bar: each readable, toned, never the same family.
 *  Home switches to its secondary first, as the old pickBarColors did. */
export function matchupTones(
	away: { color?: string | null; secondary_color?: string | null } | null | undefined,
	home: { color?: string | null; secondary_color?: string | null } | null | undefined
): [string, string] {
	const opts = (t: typeof away) => {
		const list = [norm(t?.color), norm(t?.secondary_color)].filter(usable).map(tone);
		return list.length ? [...new Set(list)] : [FALLBACK];
	};
	const A = opts(away), H = opts(home);
	for (const h of H) if (!clash(A[0], h)) return [A[0], h];
	for (const a of A) for (const h of H) if (!clash(a, h)) return [a, h];
	return [A[0], '#e4e4e7'];
}
