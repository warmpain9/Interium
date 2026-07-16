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

    const VERSION = '2.14.0';

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
})();
