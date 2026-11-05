import { readFile, writeFile, mkdir } from 'node:fs/promises';

const read = (p) => readFile(new URL('../' + p, import.meta.url), 'utf8');

const loader = await read('loader/interium-loader.user.js');
const match = loader.match(/https:\/\/raw\.githubusercontent\.com\/warmpain9\/Interium\/([^/]+)\//);
const branch = match ? match[1] : 'v2-echocore';
const BASE = `https://raw.githubusercontent.com/warmpain9/Interium/${branch}/`;

const files = [...loader.matchAll(/^\/\/ @require\s+(https:\/\/\S+)\s*$/gm)].map((m) => m[1].slice(BASE.length));
if (!files.length) throw new Error('no @require lines found in the loader');

const loaderVersion = (loader.match(/^\/\/ @version\s+(\S+)/m) || [])[1] || '2.0.0';
const stamp = new Date().toISOString().replace(/[-:]|\..+/g, '').replace('T', '.');

const header = `// ==UserScript==
// @name         Interium DEV (local build)
// @namespace    https://github.com/warmpain9/Interium
// @version      ${loaderVersion}.${stamp}
// @description  Local standalone build of Interium v2 (no CDN @require).
// @author       Interium contributors
// @license      MIT
// @match        https://www.echocr.xyz/*
// @match        https://echocr.xyz/*
// @run-at       document-start
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

console.info('[Interium] Standalone v${loaderVersion}.${stamp} active.');

`;

const bodies = await Promise.all(files.map(read));
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(
    new URL('../dist/interium-dev.user.js', import.meta.url),
    header + bodies.map((b) => b.trim()).join('\n\n') + '\n',
);
console.log('Built dist/interium-dev.user.js from: ' + files.join(', '));
