import { readFile, writeFile, mkdir } from 'node:fs/promises';
const core = await readFile(new URL('../src/core.js', import.meta.url), 'utf8');
let trading = await readFile(new URL('../src/features/trading-interium.js', import.meta.url), 'utf8');
trading = trading.replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==\s*/m, '');
const banner = `/* Interium main runtime | MIT | Unofficial, not affiliated with Pekora.\n * Trading code source: Trading Interium (authoritative; no trade code imported from src.js).\n */\n`;
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/interium-main.js', import.meta.url), banner + core + '\n\n' + trading.trim() + '\n');
console.log('Built dist/interium-main.js');
