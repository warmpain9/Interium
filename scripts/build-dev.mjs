// Dev build: bundles the EXACT runtimes the loader @require's into ONE
// standalone userscript (dist/interium-dev.user.js) with no CDN @require,
// so changes can be tested locally in Tampermonkey BEFORE pushing to GitHub.
//
// Usage:
//   npm run build:dev
//   -> open Tampermonkey Dashboard -> Utilities -> "Import from file"
//      (or create a new script and paste the file contents)
//   -> DISABLE the production "Interium Loader" while the DEV script is on,
//      otherwise every runtime runs twice.
//   After each code change: re-run build:dev and re-paste/re-import.
//
// The list of runtime files is NOT duplicated here: it is parsed from the
// loader's @require lines (same technique as tests/audit.mjs), so renaming
// a runtime (ui-42 -> ui-43 ...) needs no edit in this script and the dev
// bundle always matches what production users would receive.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');

const BASE = 'https://raw.githubusercontent.com/warmpain9/Interium/main/';
const loader = await read('loader/interium-loader.user.js');
const files = [...loader.matchAll(/^\/\/ @require\s+(https:\/\/\S+)\s*$/gm)].map((m) => m[1].slice(BASE.length));
if (!files.length) throw new Error('no @require lines found in the loader');

const loaderVersion = (loader.match(/^\/\/ @version\s+(\S+)/m) || [])[1] || '0.0.0';
const stamp = new Date().toISOString().replace(/[-:]|\..+/g, '').replace('T', '.');

const header = `// ==UserScript==
// @name         Interium DEV (local build)
// @namespace    https://github.com/warmpain9/Interium
// @version      ${loaderVersion}.${stamp}
// @description  Local dev bundle of the Interium runtimes (no CDN @require). Disable the production Interium Loader while this script is enabled.
// @author       Interium contributors
// @license      MIT
// @match        https://www.pekora.zip/*
// @match        https://pekora.zip/*
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==

console.info('[Interium] DEV bundle ${loaderVersion}.${stamp} - runtimes inlined locally: ${files.join(', ')}');

`;

const bodies = await Promise.all(files.map(read));
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(
    new URL('../dist/interium-dev.user.js', import.meta.url),
    header + bodies.map((b) => b.trim()).join('\n\n') + '\n',
);
console.log('Built dist/interium-dev.user.js from: ' + files.join(', '));
