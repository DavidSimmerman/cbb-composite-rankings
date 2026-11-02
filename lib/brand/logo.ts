// The CBB Composite logo (chosen Nov 2 2026, version B): a violet basketball ring cut around the
// slanted CBB / COMPOSITE lettering, with a four-team bracket entering from each side, centred on
// the ball. One source of truth for the header logo, favicon, loading animation and OG image.
// Canvas 866x598. Everything is plain path data; "COMPOSITE" is outlined from Kanit SemiBold
// Italic so the logo never depends on a font loading.

export const VIEWBOX = '0 0 866 598';
/** Tight crop around the artwork (for the header and anywhere the canvas padding isn't wanted). */
export const VIEWBOX_TIGHT = '30 52 806 470';
/** Square crop centred on the ball (favicons, app icons). */
export const VIEWBOX_SQUARE = '37 -106 792 792';

// ── Ball: a true circle, cut flat 18 above CBB and 18 below COMPOSITE
export const BALL = { cx: 433, cy: 287, r: 226, stroke: 18, seam: 16 };
export const BALL_CUT = { top: 182, bottom: 396 };
/** Side seams: circles branching off the ring low down, about 48 from the centre line. */
export const SEAMS = [
	{ cx: 191, cy: 287, r: 194 },
	{ cx: 675, cy: 287, r: 194 }
];
export const BALL_GRADIENT: [string, string] = ['#c13cf4', '#a43cef'];

