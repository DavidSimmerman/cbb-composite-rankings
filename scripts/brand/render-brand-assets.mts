// Renders the brand assets from lib/brand/logo.ts:
//   app/apple-icon.png          180x180 home-screen icon
//   public/open-graph-image.png 1200x630 share image: the logo with the four models below
//   public/og-video.mp4         1200x630, 5s: the logo loads in (ball, letters, brackets drawn in
//                               stage by stage like the loader), then the models appear
// Run: npx tsx scripts/brand/render-brand-assets.mts
// Needs Playwright's Chromium and ffmpeg on PATH. Fonts: Space Grotesk from Google Fonts.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { logoSvg, VIEWBOX_SQUARE, VIEWBOX_TIGHT } from '../../lib/brand/logo';

const root = resolve(import.meta.dirname, '../..');
const MODELS: [string, string][] = [['KenPom', '#60a5fa'], ['EvanMiya', '#34d399'], ['BartTorvik', '#fb923c'], ['NET', '#f87171']];
const FPS = 30, SECONDS = 5;

// Timeline (seconds) for the video; the still image is the last frame
const css = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&display=block');
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #07080f; overflow: hidden; font-family: 'Space Grotesk', sans-serif; }
.stage { position: relative; width: 1200px; height: 630px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 34px; }
.glow { position: absolute; left: 50%; top: 40%; width: 760px; height: 420px; transform: translate(-50%, -50%); border-radius: 50%; background: #a855f7; opacity: 0.1; filter: blur(110px); }
.logo { position: relative; width: 820px; }
.logo svg { width: 100%; height: auto; display: block; }
.models { position: relative; display: flex; gap: 40px; font-size: 30px; font-weight: 600; letter-spacing: 0.01em; }
.models span { display: flex; align-items: center; gap: 12px; }
.models i { width: 12px; height: 12px; border-radius: 50%; }
@keyframes in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes ball { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
.anim .ballg { transform-box: fill-box; transform-origin: center; animation: ball 0.7s ease-out 0s both; }
.anim .letters { animation: in 0.6s ease-out 0.25s both; }
.anim .comp { animation: in 0.5s ease-out 0.55s both; }
.anim .bl { stroke-dasharray: 1 2; animation: draw 0.32s linear both; }
.anim .s0 { animation-delay: 0.45s } .anim .s1 { animation-delay: 0.77s } .anim .s2 { animation-delay: 1.09s }
.anim .s3 { animation-delay: 1.41s } .anim .s4 { animation-delay: 1.73s }
.anim .models span { animation: in 0.45s ease-out both; }
.anim .models span:nth-child(1) { animation-delay: 2.15s } .anim .models span:nth-child(2) { animation-delay: 2.35s }
.anim .models span:nth-child(3) { animation-delay: 2.55s } .anim .models span:nth-child(4) { animation-delay: 2.75s }
`;

// Tag the logo's parts so the page CSS can animate them (the module's SVG stays plain). The
// letters are wrapped in groups: a CSS transform on the path itself would replace its slant.
function ogLogo() {
	return logoSvg({ id: 'og', viewBox: VIEWBOX_TIGHT, animated: true })
		.replace('<g clip-path="url(#og-band)"', '<g class="ballg" clip-path="url(#og-band)"')
		.replace(/class="bracket-line bracket-d(\d)"/g, 'class="bl s$1"')
		.replace(/(<path d="[^"]+" fill="#ffffff" fill-rule="evenodd" transform="[^"]+"\/>)/, '<g class="letters">$1</g>')
		.replace(/(<path d="[^"]+" fill="#ffffff"\/>)<\/svg>$/, '<g class="comp">$1</g></svg>');
}
const page = (anim: boolean) => `<!doctype html><html><head><style>${css}</style></head><body><div class="stage ${anim ? 'anim' : ''}"><div class="glow"></div><div class="logo">${ogLogo()}</div><div class="models">${MODELS.map(([n, c]) => `<span style="color:${c}"><i style="background:${c}"></i>${n}</span>`).join('')}</div></div></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
	// apple-icon: the logo on the dark canvas, square
	const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
	await icon.setContent(`<body style="margin:0;background:#07080f;width:180px;height:180px;display:grid;place-items:center"><div style="width:168px">${logoSvg({ id: 'ai', viewBox: VIEWBOX_SQUARE })}</div></body>`);
	await icon.screenshot({ path: join(root, 'app/apple-icon.png') });

	const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
	await p.setContent(page(false), { waitUntil: 'networkidle' });
	await p.evaluate(() => document.fonts.ready);
	await p.screenshot({ path: join(root, 'public/open-graph-image.png') });

	// video: pause every animation and step it frame by frame
	await p.setContent(page(true), { waitUntil: 'networkidle' });
	await p.evaluate(() => document.fonts.ready);
	const dir = mkdtempSync(join(tmpdir(), 'og-frames-'));
	for (let f = 0; f < FPS * SECONDS; f++) {
		await p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), (f * 1000) / FPS);
		await p.screenshot({ path: join(dir, `f${String(f).padStart(4, '0')}.png`) });
	}
	execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', join(root, 'public/og-video.mp4')]);
	rmSync(dir, { recursive: true });
} finally {
	await browser.close();
}
console.log('wrote app/apple-icon.png, public/open-graph-image.png, public/og-video.mp4');
