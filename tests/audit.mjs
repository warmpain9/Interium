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
for (const forbidden of ['interium.zxwxtt.workers.dev', '/trades/v1/trades/send', 'Mass Trader']) {
  if (all.includes(forbidden)) fail('excluded src.js trade/backend content found: ' + forbidden);
}
if (!process.exitCode) console.log('Audit passed: 3 pinned @require sources, no cookie access, excluded trade/backend markers absent.');
