import { readFile, writeFile, mkdir } from 'node:fs/promises';

const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');
const stripHeader = (s) => s.replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==\s*/m, '');

const banner = `/* Interium v2 runtime | MIT | Unofficial EchoCore enhancement suite */\n`;

const [core, trading, ui] = await Promise.all([
    read('src/core/core.js'),
    read('src/trading/trading.js'),
    read('src/ui/ui.js'),
]);

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(
    new URL('../dist/interium-main.js', import.meta.url),
    banner + stripHeader(core).trim() + '\n\n' + stripHeader(trading).trim() + '\n\n' + stripHeader(ui).trim() + '\n',
);
console.log('Built dist/interium-main.js');
