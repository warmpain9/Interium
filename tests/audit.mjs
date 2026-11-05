import { readFile } from 'node:fs/promises';
const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');
const fail = (m) => { console.error('AUDIT FAIL:', m); process.exitCode = 1; };

const loader = await read('loader/interium-loader.user.js');
const match = loader.match(/https:\/\/raw\.githubusercontent\.com\/warmpain9\/Interium\/([^/]+)\//);
const branch = match ? match[1] : 'v2-echocore';
const BASE = `https://raw.githubusercontent.com/warmpain9/Interium/${branch}/`;

const requires = [...loader.matchAll(/^\/\/ @require\s+(https:\/\/\S+)\s*$/gm)].map((m) => m[1]);
if (requires.length !== 3) fail('expected exactly 3 @require lines, got ' + requires.length);
for (const u of requires) if (!u.startsWith(BASE + 'src/')) fail('unexpected @require source: ' + u);

const bodies = await Promise.all(requires.map((u) => read(u.slice(BASE.length))));
const all = loader + bodies.join('\n');

// Security & privacy audits
if (/document\.cookie|\.cookie\s*=/.test(all)) fail('cookie access found');

for (const forbidden of ['interium.zxwxtt.workers.dev', 'workers.dev/announce', 'workers.dev/badges']) {
    if (all.includes(forbidden)) fail('excluded third-party backend content found: ' + forbidden);
}

// Core modules verification
if (!bodies.some((b) => b.includes('InteriumTrading'))) fail('InteriumTrading runtime missing');
if (!bodies.some((b) => b.includes('InteriumUI'))) fail('InteriumUI runtime missing');
if (!bodies.some((b) => b.includes('InteriumCore'))) fail('InteriumCore runtime missing');

// Card sizing fix verification
const ui = bodies.find((b) => b.includes('InteriumUI')) || '';
if (!ui.includes('aspect-ratio: 1 / 1')) fail('inventory aspect-ratio fix missing');
if (!ui.includes('--int-card-scale')) fail('card image scale variable missing');

if (!process.exitCode) console.log('Audit passed: loader sources, security boundaries, and v2 modules verified.');
