// ==UserScript==
// @name         Interium Loader
// @namespace    https://github.com/warmpain9/Interium
// @version      1.0.1
// @description  Small, auditable loader for the unofficial Interium community userscript.
// @author       Interium contributors
// @license      MIT
// @match        https://www.pekora.zip/*
// @match        https://pekora.zip/*
// @run-at       document-start
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      cdn.jsdelivr.net
// @connect      www.koromons.net
// @homepageURL  https://warmpain9.github.io/Interium/
// @supportURL   https://github.com/warmpain9/Interium/issues
// ==/UserScript==

(() => {
  'use strict';

  const PREFIX = '[Interium Loader]';
  const SOURCE_URL = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/dist/interium-main.js';
  const CACHE_KEY = 'interium.loader.lastGoodSource.v1';
  const TIMEOUT_MS = 12_000;

  function compile(source, label) {
    if (typeof source !== 'string' || !source.includes('/* INTERIUM_MAIN */')) {
      throw new Error(`Refusing to run ${label}: Interium marker was not found.`);
    }
    return new Function(`${source}\n//# sourceURL=${SOURCE_URL}`);
  }

  function run(source, label) {
    const execute = compile(source, label);
    execute();
    console.info(PREFIX, `Running ${label}.`);
  }

  function runCached(reason) {
    const cached = GM_getValue(CACHE_KEY, '');
    if (!cached) {
      console.error(PREFIX, reason, 'No cached copy is available.');
      return;
    }
    console.warn(PREFIX, reason, 'Using the last successfully downloaded copy.');
    try {
      run(cached, 'cached source');
    } catch (error) {
      console.error(PREFIX, 'Cached source failed:', error);
    }
  }

  const requestUrl = `${SOURCE_URL}?t=${Date.now()}`;
  console.info(PREFIX, 'Downloading current source:', requestUrl);

  GM_xmlhttpRequest({
    method: 'GET',
    url: requestUrl,
    timeout: TIMEOUT_MS,
    headers: { Accept: 'text/javascript, text/plain;q=0.9' },
    onload(response) {
      if (response.status < 200 || response.status >= 300) {
        runCached(`jsDelivr returned HTTP ${response.status}.`);
        return;
      }

      const source = response.responseText || '';
      let execute;
      try {
        execute = compile(source, 'latest CDN source');
      } catch (error) {
        console.error(PREFIX, 'Downloaded source was invalid:', error);
        runCached('The downloaded source could not be compiled.');
        return;
      }

      try {
        execute();
        GM_setValue(CACHE_KEY, source);
        console.info(PREFIX, 'Running latest CDN source.');
      } catch (error) {
        // A failed runtime may already have changed the page, so do not run a
        // second copy over it. A cached fallback is reserved for download or
        // compilation failures.
        console.error(PREFIX, 'Latest source stopped with a runtime error:', error);
      }
    },
    ontimeout() {
      runCached(`Download timed out after ${TIMEOUT_MS / 1000}s.`);
    },
    onerror(error) {
      console.error(PREFIX, 'Download failed:', error);
      runCached('Could not reach jsDelivr.');
    }
  });
})();
