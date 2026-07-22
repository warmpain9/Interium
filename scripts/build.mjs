// Optional dev build: concatenates the three live runtimes into a single
// dist/interium-main.js for local testing. The loader does NOT use dist/ -
// it @require's the src/ files directly from GitHub raw, so shipping never
// depends on this script. Runtime filenames are stable (no version suffix).
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');
const stripHeader = (s) => s.replace(/^\/\/ ==UserScript==[\s\S]*?^\/\/ ==\/UserScript==\s*/m, '');

const banner = `/* Interium main runtime | MIT | Unofficial, not affiliated with Pekora.\n * Trading code source: Trading Interium (authoritative; no trade code imported from src.js).\n */\n`;

const [core, trading, ui] = await Promise.all([
    read('src/core/core.js'),
    read('src/trading/interium-trading.js'),
    read('src/ui/interium-ui.js'),
]);

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(
    new URL('../dist/interium-main.js', import.meta.url),
    banner + stripHeader(core).trim() + '\n\n' + stripHeader(trading).trim() + '\n\n' + stripHeader(ui).trim() + '\n',
);
console.log('Built dist/interium-main.js');