// ── Letters: custom CBB (flat C terminals keep one straight top line), slanted 14 degrees
const CAP = 122;
const SLANT = -14;
function C(x: number, t: number, w = 146) {
	const b = t + CAP, S = 42, A = 32, R = 46, r = 14;
	return `M${x + w} ${t} H${x + R} Q${x} ${t} ${x} ${t + R} V${b - R} Q${x} ${b} ${x + R} ${b} H${x + w} V${b - A} ` +
		`H${x + S + r} Q${x + S} ${b - A} ${x + S} ${b - A - r} V${t + A + r} Q${x + S} ${t + A} ${x + S + r} ${t + A} H${x + w} Z`;
}
function B(x: number, t: number, w = 138) {
	const b = t + CAP, S = 42, wt = w - 8;
	const outer = `M${x + 6} ${t} H${x + wt - 30} Q${x + wt} ${t} ${x + wt} ${t + 30} V${t + 40} Q${x + wt} ${t + 56} ${x + wt - 14} ${t + 61} ` +
		`Q${x + w} ${t + 66} ${x + w} ${t + 86} V${b - 30} Q${x + w} ${b} ${x + w - 30} ${b} H${x + 6} Q${x} ${b} ${x} ${b - 6} V${t + 6} Q${x} ${t} ${x + 6} ${t} Z`;
	const slot = (x0: number, x1: number, y0: number, y1: number, rr = 7) =>
		`M${x0} ${y0} H${x1 - rr} Q${x1} ${y0} ${x1} ${y0 + rr} V${y1 - rr} Q${x1} ${y1} ${x1 - rr} ${y1} H${x0} Z`;
	return outer + slot(x + S, x + wt - 38, t + 30, t + 50) + slot(x + S, x + w - 40, t + 72, t + 92);
}
const LETTERS_TOP = 200;
const LETTERS_BASE = LETTERS_TOP + CAP;
const LETTERS_W = 438;
const lx = 433 - (LETTERS_W + Math.tan((-SLANT * Math.PI) / 180) * CAP) / 2;
export const LETTERS_D = C(lx, LETTERS_TOP) + B(lx + 154, LETTERS_TOP) + B(lx + 300, LETTERS_TOP);
export const LETTERS_TRANSFORM = `translate(0 ${LETTERS_BASE}) skewX(${SLANT}) translate(0 ${-LETTERS_BASE})`;
export const COMPOSITE_D = 'M222.38 378.47L222.38 378.47Q217.44 378.47 214.18 376.64Q210.91 374.80 209.64 371.35Q208.37 367.89 209.41 363.10L209.41 363.10Q211.05 355.53 215.78 351.40Q220.50 347.26 229.01 347.26L229.01 347.26Q231.78 347.26 233.87 347.69Q235.96 348.11 237.79 348.81L237.79 348.81L236.43 355.44Q232.72 353.75 228.16 353.75L228.16 353.75Q223.65 353.75 220.90 356.00Q218.15 358.26 217.11 363.10L217.11 363.10Q216.08 367.94 217.68 369.99Q219.28 372.03 224.35 372.03L224.35 372.03Q226.56 372.03 228.82 371.63Q231.07 371.23 233.28 370.39L233.28 370.39L231.87 377.06Q229.76 377.72 227.45 378.09Q225.15 378.47 222.38 378.47ZM274.59 378.47L274.59 378.47Q270.08 378.47 267.05 376.78Q264.02 375.09 262.84 371.65Q261.67 368.22 262.79 363.01L262.79 363.01Q264.58 354.59 269.05 350.93Q273.51 347.26 281.27 347.26L281.27 347.26Q285.78 347.26 288.81 348.93Q291.84 350.60 292.99 354.08Q294.14 357.56 292.97 363.01L292.97 363.01Q291.28 370.95 286.79 374.71Q282.30 378.47 274.59 378.47ZM275.95 372.03L275.95 372.03Q279.76 372.03 281.99 369.85Q284.23 367.66 285.21 363.01L285.21 363.01Q285.97 359.48 285.73 357.46Q285.50 355.44 284.06 354.59Q282.63 353.75 279.86 353.75L279.86 353.75Q276.00 353.75 273.79 355.84Q271.58 357.93 270.50 363.01L270.50 363.01Q269.84 366.25 270.08 368.25Q270.31 370.25 271.72 371.14Q273.13 372.03 275.95 372.03ZM326.24 378L318.67 378L325.07 347.73L332.26 347.73L336.96 364.51L348.66 347.73L356.37 347.73L349.98 378L342.41 378L346.07 360.61L337.52 372.83L333.34 372.83L329.91 360.61L326.24 378ZM387.38 378L379.82 378L386.21 347.73L400.69 347.73Q404.21 347.73 406.35 349.19Q408.49 350.65 409.26 353.09Q410.04 355.53 409.43 358.54L409.43 358.54Q408.49 363.43 405.29 366.27Q402.10 369.12 396.64 369.12L396.64 369.12L389.26 369.12L387.38 378ZM392.55 353.56L390.49 363.29L395.94 363.29Q398.71 363.29 400.03 361.97Q401.34 360.66 401.77 358.50L401.77 358.50Q402.28 355.86 401.55 354.71Q400.83 353.56 398.24 353.56L398.24 353.56L392.55 353.56ZM447.31 378.47L447.31 378.47Q442.79 378.47 439.76 376.78Q436.73 375.09 435.56 371.65Q434.38 368.22 435.51 363.01L435.51 363.01Q437.29 354.59 441.76 350.93Q446.22 347.26 453.98 347.26L453.98 347.26Q458.49 347.26 461.52 348.93Q464.55 350.60 465.71 354.08Q466.86 357.56 465.68 363.01L465.68 363.01Q463.99 370.95 459.50 374.71Q455.01 378.47 447.31 378.47ZM448.67 372.03L448.67 372.03Q452.47 372.03 454.71 369.85Q456.94 367.66 457.93 363.01L457.93 363.01Q458.68 359.48 458.44 357.46Q458.21 355.44 456.78 354.59Q455.34 353.75 452.57 353.75L452.57 353.75Q448.71 353.75 446.51 355.84Q444.30 357.93 443.22 363.01L443.22 363.01Q442.56 366.25 442.79 368.25Q443.03 370.25 444.44 371.14Q445.85 372.03 448.67 372.03ZM500.88 378.47L500.88 378.47Q497.87 378.47 495.36 378.02Q492.84 377.58 491.15 376.73L491.15 376.73L492.51 370.29Q494.44 371.19 496.82 371.75Q499.19 372.31 501.44 372.31L501.44 372.31Q504.26 372.31 505.77 371.80Q507.27 371.28 507.65 369.54L507.65 369.54Q507.88 368.37 507.37 367.66Q506.85 366.95 505.42 366.41Q503.98 365.87 501.54 365.12L501.54 365.12Q497.17 363.76 495.73 361.76Q494.30 359.76 495.05 356.19L495.05 356.19Q495.99 351.87 499.59 349.56Q503.18 347.26 509.25 347.26L509.25 347.26Q511.88 347.26 514.28 347.66Q516.67 348.06 518.13 348.58L518.13 348.58L516.72 355.06Q514.84 354.26 512.89 353.89Q510.94 353.51 509.01 353.51L509.01 353.51Q506.47 353.51 504.81 353.98Q503.14 354.45 502.76 356.14L502.76 356.14Q502.57 357.13 503.00 357.72Q503.42 358.31 504.71 358.78Q506.00 359.25 508.26 359.90L508.26 359.90Q511.79 360.89 513.45 362.28Q515.12 363.67 515.50 365.47Q515.87 367.28 515.40 369.54L515.40 369.54Q514.56 373.54 510.92 376.00Q507.27 378.47 500.88 378.47ZM550.09 378L542.52 378L548.91 347.73L556.48 347.73L550.09 378ZM594.50 378L586.93 378L592.10 353.56L583.22 353.56L584.44 347.73L609.77 347.73L608.55 353.56L599.67 353.56L594.50 378ZM653.62 378L631.29 378L637.69 347.73L660.01 347.73L658.79 353.56L644.03 353.56L642.67 359.90L655.69 359.90L654.47 365.83L641.45 365.83L640.08 372.17L654.84 372.17L653.62 378Z';

