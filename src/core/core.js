// ==Interium Core==
// src/core/core.js - shared foundation for the Interium runtimes.
// Loaded FIRST (see @require order in loader/interium-loader.user.js),
// before src/trading/*.js and src/ui/*.js.
//
// What lives here:
//   - project version + module registry (each runtime announces itself)
//   - the unified glass recipe used across the whole UI
//   - asset URL helper for repo assets/ on jsDelivr (icons/, avatar-bgs/)
// Runtimes keep working even if they don't use the core yet; new features
// should read shared values from window.InteriumCore instead of copying them.

(function () {
    'use strict';

    if (window.InteriumCore) return; // never double-init

    const VERSION = '2.25.0';

    // ── Unified glass recipe (single source of truth) ──
    const GLASS_BG = 'rgba(255,255,255,0.05)';
    const GLASS_FILTER = 'blur(14px) saturate(160%)';
    const GLASS_BORDER_COLOR = 'rgba(255,255,255,0.12)';
    const GLASS_SHADOW = '0 8px 28px rgba(0,0,0,0.28)';
    const GLASS_CSS = `background:${GLASS_BG}!important;backdrop-filter:${GLASS_FILTER}!important;-webkit-backdrop-filter:${GLASS_FILTER}!important;border:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;`;

    // ── Repo asset helpers ──
    const CDN_BASE = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/';
    const assetUrl = (name) => CDN_BASE + 'assets/' + name; // e.g. assetUrl('icons/rare.svg')

    // ── Module registry ──
    const modules = {};
    const registerModule = (name, version) => {
        modules[name] = { version: String(version || '?'), at: Date.now() };
        console.info(`[Interium Core] module attached: ${name} v${modules[name].version}`);
    };

    window.InteriumCore = Object.freeze({
        version: VERSION,
        GLASS_BG,
        GLASS_FILTER,
        GLASS_BORDER_COLOR,
        GLASS_SHADOW,
        GLASS_CSS,
        CDN_BASE,
        assetUrl,
        registerModule,
        modules,
    });

    console.info(`[Interium Core] v${VERSION} ready.`);

    // ── Koromon's value cache warmer (v2.25.0) ──
    // The /internal/collectibles page ships a strict connect-src CSP that blocks koromons.net,
    // GitHub raw and every other external host, so its own value refresh can never fetch there
    // and its localStorage caches stay empty -> collectibles falls back to RAP. This warmer runs
    // on the OTHER pekora pages (where external fetch is allowed) and seeds the exact cache keys
    // the collectibles suite reads, so real Koromon's values/demand render instead of RAP.
    (function warmKoromonsCaches() {
        try {
            if (/^\/internal\/collectibles/i.test(location.pathname)) return; // its CSP blocks us anyway
            const ITEMS_URL = 'https://www.koromons.net/api/items';
            const FALLBACK_URL = 'https://raw.githubusercontent.com/unitedbygrief/koronevalues/refs/heads/main/valu.json';
            const VALUES_CACHE_KEY = 'pk_v50_koromons_items_v3_cache';
            const DEMAND_CACHE_KEY = 'pk_v50_koromons_demand_cache';
            const MIN_REFETCH_MS = 1000 * 60 * 30; // at most one warm per ~30 min of browsing

            try {
                const raw = localStorage.getItem(VALUES_CACHE_KEY);
                if (raw) {
                    const c = JSON.parse(raw);
                    if (c && Array.isArray(c.items) && c.items.length && (Date.now() - Number(c.t || 0)) < MIN_REFETCH_MS) return;
                }
            } catch (_) {}

            const toItems = (d) => Array.isArray(d) ? d
                : (d && Array.isArray(d.items)) ? d.items
                : (d && Array.isArray(d.data)) ? d.data
                : null;

            const getJson = (url) => fetch(url, { headers: { accept: 'application/json' } })
                .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url); return r.json(); });

            const getItems = () => getJson(ITEMS_URL)
                .then((d) => { const rows = toItems(d); if (rows && rows.length) return rows; throw new Error('koromons api/items empty'); })
                .catch((e) => {
                    console.warn('[Interium Core] warmer: api/items failed, trying valu.json fallback:', (e && e.message) || e);
                    return getJson(FALLBACK_URL).then((d) => { const rows = toItems(d); if (rows && rows.length) return rows; throw new Error('valu.json fallback empty'); });
                });

            getItems().then((rows) => {
                const payload = JSON.stringify({ t: Date.now(), items: rows });
                try { localStorage.setItem(VALUES_CACHE_KEY, payload); } catch (_) {}
                try { localStorage.setItem(DEMAND_CACHE_KEY, payload); } catch (_) {}
                console.info('[Interium Core] warmer: seeded ' + rows.length + ' Koromon\u2019s items into collectibles caches.');
            }).catch((e) => {
                console.warn('[Interium Core] warmer: could not seed value cache (page CSP may block external fetch):', (e && e.message) || e);
            });
        } catch (_) {}
    })();

})();
