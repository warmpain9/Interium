// ==UserScript==
// @name         Interium Loader
// @namespace    https://github.com/warmpain9/Interium
// @version      2.8.0
// @description  CSP-safe loader: Tampermonkey attaches the Interium trading + UI runtimes from GitHub (via jsDelivr) using @require.
// @author       Interium contributors
// @license      MIT
// @match        https://www.pekora.zip/*
// @match        https://pekora.zip/*
// @run-at       document-start
// @noframes
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      pekora.zip
// @connect      www.pekora.zip
// @connect      www.koromons.net
// @require      https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/dist/interium-trading-2.js
// @require      https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/dist/interium-ui-7.js
// @updateURL    https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/loader/interium-loader.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/loader/interium-loader.user.js
// @homepageURL  https://github.com/warmpain9/Interium
// @supportURL   https://github.com/warmpain9/Interium/issues
// ==/UserScript==

/*
 * Why @require instead of downloading + eval():
 * pekora.zip's Content Security Policy forbids 'unsafe-eval' on some pages
 * (for example /internal/collectibles), so no loader may execute downloaded
 * source code as a string there. With @require, Tampermonkey itself fetches
 * the runtime from GitHub and runs it as regular userscript code at
 * document-start - the page CSP cannot block that.
 *
 * How updates ship:
 * 1. Commit the changed runtime file on main:
 *      - trading (rank, collectibles, koromons values) -> dist/interium-trading-2.js
 *      - UI (panel, themes, watermark, styling)        -> dist/interium-ui-7.js
 * 2. Bump @version in THIS file and commit it too.
 * Tampermonkey auto-updates the loader from @updateURL and re-downloads the
 * @require'd runtime along with it - users never reinstall anything.
 */
console.info('[Interium Loader] v2.8.0 - trading + UI runtimes attached via @require (CSP-safe).');