// ── Brackets (left side; the right side mirrors it). Four equal entries, two equal
// second-round lines, one final line; rounded corners, flat ends; slanted like the letters.
// Split into the five stages the loading animation draws in order (old site's bd0-bd4). Each
// corner piece starts 1.5 back over the line before it, so flat ends never leave a hairline seam.
const BC = BALL.cy;
const X1 = 112, X2 = 160, X_END = 200, K = 8;
const ENTRIES = [BC - 80, BC - 28, BC + 28, BC + 80];
const MIDS = [BC - 54, BC - 54, BC + 54, BC + 54];
export type BracketStage = 0 | 1 | 2 | 3 | 4;
export const BRACKET_SEGMENTS: { d: string; stage: BracketStage }[] = [
	...ENTRIES.map(y => ({ d: `M40 ${y} H${X1 - K}`, stage: 0 as const })),
	...ENTRIES.map((y, i) => ({ d: `M${X1 - K - 1.5} ${y} H${X1 - K} Q${X1} ${y} ${X1} ${y + (MIDS[i] > y ? K : -K)} V${MIDS[i]}`, stage: 1 as const })),
	...[BC - 54, BC + 54].map(y => ({ d: `M${X1} ${y} H${X2 - K}`, stage: 2 as const })),
	...[BC - 54, BC + 54].map(y => ({ d: `M${X2 - K - 1.5} ${y} H${X2 - K} Q${X2} ${y} ${X2} ${y + (BC > y ? K : -K)} V${BC}`, stage: 3 as const })),
	{ d: `M${X2} ${BC} H${X_END}`, stage: 4 }
];
export const BRACKET_STROKE = 11;
export const BRACKET_TRANSFORM = `translate(0 ${BC}) skewX(${SLANT}) translate(0 ${-BC})`;
export const MIRROR = 'translate(866 0) scale(-1 1)';

/** The whole logo as a standalone SVG string (static files, OG rendering). ids get a prefix so
 *  several copies can share a page. animated: bracket lines carry the loader classes. */
export function logoSvg({ id = 'cbb', viewBox = VIEWBOX, width, height, animated = false, ink = '#ffffff' }: { id?: string; viewBox?: string; width?: number; height?: number; animated?: boolean; ink?: string } = {}) {
	const { cx, cy, r, stroke, seam } = BALL;
	const seg = (s: (typeof BRACKET_SEGMENTS)[number]) =>
		`<path d="${s.d}"${animated ? ` pathLength="1" class="bracket-line bracket-d${s.stage}"` : ''}/>`;
	const half = BRACKET_SEGMENTS.map(seg).join('');
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${width ? ` width="${width}"` : ''}${height ? ` height="${height}"` : ''} fill="none" role="img" aria-label="CBB Composite">` +
		`<defs><linearGradient id="${id}-g" gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="0" y2="520"><stop offset="0" stop-color="${BALL_GRADIENT[0]}"/><stop offset="1" stop-color="${BALL_GRADIENT[1]}"/></linearGradient>` +
		`<clipPath id="${id}-band"><rect x="0" y="-200" width="866" height="${BALL_CUT.top + 200}"/><rect x="0" y="${BALL_CUT.bottom}" width="866" height="400"/></clipPath>` +
		`<clipPath id="${id}-in"><circle cx="${cx}" cy="${cy}" r="${r + stroke / 2 - 1}"/></clipPath></defs>` +
		`<g clip-path="url(#${id}-band)" stroke="url(#${id}-g)" stroke-width="${stroke}"><circle cx="${cx}" cy="${cy}" r="${r}"/>` +
		`<g clip-path="url(#${id}-in)" stroke-width="${seam}"><path d="M${cx} -200 V800"/>${SEAMS.map(s => `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}"/>`).join('')}</g></g>` +
		`<g stroke="${ink}" stroke-width="${BRACKET_STROKE}" stroke-linecap="butt" stroke-linejoin="round" transform="${BRACKET_TRANSFORM}"><g>${half}</g><g transform="${MIRROR}">${half}</g></g>` +
		`<path d="${LETTERS_D}" fill="${ink}" fill-rule="evenodd" transform="${LETTERS_TRANSFORM}"/>` +
		`<path d="${COMPOSITE_D}" fill="${ink}"/>` +
		`</svg>`
	);
}
