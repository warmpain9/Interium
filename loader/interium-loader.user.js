// ==UserScript==
// @name         Interium Loader
// @namespace    https://github.com/warmpain9/Interium
// @version      1.1.0
// @description  Cache-first loader for the unofficial Interium trading userscript.
// @author       Interium contributors
// @license      MIT
// @match        https://www.pekora.zip/*
// @match        https://pekora.zip/*
// @run-at       document-start
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      cdn.jsdelivr.net
// @connect      pekora.zip
// @connect      www.pekora.zip
// @connect      www.koromons.net
// @homepageURL  https://github.com/warmpain9/Interium
// @supportURL   https://github.com/warmpain9/Interium/issues
// ==/UserScript==

(() => {
  'use strict';

  const PREFIX = '[Interium Loader]';
  const SOURCE_URL = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/dist/interium-main-working.js';
  const CACHE_KEY = 'interium.loader.cacheFirst.working110.v1';
  const TIMEOUT_MS = 15_000;

  function validate(source, label) {
    if (typeof source !== 'string' || !source.includes('/* INTERIUM_MAIN */')) {
      throw new Error(`Invalid ${label}: Interium marker missing.`);
    }
    // Compile without running to catch truncated or malformed CDN responses.
    new Function(source);
  }

  function execute(source, label) {
    validate(source, label);
    // Direct eval keeps the same Tampermonkey sandbox and grants as the loader.
    eval(`${source}\n//# sourceURL=${SOURCE_URL}`);
    console.info(PREFIX, `Executed ${label} at document state: ${document.readyState}.`);
  }

  let ranAtStart = false;
  const cached = GM_getValue(CACHE_KEY, '');
  if (cached) {
    try {
      execute(cached, 'cached source');
      ranAtStart = true;
    } catch (error) {
      console.error(PREFIX, 'Cached source was invalid and will be replaced:', error);
      GM_setValue(CACHE_KEY, '');
    }
  } else {
    console.warn(PREFIX, 'No startup cache yet. Downloading it now; refresh once after this load.');
  }

  const requestUrl = `${SOURCE_URL}?t=${Date.now()}`;
  console.info(PREFIX, 'Checking current source:', requestUrl);
  GM_xmlhttpRequest({
    method: 'GET',
    url: requestUrl,
    timeout: TIMEOUT_MS,
    headers: { Accept: 'text/javascript, text/plain;q=0.9' },
    onload(response) {
      if (response.status < 200 || response.status >= 300) {
        console.error(PREFIX, `jsDelivr returned HTTP ${response.status}.`);
        return;
      }
      const latest = response.responseText || '';
      try { validate(latest, 'downloaded source'); }
      catch (error) {
        console.error(PREFIX, 'Downloaded source was rejected:', error);
        return;
      }

      const changed = latest !== cached;
      GM_setValue(CACHE_KEY, latest);

      if (!ranAtStart) {
        try {
          execute(latest, 'first downloaded source');
          console.warn(PREFIX, 'Startup cache is ready. Refresh once so Interium starts at document-start.');
        } catch (error) {
          console.error(PREFIX, 'Downloaded source stopped with a runtime error:', error);
        }
      } else if (changed) {
        console.info(PREFIX, 'A newer source was cached for the next page load.');
      } else {
        console.info(PREFIX, 'Startup cache is current.');
      }
    },
    ontimeout() { console.error(PREFIX, `Update check timed out after ${TIMEOUT_MS / 1000}s.`); },
    onerror(error) { console.error(PREFIX, 'Update check failed:', error); }
  });
})();
