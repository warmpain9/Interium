import { readFile } from 'node:fs/promises';
const loader = await readFile(new URL('../loader/interium-loader.user.js', import.meta.url), 'utf8');
const main = await readFile(new URL('../dist/interium-main.js', import.meta.url), 'utf8');
const fail = (m) => { console.error('AUDIT FAIL:', m); process.exitCode = 1; };
if (/document\.cookie|\.cookie\s*=/.test(loader + main)) fail('cookie access found');
if (!loader.includes('raw.githubusercontent.com/warmpain9/Interium/main/dist/interium-main.js')) fail('unexpected source URL');
if (!main.includes('Trading Interium')) fail('authoritative trading module missing');
for (const forbidden of ['interium.zxwxtt.workers.dev', '/trades/v1/trades/send', 'Mass Trader']) {
  if (main.includes(forbidden)) fail(`excluded src.js trade/backend content found: ${forbidden}`);
}
if (!process.exitCode) console.log('Audit passed: no cookie access, loader URL fixed, excluded trade/backend markers absent.');
