import { readFile } from 'node:fs/promises';
const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');
const fail = (m) => { console.error('AUDIT FAIL:', m); process.exitCode = 1; };

const loader = await read('loader/interium-loader.user.js');
const BASE = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/';
const requires = [...loader.matchAll(/^\/\/ @require\s+(https:\/\/\S+)\s*$/gm)].map((m) => m[1]);
if (requires.length !== 3) fail('expected exactly 3 @require lines, got ' + requires.length);
for (const u of requires) if (!u.startsWith(BASE + 'src/')) fail('unexpected @require source: ' + u);

// audit the exact local files the loader will attach
const bodies = await Promise.all(requires.map((u) => read(u.slice(BASE.length))));
const all = loader + bodies.join('\n');
if (/document\.cookie|\.cookie\s*=/.test(all)) fail('cookie access found');
if (!bodies.some((b) => b.includes('Trading Interium'))) fail('authoritative trading module missing');
// No third-party backend may ever be *called*. The Mass Trader engine talks
// only to pekora.zip's own /trades/v1/trades/send offer endpoint (allowed; it
// only sends offers the recipient must manually accept, never auto-accepts).
for (const forbidden of ['interium.zxwxtt.workers.dev', 'workers.dev/announce', 'workers.dev/badges']) {
  if (all.includes(forbidden)) fail('excluded third-party backend content found: ' + forbidden);
}
// All glassify surfaces must share the canonical visual preset. Keep the recipe in
// one place and prohibit new hard-coded positive backdrop blur values.
const ui = bodies.find((b) => b.includes('Interium UI runtime')) || '';
if (!ui.includes("const GLASS_BG = 'rgba(255,255,255,0.05)';")) fail('canonical glass background changed or missing');
if (!ui.includes("const GLASS_FILTER = 'blur(14px) saturate(160%)';")) fail('canonical glass filter changed or missing');
if (!ui.includes("const GUI_GLASS_BG = 'rgba(10,10,14,0.86)';")) fail('GUI-only dark glass tint changed or missing');
if (!ui.includes("panel.style.setProperty('background', GUI_GLASS_BG, 'important')")) fail('GUI panel does not use GUI_GLASS_BG');
if (ui.includes('.card-body${NOHOME},')) fail('nested profile card-body still receives a second glass layer');
if (!ui.includes('.card > .card-body,')) fail('nested profile card-body transparency rule missing');
const hardcodedBackdropBlurs = [...ui.matchAll(/(?:-webkit-)?backdrop-filter\s*:\s*blur\((?!0px)/g)];
if (hardcodedBackdropBlurs.length) fail('hard-coded positive backdrop blur found; use GLASS_FILTER');
for (const marker of [
  '[class*="groupCard-"] {\n                    ${GLASS_CSS}',
  '[class*="gameCardContainer"]{${GLASS_CSS}',
  '[class*="resultsContainer-"] [class*="cardWrapper-"]{${GLASS_CSS}',
  '[class*="avatarCardContainer"]{${GLASS_CSS}',
  '[class*="buttonCol-"],[class*="submenuContainer-"][class~="section-content"]{${GLASS_CSS}',
]) if (!ui.includes(marker)) fail('glassify surface does not use GLASS_CSS: ' + marker);

if (!process.exitCode) console.log('Audit passed: loader sources, privacy markers, and unified glassify surfaces verified.');
