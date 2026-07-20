// ─────────────────────────────────────────────────────────────────────
// Interium UI runtime — themes, panel, watermark, page styling
// Ported from the Interium 1.0.5 GUI with these changes:
//   • Trading-specific UI is handled by the separate
//     dist/interium-trading-*.js runtime.
//   • Auto-refresher / auto-clicker code is not part of this UI runtime
//   • "LARP" fake-balance / fake-verify / fake-item tools are not part of this UI runtime
//   • Calls to the private hexium.zxwxtt.workers.dev server are not part of this build
//     (no auth gate, announcements, badges or remote profile saves)
// The only network requests made here go to pekora.zip itself (your own
// profile info + avatar headshot for the panel header). Settings are
// stored locally in Tampermonkey storage under "interium_ui_cfg_v1".
// ─────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    // ── Local / standalone fallback ───────────────────────────────────
    // Under Tampermonkey the GM_* storage APIs exist and are used as-is.
    // When the script runs WITHOUT a userscript manager (e.g. pasted into the
    // Settings are stored directly in localStorage (no GM storage needed).
    const _LS = window.localStorage;
    const _lsGet = (k, d) => { try { const s = _LS.getItem('interium_cfg_' + k); return s === null ? d : JSON.parse(s); } catch { return d; } };
    const _lsSet = (k, v) => { try { _LS.setItem('interium_cfg_' + k, JSON.stringify(v)); } catch {} };

    const PANEL_HIDDEN_KEY  = 'pks_panel_hidden';
    const THEMES = {
        purple: {
            name: 'Void',
            accent:'#c084fc',accentDim:'#9333ea',accentRgb:'192,132,252',
            topBorder:'linear-gradient(90deg,#c084fc,#818cf8,#38bdf8)',
            panelBg:'#0e0d13',headerBg:'#13111a',tabBarBg:'#0e0d13',tabBorder:'#1e1a2e',
            activeBg:'#1c1828',activeText:'#c084fc',border:'#2a2438',inputBg:'#171520',
            inputBorder:'#2d2840',sectionText:'#4a4060',labelText:'#9988bb',
            mutedText:'rgba(192,132,252,0.55)',valueText:'#e8e0f8',
            cardBorder:'#c084fc22',cardGlow:'0 0 0 1px #c084fc18, 0 4px 24px rgba(192,132,252,0.10)',
            cardHoverBorder:'#c084fc55',cardHoverGlow:'0 0 0 1px #c084fc44, 0 8px 32px rgba(192,132,252,0.18)',
            glowColor:'rgba(192,132,252,0.18)',
        },
        crimson: {
            name: 'Crimson',
            accent:'#ff4466',accentDim:'#cc2244',accentRgb:'255,68,102',
            topBorder:'linear-gradient(90deg,#ff4466,#ff8800,#ff4466)',
            panelBg:'#0d0b0b',headerBg:'#130f0f',tabBarBg:'#0d0b0b',tabBorder:'#2a1a1a',
            activeBg:'#221414',activeText:'#ff4466',border:'#3a2020',inputBg:'#1a1010',
            inputBorder:'#3a2020',sectionText:'#5a3030',labelText:'#bb8888',
            mutedText:'rgba(255,68,102,0.55)',valueText:'#f0dede',
            cardBorder:'#ff446622',cardGlow:'0 0 0 1px #ff446618, 0 4px 24px rgba(255,68,102,0.10)',
            cardHoverBorder:'#ff446655',cardHoverGlow:'0 0 0 1px #ff446644, 0 8px 32px rgba(255,68,102,0.18)',
            glowColor:'rgba(255,68,102,0.18)',
        },
        blue: {
            name: 'Arctic',
            accent:'#38bdf8',accentDim:'#0284c7',accentRgb:'56,189,248',
            topBorder:'linear-gradient(90deg,#38bdf8,#818cf8,#c084fc,#38bdf8)',
            panelBg:'#0a0c10',headerBg:'#0e1018',tabBarBg:'#0a0c10',tabBorder:'#161a28',
            activeBg:'#131828',activeText:'#38bdf8',border:'#1e2436',inputBg:'#10131e',
            inputBorder:'#1e2436',sectionText:'#303858',labelText:'#7888aa',
            mutedText:'rgba(56,189,248,0.55)',valueText:'#d0e8f8',
            cardBorder:'#38bdf822',cardGlow:'0 0 0 1px #38bdf818, 0 4px 24px rgba(56,189,248,0.10)',
            cardHoverBorder:'#38bdf855',cardHoverGlow:'0 0 0 1px #38bdf844, 0 8px 32px rgba(56,189,248,0.18)',
            glowColor:'rgba(56,189,248,0.18)',
        },
        midnight: {
            name: 'Gold',
            accent:'#f0a500',accentDim:'#c07800',accentRgb:'240,165,0',
            topBorder:'linear-gradient(90deg,#f0a500,#fbbf24,#f0a500)',
            panelBg:'#090909',headerBg:'#0e0e0e',tabBarBg:'#090909',tabBorder:'#1a1a1a',
            activeBg:'#1a1700',activeText:'#f0a500',border:'#2a2510',inputBg:'#111100',
            inputBorder:'#2a2510',sectionText:'#444',labelText:'#aaa',
            mutedText:'rgba(240,165,0,0.55)',valueText:'#f5e8cc',
            cardBorder:'#f0a50022',cardGlow:'0 0 0 1px #f0a50018, 0 4px 24px rgba(240,165,0,0.10)',
            cardHoverBorder:'#f0a50055',cardHoverGlow:'0 0 0 1px #f0a50044, 0 8px 32px rgba(240,165,0,0.18)',
            glowColor:'rgba(240,165,0,0.18)',
        },
        matrix: {
            name: 'Matrix',
            accent:'#00ff41',accentDim:'#00bb30',accentRgb:'0,255,65',
            topBorder:'linear-gradient(90deg,#00ff41,#00cc30,#00ff41)',
            panelBg:'#050a05',headerBg:'#080d08',tabBarBg:'#050a05',tabBorder:'#0a180a',
            activeBg:'#0a200a',activeText:'#00ff41',border:'#143014',inputBg:'#070e07',
            inputBorder:'#143014',sectionText:'#1a401a',labelText:'#449944',
            mutedText:'rgba(0,255,65,0.55)',valueText:'#ccffcc',
            cardBorder:'#00ff4122',cardGlow:'0 0 0 1px #00ff4118, 0 4px 24px rgba(0,255,65,0.10)',
            cardHoverBorder:'#00ff4155',cardHoverGlow:'0 0 0 1px #00ff4144, 0 8px 32px rgba(0,255,65,0.18)',
            glowColor:'rgba(0,255,65,0.18)',
        },
        rose: {
            name: 'Rose',
            accent:'#fb7185',accentDim:'#e11d48',accentRgb:'251,113,133',
            topBorder:'linear-gradient(90deg,#fb7185,#f472b6,#fb7185)',
            panelBg:'#120a0c',headerBg:'#180e11',tabBarBg:'#120a0c',tabBorder:'#2a151a',
            activeBg:'#26141a',activeText:'#fb7185',border:'#3a1f26',inputBg:'#1a1013',
            inputBorder:'#3a1f26',sectionText:'#5a3038',labelText:'#bb8893',
            mutedText:'rgba(251,113,133,0.55)',valueText:'#f5dde2',
            cardBorder:'#fb718522',cardGlow:'0 0 0 1px #fb718518, 0 4px 24px rgba(251,113,133,0.10)',
            cardHoverBorder:'#fb718555',cardHoverGlow:'0 0 0 1px #fb718544, 0 8px 32px rgba(251,113,133,0.18)',
            glowColor:'rgba(251,113,133,0.18)',
        },
        mono: {
            name: 'Mono',
            accent:'#e5e7eb',accentDim:'#9ca3af',accentRgb:'229,231,235',
            topBorder:'linear-gradient(90deg,#9ca3af,#e5e7eb,#9ca3af)',
            panelBg:'#0c0c0d',headerBg:'#101011',tabBarBg:'#0c0c0d',tabBorder:'#1c1c1e',
            activeBg:'#1c1c1e',activeText:'#e5e7eb',border:'#2b2b2e',inputBg:'#131314',
            inputBorder:'#2b2b2e',sectionText:'#4a4a4e',labelText:'#a0a0a6',
            mutedText:'rgba(229,231,235,0.55)',valueText:'#f0f0f2',
            cardBorder:'#e5e7eb22',cardGlow:'0 0 0 1px #e5e7eb14, 0 4px 24px rgba(229,231,235,0.07)',
            cardHoverBorder:'#e5e7eb44',cardHoverGlow:'0 0 0 1px #e5e7eb33, 0 8px 32px rgba(229,231,235,0.12)',
            glowColor:'rgba(229,231,235,0.14)',
        },
        sakura: {
            name: 'Sakura',
            accent:'#f9a8d4',accentDim:'#f472b6',accentRgb:'249,168,212',
            topBorder:'linear-gradient(90deg,#f9a8d4,#c084fc,#f9a8d4)',
            panelBg:'#100b0f',headerBg:'#160f15',tabBarBg:'#100b0f',tabBorder:'#281a26',
            activeBg:'#241824',activeText:'#f9a8d4',border:'#382438',inputBg:'#171018',
            inputBorder:'#382438',sectionText:'#553a54',labelText:'#bb96b6',
            mutedText:'rgba(249,168,212,0.55)',valueText:'#f5e4f0',
            cardBorder:'#f9a8d422',cardGlow:'0 0 0 1px #f9a8d418, 0 4px 24px rgba(249,168,212,0.10)',
            cardHoverBorder:'#f9a8d455',cardHoverGlow:'0 0 0 1px #f9a8d444, 0 8px 32px rgba(249,168,212,0.18)',
            glowColor:'rgba(249,168,212,0.18)',
        },
    };

    const DEFAULTS = {
        showNotifications:     true,
        notificationDuration:  5000,
        notificationPosition:  'bottom-right',
        theme:                 'purple',
        guiScale:              100,
        hotkeyRefresher:       'F',
        hotkeyHardRefresh:     'R',
        hotkeyToggleGui:       'Insert',
        clickInterval:         1500,
        hardRefreshInterval:   60000,
        miscBgUrl:                  '',
        miscBgBlur:                 false,
        miscBgBlurAmount:           8,
        miscBgDarkOverlay:          false,
        miscBgDarkOpacity:          50,
        sidebarEnabled:             false,
        sidebarMode:                'transparent',
        sidebarBlurAmount:          8,
        sidebarColour:              '#0d0d14',
        sidebarOpacity:             80,
        navbarEnabled:              false,
        navbarMode:                 'transparent',
        navbarColour:               '#0d0d14',
        navbarOpacity:              80,
        navbarDropdownGlass:        true,
        miscHideAds:                true,
        miscHideAlert:              false,
        miscHideNavbar:             false,
        miscPageFont:               'Default (Site Font)',
        miscGuiFont:                'Exo 2',
        miscHideMyFeed:             false,
        miscHideBlogNews:           false,
        miscModernGameCards:        false,
        miscGamesGlassify:          true,
        miscGamesHideComments:      false,
        miscGamesHideRecommended:   false,
        miscGamesHeroBackdrop:      true,
        miscCatalogFrameTransparent:false,
        miscCatalogHideSidebar:     false,
        miscCatalogItemCards:       true,
        miscCatalogDropdownGlass:   true,
        miscItemPageGlass:          true,
        miscGroupsGlassify:         true,
        miscProfileFrameTransparent:false,
        miscProfileTabsGlassify:    true,
        miscProfileNameAnimate:     false,
        miscProfileNameColor1:      '#5100e8',
        miscProfileNameColor2:      '#f238f8',
        miscFriendsFrameTransparent:false,
        miscFriendRequestMerge:     true,
        miscFriendsTabsGlassify:    true,
        miscMessagesGlassify:       true,
        miscInventoryGlassify:      true,
        miscDevelopGlassify:        true,
        miscAvatarFrameTransparent: false,
        miscAvatarBlurDropdown:     false,
        miscHomeFramesTransparent:  false,
        miscFooterTransparent:      false,
        profileBannerEnabled:       false,
        profileBannerImage:         '',
        profileBannerBlur:          0,
        profileBannerTint:          '#000000',
        profileBannerTintOpacity:   0,
        profileBannerTintGradient:  false,
        profileBannerTint2:         '#3f2550',
        profileBannerTintAngle:     135,
        profileBannerBrightness:    100,
        hideHexBadge:               false,
        tradesBgColor:              '#262626',
        tradesOpacity:              100,
        tradesBlur:                 0,
        tradesAccent:               '#ffffff',
        tradesGlassCards:           false,
        tradesMetric:               'value',
        tradesPillOpacity:          5,
        robuxIcon:                  'off',
        tradesGlassify:             true,
        sendTradeGlassify:          true,
        tradesDropdownGlass:        true,
        watermarkEnabled:       true,
        watermarkPosition:      'bottom-center',
        watermarkShowPing:      true,
        watermarkShowTime:      true,
        watermarkShowUser:      true,
        watermarkScale:         120,
        watermarkOpacity:       90,
        watermarkAccentColor:   '',
        customAccentEnabled:    false,
        customAccentColor:      '#00e87a',
        panelGlass:             true,
        panelOpacity:           85,
        panelBlur:              14,
        panelRadius:            16,
        panelGradientEnabled:   false,
        panelGradientColor1:    '#0d0d12',
        panelGradientColor2:    '#1a1830',
        effectType:             'none',
        effectIntensity:        50,
        effectSpeed:            50,
        effectColor:            '',
        larpEnabled:            false,
        larpVerify:             false,
        larpRobux:              0,
        larpTix:                0,
        avatarBgEnabled:        false,
        avatarBgImage:          '',
        avatarBgBlur:           0,
        avatarGlassify:         false,
        avatarEditorGlass:      true,
        avatarFakeItems:        [],
        avatarFakeQty:          {},
        anonymous:             false,
    };

    const loadCfg = () => {
        try {
            const s = _lsGet('interium_ui_cfg_v1', null);
            return s ? Object.assign({}, DEFAULTS, JSON.parse(s)) : Object.assign({}, DEFAULTS);
        } catch { return Object.assign({}, DEFAULTS); }
    };
    const saveCfg = (c) => { try { _lsSet('interium_ui_cfg_v1', JSON.stringify(c)); } catch {} };
    let cfg = loadCfg();

    const hexToRgbObj = (h) => {
        let s = String(h || '').replace('#', '').trim();
        if (s.length === 3) s = s.split('').map(c => c + c).join('');
        if (s.length !== 6) return null;
        const n = parseInt(s, 16);
        if (Number.isNaN(n)) return null;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const darkenHex = (h, f = 0.66) => {
        const c = hexToRgbObj(h); if (!c) return h;
        const d = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
        return '#' + [d(c.r), d(c.g), d(c.b)].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    const deriveAccent = (hex) => {
        const c = hexToRgbObj(hex); if (!c) return null;
        const rgb = `${c.r},${c.g},${c.b}`;
        return {
            accent: hex, accentDim: darkenHex(hex, 0.66), accentRgb: rgb, activeText: hex,
            glowColor: `rgba(${rgb},0.18)`,
            topBorder: `linear-gradient(90deg,${hex},${darkenHex(hex, 0.55)},${hex})`,
            cardBorder: `rgba(${rgb},0.13)`,
            cardGlow: `0 0 0 1px rgba(${rgb},0.10), 0 4px 24px rgba(${rgb},0.10)`,
            cardHoverBorder: `rgba(${rgb},0.33)`,
            cardHoverGlow: `0 0 0 1px rgba(${rgb},0.27), 0 8px 32px rgba(${rgb},0.18)`,
        };
    };
    const getTheme = () => {
        const base = THEMES[cfg.theme] || THEMES.purple;
        if (cfg.customAccentEnabled && cfg.customAccentColor?.trim()) {
            const derived = deriveAccent(cfg.customAccentColor.trim());
            if (derived) return Object.assign({}, base, derived);
        }
        return base;
    };

    const PAGE_FONT_SPECS = {
        'Source Sans Pro Light': { family: 'Source Sans 3', weight: 300 },
    };

    const applyPageFont = (font) => {
        let el = document.getElementById('pks-page-font-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-page-font-style'; document.head.appendChild(el); }
        if (!font || font === 'Default (Site Font)') { el.textContent = ''; return; }
        const { family, weight } = PAGE_FONT_SPECS[font] || { family: font };
        const famParam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : '');
        const url = `https://fonts.googleapis.com/css2?family=${famParam}&display=swap`;
        el.textContent = `@import url('${url}'); body, body * { font-family:'${family}',sans-serif!important;${weight ? ` font-weight:${weight}!important;` : ''} }`;
    };

    const applyGuiFont = (font) => {
        const resolved = (!font || font === 'Share Tech Mono') ? 'Share Tech Mono' : font;
        const linkId = 'pks-gui-font-link';
        let link = document.getElementById(linkId);
        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(resolved)}:wght@400;600;700&display=swap`;
        const varId = 'pks-gui-font-var';
        let varEl = document.getElementById(varId);
        if (!varEl) {
            varEl = document.createElement('style');
            varEl.id = varId;
            document.head.appendChild(varEl);
        }
        varEl.textContent = `:root { --pks-font: '${resolved}', 'Share Tech Mono', monospace; }`;
    };

    const injectFont = () => {
        const baseId = 'pks-base-font-link';
        if (!document.getElementById(baseId)) {
            const link = document.createElement('link');
            link.id = baseId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap';
            document.head.appendChild(link);
        }
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
    };

    // ── Unified glass recipe ────────────���������������������──────�����─────���────────────────
    // Every blur / glassify surface (navbar, sidebar, cards, frames,
    // dropdowns, chips) uses these EXACT values so the glass effect looks
    // identical everywhere. Tweak here to retune all glass at once.
    const GLASS_BG = 'rgba(255,255,255,0.05)';
    // GUI-only tint: deliberately darker than site glass. Do not reuse this
    // outside #pks-panel; profile/catalog/avatar surfaces stay on GLASS_BG.
    const GUI_GLASS_BG = 'rgba(10,10,14,0.86)';
    const GLASS_FILTER = 'blur(14px) saturate(160%)';
    const GLASS_BORDER_COLOR = 'rgba(255,255,255,0.12)';
    const GLASS_SHADOW = '0 8px 28px rgba(0,0,0,0.28)';
    const GLASS_CSS = `background:${GLASS_BG}!important;backdrop-filter:${GLASS_FILTER}!important;-webkit-backdrop-filter:${GLASS_FILTER}!important;border:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;`;

    const SIDEBAR_SELECTORS = [
        '.container-0-2-79 .card-0-2-80',
        '.card-d0-0-2-87',
        '.container-0-2-96 .card-0-2-97',
        '.card-d0-0-2-104',
        '[class*="container-0-2-"] > [class*="card-0-2-"]',
    ].join(',\n                    ');

    const applySidebarNavStyle = () => {
        let el = document.getElementById('pks-sidebar-nav-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-sidebar-nav-style'; document.head.appendChild(el); }
        let css = '';
        if (cfg.sidebarEnabled) {
            const op   = (cfg.sidebarOpacity ?? 80) / 100;
            const blur = cfg.sidebarBlurAmount ?? 8;
            if (cfg.sidebarMode === 'transparent') {
                css += `${SIDEBAR_SELECTORS} { background:transparent!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            } else if (cfg.sidebarMode === 'blur') {
                css += `${SIDEBAR_SELECTORS} { ${GLASS_CSS} }`;
            } else if (cfg.sidebarMode === 'colour') {
                const col = cfg.sidebarColour || '#0d0d14';
                const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
                css += `${SIDEBAR_SELECTORS} { background:rgba(${r},${g},${b},${op})!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            }
        }
        if (cfg.navbarEnabled) {
            const op   = (cfg.navbarOpacity ?? 80) / 100;
            const blur = cfg.sidebarBlurAmount ?? 8;
            if (cfg.navbarMode === 'transparent') {
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:transparent!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            } else if (cfg.navbarMode === 'blur') {
                // Glass goes on a ::before layer, NOT the navbar element itself, so the
                // navbar is not a "backdrop root" and the nested account dropdown
                // (Settings/Help/Logout) keeps its own blur instead of going transparent.
                // transform:translateZ(0) re-creates the stacking context + containing
                // block that the old backdrop-filter gave the navbar; that layer isolation
                // is what keeps the dropdown from being clipped into a scroll box. transform
                // is NOT a backdrop-root trigger, so the dropdown blur still works.
                const NAV = '.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar';
                css += `${NAV}{background:transparent!important;border:none!important;border-bottom:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;transform:translateZ(0)!important;}`;
                css += `${NAV}::before{content:''!important;position:absolute!important;inset:0!important;z-index:-1!important;pointer-events:none!important;background:${GLASS_BG}!important;backdrop-filter:${GLASS_FILTER}!important;-webkit-backdrop-filter:${GLASS_FILTER}!important;}`;
                if (cfg.navbarDropdownGlass) {
                    // Gear/account dropdown (Settings / Help / Logout) rendered inside the
                    // navbar wrapper gets the same glass as the bar itself. Menu classes
                    // from the live DOM: dropdownWrapper- anchors dropdownNew-/dropdownClass-.
                    // The bar's blur lives on a ::before layer (see above), so the nav is not
                    // a backdrop root and the dropdown's own backdrop-filter still works.
                    const DD = '.navbar-wrapper-main [class*="dropdownNew"],.navbar-wrapper-main [class*="dropdownClass"]';
                    css += `${DD}{${GLASS_CSS}border-radius:12px!important;overflow:hidden!important;}`;
                    css += `.navbar-wrapper-main [class*="dropdownNew"] a,.navbar-wrapper-main [class*="dropdownClass"] a,.navbar-wrapper-main [class*="dropdownNew"] p,.navbar-wrapper-main [class*="dropdownClass"] p{background:transparent!important;color:#fff!important;}`;
                    css += `.navbar-wrapper-main [class*="dropdownNew"] a:hover,.navbar-wrapper-main [class*="dropdownClass"] a:hover{background:rgba(255,255,255,0.08)!important;}`;
                }
            } else if (cfg.navbarMode === 'colour') {
                const col = cfg.navbarColour || '#0d0d14';
                const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:rgba(${r},${g},${b},${op})!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            }
        }
        el.textContent = css;
    };

    const applySidebarDirect = () => {
        const card = document.querySelector('.container-0-2-96 .card-0-2-97')
            || document.querySelector('.card-d0-0-2-104')
            || document.querySelector('.container-0-2-79 .card-0-2-80')
            || document.querySelector('.card-d0-0-2-87')
            || (() => {
                const containers = document.querySelectorAll('[class*="container-0-2-"]');
                for (const c of containers) {
                    const inner = c.querySelector('[class*="card-0-2-"]');
                    if (inner && inner.querySelector('a[href*="/profile"], a[href$="/home"]')) return inner;
                }
                return null;
            })();
        if (!card) return;
        // Always clear our previous inline styling first, so turning the
        // sidebar OFF (or switching modes) actually reverts it.
        ['background', 'backdrop-filter', '-webkit-backdrop-filter', 'border-color', 'box-shadow']
            .forEach(prop => card.style.removeProperty(prop));
        if (!cfg.sidebarEnabled) return;
        const op   = (cfg.sidebarOpacity ?? 80) / 100;
        const blur = cfg.sidebarBlurAmount ?? 8;
        if (cfg.sidebarMode === 'transparent') {
            card.style.setProperty('background', 'transparent', 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        } else if (cfg.sidebarMode === 'blur') {
            // Unified glass recipe - identical to every other glass surface.
            card.style.setProperty('background', GLASS_BG, 'important');
            card.style.setProperty('backdrop-filter', GLASS_FILTER, 'important');
            card.style.setProperty('-webkit-backdrop-filter', GLASS_FILTER, 'important');
            card.style.setProperty('border-color', GLASS_BORDER_COLOR, 'important');
            card.style.setProperty('box-shadow', GLASS_SHADOW, 'important');
        } else if (cfg.sidebarMode === 'colour') {
            const col = cfg.sidebarColour || '#0d0d14';
            const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
            card.style.setProperty('background', `rgba(${r},${g},${b},${op})`, 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        }
    };


    const SIDEBAR_LINKS = [
        { href: '/internal/robuxexchange', name: 'Robux Exchange' },
        { href: '/internal/tixexchange',   name: 'Tix Exchange' },
        { href: '/My/Trades.aspx',         name: 'My Trades' },
    ];
    const injectSidebarLinks = () => {
        const groups = document.querySelector('a[href="/groups"][class*="link-0-2-"]') || document.querySelector('[class*="card-0-2-"] a[href="/groups"]');
        if (!groups || !groups.parentElement) return;
        let after = groups;
        SIDEBAR_LINKS.forEach(spec => {
            const existing = document.querySelector(`a[data-pks-navlink="${spec.href}"]`);
            if (existing) { after = existing; return; }
            const clone = groups.cloneNode(true);
            clone.setAttribute('data-pks-navlink', spec.href);
            clone.setAttribute('href', spec.href);
            clone.querySelectorAll('[class*="icon-nav-"]').forEach(e => e.remove());
            const wrap = clone.querySelector('[class*="wrapper-0-2-"]');
            if (wrap) wrap.className = wrap.className.replace(/\s*hover-icon-nav-\S+/, '');
            const name = clone.querySelector('[class*="name-0-2-"]');
            if (name) name.textContent = spec.name;
            clone.querySelectorAll('[class*="countWrapper"]').forEach(e => e.remove());
            after.parentElement.insertBefore(clone, after.nextSibling);
            after = clone;
        });
    };

    // Friends glass: applies the SAME unified glass recipe as "Transparent
    // page frames" to friends sections, via inline styles so no site CSS can
    // override it. Covers the Friends page and profile friends strips, on
    // both live-site markup (friendEntry/friendWrapper) and older builds
    // (listItemFriend/sideRow).
    const FRIENDS_INLINE_PROPS = ['background', 'background-color', 'backdrop-filter', '-webkit-backdrop-filter', 'box-shadow', 'border', 'border-radius', 'color'];
    const applyFriendsTransparencyDirect = () => {
        if (!cfg.miscFriendsFrameTransparent) {
            document.querySelectorAll('[data-interium-friends]').forEach(el => {
                FRIENDS_INLINE_PROPS.forEach(p => el.style.removeProperty(p));
                el.removeAttribute('data-interium-friends');
            });
            return;
        }
        const glass = new Set();
        const clear = new Set();
        // Friends page cards -> glass
        document.querySelectorAll('[class*="friendCard-"],[class*="manageRequestCard-"]').forEach(el => glass.add(el));
        document.querySelectorAll('[class*="friendsContainer-"],[class*="friendCardWrapper-"]').forEach(el => clear.add(el));
        // Profile friends strip: find entries, glass their section container
        document.querySelectorAll('[class*="friendEntry"],[class*="friendWrapper"],[class*="listItemFriend-"]').forEach(li => {
            clear.add(li);
            const box = li.closest('.section-content,[class*="card-0-2-"],.card');
            if (box) glass.add(box);
        });
        glass.forEach(el => {
            clear.delete(el);
            el.setAttribute('data-interium-friends', '1');
            el.style.setProperty('background', GLASS_BG, 'important');
            el.style.setProperty('backdrop-filter', GLASS_FILTER, 'important');
            el.style.setProperty('-webkit-backdrop-filter', GLASS_FILTER, 'important');
            el.style.setProperty('border', `1px solid ${GLASS_BORDER_COLOR}`, 'important');
            el.style.setProperty('border-radius', '14px', 'important');
            el.style.setProperty('box-shadow', GLASS_SHADOW, 'important');
        });
        clear.forEach(el => {
            el.setAttribute('data-interium-friends', '1');
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        });
        document.querySelectorAll('[class*="listItemFriend-"] [class*="playerName-"],[class*="friendEntry"] [class*="playerName"],[class*="friendCard-"] [class*="username-"],[class*="manageRequestCard-"] [class*="username-"]').forEach(el => {
            el.setAttribute('data-interium-friends', '1');
            el.style.setProperty('color', '#fff', 'important');
        });
        const sig = location.pathname + ':' + glass.size + '/' + clear.size;
        if (applyFriendsTransparencyDirect._sig !== sig) {
            applyFriendsTransparencyDirect._sig = sig;
            console.info('[Interium] Friends glass: ' + glass.size + ' glass containers + ' + clear.size + ' cleared entries on ' + location.pathname);
        }
    };

    // Friend-request cards: the avatar/name card has no stable class we know,
    // so CSS guessing failed twice. Find it deterministically in the live DOM:
    // the element right above each manageRequestCard- strip (its previous
    // sibling, or the sibling of its friendCardWrapper-). Give it sharp BOTTOM
    // corners + zero seam gap via inline !important styles. GUI-gated:
    // "Merge friend request cards" (miscFriendRequestMerge); toggle-off
    // path removes exactly the inline props the merge sets.
    const applyRequestCardMergeDirect = () => {
        const on = !!cfg.miscFriendRequestMerge;
        document.querySelectorAll('[class*="manageRequestCard-"]').forEach(mc => {
            const wrap = mc.closest('[class*="friendCardWrapper-"]');
            const top = mc.previousElementSibling || (wrap ? wrap.previousElementSibling : null);
            if (!(top instanceof HTMLElement)) return;
            if (!on) {
                /* Toggle off: undo exactly the inline props the merge sets. */
                ['border-radius','border-bottom','margin-bottom','box-shadow'].forEach(p => top.style.removeProperty(p));
                mc.style.removeProperty('margin-top');
                if (wrap) { wrap.style.removeProperty('margin-top'); wrap.style.removeProperty('padding-top'); }
                return;
            }
            const set = (el, p, v) => el.style.setProperty(p, v, 'important');
            set(top, 'border-radius', '10px 10px 0 0');
            set(top, 'border-bottom', 'none');
            set(top, 'margin-bottom', '0');
            set(top, 'box-shadow', 'none');
            set(mc, 'margin-top', '0');
            if (wrap) { set(wrap, 'margin-top', '0'); set(wrap, 'padding-top', '0'); }
        });
    };

    // "Currently Wearing" glass: the section has no stable class hooks, so we
    // find it by its header text and glass the panels below it via inline
    // styles (same recipe as the friends glass). Gated by "Glassify profile".
    let lastWearingLogCount = -1;
    const applyWearingGlassDirect = () => {
        if (!cfg.miscProfileFrameTransparent) {
            document.querySelectorAll('[data-interium-wearing]').forEach(el => {
                FRIENDS_INLINE_PROPS.forEach(p => el.style.removeProperty(p));
                el.removeAttribute('data-interium-wearing');
            });
            return;
        }
        const glassPanel = (p, radius) => {
            p.setAttribute('data-interium-wearing', '1');
            p.style.setProperty('background', GLASS_BG, 'important');
            p.style.setProperty('backdrop-filter', GLASS_FILTER, 'important');
            p.style.setProperty('-webkit-backdrop-filter', GLASS_FILTER, 'important');
            p.style.setProperty('border', `1px solid ${GLASS_BORDER_COLOR}`, 'important');
            p.style.setProperty('border-radius', radius || '16px', 'important');
            p.style.setProperty('box-shadow', GLASS_SHADOW, 'important');
        };
        // The section container/card must NOT paint its own glass under the
        // panels - stacked layers read brighter than every other glass surface.
        const clearHost = (el) => {
            el.setAttribute('data-interium-wearing', '1');
            el.style.setProperty('background', 'transparent', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
            el.style.setProperty('backdrop-filter', 'none', 'important');
            el.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
            el.style.setProperty('border', 'none', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
        };
        const isMatch = el => /currently\s+wearing/i.test(el.textContent || '');
        // Tag-agnostic header lookup: the DEEPEST elements whose (short) text
        // is the section title - works whatever tag/class the site uses.
        const headers = [...document.querySelectorAll('body *')].filter(el => el instanceof HTMLElement && (el.textContent || '').length < 80 && isMatch(el) && ![...el.children].some(isMatch));
        let panelCount = 0;
        headers.forEach(h => {
            // Exact Pekora profile DOM (from a live dump): the H3 header sits in
            // <div class="col-12">, and its siblings inside <div class="flex
            // marginStuff"> are the two panels <div class="col-12 col-lg-6">
            // (3D viewer | wearing items).
            const headCol = h.closest('[class*="col-12"]') || h;
            const wrap = headCol.parentElement;
            if (!wrap) return;
            const panels = [...wrap.children].filter(c => c instanceof HTMLElement && c !== headCol && !c.contains(h) && c.offsetHeight >= 120);
            panels.forEach((p, i) => {
                // ONE-card effect: only the outer corners are rounded; the
                // inner meeting edges stay sharp on both sides.
                glassPanel(p, panels.length < 2 ? '16px' : (i === 0 ? '16px 0 0 16px' : (i === panels.length - 1 ? '0 16px 16px 0' : '0')));
                // No border on the inner meeting edges - two adjacent 1px
                // borders otherwise render as a bright seam line.
                if (panels.length > 1 && i < panels.length - 1) p.style.setProperty('border-right', 'none', 'important');
                if (panels.length > 1 && i > 0) p.style.setProperty('border-left', 'none', 'important');
                // No drop shadow on merged panels: each panel's soft glass
                // shadow paints over its neighbour at the seam and ruins the
                // one-card look. Inline !important beats every stylesheet.
                if (panels.length > 1) p.style.setProperty('box-shadow', 'none', 'important');
                // If the panel's own paint lives on a full-size inner wrapper,
                // clear it so it neither covers nor stacks over the glass.
                [...p.children].forEach(inner => {
                    if (inner instanceof HTMLElement && inner.offsetHeight >= p.offsetHeight - 24) clearHost(inner);
                });
                panelCount += 1;
            });
            if (!panels.length) return;
            clearHost(wrap);
            const host = wrap.closest('.card,[class*="card-0-2-"],.section-content');
            if (host && host !== wrap && host.contains(h)) clearHost(host);
        });
        if (panelCount !== lastWearingLogCount) {
            lastWearingLogCount = panelCount;
            console.info('[Interium] Wearing glass: ' + panelCount + ' panels on ' + location.pathname);
        }
    };

    const applyPageFrameTransparency = () => {
        let el = document.getElementById('pks-frame-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-frame-style'; document.head.appendChild(el); }
        const t = getTheme();
        let css = `[class*="headshotWrapper"]{background:transparent!important;background-color:transparent!important;box-shadow:none!important;}`;
        css += `li[class*="messagesContainer-"]{display:none!important;}`;
        css += `[class*="dropdownWrapper"]{position:relative!important;z-index:1500!important;}[class*="dropdownNew"],[class*="dropdownClass"]{z-index:1500!important;}`;
        css += `[class*="userStatus"],[class*="statHeader"],[class*="statText"]{font-weight:700!important;}`;
        const FRAME_CSS = `background:transparent!important;backdrop-filter:blur(0px)!important;border-color:rgba(255,255,255,0.06)!important;box-shadow:none!important;`;
        /* PAGE-GATED (leak audit): each block below only builds its CSS on
           the page it belongs to. Generic JSS names (buttonCol-, card-0-2-,
           thumbnailWrapper, favoriteButton, containerHeader...) exist on many
           pages, so ungated rules leaked across pages (e.g. profile glass
           restyled the avatar category strip). applyPageFrameTransparency is
           re-run on every SPA navigation, so the gates stay in sync. */
        if (cfg.miscHomeFramesTransparent && isHomePage()) {
            css += `[class*="myFeedContainer-"],[class*="blogNewsContainer-"],[class*="homeGamesContainer-"]{${FRAME_CSS}}`;
            css += `[class*="friendSection"] .section-content,[class*="friendSection"]{background:transparent!important;}[class*="thumbnailWrapper"]{box-shadow:none!important;}`;
        }
        if (cfg.miscCatalogFrameTransparent && /^\/catalog(\/|$)/i.test(location.pathname)) {
            // Catalog listing page + item detail page (hash-proof wildcards).
            css += `[class*="catalogPage-"],[class*="catalogContainer-"],[class*="searchResultsContainer-"],[class*="resultsWrapper-"],[class*="searchOptionsContainer-"]{${FRAME_CSS}}`;
            css += `[class*="itemDetailsContainer-"],[class*="itemDetails-"],[class*="itemThumbContainer-"]{${FRAME_CSS}}`;
        }
        if (cfg.miscProfileFrameTransparent && isProfilePage()) {
            // :has() may be unsupported in older engines - feature-detect so
            // the glass never breaks (we only lose the sidebar exclusion).
            let NOHOME = '';
            try { if (CSS.supports('selector(:has(a))')) NOHOME = ':not(:has(a[href$="/home"]))'; } catch {}
            let glassEl = document.getElementById('pks-profile-glass-style');
            if (!glassEl) { glassEl = document.createElement('style'); glassEl.id = 'pks-profile-glass-style'; document.head.appendChild(glassEl); }
            glassEl.textContent = `
                /* NOHOME keeps the site's left nav sidebar (also a .card)
                   out of the glassify effect when :has() is supported */
                .card${NOHOME},
                [class*="card-0-2-"]${NOHOME},
                [class*="avatarImageCard-"],
                [class*="groupCard-"] {
                    ${GLASS_CSS}
                    border-radius:12px!important;
                }
                /* Nested card bodies must stay transparent: glass on both the
                   outer card and card-body stacks two white layers and makes
                   the profile header brighter than the About section. */
                .card > .card-body,
                [class*="card-0-2-"] > .card-body,
                [class*="card-0-2-"] > [class*="cardBody-0-2-"],
                [class*="avatarWrapper-"],
                [class*="avatarContainer-"],
                [class*="image-0-2-"],
                [class*="listItemFriend-"],
                [class*="friendLink-"] {
                    background: transparent !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                /* backdrop-filter makes each card its own stacking context, which
                   buries the Past Usernames popover under the next glass frame.
                   Lift the hovered card so its popover paints above its siblings. */
                .card:hover,
                [class*="card-0-2-"]:hover:not([class*="dropdown"]) {
                    position: relative !important;
                    z-index: 100 !important;
                }
                .popover,
                [class*="popover"] {
                    z-index: 2000 !important;
                }
                /* About / Creations tab bar -> ONE merged glass bar: FULLY rounded
                   (14px, matches the unified tab-bar block); overflow:hidden clips
                   the accent underline inside the rounded corners */
                [class*="buttonCol"]{${GLASS_CSS}border-radius:14px!important;border-bottom:none!important;overflow:hidden!important;gap:0!important;}
                [class*="buttonCol"] [class*="vTab-"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:0!important;margin:0!important;}
                [class*="buttonCol"] [class*="vTabLabel"],[class*="buttonCol"] [class*="vTabUnselected"]{background:transparent!important;background-color:transparent!important;}
                /* Favorite Games cards on the profile page — same flat glass as
                   the game page recommended cards; nested inside .card so no
                   stacked blur (flat rgba bg + border, no backdrop-filter) */
                [class*="gameCardContainer"]{background:rgba(255,255,255,0.045)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:14px!important;box-shadow:none!important;overflow:hidden!important;transition:border-color 0.15s ease,transform 0.14s ease!important;}
                [class*="gameCardContainer"]:hover{border-color:${t.accent}88!important;transform:translateY(-2px)!important;}
                [class*="gameCardThumbContainer"],[class*="gameCardThumbContainer"] img{border-radius:14px 14px 0 0!important;background:transparent!important;}
                [class*="gameCardTitle"]{color:#fff!important;}
                [class*="gameCardPlaying"]{color:#9aa0c0!important;}
                [class*="gameCardFooterContainer"]{background:rgba(20,22,34,0.92)!important;border-radius:0 0 14px 14px!important;}
            `;
        } else {
            document.getElementById('pks-profile-glass-style')?.remove();
        }
        if (cfg.miscFriendsFrameTransparent && isFriendsPage()) {
            // Friends sections get the SAME glass as "Transparent page frames".
            css += `.section-content:has([class*="friendEntry"],[class*="listItemFriend-"]){${GLASS_CSS}border-radius:14px!important;}`;
            css += `[class*="friendCard-"],[class*="manageRequestCard-"]{${GLASS_CSS}border-radius:10px!important;}`;
            css += `[class*="friendsContainer-"],[class*="friendCardWrapper-"]{background:transparent!important;background-color:transparent!important;box-shadow:none!important;}`;
            css += `[class*="friendEntry"],[class*="friendWrapper"],[class*="thumbnailWrapper"],[class*="listItemFriend-"],[class*="sideRow-"]{background:transparent!important;background-color:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}`;
            css += `[class*="listItemFriend-"] [class*="playerName-"],[class*="friendCard-"] [class*="username-"],[class*="manageRequestCard-"] [class*="username-"]{color:#fff!important;}`;
        }
        /* Friends page (live DOM dump): tab bar is card-0-2-* > row-0-2-* >
           .col > p.entry-0-2-*; request cards are friendCardWrapper-* >
           friendCard-* (avatar/name) + manageRequestCard-* (white strip with
           p.buttonShared- Ignore/Accept). Always-on restyle: */
        /* 1. Tab bar: FULLY rounded (14px, matches the unified tab-bar block);
           overflow:hidden clips the accent underline inside the corners. */
        /* Page-gated: card-0-2-/row-0-2-/entry-0-2- are generic JSS names. */
        if (isFriendsPage()) {
        css += `[class*="card-0-2-"]:has(> [class*="row-0-2-"] > .col > [class*="entry-0-2-"]){border-radius:14px!important;overflow:hidden!important;}`;
        /* 2. Merge avatar card + buttons strip into ONE glass card: rounded
           outer corners, no borders/shadow at the seam (profile lesson).
           GUI-gated: "Merge friend request cards" (miscFriendRequestMerge). */
        if (cfg.miscFriendRequestMerge) {
        /* The avatar/name card's class is unknown - target it structurally:
           the direct child of the wrapper that sits right BEFORE the buttons
           strip. Zero out the vertical gap and both seam borders/shadows. */
        css += `[class*="friendCardWrapper-"] > *:has(+ [class*="manageRequestCard-"]){${GLASS_CSS}border-radius:10px 10px 0 0!important;border-bottom:0!important;margin-bottom:0!important;box-shadow:none!important;}`;
        css += `[class*="friendCardWrapper-"] [class*="manageRequestCard-"]{${GLASS_CSS}border-radius:0 0 10px 10px!important;border-top:0!important;margin-top:0!important;box-shadow:none!important;padding:8px 10px 10px!important;}`;
        css += `[class*="manageRequestCard-"] [class*="buttonShared-"]{border-radius:8px!important;margin:0!important;font-weight:700!important;cursor:pointer!important;transition:filter 0.15s ease,border-color 0.15s ease!important;}`;
        css += `[class*="manageRequestCard-"] [class*="ignoreButton-"]{background-color:${GLASS_BG}!important;border:1px solid ${GLASS_BORDER_COLOR}!important;color:#fff!important;margin-right:4px!important;}`;
        css += `[class*="manageRequestCard-"] [class*="ignoreButton-"]:hover{border-color:${t.accent}77!important;}`;
        css += `[class*="manageRequestCard-"] [class*="acceptButton-"]{background:linear-gradient(135deg,${t.accent},${darkenHex(t.accent,0.6)})!important;border:none!important;color:#050508!important;margin-left:4px!important;}`;
        css += `[class*="manageRequestCard-"] [class*="acceptButton-"]:hover{filter:brightness(1.12)!important;}`;
        }
        }
        applyFriendsTransparencyDirect();
        applyRequestCardMergeDirect();
        applyWearingGlassDirect();
        if (cfg.miscAvatarFrameTransparent && isAvatarPage()) css += `[class*="avatarCardContainer-"]{${FRAME_CSS}}[class*="pillToggle-"]{background:${GLASS_BG}!important;border-color:rgba(255,255,255,0.1)!important;}`;
        if (cfg.miscAvatarBlurDropdown && isAvatarPage()) { // buttonCol- also exists on profile pages
            // Exact Pekora Avatar DOM (from Avatar runtime): buttonCol-* is the category strip;
            // submenuContainer-* section-content is the hover dropdown rendered directly below it.
            // Apply the SAME complete glass recipe directly to both. Do not style their common
            // parent: backdrop-filter never blurs a parent's own children (the item cards).
            // One literal preset for BOTH surfaces. The stronger shared tint normalises the
            // different backdrops (dark page behind the strip, bright cards behind submenu)
            // while retaining the same live 14px backdrop blur on each element.
            css += `[class*="buttonCol-"],[class*="submenuContainer-"][class~="section-content"]{${GLASS_CSS}}`;
            css += `[class*="buttonCol-"]{border-radius:12px 12px 0 0!important;border-bottom:0!important;}`;
            css += `[class*="submenuContainer-"][class~="section-content"]{border-radius:0 0 12px 12px!important;border-top:0!important;margin-top:0!important;}`;

            // Pekora gives unselected category <p> elements their own opaque background. Clear
            // only those child paints so the real blur on buttonCol remains visible.
            css += `[class*="buttonCol-"] [class*="vTab-"],[class*="buttonCol-"] [class*="vTabLabel-"],[class*="buttonCol-"] [class*="vTabUnselected-"]{background:transparent!important;background-color:transparent!important;}`;
            css += `[class*="buttonCol-"] p[class*="vTabUnselected-"]{box-shadow:none!important;}`;
        }
        if (cfg.miscFooterTransparent) css += `[class*="footerContainer"],footer[class*="footerContainer"]{background:transparent!important;border-top:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;backdrop-filter:none!important;}`;
        const onGamesPage = /^\/games(\/|$)/i.test(location.pathname);
        if (cfg.miscGamesGlassify && onGamesPage) {
            const accentDark = darkenHex(t.accent, 0.62);
            const GLASS = `${GLASS_CSS}border-radius:16px!important;`;
            css += `
                /* every major frame → glass */
                [class*="recommendedGamesContainer"],[class*="serverContainer"],[class*="subSectionContainer"],[class*="gameDescription"],[class*="contentContainer"]:not([class*="badgeContentContainer"]){${GLASS}padding:16px!important;}
                /* hero → ONE unified glass frame: div.background wraps BOTH thumbContainer
                   (the game preview carousel) and callsToAction (name / creator / play / votes),
                   so the frame sits on the wrapper; callsToAction stays paint-free (stacking rule).
                   Native children are floats with hard-coded widths (640px / calc(100% - 640px)),
                   and the wrapper itself has a hard-coded height:384px (sized for the native
                   12px padding + 360px carousel) — with our 16px padding that fixed height
                   squeezes the image against the bottom edge (big gap on top, none below).
                   Rebuild it as a symmetric flex row with height:auto: even 16px padding all around. */
                [class*="gameContainer"] [class*="background-"]{${GLASS}padding:16px!important;height:auto!important;min-height:0!important;display:flex!important;align-items:stretch!important;flex-wrap:wrap!important;gap:18px!important;}
                [class*="gameContainer"] [class*="background-"]>[class*="thumbContainer"]{float:none!important;flex:0 1 640px!important;min-width:0!important;display:flex!important;align-items:center!important;justify-content:center!important;}
                [class*="carouselGameDetails"]{max-width:100%!important;}
                [class*="gameContainer"] [class*="background-"]>[class*="callsToAction"]{float:none!important;flex:1 1 240px!important;width:auto!important;min-width:0!important;height:auto!important;padding:0!important;}
                [class*="callsToAction"]{background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
                [class*="serverContainer"] [class*="callsToAction"]{border-right:1px solid rgba(255,255,255,0.12)!important;}
                [class*="carouselGameDetails"],[class*="thumbContainer"],[class*="innerCarousel"],[class*="carouselItem"]{border-radius:16px!important;overflow:hidden!important;}
                [class*="gameName"],[class*="containerHeader"] h3{color:#fff!important;}
                [class*="creatorName"]{color:${t.accent}!important;}
                [class*="descriptionText"]{color:#dfe3f0!important;background:transparent!important;}
                [class*="voteText"],[class*="voteNumbers"],[class*="playerCount"],[class*="creatorLabel"]{color:#e6e9f5!important;}
                /* game stats → modern glass chips */
                [class*="gameStatsContainer"]{display:flex!important;flex-wrap:wrap!important;gap:8px!important;border:none!important;padding:0!important;margin-top:12px!important;}
                [class*="gameStat-"]{list-style:none!important;${GLASS_CSS}border-radius:12px!important;padding:8px 13px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="gameStat-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="gameStatLabel"]{color:#9aa0c0!important;}
                [class*="gameStatStat"]{color:#fff!important;font-weight:700!important;}
                [class*="reportAbuseContainer"] a,[class*="abuseLink"]{color:${t.accent}!important;}
                /* about/store/servers tabs → styled by the unified tab-bar block below */
                /* comments → glass cards */
                [class*="commentContainer"]{${GLASS_CSS}border-radius:14px!important;padding:12px 14px!important;margin-bottom:10px!important;}
                [class*="commentEntryDiv"]{background:transparent!important;border:none!important;box-shadow:none!important;height:auto!important;}
                [class*="commentText"]{color:#e8ebf7!important;}
                [class*="commentCreatedAt"]{color:#8b93b8!important;}
                [class*="noCommentFound"]{color:#9aa0c0!important;}
                /* comment composer → one glass row: input grows, button sits right,
                   character counter drops to its own full-width line below */
                [class*="createCommentContainer"]{${GLASS_CSS}border-radius:14px!important;padding:16px!important;margin-bottom:12px!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;}
                [class*="createCommentContainer"] [class*="commentBox"]{flex:1 1 auto!important;width:auto!important;background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
                [class*="createCommentContainer"] [class*="btnDiv"]{flex:0 0 auto!important;margin:0 0 0 12px!important;}
                [class*="createCommentContainer"] input{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;color:#fff!important;height:44px!important;padding:5px 14px!important;}
                [class*="createCommentContainer"] input:focus{border-color:${t.accent}!important;background:rgba(255,255,255,0.09)!important;outline:none!important;}
                [class*="createCommentContainer"] input::placeholder{color:rgba(255,255,255,0.42)!important;}
                [class*="createCommentContainer"] [class*="continueButton"]{height:44px!important;padding:8px 16px!important;border-radius:12px!important;border:none!important;background:linear-gradient(135deg,${t.accent},${accentDark})!important;color:#fff!important;font-weight:700!important;box-shadow:0 6px 20px ${t.accent}44!important;cursor:pointer!important;transition:transform 0.15s ease,box-shadow 0.15s ease,filter 0.15s ease!important;}
                [class*="createCommentContainer"] [class*="continueButton"]:hover{transform:translateY(-1px)!important;filter:brightness(1.08)!important;box-shadow:0 8px 24px ${t.accent}77!important;}
                [class*="createCommentContainer"] [class*="continueButton"]:disabled{opacity:0.55!important;}
                [class*="createCommentContainer"] [class*="commentMsg"]{flex:0 0 100%!important;position:static!important;width:100%!important;min-height:0!important;margin:10px 0 0!important;text-align:right!important;font-size:12px!important;display:block!important;}
                [class*="characterCount"]{position:static!important;display:inline-block!important;color:#8b93b8!important;font-size:12px!important;}
                /* badges → flat translucent cards (inside glassed panels — stacking rule) */
                [class*="descriptionHeaderContainer"] h3{color:#fff!important;}
                [class*="badgeList"]{gap:10px!important;}
                [class*="badgeContainer"]{background:rgba(255,255,255,0.045)!important;border:1px solid rgba(255,255,255,0.10)!important;border-radius:14px!important;padding:14px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="badgeContainer"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="badgeContentContainer"]{background:transparent!important;border:none!important;box-shadow:none!important;padding:0 12px!important;}
                [class*="badgeImageContainer"] img{filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35))!important;}
                [class*="badgeDetailsContainer"] a{color:${t.accent}!important;}
                [class*="badgeStatField"]{color:#9aa0c0!important;}
                [class*="badgeStatValue"]{color:#fff!important;font-weight:700!important;}
                [class*="seeMoreButton"],[class*="loadMoreBtn"]{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;color:#fff!important;font-weight:600!important;cursor:pointer!important;transition:background 0.15s ease,border-color 0.15s ease!important;}
                [class*="seeMoreButton"]:hover,[class*="loadMoreBtn"]:hover{background:rgba(255,255,255,0.10)!important;border-color:${t.accent}99!important;}
                [class*="loadMore"]{color:${t.accent}!important;font-weight:600!important;}
                /* recommended games → hover cards. Real component (2901 shared chunk):
                   gameCardContainer paints the native card (var(--white-color) + grey shadow,
                   3px radius). Flat translucent inside the glassed panel (stacking rule).
                   SCOPED under recommendedGamesContainer: this glassify block is gated to
                   /games as a whole, so unscoped gameCard* rules also hit the /games
                   LISTING and (winning the cascade by document order) turned its cards
                   back into a bare 4.5% white film -- the listing is owned by the unified
                   "Modern game cards" setting (applyCardStyle) instead. */
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]{gap:10px!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardContainer"]{background:rgba(255,255,255,0.045)!important;border:1px solid rgba(255,255,255,0.10)!important;border-radius:14px!important;overflow:hidden!important;box-shadow:none!important;transition:border-color 0.15s ease,transform 0.14s ease,box-shadow 0.15s ease!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardContainer"]:hover{border-color:${t.accent}88!important;transform:translateY(-2px)!important;box-shadow:0 10px 26px rgba(0,0,0,0.35)!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardThumbContainer"],[class*="recommendedGamesContainer"] [class*="gameCardThumbContainer"] img{border-radius:14px 14px 0 0!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardTitle"]{color:#fff!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardPlaying"]{color:#9aa0c0!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardFooterContainer"]{background:rgba(20,22,34,0.92)!important;box-shadow:0 10px 26px rgba(0,0,0,0.45)!important;border-radius:0 0 14px 14px!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardFooter-"]{border-top:1px solid rgba(255,255,255,0.12)!important;}
                /* recommended games → ONE scrollable row instead of wrapping. Native layout is
                   ul > li.listItem (width:16.66%, float:left), which wraps to extra rows. Scoped
                   to the recommended panel so other card grids keep their native layout. The
                   hover footer strip is hidden here: a horizontal scroll container clips
                   anything hanging below the cards, so it would render cut in half. */
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;padding:6px 2px 12px!important;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.22) transparent;}
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]>li{float:none!important;flex:0 0 auto!important;width:16.6667%!important;min-width:150px!important;margin-bottom:0!important;}
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]::-webkit-scrollbar{height:8px;}
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:8px;}
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.32);}
                [class*="recommendedGamesContainer"] [class*="gameCardsContainer"]::-webkit-scrollbar-track{background:transparent;}
                [class*="recommendedGamesContainer"] [class*="gameCardFooterContainer"]{display:none!important;}
                /* store tab game passes → cards. Flat translucent (NO backdrop-filter): they sit
                   inside the already-glassed tabPane panel (stacking rule). Native passCard is a
                   white 3px-radius box with a hard caption divider and grey Buy buttons. */
                [class*="passCard"]{background:rgba(255,255,255,0.045)!important;border:1px solid rgba(255,255,255,0.10)!important;border-radius:14px!important;overflow:hidden!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="passCard"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="passPicture"] img{border-radius:14px 14px 0 0!important;}
                [class*="passCaption"]{border-top:1px solid rgba(255,255,255,0.12)!important;padding:4px 10px 10px!important;}
                [class*="passName"]{color:#fff!important;}
                [class*="passCard"] [class*="buyBtn"]{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:10px!important;color:#fff!important;transition:background 0.15s ease,border-color 0.15s ease,color 0.15s ease!important;}
                [class*="passCard"] [class*="buyBtn"]:hover{background:#3fc679!important;border-color:#3fc679!important;color:#fff!important;}
                /* ...but the LIVE game page renders passes with a different component:
                   gPassWrapper > "section-content hoverShadow" gPassContainer > gPassImg +
                   gPassDetails (hard #b8b8b8 divider, gPassName / price / gPassBuyButton).
                   section-content paints the native white card — override it here. */
                [class*="gPassContainer"]{background:rgba(255,255,255,0.045)!important;border:1px solid rgba(255,255,255,0.10)!important;border-radius:14px!important;overflow:hidden!important;box-shadow:none!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="gPassContainer"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;box-shadow:none!important;}
                [class*="gPassImg"]{border-radius:14px 14px 0 0!important;}
                [class*="gPassDetails"]{border-top:1px solid rgba(255,255,255,0.12)!important;padding:4px 10px 10px!important;background:transparent!important;}
                [class*="gPassName"]{color:#fff!important;}
                [class*="gPassBuyButton"]{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:10px!important;color:#fff!important;transition:background 0.15s ease,border-color 0.15s ease,color 0.15s ease!important;}
                [class*="gPassBuyButton"]:hover{background:#3fc679!important;border-color:#3fc679!important;color:#fff!important;}
                [class*="gPassOwnedButton"]{color:#9aa0c0!important;}
                /* creator's "Add Pass" tile */
                [class*="addPassText"]{color:#c8cde0!important;}
                [class*="addPassIcon"]{filter:invert(1) opacity(0.75)!important;}
                /* recommended games and comments both live in a row.recommendedGamesContainer
                   glass panel back-to-back — add breathing room so they read as separate blocks */
                [class*="recommendedGamesContainer"]{margin-bottom:18px!important;}
                /* modern, sleek buttons */
                [class*="actionButtonsContainer"]{gap:8px!important;}
                [class*="playButtonContainer"] button,[class*="buttonWrapper"] button{background:linear-gradient(135deg,${t.accent},${accentDark})!important;border:none!important;border-radius:14px!important;box-shadow:0 6px 22px ${t.accent}55!important;transition:transform 0.16s ease,box-shadow 0.16s ease,filter 0.16s ease!important;}
                [class*="playButtonContainer"] button:hover,[class*="buttonWrapper"] button:hover{transform:translateY(-2px) scale(1.02)!important;filter:brightness(1.08)!important;box-shadow:0 12px 30px ${t.accent}88!important;}
                [class*="playButtonContainer"] button [class*="iconPlay"]{filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))!important;}

            `;
            // /games LISTING cards are owned by the unified "Modern game
            // cards" setting (miscModernGameCards in applyCardStyle), shared
            // with the home page. The flat translucent card rules above only
            // matter on the game DETAIL page (nested inside glassed panels).
        }
        // Only strip native frames when a feature that draws its own (glass / hero backdrop) is enabled.
        // Inner hosts (thumb, carousel, description) are always cleared; the background- hero
        // wrapper is cleared ONLY when it does not itself carry the unified hero glass above
        // (i.e. glassify off or not on a /games/<id> page).
        if (cfg.miscGamesGlassify || cfg.miscGamesHeroBackdrop) css += `[class*="gameContainer"] [class*="thumbContainer"],[class*="gameContainer"] [class*="carouselGameDetails"],[class*="gameContainer"] [class*="descriptionContainer"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if ((cfg.miscGamesGlassify || cfg.miscGamesHeroBackdrop) && !(cfg.miscGamesGlassify && onGamesPage)) css += `[class*="gameContainer"] [class*="background-"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (cfg.miscGamesHideRecommended && onGamesPage) css += `[class*="recommendedGamesContainer"]{display:none!important;}`;
        if (cfg.miscGamesHideComments && onGamesPage) css += `[class*="commentsContainer"]{display:none!important;}[class*="containerHeader"]:has(+[class*="commentsContainer"]){display:none!important;}`;
        // ── Tab bars: unified glass (REWRITTEN) ──
        // There are TWO different native tab components, not one:
        //  1) vTab component — game page (About/Store/Servers, wrapped in
        //     horizontalTabs) and profile page (About/Creations, no wrapper):
        //     div[buttonCol-] > div[vTab-] > p[vTabLabel-]; unselected labels also
        //     carry vTabUnselected- with a native paddingTop:7px that misaligns the
        //     text, and the selected tab hides a white btnBottomSeperator strip that
        //     hangs BELOW the bar (height:5px;margin-bottom:-5px) — display:none it.
        //  2) friends page (/users/<id>/friends) — a DIFFERENT component entirely:
        //     div[card-] > div[row-] > .col > p[entry-] (+entryActive-); its native
        //     underline is an inset box-shadow 0 -4px var(--primary-color).
        // Both are rebuilt as ONE glass bar: equal flex columns, uniform padding,
        // accent underline on the active tab, soft hover highlight. Page-gated
        // because the same generic class names are reused elsewhere (Groups,
        // Messages keep their native tabs; the avatar page strip styles buttonCol-
        // itself, but that block is gated to the avatar page).
        // The underline is an INSET PILL (::after with rounded ends, pulled in from
        // the sides and lifted off the bottom) so it can never poke past the bar's
        // rounded glass corners like a full-width inset box-shadow would.
        const onProfileTabsPage = /\/users\/\d+\/profile/i.test(location.pathname);
        const onFriendsTabsPage = /\/users\/\d+\/friends/i.test(location.pathname) || /^\/my\/friends/i.test(location.pathname);
        // SPLIT GATES (cross-toggle leak fix): the /games toggle only styles the
        // /games page, the profile About/Creations tab bar follows its OWN
        // /profile toggle - one page's toggle must never restyle another page.
        if ((cfg.miscGamesGlassify && onGamesPage) || (cfg.miscProfileTabsGlassify && onProfileTabsPage)) {
            const t = getTheme();
            css += `
                [class*="buttonCol-"]{${GLASS_CSS}border-radius:14px!important;overflow:hidden!important;display:flex!important;align-items:stretch!important;padding:0!important;border-bottom:none!important;}
                [class*="buttonCol-"] [class*="vTab-"]{flex:1 1 0!important;display:block!important;margin:0!important;border:none!important;background:transparent!important;min-width:0!important;}
                /* underline: 1:1 the game-page look — full-width inset box-shadow flush
                   with the tab bottom; the bar's border-radius + overflow:hidden clips it
                   at the rounded corners so it stays inside the glass */
                [class*="buttonCol-"] [class*="vTabLabel-"]{background:transparent!important;color:#fff!important;margin:0!important;padding:12px 8px!important;text-align:center!important;font-size:16px!important;font-weight:600!important;box-shadow:inset 0 -3px 0 0 ${t.accent}!important;transition:background 0.15s ease,box-shadow 0.15s ease!important;}
                [class*="buttonCol-"] [class*="vTabUnselected-"]{box-shadow:none!important;cursor:pointer!important;}
                [class*="buttonCol-"] [class*="vTabUnselected-"]:hover{background:rgba(255,255,255,0.08)!important;box-shadow:inset 0 -3px 0 0 ${t.accent}55!important;}
                [class*="btnBottomSeperator-"]{display:none!important;}
                /* count bubble (e.g. pending requests) inside a tab label */
                [class*="buttonCol-"] [class*="count-"]{background:rgba(255,255,255,0.08)!important;border:1px solid rgba(255,255,255,0.22)!important;color:#fff!important;border-radius:8px!important;}
            `;
        }
        if (cfg.miscFriendsTabsGlassify && onFriendsTabsPage) {
            const t = getTheme();
            css += `
                [class*="friendsContainer-"] [class*="card-"]:has([class*="entryActive-"]){${GLASS_CSS}border-radius:14px!important;overflow:hidden!important;}
                [class*="friendsContainer-"] [class*="card-"]:has([class*="entryActive-"]) [class*="row-"]{padding:0!important;margin:0!important;}
                /* underline: 1:1 the game-page look (full-width inset box-shadow); the
                   card's border-radius + overflow:hidden keeps it inside the glass */
                [class*="friendsContainer-"] p[class*="entry-"]{background:transparent!important;color:#fff!important;margin:0!important;padding:12px 8px!important;font-size:16px!important;font-weight:600!important;text-align:center!important;cursor:pointer!important;box-shadow:none!important;transition:background 0.15s ease,box-shadow 0.15s ease!important;}
                [class*="friendsContainer-"] p[class*="entry-"]:not([class*="entryActive-"]):hover{background:rgba(255,255,255,0.08)!important;box-shadow:inset 0 -3px 0 0 ${t.accent}55!important;}
                [class*="friendsContainer-"] p[class*="entryActive-"]{box-shadow:inset 0 -3px 0 0 ${t.accent}!important;}
            `;
        }
        // ── Develop page (/develop) glassify ──
        // Saved-DOM reference: the page content lives in div[developerContainer-];
        // every selector below is SCOPED under it because the page reuses generic
        // JSS names (wrapper-, text-, row-, box-, container-, buttonCol-) that also
        // exist in the navbar/side nav and on other pages (same cross-page-leak
        // lesson as the /trades itemCard- and /games recommendedGamesContainer fixes).
        // Structure map (from the saved page):
        //   div[buttonCol-] > div[vTab-] > p[vTabLabel-]   top tabs (My Creations...)
        //   a[wrapper-] > span[text-]                      left asset-type list
        //     (+wrapperSelected-/textSelected- = active, +wrapperDisabled- = greyed)
        //   div[row-]:has(img[image-])                     one creation row
        //   div[container-] > div[box-] > gear-/caret-     per-row settings button
        const onDevelopPage = /^\/develop(\/|$)/i.test(location.pathname);
        if (cfg.miscDevelopGlassify && onDevelopPage) {
            const t = getTheme();
            css += `
                /* the WHOLE page card is one big glass surface; every inner panel
                   (tab bar, sidebar, rows) is layered on top of it */
                [class*="developerContainer-"]{${GLASS_CSS}border-radius:16px!important;padding:14px 16px 16px!important;}
                /* top tab bar - same glass recipe as the game/profile vTab bar */
                [class*="developerContainer-"] [class*="buttonCol-"]{${GLASS_CSS}border-radius:14px!important;overflow:hidden!important;display:flex!important;align-items:stretch!important;padding:0!important;border-bottom:none!important;}
                [class*="developerContainer-"] [class*="buttonCol-"] [class*="vTab-"]{flex:1 1 0!important;display:block!important;margin:0!important;border:none!important;background:transparent!important;min-width:0!important;}
                [class*="developerContainer-"] [class*="buttonCol-"] [class*="vTabLabel-"]{background:transparent!important;color:#fff!important;margin:0!important;padding:12px 8px!important;text-align:center!important;font-size:16px!important;font-weight:600!important;box-shadow:inset 0 -3px 0 0 ${t.accent}!important;transition:background 0.15s ease,box-shadow 0.15s ease!important;}
                [class*="developerContainer-"] [class*="buttonCol-"] [class*="vTabUnselected-"]{box-shadow:none!important;cursor:pointer!important;}
                [class*="developerContainer-"] [class*="buttonCol-"] [class*="vTabUnselected-"]:hover{background:rgba(255,255,255,0.08)!important;box-shadow:inset 0 -3px 0 0 ${t.accent}55!important;}
                [class*="developerContainer-"] [class*="btnBottomSeperator-"]{display:none!important;}
                /* left asset-type list: one glass panel, entries become soft rows */
                [class*="developerContainer-"] div:has(> a[class*="wrapper-"]){${GLASS_CSS}border-radius:14px!important;padding:6px!important;overflow:hidden!important;}
                [class*="developerContainer-"] a[class*="wrapper-"]{display:block!important;background:transparent!important;border:none!important;border-radius:9px!important;padding:7px 10px!important;margin:1px 0!important;transition:background 0.15s ease,box-shadow 0.15s ease!important;}
                [class*="developerContainer-"] a[class*="wrapper-"]:hover{background:rgba(255,255,255,0.08)!important;text-decoration:none!important;}
                [class*="developerContainer-"] a[class*="wrapperSelected-"]{background:${t.accent}22!important;box-shadow:inset 3px 0 0 0 ${t.accent}!important;}
                [class*="developerContainer-"] a[class*="wrapperDisabled-"]{opacity:0.45!important;}
                [class*="developerContainer-"] a[class*="wrapper-"] [class*="text-"]{color:#fff!important;}
                /* creation rows (a row holding the asset thumbnail) become glass cards.
                   margin:0 kills the bootstrap .row negative side gutters - without it the
                   card bleeds ~12px left and visually merges with the sidebar panel */
                [class*="developerContainer-"] div[class*="row-"]:has(> div > a > img[class*="image-"]){${GLASS_CSS}border-radius:14px!important;padding:10px!important;margin:0 0 10px 0!important;align-items:center!important;transition:box-shadow 0.16s ease,border-color 0.16s ease!important;}
                [class*="developerContainer-"] div[class*="row-"]:has(> div > a > img[class*="image-"]):hover{border-color:${t.accent}77!important;box-shadow:0 12px 32px rgba(0,0,0,0.4)!important;}
                [class*="developerContainer-"] img[class*="image-"]{border-radius:10px!important;background:rgba(255,255,255,0.035)!important;}
                [class*="developerContainer-"] [class*="startPlaceLabel-"]{color:rgba(255,255,255,0.65)!important;}
                /* per-row gear/settings button */
                [class*="developerContainer-"] [class*="box-"]{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:10px!important;transition:background 0.15s ease,border-color 0.15s ease!important;}
                [class*="developerContainer-"] [class*="box-"]:hover{background:rgba(255,255,255,0.12)!important;border-color:${t.accent}77!important;}
                /* form controls (upload forms, Select Group, search fields...) follow the glass */
                [class*="developerContainer-"] input[type="text"],[class*="developerContainer-"] input[type="number"],[class*="developerContainer-"] input[type="file"],[class*="developerContainer-"] textarea,[class*="developerContainer-"] select{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:9px!important;color:#fff!important;transition:border-color 0.15s ease,background 0.15s ease!important;}
                [class*="developerContainer-"] input[type="text"]:focus,[class*="developerContainer-"] input[type="number"]:focus,[class*="developerContainer-"] textarea:focus,[class*="developerContainer-"] select:focus{border-color:${t.accent}99!important;background:rgba(255,255,255,0.09)!important;outline:none!important;}
            `;
        }
        el.textContent = css;
        applyGamesHeroBackdrop();
        applyMessagesGlass();
        applyGroupsGlass();
        applyInventoryGlass();
    };

    // ── Inventory page (/users/<id>/inventory) glassify ──
    // JSS names from Next chunk 6236 (Korone dump): itemCard-, serial-,
    // itemLabel-, creatorLabel-, creatorUrl-, categoryBgDesktop-,
    // categoryTitle-, categoryValue-, showingLabel-, selectorOption(Selected)-,
    // selectorClosed-, selectorMenuOpen-, selectOption-. Site defaults paint
    // OPAQUE var(--white-color) panels with light seams (itemLabel border-top
    // #f2f2f2) -- broken look on dark theme + custom bg. Page-gated: these
    // are generic JSS names that could collide elsewhere.
    const isInventoryPage = () => /^\/users\/\d+\/inventory(\/|$)/i.test(location.pathname);
    const applyInventoryGlass = () => {
        let el = document.getElementById('pks-inventory-glass-style');
        if (!cfg.miscInventoryGlassify || !isInventoryPage()) { el?.remove(); return; }
        if (!el) { el = document.createElement('style'); el.id = 'pks-inventory-glass-style'; document.head.appendChild(el); }
        const t = getTheme();
        // Card surface: same branching as modern game cards. With a custom
        // background we need the REAL fake-backdrop blur (absolute pseudo
        // slice + background-attachment:fixed) because backdrop-filter alone
        // reads as a flat tint; hover lift therefore uses top, never
        // transform (transform breaks background-attachment:fixed).
        let cardCss;
        const invBgUrl = cfg.miscBgUrl?.trim();
        if (invBgUrl) {
            const sliceBlur = (cfg.miscBgBlur ? (cfg.miscBgBlurAmount ?? 8) : 0) + 16;
            const bgDarkOp = cfg.miscBgDarkOverlay ? ((cfg.miscBgDarkOpacity ?? 50) / 100) : 0;
            const cardVeil = Math.min(0.8, 0.32 + bgDarkOp * 0.55).toFixed(2);
            el.dataset.invMode = 'custom-slice';
            cardCss = `
            [class*="itemCard-"]{position:relative!important;top:0!important;isolation:isolate!important;background:transparent!important;border:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;border-radius:12px!important;padding:8px!important;overflow:hidden!important;transition:border-color 0.22s,box-shadow 0.22s,top 0.18s!important;}
            [class*="itemCard-"]::before{content:'';position:absolute;inset:-${sliceBlur * 2}px;z-index:-2;background:url('${invBgUrl.replace(/'/g, "\\'")}') center/cover no-repeat fixed;filter:blur(${sliceBlur}px) saturate(150%);pointer-events:none;}
            [class*="itemCard-"]::after{content:'';position:absolute;inset:0;z-index:-1;background:rgba(10,11,16,${cardVeil});pointer-events:none;}
            [class*="itemCard-"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;top:-3px!important;z-index:2!important;}
            `;
        } else {
            // No custom background: ONE unified glass recipe -- exactly the
            // same GLASS_CSS surface as the category sidebar / messages /
            // groups panels. The graphite tint and site-background slice
            // experiments both read as solid dark tiles, not glass.
            el.dataset.invMode = 'glass';
            cardCss = `
            [class*="itemCard-"]{${GLASS_CSS}position:relative!important;top:0!important;border-radius:12px!important;padding:8px!important;overflow:hidden!important;transition:border-color 0.22s,box-shadow 0.22s,top 0.18s!important;}
            [class*="itemCard-"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;top:-3px!important;z-index:2!important;}
            `;
        }
        el.textContent = `
            /* category sidebar: one glass panel, accent for the active entry.
               NOTE: the backdrop-filter must live on a ::before pseudo layer,
               NOT on the panel element itself. Element-level backdrop-filter
               makes the panel a backdrop root, and the nested SUBCATEGORY
               flyout (also a categoryBgDesktop) can then only blur the
               panel's own content -- outside the panel bounds it saw nothing,
               so the flyout rendered transparent with no blur. Each pseudo
               needs a stacking context to keep z-index:-1 contained: the
               outer panel gets one from the z-index:5 lift below, the flyout
               from its own zIndex:4. */
            [class*="categoryBgDesktop-"]{background:transparent!important;border:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;border-radius:14px!important;}
            [class*="categoryBgDesktop-"]::before{content:'';position:absolute;inset:0;z-index:-1;border-radius:14px;background:${GLASS_BG};backdrop-filter:${GLASS_FILTER};-webkit-backdrop-filter:${GLASS_FILTER};pointer-events:none;}
            /* GLASS_CSS backdrop-filter turns the sidebar panel into a
               stacking context, trapping the SUBCATEGORY flyout's own
               zIndex:4 inside it -- so the later-painted position:relative
               item cards covered the flyout (Accessories > Hat/Face/...).
               Lift the whole panel above the cards (hover cards peak at
               z-index:2). The flyout is ALSO a categoryBgDesktop clone with
               childSelector (position:absolute), so exclude it from the
               position:relative override or its placement breaks. */
            [class*="categoryBgDesktop-"]:not([class*="childSelector-"]){position:relative!important;z-index:5!important;}
            [class*="categoryTitle-"]{color:#fff!important;}
            [class*="selectorOption-"]{color:#c9cde0!important;transition:color 0.15s ease!important;}
            [class*="selectorOption-"]:hover{color:#fff!important;}
            [class*="selectorOptionSelected-"]{color:${t.accent}!important;border-right-color:${t.accent}!important;}
            /* header */
            [class*="categoryValue-"]{color:#fff!important;}
            [class*="showingLabel-"]{color:#9aa0c0!important;}
            /* item cards: surface from the branch above (real blur slice
               with custom bg, glass + graphite tint otherwise) */
            ${cardCss}
            /* Equal-height cards (pekora bug: the serial pill and the limited
               badge shift geometry per card). Layout normalised to padding +
               square image + fixed 16px badge row + one name line + one
               creator line; the serial pill is lifted out of the flow. */
            [class*="itemCard-"] [class*="serial-"]{position:absolute!important;top:8px!important;right:8px!important;float:none!important;margin:0!important;z-index:3!important;}
            /* Preview framed EXACTLY like the catalog listing cards
               (cardImage- recipe): faint translucent fill + 10px radius,
               plus an explicit glass hairline so the frame reads on any
               background. The site renders the thumb img at its natural
               ~110px size (stock cards are narrower); force the img to fill
               the square frame edge-to-edge like catalog previews do. */
            [class*="itemCard-"] [class*="itemImage-"]{margin:0 0 6px!important;width:100%!important;aspect-ratio:1/1!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;background-color:rgba(255,255,255,0.035)!important;border:1px solid ${GLASS_BORDER_COLOR}!important;border-radius:10px!important;box-shadow:none!important;}
            [class*="itemCard-"] [class*="itemImage-"] img{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;border:none!important;border-radius:10px!important;background-color:transparent!important;}
            [class*="itemCard-"] .icon-limited-label,[class*="itemCard-"] .icon-limited-unique-label,[class*="itemCard-"] [class*="fakeLimitedLabel-"]{display:block!important;height:16px!important;margin:2px 0 0!important;}
            [class*="itemLabel-"]{color:#fff!important;border-top:1px solid rgba(255,255,255,0.1)!important;padding-top:4px!important;}
            [class*="creatorLabel-"]{color:#9aa0c0!important;margin-bottom:6px!important;}
            [class*="creatorUrl-"]{color:${t.accent}!important;}
            [class*="serial-"]{background:rgba(0,0,0,0.68)!important;border:1px solid rgba(255,255,255,0.14)!important;}
            /* mobile category selector */
            [class*="selectorClosed-"]{${GLASS_CSS}border-radius:10px!important;color:#fff!important;}
            [class*="selectorMenuOpen-"]{${GLASS_CSS}background:rgba(15,15,18,0.92)!important;border-radius:10px!important;overflow:hidden!important;}
            [class*="selectOption-"]{color:#e6e9f5!important;}
            [class*="selectOption-"]:hover{background:rgba(255,255,255,0.08)!important;box-shadow:inset 3px 0 0 0 ${t.accent}!important;}
        `;
    };

    const applyMessagesGlass = () => {
        if (!cfg.miscMessagesGlassify || !document.querySelector('div[class*="messagesContainer-"]')) {
            document.getElementById('pks-messages-glass-style')?.remove();
            return;
        }
        let el = document.getElementById('pks-messages-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-messages-glass-style'; document.head.appendChild(el); }
        const t = getTheme();
        const GLASS = `${GLASS_CSS}border-radius:16px!important;`;
        const M = 'div[class*="messagesContainer-"]';
        el.textContent = `
            ${M}{${GLASS}padding:18px!important;color:#e6e9f5!important;}
            /* tabs (Inbox / Sent / Notifications / Archive) */
            ${M} [class*="vTab-0-2"]{${GLASS_CSS}border-radius:12px!important;overflow:hidden!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
            ${M} [class*="vTab-0-2"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
            ${M} [class*="vTabLabel"]{margin:0!important;padding:10px 16px!important;color:#cfd3e6!important;font-weight:600!important;cursor:pointer!important;}
            ${M} [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 3px 0 0 ${t.accent}!important;}
            ${M} [class*="vTabUnselected"]{color:#8a90ad!important;}
            ${M} [class*="count-0-2"]{background:${t.accent}!important;color:#050508!important;border-radius:10px!important;padding:1px 7px!important;font-weight:700!important;margin-left:6px!important;}
            ${M} [class*="btnBottomSeperator"]{display:none!important;}
            /* message rows → individual glass cards */
            ${M} [class*="messageRow-"]{${GLASS}display:flex!important;align-items:center!important;gap:12px!important;padding:12px 14px!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
            ${M} [class*="messageRow-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;background:rgba(255,255,255,0.08)!important;}
            /* The stock row is an inline-block layout with hand-tuned offsets
               (Messages dump JSS: userImage margin-top:-15px + margin-left:18px,
               markReadWrapper top:20px, userCheckAndImage width:68px,
               subjectAndContent width:calc(100% - 73px) + vertical-align:super).
               Under our flex row those offsets make the avatar and the
               checkbox sag out of line, so neutralise them all and let
               flexbox do the centring. */
            ${M} [class*="userCheckAndImage-"]{width:auto!important;margin:0!important;flex:0 0 auto!important;display:flex!important;align-items:center!important;gap:10px!important;}
            ${M} [class*="markReadWrapper-"]{position:static!important;top:auto!important;width:auto!important;display:flex!important;align-items:center!important;}
            /* Fixed 48px avatar: the stock 68px userCheckAndImage column was
               the only thing capping the avatar; with it neutralised the img
               rendered at its natural (huge) size. */
            ${M} [class*="userImage-"]{margin:0!important;flex:0 0 auto!important;width:48px!important;height:48px!important;}
            ${M} [class*="subjectAndContent-"]{width:auto!important;flex:1 1 auto!important;min-width:0!important;vertical-align:baseline!important;}
            ${M} [class*="userImage-"] img{display:block!important;width:100%!important;height:100%!important;object-fit:cover!important;border-radius:50%!important;border:1px solid rgba(255,255,255,0.15)!important;}
            ${M} [class*="username-"]{color:#fff!important;font-weight:700!important;}
            ${M} [class*="subjectUnread"]{color:${t.accent}!important;font-weight:700!important;}
            ${M} [class*="subject-0-2"]:not([class*="subjectUnread"]){color:#dfe3f0!important;}
            ${M} [class*="body-0-2"]{color:#9aa0c0!important;}
            ${M} [class*="divider-top"]{display:none!important;}
            /* action + pagination buttons → glass */
            ${M} button{${GLASS_CSS}color:#e6e9f5!important;border-radius:10px!important;transition:all 0.15s ease!important;}
            ${M} button:hover:not(:disabled){border-color:${t.accent}99!important;background:rgba(255,255,255,0.1)!important;transform:translateY(-1px)!important;}
            ${M} button:disabled{opacity:0.4!important;}
            /* checkboxes */
            ${M} input[type="checkbox"]{accent-color:${t.accent}!important;cursor:pointer!important;}
        `;
    };

    const isGroupsPage = () => /^\/(my\/)?groups(\.aspx)?(\/|$)/i.test(location.pathname);
    // Glassify the /groups page: no stable page-specific JSS hook is known
    // for this page, so generic panel selectors are used. That is safe ONLY
    // because the whole block is path-gated to /groups (leak-audit rule) and
    // rebuilt on SPA navigation via applyPageFrameTransparency.
    const applyGroupsGlass = () => {
        let el = document.getElementById('pks-groups-glass-style');
        if (!cfg.miscGroupsGlassify || !isGroupsPage()) { el?.remove(); return; }
        if (!el) { el = document.createElement('style'); el.id = 'pks-groups-glass-style'; document.head.appendChild(el); }
        el.textContent = `
            /* Top-level panels: groups list, search strip, main group card, Controls. */
            .card,.section-content,[class*="card-0-2-"],[class*="groupContainer-"],[class*="groupsContainer-"]{${GLASS_CSS}border-radius:14px!important;}
            /* Nested panels stay transparent so glass never stacks twice. */
            .card .card,.card .section-content,.section-content .card,.section-content .section-content,.card .card-body,[class*="card-0-2-"] [class*="card-0-2-"],[class*="card-0-2-"] .card-body,[class*="card-0-2-"] .section-content,.section-content [class*="card-0-2-"]{background-color:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:blur(0px)!important;-webkit-backdrop-filter:blur(0px)!important;}
        `;
    };

    const isGamePage = () => /\/games\/\d+/i.test(location.pathname);
    const applyGamesHeroBackdrop = () => {
        let el = document.getElementById('pks-games-hero-style');
        if (!cfg.miscGamesHeroBackdrop || !isGamePage() || cfg.miscBgUrl?.trim()) { el?.remove(); return; }
        const tryApply = () => {
            const img = document.querySelector('[class*="carouselItem"] img, [class*="thumbContainer"] img, [class*="imageContainer"] img');
            const url = img?.src;
            if (!url) return false;
            if (!el) { el = document.createElement('style'); el.id = 'pks-games-hero-style'; document.head.appendChild(el); }
            el.textContent = `
                body::before{content:'';position:fixed;inset:-40px;z-index:0;background:url('${url.replace(/'/g, "\\'")}') center/cover no-repeat;filter:blur(38px) saturate(135%) brightness(0.55);transform:scale(1.1);pointer-events:none;}
                body::after{content:'';position:fixed;inset:0;z-index:0;background:linear-gradient(180deg,rgba(8,8,14,0.55),rgba(8,8,14,0.88))!important;pointer-events:none;}
                body>*{position:relative;z-index:1;}#pks-panel,#pks-watermark{z-index:2147483647!important;}
            `;
            return true;
        };
        if (tryApply()) return;
        let tries = 0;
        const obs = new MutationObserver(() => { if (tries++ > 120) { obs.disconnect(); return; } if (tryApply()) obs.disconnect(); });
        obs.observe(document.body, { childList: true, subtree: true });
    };

    const applyThemeToDom = () => {
        const t = getTheme();
        let styleEl = document.getElementById('pks-theme-style');
        if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'pks-theme-style'; document.head.appendChild(styleEl); }
        styleEl.textContent = `
            #pks-panel input:focus, #pks-panel select:focus { border-color:${t.accent}!important;box-shadow:0 0 0 2px ${t.accent}22!important; }
            #pks-panel input[type=checkbox] { accent-color:${t.accent}; }
            .pks-tab-btn.active { background:${t.activeBg}!important;color:${t.activeText}!important;border-bottom:2px solid ${t.accent}!important; }
            #pks-r-dot.on { background:${t.accent}!important;box-shadow:0 0 8px ${t.accent}!important; }
            .pks-stat-val { color:${t.accent}!important; }
            #pks-panel input[type=text], #pks-panel input[type=number], #pks-panel select { background:${t.inputBg};border-color:${t.inputBorder};color:${t.valueText}; }
            #pks-panel { background:${t.panelBg};border-color:${t.border}; }
            #pks-header { background:${t.headerBg}; }
            #pks-tab-bar { background:${t.tabBarBg};border-bottom-color:${t.tabBorder}; }
            .pks-section-title { color:${t.sectionText}!important; }
            .pks-row label { color:${t.labelText}!important; }
            #pks-top-border { background:${t.topBorder}!important; }
            #pks-r-start.pks-action-btn { background:${t.accent}!important;color:#050508!important; }
            #pks-avatar-img { border-color:${t.accent}44!important; }
            .pks-currency-pill { border-color:${t.border}!important;background:${t.inputBg}!important; }
            .pks-stat { background:${t.inputBg}!important;border-color:${t.border}!important; }
            .pks-action-btn:hover { filter:brightness(1.2); }
            @keyframes pks-title-color { 0%{color:${t.accent}} 50%{color:${t.accentDim}} 100%{color:${t.accent}} }
            #pks-header-title { color:${t.accent};animation:pks-title-color 3s ease-in-out infinite; }
        `;
        updatePanelGlow();
        applyPanelAppearance();
        updateWatermarkTheme();
        applyCardStyle();
        applyMisc();
        applyTradeStyle();
    };

    const updatePanelGlow = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const t = getTheme();
        panel.style.boxShadow = `0 14px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04),0 0 28px 4px ${t.glowColor},0 0 60px 8px ${t.glowColor.replace('0.18','0.07')}`;
    };

    const applyPanelAppearance = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const t = getTheme();
        const header = document.getElementById('pks-header');
        const tabbar = document.getElementById('pks-tab-bar');
        panel.style.borderRadius = (cfg.panelRadius ?? 16) + 'px';

        if (cfg.panelGradientEnabled) {
            const c1 = cfg.panelGradientColor1 || '#0d0d12';
            const c2 = cfg.panelGradientColor2 || '#1a1830';
            panel.style.setProperty('background', `linear-gradient(160deg, ${c1}, ${c2})`, 'important');
            panel.style.removeProperty('backdrop-filter');
            panel.style.removeProperty('-webkit-backdrop-filter');
            header?.style.setProperty('background', 'transparent', 'important');
            tabbar?.style.setProperty('background', 'transparent', 'important');
            return;
        }
        header?.style.removeProperty('background');
        tabbar?.style.removeProperty('background');

        if (cfg.panelGlass) {
            // Only the Interium GUI uses the darker glass tint. Blur/border/shadow
            // remain canonical, while every site glassify surface keeps GLASS_BG.
            panel.style.setProperty('background', GUI_GLASS_BG, 'important');
            panel.style.setProperty('backdrop-filter', GLASS_FILTER, 'important');
            panel.style.setProperty('-webkit-backdrop-filter', GLASS_FILTER, 'important');
            panel.style.setProperty('border-color', GLASS_BORDER_COLOR, 'important');
            panel.style.setProperty('box-shadow', GLASS_SHADOW, 'important');
            header?.style.setProperty('background', 'transparent', 'important');
            tabbar?.style.setProperty('background', 'transparent', 'important');
        } else {
            panel.style.removeProperty('background');
            panel.style.removeProperty('backdrop-filter');
            panel.style.removeProperty('-webkit-backdrop-filter');
        }
    };

    const state = {
        session:   { lastUrl: location.href, cachedCsrf: null },
        dom:       { observer: null, retryTimer: null },
        refresher: { running: false, clickTimer: null, reloadTimer: null, clicks: 0, reloads: 0 },
        profile:   { id: null, name: null, robux: 0, tickets: 0, avatar: null },
        watermark: { startTime: Date.now(), pingTimer: null, ping: null, dragX: null, dragY: null },
        authInfo:  { daysLeft: 0 },
        authKey:   null,
        trade: {
            tradeTabActive: false,
            massModal: null,
            massBlastState: { myItems:[], mySelected:[], targetAssetId:null, targetOwners:[], sending:false, stopped:false, delaySeconds:20, logs:[] },
            massCustomState: { myItems:[], mySelected:[], targets:[], sending:false, logs:[] },
            assetThumbs: {},
            myUserId: null,
        }
    };

    let twMyItems = [], twTheirItems = [], twMySelected = [], twTheirSelected = [];
    let twMyPage = 0, twTheirPage = 0, twMySearch = '', twTheirSearch = '';
    const TW_PER_PAGE = 10, TW_MAX_SEL = 4;

    const isHomePage     = () => location.pathname === '/' || location.pathname.toLowerCase() === '/home';
    const isProfilePage  = () => /\/users\/\d+\/profile/i.test(location.pathname);

    let _csrfToken = null;
    // No browser cookie reads here: the CSRF token is obtained from the
    // x-csrf-token response header via the 403 retry in postApi below.
    const getCsrf = () => _csrfToken || '';

    const postApi = async (url, body = {}) => {
        let csrf = getCsrf();
        const doPost = async (token) => {
            const h = { 'Content-Type': 'application/json' };
            if (token) h['x-csrf-token'] = token;
            const r = await fetch(url, { method: 'POST', headers: h, credentials: 'include', body: JSON.stringify(body) });
            if (r.status === 403) {
                const t = r.headers.get('x-csrf-token');
                if (t && t !== token) { _csrfToken = t; return doPost(t); }
            }
            return r;
        };
        return doPost(csrf);
    };

    const apiGet = (url) => fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });

    // ── Interium: compatibility stubs ────────────────────────────────
    // Trading is handled by Interium's own trading runtime file. These
    // no-op stubs keep optional UI hooks safe when a hook is not loaded.
    const _noop = () => {};
    const isTradePage = () => false;
    const isTradeWindow = () => false;
    const applyTradeStyle = _noop, applyTradesCustom = _noop, ensureTradesOverlay = _noop,
          injectTradeWindow = _noop, injectProfileTradeButton = _noop;
    // buildMassTradeUI is a real implementation (see below) that renders the
    // TRADE tab and drives window.InteriumMassTrader (consent-based offers).
    const startRefresher = _noop, stopRefresher = _noop, panelLog = _noop,
          updateRefresherUI = _noop, updateRefresherStatus = _noop;
    const applyLarp = _noop, applyFakeVerify = _noop, applyCatalogOwned = _noop,
          injectAvatarTools = _noop, removeFakeAvatarItem = _noop, formatLarp = () => '';
    const addFakeAvatarItem = async () => {};
    const fetchFakeItemData = async () => null;
    const applyBadges = _noop, pollAnnouncements = _noop, saveProfileBanner = _noop;
    const getAuthSession = () => '';


    const notify = (message, type = 'success') => {
        if (!cfg.showNotifications) return;
        const colors = {
            success: { bg:'#0d1f16', border:'#00e87a', accent:'#00e87a' },
            error:   { bg:'#1f0d0d', border:'#ff4466', accent:'#ff4466' },
            info:    { bg:'#0d1120', border:'#5b8cff', accent:'#5b8cff' },
            warning: { bg:'#1f1a0d', border:'#f0a500', accent:'#f0a500' },
        };
        const icons = {
            success: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>`,
            error:   `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>`,
            info:    `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="5" x2="6" y2="9"/><circle cx="6" cy="3" r="0.5" fill="currentColor"/></svg>`,
            warning: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L10.5 10H1.5Z"/><line x1="6" y1="5.5" x2="6" y2="7.5"/></svg>`,
        };
        const c = colors[type] || colors.info;
        const icon = icons[type] || icons.info;
        const posStyles = {
            'top-center':    'top:16px;left:50%;transform:translateX(-50%);',
            'bottom-center': 'bottom:16px;left:50%;transform:translateX(-50%);',
            'top-right':     'top:16px;right:16px;',
            'bottom-right':  'bottom:16px;right:16px;',
        };
        const pos = posStyles[cfg.notificationPosition] || posStyles['top-center'];
        const existing = document.querySelectorAll('.pks-notif');
        existing.forEach((el, i) => {
            if (cfg.notificationPosition?.includes('bottom')) el.style.bottom = (16 + (existing.length - i) * 56) + 'px';
            else el.style.top = (16 + (existing.length - i) * 56) + 'px';
        });
        const el = document.createElement('div');
        el.className = 'pks-notif';
        el.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483647;display:inline-flex;align-items:center;gap:9px;background:${GLASS_BG};border:1px solid ${c.border};border-radius:10px;padding:10px 14px;width:auto;max-width:340px;white-space:nowrap;font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:11px;color:#e0e0e0;box-shadow:0 0 18px ${c.border}33,0 4px 14px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,top 0.2s,bottom 0.2s;pointer-events:none;backdrop-filter:${GLASS_FILTER};-webkit-backdrop-filter:${GLASS_FILTER};overflow:hidden;`;
        el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${c.accent};display:flex;align-items:center;justify-content:center;color:${c.accent};flex-shrink:0;">${icon}</div><span style="flex:1;line-height:1.3;white-space:normal;max-width:260px;">${message}</span><div style="width:2px;height:28px;border-radius:2px;background:${c.accent};flex-shrink:0;"></div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
        setTimeout(() => {
            el.style.opacity = '0';
            el.addEventListener('transitionend', () => el.remove(), { once: true });
        }, cfg.notificationDuration);
    };

    const fetchProfile = async () => {
        try {
            const userRes = await fetch('https://www.pekora.zip/apisite/users/v1/users/authenticated', { credentials:'include' });
            if (!userRes.ok) return;
            const user = await userRes.json();
            state.profile.id   = user.id;
            state.profile.name = user.displayName || user.name;
            state.trade.myUserId = user.id;
            const currRes = await fetch(`https://www.pekora.zip/apisite/economy/v1/users/${user.id}/currency`, { credentials:'include' });
            if (currRes.ok) { const curr = await currRes.json(); state.profile.robux = curr.robux ?? 0; state.profile.tickets = curr.tickets ?? 0; }
            updateProfileUI();
            updateWatermark();
        } catch {}
    };

    const updateProfileUI = () => {
        const nameEl   = document.getElementById('pks-profile-name');
        const robuxEl  = document.getElementById('pks-profile-robux');
        const ticketEl = document.getElementById('pks-profile-tickets');
        const avatarEl = document.getElementById('pks-avatar-img');
        const avatarX  = document.getElementById('pks-avatar-anon');
        const t        = getTheme();
        if (cfg.anonymous) {
            if (nameEl)   nameEl.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
            if (robuxEl)  robuxEl.textContent = '\u2022\u2022\u2022';
            if (ticketEl) ticketEl.textContent = '\u2022\u2022\u2022';
            if (avatarEl) avatarEl.style.display = 'none';
            if (avatarX)  avatarX.style.display = 'flex';
        } else {
            if (nameEl)   nameEl.textContent = state.profile.name ?? '\u2014';
            if (robuxEl)  robuxEl.innerHTML  = `<span style="color:${t.accent};font-weight:700;">${(state.profile.robux ?? 0).toLocaleString()}</span>`;
            if (ticketEl) ticketEl.innerHTML = `<span style="color:#f0a500;font-weight:700;">${(state.profile.tickets ?? 0).toLocaleString()}</span>`;
            if (avatarEl) avatarEl.style.display = 'block';
            if (avatarX)  avatarX.style.display = 'none';
        }
    };

    const getWatermarkAccent = () => cfg.watermarkAccentColor?.trim() || getTheme().accent;

    const measurePing = async () => {
        try {
            const t0 = performance.now();
            await fetch('https://www.pekora.zip/apisite/users/v1/users/authenticated', { credentials:'include', cache:'no-store', signal:AbortSignal.timeout(5000) });
            state.watermark.ping = Math.round(performance.now() - t0);
        } catch { state.watermark.ping = null; }
        updateWatermark();
    };

    const formatSessionTime = () => {
        const ms = Date.now() - state.watermark.startTime;
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}m`; if (m > 0) return `${m}m ${s % 60}s`; return `${s}s`;
    };

    const updateWatermark = () => {
        const wm = document.getElementById('pks-watermark');
        if (!wm) return;
        if (!cfg.watermarkEnabled) { wm.style.display = 'none'; return; }
        wm.style.display = '';
        const wmAccent = getWatermarkAccent();
        const scale = (cfg.watermarkScale ?? 100) / 100;
        const op    = (cfg.watermarkOpacity ?? 90) / 100;
        const parts = [{ text:'Interium', logo:true }];
        if (cfg.watermarkShowTime) parts.push({ text:formatSessionTime() });
        if (cfg.watermarkShowPing) {
            const p = state.watermark.ping;
            const pingColor = p === null ? '#555' : p < 80 ? '#00e87a' : p < 200 ? '#f0a500' : '#ff4466';
            parts.push({ text:p !== null ? `${p}ms` : '\u2014ms', color:pingColor });
        }
        if (cfg.watermarkShowUser) parts.push({ text:cfg.anonymous ? '\u2022\u2022\u2022\u2022\u2022\u2022' : (state.profile.name || '\u2026') });
        wm.innerHTML = '';
        parts.forEach((p, i) => {
            if (i > 0) { const sep = document.createElement('span'); sep.textContent = '\u00b7'; sep.style.cssText = `color:rgba(255,255,255,0.15);margin:0 5px;font-size:${10 * scale}px;`; wm.appendChild(sep); }
            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.cssText = p.logo ? `color:${wmAccent};font-weight:700;letter-spacing:0.1em;font-size:${10 * scale}px;` : `color:${p.color || 'rgba(255,255,255,0.5)'};font-size:${10 * scale}px;`;
            wm.appendChild(span);
        });
        let shimmer = wm.querySelector('.pks-wm-shimmer');
        if (!shimmer) { shimmer = document.createElement('div'); shimmer.className = 'pks-wm-shimmer'; wm.appendChild(shimmer); }
        shimmer.style.cssText = `position:absolute;bottom:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,${wmAccent}99,transparent);animation:pks-wm-slide 2.5s linear infinite;`;
        if (state.watermark.dragX === null) {
            const positions = {
                'bottom-left':  'bottom:12px;left:12px;','bottom-right':'bottom:12px;right:12px;',
                'top-left':     'top:12px;left:12px;','top-right':'top:12px;right:420px;',
                'bottom-center':'bottom:12px;left:50%;transform:translateX(-50%);','top-center':'top:12px;left:50%;transform:translateX(-50%);',
            };
            const pos = positions[cfg.watermarkPosition] || positions['bottom-left'];
            const wmCss = `all:initial;position:fixed;${pos}z-index:2147483640;display:flex;align-items:center;gap:0;font-family:var(--pks-font),'Share Tech Mono',monospace;font-weight:600;letter-spacing:0.06em;background:${GLASS_BG};backdrop-filter:${GLASS_FILTER};-webkit-backdrop-filter:${GLASS_FILTER};border:1px solid ${GLASS_BORDER_COLOR};box-shadow:${GLASS_SHADOW};border-radius:6px;padding:${5*scale}px ${12*scale}px;pointer-events:auto;user-select:none;overflow:hidden;opacity:${op};cursor:grab;`;
            /* PERF: identical cssText writes still force style recalc at the
               1 Hz watermark tick -- only write when it actually changed. */
            if (wm.__pksCss !== wmCss) { wm.__pksCss = wmCss; wm.style.cssText = wmCss; }
        } else {
            wm.style.left = state.watermark.dragX + 'px'; wm.style.top = state.watermark.dragY + 'px';
            wm.style.opacity = String(op); wm.style.padding = `${5*scale}px ${12*scale}px`;
        }
    };

    const updateWatermarkTheme = () => updateWatermark();

    const buildWatermark = () => {
        let kf = document.getElementById('pks-wm-kf');
        if (!kf) { kf = document.createElement('style'); kf.id = 'pks-wm-kf'; kf.textContent = `@keyframes pks-wm-slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`; document.head.appendChild(kf); }
        let wm = document.getElementById('pks-watermark');
        if (!wm) { wm = document.createElement('div'); wm.id = 'pks-watermark'; document.body.appendChild(wm); }
        let isDragging = false, dox = 0, doy = 0, dsx = 0, dsy = 0;
        wm.addEventListener('mousedown', (e) => {
            isDragging = true; const r = wm.getBoundingClientRect(); dox = r.left; doy = r.top; dsx = e.clientX; dsy = e.clientY; wm.style.cursor = 'grabbing'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            state.watermark.dragX = dox + (e.clientX - dsx); state.watermark.dragY = doy + (e.clientY - dsy);
            wm.style.left = state.watermark.dragX + 'px'; wm.style.top = state.watermark.dragY + 'px'; wm.style.bottom = 'auto'; wm.style.right = 'auto'; wm.style.transform = 'none';
        });
        document.addEventListener('mouseup', () => { isDragging = false; wm.style.cursor = 'grab'; });
        updateWatermark();
        setInterval(() => { if (!document.hidden) updateWatermark(); }, 1000); /* PERF: clock catches up on focus */
        measurePing();
        state.watermark.pingTimer = setInterval(() => { if (!document.hidden) measurePing(); }, 10000); /* PERF: no pings from background tabs */
    };

    let _fxCanvas = null, _fxCtx = null, _fxRaf = null, _fxParticles = [], _fxCols = [], _fxResize = null, _fxLast = 0;
    const MATRIX_CHARS = 'アウエカキクケコサシスセソダツナニノハホマミムメモヤユヨリワ0123456789'.split('');

    const fxResolveColor = (type) => {
        if (cfg.effectColor?.trim()) return cfg.effectColor.trim();
        const t = getTheme();
        if (type === 'matrix') return t.accent;
        if (type === 'rain')   return '#9fc4ff';
        return '#ffffff';
    };

    const stopEffects = () => {
        if (_fxRaf) cancelAnimationFrame(_fxRaf);
        _fxRaf = null;
        if (_fxResize) { window.removeEventListener('resize', _fxResize); _fxResize = null; }
        if (_fxCanvas) { _fxCanvas.remove(); _fxCanvas = null; _fxCtx = null; }
        document.getElementById('pks-effects-style')?.remove();
        _fxParticles = []; _fxCols = [];
    };

    const fxInit = (type, w, h) => {
        _fxParticles = []; _fxCols = [];
        const intensity = Math.max(10, Math.min(100, cfg.effectIntensity ?? 50)) / 100;
        if (type === 'rain') {
            const n = Math.round(60 + intensity * 240);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, len: 8+Math.random()*14, vy: 6+Math.random()*6, vx: -1-Math.random()*1.2 });
        } else if (type === 'snow') {
            const n = Math.round(40 + intensity * 160);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, r: 1+Math.random()*2.5, vy: 0.4+Math.random()*1.1, phase: Math.random()*Math.PI*2, drift: 0.3+Math.random()*0.7 });
        } else if (type === 'stars') {
            const n = Math.round(50 + intensity * 200);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, r: 0.5+Math.random()*1.6, phase: Math.random()*Math.PI*2, tw: 0.01+Math.random()*0.03 });
        } else if (type === 'matrix') {
            const fs = 14, cols = Math.ceil(w / fs);
            for (let i = 0; i < cols; i++) _fxCols.push({ y: (Math.random()*h)/fs, speed: 0.3+Math.random()*0.7 });
        }
    };

    const fxDraw = (type, dt) => {
        const ctx = _fxCtx, c = _fxCanvas;
        if (!ctx || !c) return;
        const w = c.width, h = c.height;
        const speed = Math.max(10, Math.min(100, cfg.effectSpeed ?? 50)) / 50;
        const color = fxResolveColor(type);
        ctx.clearRect(0, 0, w, h);
        if (type === 'rain') {
            ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.1;
            ctx.beginPath();
            for (const p of _fxParticles) {
                ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx*2, p.y + p.len);
                p.y += p.vy * speed * dt; p.x += p.vx * speed * dt;
                if (p.y > h) { p.y = -p.len; p.x = Math.random()*w; }
                if (p.x < 0) p.x = w;
            }
            ctx.stroke(); ctx.globalAlpha = 1;
        } else if (type === 'snow') {
            ctx.fillStyle = color;
            for (const p of _fxParticles) {
                ctx.globalAlpha = 0.75;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
                p.phase += 0.02 * dt;
                p.y += p.vy * speed * dt; p.x += Math.sin(p.phase) * p.drift * speed * dt * 0.5;
                if (p.y > h) { p.y = -p.r; p.x = Math.random()*w; }
            }
            ctx.globalAlpha = 1;
        } else if (type === 'stars') {
            ctx.fillStyle = color;
            for (const p of _fxParticles) {
                p.phase += p.tw * dt * speed;
                ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(p.phase));
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'matrix') {
            const fs = 14;
            ctx.font = fs + 'px monospace'; ctx.textAlign = 'center';
            for (let i = 0; i < _fxCols.length; i++) {
                const col = _fxCols[i];
                const x = i * fs + fs/2, headY = col.y * fs;
                for (let k = 0; k < 6; k++) {
                    const yy = headY - k*fs;
                    if (yy < 0 || yy > h) continue;
                    ctx.globalAlpha = k === 0 ? 1 : Math.max(0, 0.5 - k*0.08);
                    ctx.fillStyle = k === 0 ? '#ffffff' : color;
                    ctx.fillText(MATRIX_CHARS[(Math.random()*MATRIX_CHARS.length)|0], x, yy);
                }
                col.y += col.speed * speed * 0.6 * dt;
                if (headY > h + 40) { col.y = Math.random()*-10; col.speed = 0.3+Math.random()*0.7; }
            }
            ctx.globalAlpha = 1;
        }
    };

    const applyEffects = () => {
        const type = cfg.effectType || 'none';
        stopEffects();
        if (type === 'none' || !document.body) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'pks-effects-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1;';
        document.body.insertBefore(canvas, document.body.firstChild);
        let fxStyle = document.getElementById('pks-effects-style');
        if (!fxStyle) { fxStyle = document.createElement('style'); fxStyle.id = 'pks-effects-style'; document.head.appendChild(fxStyle); }
        fxStyle.textContent = `body > *:not(#pks-effects-canvas):not(#pks-tr-overlay):not(#pks-tw-root){position:relative;z-index:2;} #pks-effects-canvas{z-index:1!important;}`;
        _fxCanvas = canvas; _fxCtx = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; fxInit(type, canvas.width, canvas.height); };
        resize(); _fxResize = resize; window.addEventListener('resize', resize);
        _fxLast = performance.now();
        const loop = (now) => {
            const dt = Math.min(3, (now - _fxLast) / 16.67); _fxLast = now;
            fxDraw(type, dt);
            _fxRaf = requestAnimationFrame(loop);
        };
        _fxRaf = requestAnimationFrame(loop);
    };

    const profileId = () => { const m = location.pathname.match(/\/users\/(\d+)/); return m ? m[1] : null; };

    const myPekoraId = () => String(state.profile.id || '');

    const getProfileFrame = () => {
        const h = document.querySelector('h2[class*="username"]');
        if (!h) return null;
        return h.closest('[class*="cardBody-0-2-"]') || h.closest('[class*="card-0-2-"]') || null;
    };

    const applyProfileBanner = (data) => {
        const frame = getProfileFrame();
        if (!frame) return;
        let layer = frame.querySelector(':scope > .pks-prof-banner');
        if (!data || !data.img) { if (layer) layer.remove(); return; }
        if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'pks-prof-banner';
            layer.style.cssText = 'position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;pointer-events:none;';
            frame.insertBefore(layer, frame.firstChild);
        }
        Array.from(frame.children).forEach(c => {
            if (c === layer) return;
            if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
            c.style.zIndex = '1';
        });
        const img    = String(data.img).replace(/'/g, "\\'");
        const blur   = Math.max(0, Math.min(40, +data.blur || 0));
        const bright = Math.max(30, Math.min(150, +data.bright || 100)) / 100;
        const tint   = /^#[0-9a-fA-F]{6}$/.test(data.tint || '') ? data.tint : '#000000';
        const tint2  = /^#[0-9a-fA-F]{6}$/.test(data.tint2 || '') ? data.tint2 : tint;
        const angle  = Math.max(0, Math.min(360, +data.tintAngle || 135));
        const grad   = !!data.tintGradient;
        const tintBg = grad ? `linear-gradient(${angle}deg, ${tint}, ${tint2})` : tint;
        const tintOp = Math.max(0, Math.min(100, +data.tintOp || 0)) / 100;
        const rawMedia = String(data.img).replace(/\.gifv(\?.*)?$/i, '.mp4');
        const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(rawMedia);
        const spread = blur * 2 + 2;
        const sig = `${rawMedia}|${blur}|${bright}|${tint}|${tint2}|${angle}|${grad}|${tintOp}|${isVideo}`;
        if (layer.getAttribute('data-sig') === sig) return;
        layer.setAttribute('data-sig', sig);
        if (isVideo) {
            const vsrc = rawMedia.replace(/"/g, '&quot;');
            layer.innerHTML = `
            <video autoplay loop muted playsinline src="${vsrc}" style="position:absolute;inset:-${spread}px;width:calc(100% + ${spread * 2}px);height:calc(100% + ${spread * 2}px);object-fit:cover;filter:blur(${blur}px) brightness(${bright});"></video>
            <div style="position:absolute;inset:0;background:${tintBg};opacity:${tintOp};"></div>`;
            const vv = layer.querySelector('video');
            if (vv) { vv.muted = true; if (vv.play) vv.play().catch(() => {}); }
        } else {
            layer.innerHTML = `
            <div style="position:absolute;inset:-${spread}px;background-image:url('${img}');background-size:cover;background-position:center;filter:blur(${blur}px) brightness(${bright});"></div>
            <div style="position:absolute;inset:0;background:${tintBg};opacity:${tintOp};"></div>`;
        }
    };

    let _bannerFetchedId = null, _bannerFetchedData = null;
    const localBannerData = () => (cfg.profileBannerEnabled && cfg.profileBannerImage) ? {
        img: cfg.profileBannerImage, blur: cfg.profileBannerBlur, tint: cfg.profileBannerTint,
        tintOp: cfg.profileBannerTintOpacity, bright: cfg.profileBannerBrightness,
        tint2: cfg.profileBannerTint2, tintGradient: cfg.profileBannerTintGradient, tintAngle: cfg.profileBannerTintAngle,
    } : null;

    const applyProfileBannerForPage = () => {
        const id = profileId();
        if (!id) return;
        // Local-only: the banner is shown on your own profile from your saved settings.
        applyProfileBanner(id === myPekoraId() ? localBannerData() : null);
    };

    let _modalFixedEls = [];
    const fixGameModal = () => {
        const modal = document.querySelector('[class*="modalWrapper"]');
        if (modal) {
            modal.style.setProperty('position', 'fixed', 'important');
            modal.style.setProperty('top', '50%', 'important');
            modal.style.setProperty('left', '50%', 'important');
            modal.style.setProperty('right', 'auto', 'important');
            modal.style.setProperty('bottom', 'auto', 'important');
            modal.style.setProperty('margin', '0', 'important');
            modal.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
            modal.style.setProperty('z-index', '2147483647', 'important');
            for (let el = modal.parentElement; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
                if (el.hasAttribute('data-pks-modalfix')) continue;
                const cs = getComputedStyle(el);
                const traps = cs.transform !== 'none' || cs.perspective !== 'none' || cs.filter !== 'none'
                    || (cs.backdropFilter && cs.backdropFilter !== 'none')
                    || /transform|perspective|filter/.test(cs.willChange || '')
                    || /paint|layout|strict|content/.test(cs.contain || '');
                if (!traps) continue;
                el.setAttribute('data-pks-modalfix', '1');
                ['transform', 'perspective', 'filter', 'backdrop-filter', '-webkit-backdrop-filter'].forEach(p => el.style.setProperty(p, 'none', 'important'));
                el.style.setProperty('will-change', 'auto', 'important');
                el.style.setProperty('contain', 'none', 'important');
                _modalFixedEls.push(el);
            }
        } else if (_modalFixedEls.length) {
            _modalFixedEls.forEach(el => {
                el.removeAttribute('data-pks-modalfix');
                ['transform', 'perspective', 'filter', 'backdrop-filter', '-webkit-backdrop-filter', 'will-change', 'contain'].forEach(p => el.style.removeProperty(p));
            });
            _modalFixedEls = [];
        }
    };

    const applyCardStyle = () => {
        let cs = document.getElementById('pks-card-style');
        if (!cs) { cs = document.createElement('style'); cs.id = 'pks-card-style'; document.head.appendChild(cs); }
        if (!cfg.miscModernGameCards && !cfg.miscCatalogItemCards && !cfg.miscItemPageGlass) { cs.textContent = ''; return; }
        const t = getTheme();
        let cssOut = '';
        if (cfg.miscModernGameCards) {
            // Unified "Modern game cards": the SINGLE owner of game-card
            // styling on pages where the cards sit directly on the page
            // background -- the HOME rows and the /games LISTING. Page-gated:
            // the game DETAIL page (/games/<id>) and profile favorites style
            // their own nested cards (flat translucent inside glassed panels).
            // backdrop-filter proved unreliable on these carousel cards, so
            // when the custom site background (miscBgUrl) is set, the cards
            // produce a REAL, guaranteed-visible blur without backdrop-filter:
            // an ::before inside each card carries the SAME image the bg
            // feature paints on body, with background-attachment:fixed (the
            // IMAGE is viewport-aligned, matching the real background pixel-
            // for-pixel) plus filter:blur. The pseudo itself is position:
            // ABSOLUTE -- never fixed: overflow:hidden does NOT clip
            // position:fixed descendants (they escape ancestor clipping
            // unless the ancestor is their containing block), which painted
            // full-viewport blur over the whole page. Absolute pseudos are
            // clipped by the card's overflow:hidden normally. The pseudo is
            // oversized (negative inset) so the blur's transparent edge fade
            // is cropped away. isolation:isolate keeps the negative-z pseudos
            // inside the card (never lift card CHILDREN with position/
            // z-index -- see the avatar-bg lesson). NOTE: no transform on the
            // card in this variant: transform breaks background-attachment:
            // fixed (it degrades to scroll) and would misalign the slice. The
            // hover lift is done with a relative top offset instead -- it
            // moves the box without creating a containing block, so the
            // viewport-anchored slice stays put (exactly how real glass
            // behaves when the card moves).
            const onModernCardsPage = isHomePage() || (/^\/games(\/|$)/i.test(location.pathname) && !isGamePage());
            if (onModernCardsPage) {
                const cardBgUrl = cfg.miscBgUrl?.trim();
                if (cardBgUrl) {
                    const sliceBlur = (cfg.miscBgBlur ? (cfg.miscBgBlurAmount ?? 8) : 0) + 16;
                    const bgDarkOp = cfg.miscBgDarkOverlay ? ((cfg.miscBgDarkOpacity ?? 50) / 100) : 0;
                    const cardVeil = Math.min(0.8, 0.32 + bgDarkOp * 0.55).toFixed(2);
                    cssOut += `
                [class*="gameCardContainer"]{position:relative!important;top:0!important;isolation:isolate!important;background:transparent!important;border:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;border-radius:14px!important;overflow:hidden!important;transition:border-color 0.22s,box-shadow 0.22s,top 0.18s!important;}
                [class*="gameCardContainer"]::before{content:'';position:absolute;inset:-${sliceBlur * 2}px;z-index:-2;background:url('${cardBgUrl.replace(/'/g, "\\'")}') center/cover no-repeat fixed;filter:blur(${sliceBlur}px) saturate(150%);pointer-events:none;}
                [class*="gameCardContainer"]::after{content:'';position:absolute;inset:0;z-index:-1;background:rgba(10,11,16,${cardVeil});pointer-events:none;}
                [class*="gameCardContainer"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;top:-3px!important;z-index:2!important;}
                    `;
                } else {
                    // No custom background set: glass + self-sufficient
                    // graphite tint (backdrop-filter stays as progressive
                    // enhancement over the native site theme).
                    cssOut += `
                [class*="gameCardContainer"]{${GLASS_CSS}background:rgba(20,20,22,0.55)!important;border-radius:14px!important;transition:border-color 0.22s,box-shadow 0.22s,transform 0.18s!important;overflow:hidden!important;}
                [class*="gameCardContainer"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;transform:translateY(-3px)!important;z-index:2!important;}
                    `;
                }
                cssOut += `
                [class*="gameCardTitle"]{color:#fff!important;}
                [class*="gameCardPlaying"]{color:#9aa0c0!important;}
                [class*="gameCardThumbContainer"],[class*="gameCardThumbContainer"] img{border-radius:14px 14px 0 0!important;}
                [class*="gameCardFooterContainer"]{background:rgba(15,15,16,0.75)!important;border-radius:0 0 14px 14px!important;}
                `;
            }
        }
        if (cfg.miscCatalogItemCards) {
            cssOut += `
                /* catalog listing cards (scoped under the results grid so
                   avatarCardWrapper etc. on other pages are not affected) */
                [class*="resultsContainer-"] [class*="cardWrapper-"]{${GLASS_CSS}border-radius:14px!important;padding:8px!important;overflow:hidden!important;transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease!important;}
                [class*="resultsContainer-"] [class*="cardWrapper-"]:hover{transform:translateY(-4px)!important;box-shadow:0 14px 38px rgba(0,0,0,0.45)!important;border-color:${t.accent}77!important;}
                [class*="resultsContainer-"] [class*="cardContainer-"]{background:transparent!important;box-shadow:none!important;border:none!important;border-radius:10px!important;}
                [class*="resultsContainer-"] [class*="cardWrapper-"] a{background:transparent!important;text-decoration:none!important;}
                [class*="resultsContainer-"] [class*="cardEquipped-"]{border:none!important;box-shadow:none!important;background:transparent!important;}
                [class*="resultsContainer-"] [class*="cardWrapper-"]:has([class*="cardEquipped-"]){outline:2px solid rgba(2,183,87,0.85)!important;outline-offset:3px!important;}
                /* background-COLOR only: the background shorthand also wiped
                   background-image, blanking the placeholder preview on items
                   not yet approved by moderation */
                [class*="resultsContainer-"] [class*="cardImage-"],[class*="resultsContainer-"] div[class*="imageBig"],[class*="resultsContainer-"] div[class*="image-"],[class*="resultsContainer-"] div[class*="thumb"]{background-color:rgba(255,255,255,0.035)!important;border-radius:10px!important;overflow:hidden!important;border:none!important;box-shadow:none!important;}
                [class*="resultsContainer-"] [class*="cardImage-"] img{border:none!important;border-radius:10px!important;background-color:transparent!important;}
                [class*="resultsContainer-"] [class*="cardItemLink-"] span{color:#fff!important;font-weight:700!important;}
                [class*="resultsContainer-"] [class*="salesCounter-"]{color:#9aa0c0!important;}
                [class*="resultsContainer-"] [class*="salesCounterValue-"]{color:#fff!important;}
                [class*="resultsContainer-"] [class*="itemStatusSaleBadge-"]{border-radius:6px!important;}
                [class*="breadcrumbsContainer-"],[class*="breadcrumbsContainer-"] span{color:#dfe3f0!important;}
            `;
            const catDark = darkenHex(t.accent, 0.6);
            cssOut += `
                [class*="catalogContainer"]{background:transparent!important;}
                [class*="catalogContainer"] h1,[class*="catalogContainer"] h2,[class*="catalogContainer"] [class*="bottom-0-2"],[class*="catalogContainer"] [class*="top-0-2"]{color:#fff!important;}
                [class*="catalogContainer"] h3,[class*="catalogContainer"] label,[class*="catalogContainer"] summary,[class*="catalogContainer"] p,[class*="catalogContainer"] [class*="sortByLabel"]{color:#dfe3f0!important;}
                [class*="catalogContainer"] a{color:${t.accent}!important;}
                /* ...but the Category/Filters sidebar keeps neutral text (accent only on hover) */
                [class*="searchOptionsContainer-"] a{color:#dfe3f0!important;}
                [class*="searchOptionsContainer-"] a:hover{color:${t.accent}!important;}
                [class*="searchOptionsContainer-"] h1,[class*="searchOptionsContainer-"] h2,[class*="searchOptionsContainer-"] h3{color:#fff!important;}
                [class*="catalogContainer"] input[type="text"]{${GLASS_CSS}border-radius:8px!important;color:#fff!important;padding:5px 9px!important;}
            `;
            // Flat select fallback only while "Glassy dropdowns" is off - when
            // it is on, the merged-card recipe (pksGlassSelectCss) owns selects.
            if (!cfg.miscCatalogDropdownGlass) cssOut += `
                [class*="catalogContainer"] select{${GLASS_CSS}border-radius:8px!important;color:#fff!important;padding:5px 9px!important;}
                [class*="catalogContainer"] select option{background:#16161f!important;color:#fff!important;}
            `;
            // Catalog dropdowns are a custom component (from a live DOM dump):
            //   selectorWrapper-* > selectorClosed-* (which GAINS the class
            //   selectorOpen-* while open) + sibling selectorMenuOpen-* with
            //   p.selectOption-* rows.
            // Merged-card glass like the trades dropdowns: while open, the
            // closed control keeps rounded TOP corners with a sharp bottom, and
            // the menu below gets a sharp top with rounded BOTTOM corners.
            if (cfg.miscCatalogDropdownGlass) cssOut += `
                /* Anchor the wrapper so the absolute menu below sizes/aligns
                   to IT (not to the page - that made the menu full-width). */
                /* display:flex kills the inline baseline gap under the control
                   (a 1-2px dark seam between the open control and the menu). */
                [class*="selectorWrapper-"]{position:relative!important;padding:0!important;display:flex!important;border:none!important;background-color:transparent!important;}
                [class*="selectorWrapper-"] > [class*="selectorClosed-"]{flex:1 1 auto!important;}
                [class*="selectorClosed-"]{${GLASS_CSS}border-radius:8px!important;color:#fff!important;cursor:pointer!important;margin:0!important;box-sizing:border-box!important;transition:border-color 0.15s ease!important;}
                [class*="selectorClosed-"]:hover{border-color:${t.accent}77!important;}
                [class*="selectorClosed-"][class*="selectorOpen-"]{border-radius:8px 8px 0 0!important;border-bottom:0!important;}
                [class*="selectorMenuOpen-"]{${GLASS_CSS}border-radius:0 0 8px 8px!important;border-top:0!important;overflow:hidden!important;z-index:1600!important;padding:5px!important;position:absolute!important;top:100%!important;left:0!important;right:auto!important;margin:0!important;width:100%!important;box-sizing:border-box!important;}
                [class*="selectorMenuOpen-"] [class*="selectOption-"]{background:transparent!important;color:#fff!important;margin:0!important;padding:7px 10px!important;border-radius:0!important;cursor:pointer!important;}
                [class*="selectorMenuOpen-"] [class*="selectOption-"]:hover{background:${t.accent}2e!important;}
                [class*="selectorCaret-"]{background:transparent!important;border:none!important;color:#fff!important;}
                /* Header search row: merge [input | category dropdown | search
                   icon] into ONE card - rounded outer corners, sharp seams,
                   single 1px divider between segments. The standalone sort
                   dropdown (Relevance) is NOT inside catalogHeader- and keeps
                   the generic rounded style above. */
                [class*="catalogHeader-"] [class*="search-0-2"],[class*="catalogHeader-"] [class*="sdfaafasfafsaf-"]{gap:0!important;}
                [class*="catalogHeader-"] input[type="text"]{border-radius:8px 0 0 8px!important;border-right:0!important;margin:0!important;}
                [class*="catalogHeader-"] [class*="selectorWrapper-"]{margin:0!important;}
                [class*="catalogHeader-"] [class*="selectorClosed-"]{border-radius:0!important;}
                /* NOTE: no GLASS_CSS / background shorthand here - the search
                   icon is likely a background-image and a shorthand would wipe
                   it (same bug that blanked unmoderated item previews). */
                [class*="catalogHeader-"] [class*="selectorWrapper-"] + *{background-color:${GLASS_BG}!important;backdrop-filter:${GLASS_FILTER}!important;-webkit-backdrop-filter:${GLASS_FILTER}!important;border:1px solid ${GLASS_BORDER_COLOR}!important;box-shadow:${GLASS_SHADOW}!important;border-radius:0 8px 8px 0!important;border-left:0!important;margin:0!important;color:#fff!important;display:flex;align-items:center;justify-content:center;cursor:pointer!important;}
                [class*="catalogHeader-"] [class*="selectorWrapper-"] + * *{background-color:transparent!important;border:none!important;color:#fff!important;box-shadow:none!important;}
                /* Same overlap bug as trades: keep the fixed navbar above open
                   dropdown menus (menus are z-index 1600, popovers stay 2000). */
                nav.navbar,[class*="navbar-0-2"],.navbar{z-index:1700!important;}
            `;
            cssOut += `
                [class*="catalogContainer"] [class*="caret-0-2"]{background:transparent!important;border:none!important;color:#fff!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2,[class*="catalogContainer"] [class*="button-0-2"]{background:linear-gradient(135deg,${t.accent},${catDark})!important;border:none!important;color:#050508!important;border-radius:8px!important;font-weight:700!important;transition:filter 0.15s ease!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2:hover,[class*="catalogContainer"] [class*="button-0-2"]:hover{filter:brightness(1.12)!important;color:#050508!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]{${GLASS_CSS}border-radius:8px!important;margin-bottom:4px!important;padding:2px 8px!important;transition:background 0.15s ease,border-color 0.15s ease!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]:hover{background:${t.accent}1f!important;border-color:${t.accent}66!important;}
                [class*="catalogContainer"] [class*="separator-0-2"]{border-color:rgba(255,255,255,0.1)!important;background:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="divider-right"]{border-color:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="wrapper-0-2"]{${GLASS_CSS}border-radius:12px!important;padding:10px!important;}
            `;
        }
        if (cfg.miscItemPageGlass && isCatalogItemPage()) {
            // Item detail page (/catalog/:id). One recipe covers all three
            // variants from the Korone dump (limited w/ resellers + price
            // chart, owned w/ Edit Avatar, not-owned w/ Buy) - they share the
            // same itemContainer- skeleton; limited-only sections (resellers
            // list, chart/stats) are .section-content SIBLINGS of it.
            const itemDark = darkenHex(t.accent, 0.6);
            cssOut += `
                /* main card + limited-only sections. Resellers AND Owners
                   share the resellersWrapper- component; the Price Chart is
                   body-0-2-* (identified via its legend, since "body-" alone
                   is too generic). They are NOT siblings of itemContainer-
                   (nested in a classless div), so they are matched directly. */
                .section-content[class*="itemContainer-"],.section-content[class*="resellersWrapper-"],.section-content[class*="body-0-2-"]:has([class*="legendItem-"]){${GLASS_CSS}border-radius:14px!important;}
                /* Price Chart "180 Days" dropdown (white in stock theme);
                   scoped to topRow- so the header dots-menu is untouched */
                [class*="topRow-"] [class*="dropdownButton-"]{background:${GLASS_BG}!important;border:1px solid ${GLASS_BORDER_COLOR}!important;color:#fff!important;border-radius:8px!important;transition:border-color 0.15s ease!important;}
                [class*="topRow-"] [class*="dropdownButton-"]:hover{border-color:${t.accent}77!important;}
                [class*="topRow-"] [class*="dropdownButtonOpen-"]{background:${t.accent}2e!important;border-color:${t.accent}aa!important;color:#fff!important;border-radius:8px 8px 0 0!important;}
                /* stock list sits at top:calc(100% + 2px) - pin it flush to
                   the button and drop the seam border */
                [class*="topRow-"] [class*="dropdownList-"]{${GLASS_CSS}border-radius:0 0 8px 8px!important;border-top:0!important;top:100%!important;margin-top:0!important;overflow:hidden!important;padding:4px!important;z-index:1600!important;}
                [class*="topRow-"] [class*="dropdownOption-"]{color:#fff!important;background-color:transparent!important;border-radius:6px!important;}
                [class*="topRow-"] [class*="dropdownOption-"]:hover{background-color:${t.accent}2e!important;}
                /* light divider line between chart and stats */
                [class*="body-0-2-"] [class*="divider-0-2-"]{background:rgba(255,255,255,0.12)!important;}
                /* inner panels stay clear - no glass-on-glass stacking;
                   background-COLOR only (shorthand wipes preview images) */
                [class*="itemThumbContainer-"],[class*="itemThumb-"],[class*="itemDetailsContainer-"],[class*="itemDetails-"],[class*="itemHeaderContainer-"],[class*="itemHeaderInfo-"],[class*="itemInteractionContainer-"],[class*="favBtnContainer-"],[class*="favoriteContainer-"],[class*="itemStatusContainer-"]{background-color:transparent!important;box-shadow:none!important;}
                /* light-theme seam lines */
                [class*="itemContainer-"] hr,[class*="attrContainer-"],[class*="restrictionsContainer-"]{border-color:rgba(255,255,255,0.08)!important;}
                [class*="resellerContainer-"]{border-top:1px solid ${GLASS_BORDER_COLOR}!important;}
                /* green Buy -> accent gradient; white buttons (Edit Avatar,
                   reseller Buy) -> outlined glass */
                [class*="newBuyButton-"]{background:linear-gradient(135deg,${t.accent},${itemDark})!important;border:none!important;color:#050508!important;border-radius:8px!important;font-weight:700!important;transition:filter 0.15s ease!important;}
                [class*="newBuyButton-"]:hover{filter:brightness(1.12)!important;color:#050508!important;}
                [class*="newCancelButton-"]{background:${GLASS_BG}!important;border:1px solid ${GLASS_BORDER_COLOR}!important;color:#fff!important;border-radius:8px!important;transition:border-color 0.15s ease!important;}
                [class*="newCancelButton-"]:hover{border-color:${t.accent}77!important;color:#fff!important;}
                /* the favorites star exists 3x in the DOM; the real one sits
                   bottom-left under the thumb (directly in itemContainer-).
                   The copies inside itemDetailsContainer- (one showed up
                   below Description) are hidden. */
                [class*="itemDetailsContainer-"] [class*="favBtnContainer-"]{display:none!important;}
                /* recommended items -> same glass cards as the catalog grid */
                .section-content[class*="recomCardContainer-"]{${GLASS_CSS}border-radius:12px!important;overflow:hidden!important;transition:transform 0.16s ease,border-color 0.16s ease,box-shadow 0.16s ease!important;}
                .section-content[class*="recomCardContainer-"]:hover{transform:translateY(-3px)!important;border-color:${t.accent}77!important;box-shadow:0 14px 38px rgba(0,0,0,0.45)!important;}
                [class*="recomCardContainer-"] [class*="thumbContainer-"]{background-color:transparent!important;}
            `;
        }
        cs.textContent = cssOut;
    };

    let _tradeWindowInjected = false;
    let _tradesPageInjected = false;
    let _tradesInjecting = false;
    let _tradesClosed = false;
    let _tradesRepaint = null;

    const escHtml = (s) => {
        const d = document.createElement('div');
        d.textContent = String(s ?? '');
        return d.innerHTML;
    };

    const fmtNum = (n) => {
        if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M';
        if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'') + 'K';
        return n.toLocaleString();
    };

    // ── Robux JSS icon fix ─────────────────────────────────────────────────────────────────
    // Group / JSS-styled robux glyphs use dynamically generated class names
    // (image-0-2-N) whose sprite is set via runtime JSS stylesheets, so static
    // CSS selectors never match them. Scan same-origin JSS sheets for the
    // `img-robux` background and repaint those exact selectors with our icon.
    // NOTE: keep JS comments OUTSIDE the CSS strings — `//` inside CSS silently
    // eats the next rule.
    const applyRobuxJssIconFix = () => {
        const rbxPath = location.pathname.toLowerCase();
        const onTrade = /^\/trades\/?$/.test(rbxPath) || rbxPath.indexOf('/my/trades.aspx') === 0 || /^\/users\/\d+\/trade\/?$/.test(rbxPath);
        if (!(cfg.robuxIcon === 'all' || (cfg.robuxIcon === 'trades' && onTrade))) {
            document.getElementById('pks-robux-jss-style')?.remove();
            return;
        }
        const RBX_ICON_URL = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/assets/icons/robux_2021.svg';
        const iconSels = [];
        const amountSels = [];
        for (const sheet of document.styleSheets) {
            let node, rules;
            try { node = sheet.ownerNode; rules = sheet.cssRules; } catch (e) { continue; }
            if (!node || (node.id && node.id.indexOf('pks-') === 0)) continue;
            const sheetIconSels = [];
            const sheetAmtSels = [];
            for (const rule of rules) {
                if (!rule.style || !rule.selectorText) continue;
                const bg = (rule.style.background || '') + (rule.style.backgroundImage || '');
                if (bg.indexOf('img-robux') !== -1) sheetIconSels.push(rule.selectorText);
                const colNorm = (rule.style.color || '').replace(/\s+/g, '').toLowerCase();
                if (colNorm === '#060' || colNorm === '#006600' || colNorm === 'rgb(0,102,0)') sheetAmtSels.push(rule.selectorText);
            }
            if (sheetIconSels.length) {
                iconSels.push(...sheetIconSels);
                amountSels.push(...sheetAmtSels);
            }
        }
        let css = '';
        if (iconSels.length) css += `${iconSels.join(',')}{background:url("${RBX_ICON_URL}") center/contain no-repeat!important;}`;
        if (amountSels.length) css += `${amountSels.join(',')}{color:#fff!important;}`;
        if (!iconSels.length && !applyRobuxJssIconFix._retried) {
            applyRobuxJssIconFix._retried = true;
            setTimeout(applyRobuxJssIconFix, 1200);
        }
        let el = document.getElementById('pks-robux-jss-style');
        if (!el) {
            el = document.createElement('style');
            el.id = 'pks-robux-jss-style';
        }
        document.head.appendChild(el);
        el.textContent = css;
    };

    const applyMisc = () => {
        let miscStyle = document.getElementById('pks-misc-style');
        if (!miscStyle) { miscStyle = document.createElement('style'); miscStyle.id = 'pks-misc-style'; document.head.appendChild(miscStyle); }
        const t = getTheme();
        let css = '';
        css += `img[src*="headshot"],img[src*="thumbnail"]{background-color:transparent!important;}[class*="avatarHeadshotContainer"],[class*="avatarContainer"],[class*="avatarWrapper"],[class*="userIconContainer"],[class*="userIcon"]{background-color:transparent!important;}`;
        css += `[class*="iconCard"],[class*="iconCard"] [class*="imageWrapper"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;

        css += `
            [class*="moneyContainer"]{overflow:visible!important;}
            [class*="moneyContainer"] .col-lg-10{flex:0 0 100%!important;max-width:100%!important;${GLASS_CSS}border-radius:16px!important;padding:16px!important;}
            [class*="moneyContainer"] table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;}
            [class*="moneyContainer"] thead{${GLASS_CSS}border-radius:10px!important;}
            [class*="moneyContainer"] thead th{color:#9aa0c0!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:0.05em!important;font-size:11px!important;border:none!important;padding:11px 14px!important;}
            [class*="moneyContainer"] thead tr th:first-child{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important;}
            [class*="moneyContainer"] thead tr th:last-child{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;}
            [class*="moneyContainer"] tbody tr{transition:background 0.15s ease!important;}
            [class*="moneyContainer"] tbody tr:hover{background:${GLASS_BG}!important;}
            [class*="moneyContainer"] tbody td{color:#dfe3f0!important;border:none!important;border-top:1px solid rgba(255,255,255,0.06)!important;padding:12px 14px!important;vertical-align:middle!important;}
            [class*="moneyContainer"] tbody [class*="image-"]{border:1px solid rgba(255,255,255,0.15)!important;}
            [class*="senderName"]{color:#fff!important;font-weight:600!important;}
            [class*="viewDetails"]{color:${t.accent}!important;font-weight:700!important;cursor:pointer!important;}
            [class*="viewDetails"]:hover{text-decoration:underline!important;}
            [class*="tradeTypeActions"]{color:#cfd3e6!important;}
            [class*="tradeTypeActions"] a{color:${t.accent}!important;}
            [class*="tradeTypeActions"] select{${GLASS_CSS}color:#fff!important;border-radius:8px!important;padding:4px 8px!important;}
        `;
        // ── Modern /trades page glassify (sender/user column + traded items + verdict bar) ──
        // The WHOLE trade-list panel (tradeList-) is ONE glass surface; individual rows
        // (tradeRow-) stay transparent — natively background:transparent — with only a subtle
        // divider + hover, so users are NOT each wrapped in their own separate box.
        // Item cards reuse the catalog listing-card recipe: glass wrapper + rounded + overflow
        // hidden + padding, and the inner thumbnail (itemThumb-) gets a faint translucent fill
        // instead of the site's opaque --white-color-hover, so the cards no longer look crooked.
        // .pg-mt-verdict = the RAP/Value summary bar the trading runtime injects (was #121212).
        // Toggleable via the GUI "/trades" section (cfg.tradesGlassify).
        // PAGE-GATED to /trades: itemCard- is a generic JSS name that ALSO
        // exists on /users/<id>/inventory (and elsewhere) -- the flat
        // width:126px card recipe below leaked there and shrank inventory
        // cards to tiny tiles (cross-page leak, same lesson as the
        // recommendedGamesContainer scoping fix on /games).
        if (cfg.tradesGlassify && /^\/trades(\/|$)/i.test(location.pathname)) {
        css += `
            [class*="tradeList-"]{${GLASS_CSS}border-radius:14px!important;overflow-x:hidden!important;}
            [class*="tradeList-"] [class*="tradeRow-"]{background:transparent!important;border:0!important;border-bottom:1px solid rgba(255,255,255,0.08)!important;transition:background 0.15s ease!important;}
            [class*="tradeList-"] [class*="tradeRow-"]:hover{background:rgba(255,255,255,0.06)!important;}
            [class*="tradeList-"] [class*="tradeRowSelected"]{background:rgba(255,255,255,0.12)!important;}
            /* Normalise card + thumb geometry across every /trades layout (the site mixes a
               fixed 126px thumb with width:100% + aspect-ratio) — one explicit size for all.
               The size MUST stay 126px (the site's native card size): a 4-item side is
               4 cards + 3x16px gaps inside the ~565px offer panel, so anything wider
               (e.g. the old 140px) made the card row overflow past the Total rows and
               the verdict bar. 4x126 + 48 = 552 <= 565 — fits like the vanilla page.
               NOTE: we are inside a CSS template literal — only CSS comments are valid here;
               JS // lines would be parsed as broken selectors and drop the next rule. */
            [class*="itemCard-"]{${GLASS_CSS}box-sizing:border-box!important;align-self:stretch!important;height:auto!important;justify-content:flex-start!important;align-content:flex-start!important;width:126px!important;max-width:calc(50% - 8px)!important;border-radius:12px!important;padding:8px!important;overflow:hidden!important;transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease!important;}
            [class*="itemCard-"]:hover{transform:translateY(-3px)!important;box-shadow:0 12px 32px rgba(0,0,0,0.4)!important;border-color:${t.accent}77!important;}
            [class*="itemCard-"] [class*="thumbWrap-"]{position:relative!important;width:100%!important;height:auto!important;aspect-ratio:1/1!important;}
            [class*="itemCard-"] [class*="itemThumb-"]{width:100%!important;height:100%!important;background:rgba(255,255,255,0.035)!important;border-radius:10px!important;overflow:hidden!important;border:none!important;box-shadow:none!important;}
            [class*="itemCard-"] [class*="itemThumb-"] img{background:transparent!important;border-radius:10px!important;object-fit:contain!important;}
            /* Pekora leaves a hole between short names and the price rows (the name/price area
               gets sized against the tallest card in the row). Kill every source of that gap:
               the name hugs its own lines, nothing flex-grows, and the value rows keep a small
               fixed top margin instead of being pushed toward the card bottom. */
            [class*="itemCard-"] [class*="itemName-"]{color:#fff!important;font-weight:600!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:3!important;line-clamp:3!important;overflow:hidden!important;height:auto!important;min-height:0!important;flex:0 0 auto!important;margin:6px 0 0!important;line-height:1.13!important;}
            [class*="itemCard-"] [class*="itemValue-"]{margin-top:3px!important;flex:0 0 auto!important;}
            [class*="itemCard-"] .pg-mt-rap{margin-top:3px!important;}
            .pg-mt-verdict{${GLASS_CSS}border-radius:10px!important;}
        `;
        }
        // ── Custom Robux icon preset (assets/icons/robux_2021.svg served via jsDelivr) ──
        // cfg.robuxIcon: 'off' | 'trades' | 'all'.
        // 'trades' = only /trades, classic trade window /My/Trades.aspx and send-trade /users/<id>/trade;
        //            the NAVBAR icon stays native there (its counter is natively white, so the
        //            --robux-color override below does not visibly affect it).
        // 'all'    = everywhere: catalog, item pages, navbar, trades, send-trade, etc.
        // While the preset is active, robux amounts render WHITE instead of pekora's native green:
        // native green comes from --robux-color / .text-robux; Interium runtime RAP spans use .pg-rap-amt.
        // NOTE: keep JS comments OUTSIDE the template literals below — `//` inside CSS silently eats the next rule.
        const rbxPath = location.pathname.toLowerCase();
        const rbxOnTradePage = /^\/trades\/?$/.test(rbxPath) || rbxPath.indexOf('/my/trades.aspx') === 0 || /^\/users\/\d+\/trade\/?$/.test(rbxPath);
        if (cfg.robuxIcon === 'all' || (cfg.robuxIcon === 'trades' && rbxOnTradePage)) {
            const RBX_ICON_URL = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/assets/icons/robux_2021.svg';
            const RBX_ICON_SWAP = `background-image:url("${RBX_ICON_URL}")!important;background-position:center!important;background-repeat:no-repeat!important;background-size:contain!important;`;
            css += `
                .icon-robux,.icon-robux-12x12,.icon-robux-16x16,.icon-robux-20x20{${RBX_ICON_SWAP}}
                .icon-robux-gray,.icon-robux-gray-12x12,.icon-robux-gray-16x16,.icon-robux-gray-20x20{${RBX_ICON_SWAP}opacity:.55!important;}
                img[src*="img-robux"]{content:url("${RBX_ICON_URL}")!important;}
                :root{--robux-color:#fff!important;}
                .text-robux{color:#fff!important;}
                .pg-rap-amt{color:#fff!important;}
            `;
            if (cfg.robuxIcon === 'all') {
                css += `
                    .icon-nav-robux{${RBX_ICON_SWAP}}
                `;
            }
        }
        // ── Send-trade page (/users/<id>/trade) glassify: inventory cards + Your Offer / Your Request panels ──
        // Classes there: itemGrid- (CSS grid) > itemButton- (card) > itemThumb-/itemImage-/itemName-/itemValue-;
        // offerPanel- = the two <section>s with "Your Offer" / "Your Request" (titles are inside them);
        // the Make Offer button lives OUTSIDE offerPanel-, so it is untouched by design.
        // Cards are equalised per grid row via align-self:stretch (pekora natively leaves them uneven);
        // itemButton is a <button>, and buttons vertically centre their content when stretched, so we
        // pin content to the top with a flex column, and drop pekora's min-height:42px on itemName so
        // the robux line hugs short names (free space goes to the card bottom instead).
        // Category selects (select- inside inventoryHeader-): glass on the closed control everywhere;
        // in Chromium with customizable-select support (@supports selector(::picker(select))) the OPEN
        // dropdown is page-rendered via appearance:base-select, so it gets the real avatar-style glass
        // (blur + rounded corners + accent hover); older browsers keep the dark-options fallback.
        // NOTE: keep JS comments OUTSIDE the template literal below — `//` inside CSS silently eats the next rule.
        // Toggleable via the GUI "/trades" section (cfg.sendTradeGlassify / cfg.tradesDropdownGlass).
        const rbxOnSendTrade = /^\/users\/\d+\/trade\/?$/.test(rbxPath);
        const rbxOnTradesList = /^\/trades\/?$/.test(rbxPath);
        if (rbxOnSendTrade && cfg.sendTradeGlassify) {
            css += `
                [class*="itemGrid-"]{align-items:stretch!important;}
                [class*="itemGrid-"] [class*="itemButton-"]{${GLASS_CSS}box-sizing:border-box!important;align-self:stretch!important;height:auto!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;align-items:stretch!important;border-radius:12px!important;padding:8px!important;overflow:hidden!important;transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease!important;}
                [class*="itemGrid-"] [class*="itemButton-"]:hover{transform:translateY(-3px)!important;box-shadow:0 12px 32px rgba(0,0,0,0.4)!important;border-color:${t.accent}77!important;}
                [class*="itemGrid-"] [class*="itemThumb-"]{background:rgba(255,255,255,0.035)!important;border:none!important;border-radius:10px!important;overflow:hidden!important;flex:0 0 auto!important;}
                [class*="itemGrid-"] [class*="itemImage-"]{background:transparent!important;border-radius:10px!important;object-fit:contain!important;}
                [class*="itemGrid-"] [class*="itemName-"]{min-height:0!important;flex:0 0 auto!important;}
                [class*="itemGrid-"] [class*="itemValue-"]{flex:0 0 auto!important;}
                [class*="offerPanel-"]{${GLASS_CSS}border-radius:14px!important;padding:16px!important;}
                [class*="offerPanel-"] [class*="slot-"]{border-radius:10px!important;}
            `;
        }
        // ── Trade pages: glassy <select> + its open picker (shared recipe) ──
        // Chromium customizable select (appearance:base-select + ::picker(select)) lets the OPEN
        // list get real glass too; older browsers keep the dark-options fallback. Select + picker
        // read as ONE merged card: rounded outer corners, sharp seam at the join (mirrored via
        // .pks-drop-up when the picker flips above the select). Applied to the send-trade category
        // select and the /trades trade-type select; toggleable via cfg.tradesDropdownGlass.
        const pksGlassSelectCss = (S) => `
            ${S}{${GLASS_CSS}border-radius:8px!important;color:#fff!important;padding:6px 10px!important;cursor:pointer!important;transition:border-color 0.15s ease!important;}
            ${S}:hover,${S}:focus{border-color:${t.accent}77!important;outline:none!important;}
            ${S} option{background:#16161f!important;color:#fff!important;}
            @supports selector(::picker(select)){
                ${S},${S}::picker(select){appearance:base-select!important;}
                ${S}:open{border-radius:8px 8px 0 0!important;border-bottom:0!important;}
                ${S}::picker(select){${GLASS_CSS}border-radius:0 0 8px 8px!important;border-top:0!important;margin-top:var(--pks-drop-shift,0px)!important;padding:5px!important;}
                ${S}.pks-drop-up:open{border-radius:0 0 8px 8px!important;border-top:0!important;border-bottom:1px solid ${GLASS_BORDER_COLOR}!important;}
                ${S}.pks-drop-up::picker(select){border-radius:8px 8px 0 0!important;border-top:1px solid ${GLASS_BORDER_COLOR}!important;border-bottom:0!important;margin-bottom:0!important;max-height:var(--pks-drop-max,60vh)!important;overflow-y:auto!important;}
                ${S} option{background:transparent!important;color:#fff!important;padding:7px 10px!important;border-radius:0!important;cursor:pointer!important;}
                ${S} option:hover,${S} option:focus{background:${t.accent}2e!important;}
                ${S} option:checked{background:${t.accent}22!important;}
            }
        `;
        if (cfg.tradesDropdownGlass && rbxOnSendTrade) css += pksGlassSelectCss('[class*="inventoryHeader-"] select');
        if (cfg.tradesDropdownGlass && rbxOnTradesList) css += pksGlassSelectCss('select[aria-label="Trade type"]');
        const rbxOnCatalog = /^\/catalog(\/|$)/i.test(rbxPath);
        if (cfg.miscCatalogDropdownGlass && rbxOnCatalog) css += pksGlassSelectCss('[class*="catalogContainer"] select');
        if ((cfg.tradesDropdownGlass && (rbxOnSendTrade || rbxOnTradesList)) || (cfg.miscCatalogDropdownGlass && rbxOnCatalog)) {
            // Flip-detection for the merged-card dropdown: when the picker runs out of room below,
            // the browser anchors it ABOVE the select, and pure CSS has no "picker flipped" selector.
            // With appearance:base-select the <option>s are real page DOM rendered inside the picker,
            // so while the select is :open we compare the first option's rect against the select's rect
            // each animation frame (scroll can re-flip a live picker) and toggle .pks-drop-up, which
            // mirrors the border-radius pairing above. The rAF loop only runs while the picker is open.
            // The picker is a top-layer popover, so the navbar can never paint over it; instead, when
            // flipped up we clamp its height (--pks-drop-max, read by the CSS above) so it stops at the
            // navbar's bottom edge and scrolls inside rather than covering the navbar.
            // In the normal downward direction the opposite can happen: with the picker open, scrolling
            // the page can drag the anchoring select up BEHIND the navbar, so the picker's top (anchored
            // to the select's bottom edge) ends up inside the navbar zone. For that case we push the
            // picker down with a dynamic margin-top (--pks-drop-shift) so its top edge stays at the
            // navbar's bottom edge (the merged seam is hidden behind the navbar then anyway).
            if (!window.__pksTradeDropWatch) {
                window.__pksTradeDropWatch = true;
                const pksWatchDropSel = (sel) => {
                    if (sel.__pksDropWatched) return;
                    sel.__pksDropWatched = true;
                    let raf = 0;
                    const tick = () => {
                        let open = false;
                        try { open = sel.matches(':open'); } catch (e) { open = false; }
                        if (!open) { sel.classList.remove('pks-drop-up'); sel.style.removeProperty('--pks-drop-max'); sel.style.removeProperty('--pks-drop-shift'); raf = 0; return; }
                        const opt = sel.options && sel.options[0];
                        if (opt) {
                            const or = opt.getBoundingClientRect();
                            const sr = sel.getBoundingClientRect();
                            if (or.height > 0) {
                                const up = or.top < sr.top;
                                sel.classList.toggle('pks-drop-up', up);
                                const nav = document.querySelector('nav.navbar, [class*="navbar-0-2"], .navbar');
                                const navBottom = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
                                if (up) {
                                    sel.style.setProperty('--pks-drop-max', Math.max(80, Math.floor(sr.top - navBottom)) + 'px');
                                    sel.style.removeProperty('--pks-drop-shift');
                                } else {
                                    sel.style.removeProperty('--pks-drop-max');
                                    const shift = Math.ceil(navBottom - sr.bottom);
                                    if (shift > 0) sel.style.setProperty('--pks-drop-shift', shift + 'px');
                                    else sel.style.removeProperty('--pks-drop-shift');
                                }
                            }
                        }
                        raf = requestAnimationFrame(tick);
                    };
                    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
                    sel.addEventListener('click', kick);
                    sel.addEventListener('keydown', kick);
                    sel.addEventListener('focus', kick);
                };
                const pksScanDropSels = () => document.querySelectorAll('[class*="inventoryHeader-"] select, select[aria-label="Trade type"], [class*="catalogContainer"] select').forEach(pksWatchDropSel);
                pksScanDropSels();
                /* PERF: this observer used to fire pksScanDropSels on EVERY
                   mutation batch and was re-registered on each style rebuild.
                   Coalesce scans into one rAF and register exactly once. */
                try {
                    if (!window.__pksDropSelObs) {
                        window.__pksDropSelObs = true;
                        let dsRaf = 0;
                        new MutationObserver(() => { if (dsRaf) return; dsRaf = requestAnimationFrame(() => { dsRaf = 0; pksScanDropSels(); }); }).observe(document.documentElement, { childList: true, subtree: true });
                    }
                } catch (e) {}
            }
        }
        css += `
            [class*="modalWrapper"]{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;z-index:2147483647!important;margin:0!important;max-width:92vw!important;${GLASS_CSS}border-radius:16px!important;color:#fff!important;overflow:hidden!important;}
            [class*="modalWrapper"] [class*="innerSection"]{background:transparent!important;border:none!important;}
            [class*="modalWrapper"] [class*="title-"]{color:#fff!important;font-weight:700!important;}
            [class*="modalWrapper"] p,[class*="modalWrapper"] span{color:#e6e9f5;}
            [class*="modalWrapper"] a{color:${t.accent}!important;}
            [class*="modalWrapper"] [class*="robuxLabel"]{color:#3fd07e!important;}
            [class*="modalWrapper"] [class*="imageWrapper"]{background:transparent!important;}
            [class*="modalWrapper"] [class*="col-0-2"]{${GLASS_CSS}border-radius:10px!important;}
            [class*="modalWrapper"] [class*="divider-right"],[class*="modalWrapper"] [class*="divider-top"]{border-color:rgba(255,255,255,0.14)!important;}
            [class*="modalWrapper"] [class*="closeButton"]{color:#fff!important;cursor:pointer!important;opacity:0.85!important;}
            [class*="modalWrapper"] [class*="closeButton"]:hover{opacity:1!important;}
            /* Profile friend-action buttons (Unfriend / Message / Chat) → modern glass */
            [class*="actionContainer"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;}
            [class*="actionContainer"] [class*="buttonContainer"]{margin:0!important;}
            [class*="actionContainer"] button{${GLASS_CSS}border-radius:12px!important;color:#fff!important;font-weight:600!important;letter-spacing:0.02em!important;padding:8px 18px!important;transition:background 0.16s ease,border-color 0.16s ease,transform 0.14s ease,box-shadow 0.16s ease!important;}
            [class*="actionContainer"] button:hover{background:rgba(255,255,255,0.12)!important;border-color:${t.accent}!important;transform:translateY(-2px)!important;box-shadow:0 8px 24px ${t.accent}55!important;}
            /* Remove the (disabled) Chat button entirely */
            [class*="actionContainer"] [class*="newDisabledCancelButton"]{display:none!important;}
            [class*="actionContainer"] [class*="buttonContainer"]:has([class*="newDisabledCancelButton"]){display:none!important;}
            /* Auto-remove the OBC flair icon everywhere */
            .icon-obc,[class*="icon-obc"]{display:none!important;}
        `;
        {
            // Background media: image/GIF via CSS background-image, or MP4/WEBM/MOV
            // via a real <video> element (CSS background-image cannot play video).
            // imgur .gifv links are normalised to .mp4. ANY direct media URL works,
            // not just imgur.
            const syncMiscBgVideo = (src, blurPx) => {
                let v = document.getElementById('pks-misc-bg-video');
                if (!src) { if (v) v.remove(); return; }
                if (!v) {
                    v = document.createElement('video');
                    v.id = 'pks-misc-bg-video';
                    v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
                    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
                }
                v.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover;z-index:0;pointer-events:none;${blurPx ? `filter:blur(${blurPx}px);transform:scale(1.1);` : ''}`;
                if (v.getAttribute('src') !== src) v.setAttribute('src', src);
                if (v.parentElement !== document.body) document.body.insertBefore(v, document.body.firstChild);
                v.muted = true; if (v.play) v.play().catch(() => {});
            };
            const rawBg = (cfg.miscBgUrl || '').trim().replace(/\.gifv(\?.*)?$/i, '.mp4');
            const isVideoBg = /\.(mp4|webm|mov)(\?.*)?$/i.test(rawBg);
            const blurAmt = cfg.miscBgBlur ? (cfg.miscBgBlurAmount ?? 8) : 0;
            const blur = blurAmt ? `blur(${blurAmt}px)` : 'none';
            const darkOp = cfg.miscBgDarkOverlay ? ((cfg.miscBgDarkOpacity ?? 50) / 100) : 0;
            if (rawBg && isVideoBg) {
                // <video> sits on z-index:0 (via inline style), under the dark
                // overlay (z-index:1) and page content (z-index:2).
                css += `body::after{content:'';position:fixed;inset:0;z-index:1;background:rgba(0,0,0,${darkOp});pointer-events:none;}body>*{position:relative;z-index:2;}#pks-panel,#pks-watermark{z-index:2147483647!important;}`;
            } else if (rawBg) {
                css += `body{background-image:url('${rawBg.replace(/'/g, "\\'")}')!important;background-size:cover!important;background-position:center!important;background-attachment:fixed!important;background-repeat:no-repeat!important;}body::before{content:'';position:fixed;inset:0;z-index:0;background:inherit;filter:${blur};pointer-events:none;}body::after{content:'';position:fixed;inset:0;z-index:1;background:rgba(0,0,0,${darkOp});pointer-events:none;}body>*{position:relative;z-index:2;}#pks-panel,#pks-watermark{z-index:2147483647!important;}`;
            }
            syncMiscBgVideo(isVideoBg ? rawBg : '', blurAmt);
        }
        if (cfg.miscHideAds) css += `[class*="adWrapper"],[class*="adImage"]{display:none!important;}`;
        if (cfg.miscHideAlert) css += `[class*="alertBg"],[class*="alertText"],[class*="alertLink"],[class*="fakeAlert"]{display:none!important;}`;
        // Hide ONLY the top <nav> element. The side nav card (Home/Profile/... links)
        // is a SIBLING of <nav> inside .navbar-wrapper-main (verified in a saved DOM
        // dump), so hiding the whole wrapper used to nuke the sidebar together with
        // the navbar. Never hide .navbar-wrapper-main here.
        if (cfg.miscHideNavbar) css += `#stylable-nav-bar,nav.navbar,.navbar-0-2-49{display:none!important;}.main-0-2-1{padding-top:0!important;}`;
        if (cfg.miscHideMyFeed) css += `[class*="myFeedContainer"]{display:none!important;}`;
        if (cfg.miscHideBlogNews) css += `[class*="blogNewsContainer"]{display:none!important;}`;
        if (cfg.miscCatalogHideSidebar) css += `[class*="searchOptionsContainer-"]{display:none!important;}[class*="searchResultsContainer-"]{width:100%!important;flex:1 1 100%!important;max-width:100%!important;}`;
        if (cfg.miscProfileNameAnimate) {
            const c1 = cfg.miscProfileNameColor1 || t.accent;
            const c2 = cfg.miscProfileNameColor2 || '#38bdf8';
            css += `@keyframes pks-name-anim{0%{color:${c1}}50%{color:${c2}}100%{color:${c1}}}.username-0-2-278,[class*="username"],[class*="helloMessage"]{animation:pks-name-anim 3s ease-in-out infinite!important;font-weight:700!important;}`;
        }
        miscStyle.textContent = css;
        applySidebarNavStyle();
        applyPageFrameTransparency();
        applyRobuxJssIconFix();
        applyPageFont(cfg.miscPageFont || 'Default (Site Font)');
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
    };

    const setupHotkeys = () => {
        document.addEventListener('keydown', (e) => {
            if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
            if (document.querySelector('.pks-hk-record.recording')) return;
            const key = e.key.toUpperCase();
            if (cfg.hotkeyToggleGui && key === cfg.hotkeyToggleGui.toUpperCase()) {
                e.preventDefault();
                const panel = document.getElementById('pks-panel');
                if (!panel) {
                    try { _lsSet(PANEL_HIDDEN_KEY, false); } catch {}
                    buildPanel(state.authInfo || {});
                } else {
                    const willHide = panel.style.display !== 'none';
                    panel.style.display = willHide ? 'none' : '';
                    try { _lsSet(PANEL_HIDDEN_KEY, willHide); } catch {}
                }
            }
        });
    };

    /* ── Mass Trader tab (ported from Hexium src.js; engine lives in
       src/trading/interium-trading-*.js as window.InteriumMassTrader). ──
       Consent-based: it only SENDS trade offers the recipient must manually
       accept. No auto-accept, no fake balance/verification, no 3rd-party host. */
    const buildMassTradeUI = () => {
        const container = document.getElementById('pks-tab-trade');
        if (!container) return;
        const MT = window.InteriumMassTrader;
        const t = getTheme();
        if (!MT) {
            container.innerHTML = `<div style="padding:16px;color:${t.sectionText};font-size:11px;line-height:1.6;">Mass Trader engine not attached. Reload the page so the trading runtime can load.</div>`;
            return;
        }
        container.innerHTML = '';

        const bs = { myItems: [], mySelected: [], targetAssetId: null, targetOwners: [], stopped: false, logs: [] };
        const cs = { myItems: [], mySelected: [], targets: [] };

        const logLine = (elId, msg, type) => {
            const el = document.getElementById(elId);
            if (!el) return;
            const d = document.createElement('div');
            d.style.cssText = `font-size:10px;padding:3px 6px;border-radius:3px;margin-bottom:2px;background:${type === 'ok' ? 'rgba(0,232,122,0.08)' : type === 'err' ? 'rgba(255,68,102,0.08)' : 'rgba(255,255,255,0.03)'};color:${type === 'ok' ? '#00e87a' : type === 'err' ? '#ff4466' : t.sectionText};`;
            d.textContent = msg;
            el.appendChild(d); el.scrollTop = el.scrollHeight;
        };
        const mtLog = (msg, type, mode) => logLine(mode === 'blast' ? 'mt-blast-log' : 'mt-custom-log', msg, type);

        const warn = document.createElement('div');
        warn.style.cssText = `margin-bottom:10px;padding:8px 10px;background:rgba(240,165,0,0.08);border:1px solid rgba(240,165,0,0.35);border-radius:6px;color:#d9a94a;font-size:9px;line-height:1.7;letter-spacing:0.04em;`;
        warn.innerHTML = 'Sends standard trade offers that the recipient must <b>manually accept</b>. Bulk automated trading may violate Pekora\u2019s rules \u2014 use at your own risk. Interium never auto-accepts or fakes anything.';
        container.appendChild(warn);

        const tabBar = document.createElement('div');
        tabBar.style.cssText = `display:flex;gap:0;margin-bottom:12px;border-bottom:1px solid ${t.border};`;
        ['blast', 'custom'].forEach((mode, idx) => {
            const btn = document.createElement('button');
            btn.id = `mt-tab-${mode}`;
            btn.style.cssText = `all:unset;flex:1;text-align:center;padding:8px;font-size:10px;font-weight:700;letter-spacing:0.08em;cursor:pointer;border-bottom:2px solid ${idx === 0 ? t.accent : 'transparent'};color:${idx === 0 ? t.accent : t.sectionText};transition:color 0.15s,border-color 0.15s;`;
            btn.textContent = mode === 'blast' ? 'BLAST OWNERS' : 'CUSTOM';
            btn.addEventListener('click', () => {
                document.querySelectorAll('[id^="mt-tab-"]').forEach((b) => { b.style.borderBottomColor = 'transparent'; b.style.color = t.sectionText; });
                document.querySelectorAll('[id^="mt-mode-"]').forEach((p) => { p.style.display = 'none'; });
                btn.style.borderBottomColor = t.accent; btn.style.color = t.accent;
                document.getElementById(`mt-mode-${mode}`).style.display = '';
            });
            tabBar.appendChild(btn);
        });
        container.appendChild(tabBar);

        const blastPanel = document.createElement('div'); blastPanel.id = 'mt-mode-blast';
        blastPanel.innerHTML = `
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">1. Your Items (max 4)</div>
                <button id="mt-blast-load" class="pks-action-btn" style="width:100%;background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:7px;font-size:10px;margin-bottom:8px;">Load My Inventory</button>
                <div id="mt-blast-my-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;max-height:168px;overflow-y:auto;overflow-x:hidden;"></div>
            </div>
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">2. Target Item (Asset ID)</div>
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <input type="text" id="mt-blast-assetid" placeholder="Asset ID" style="flex:1;background:${t.inputBg};border:1px solid ${t.inputBorder};border-radius:5px;color:${t.valueText};font-size:11px;padding:5px 8px;outline:none;font-family:inherit;">
                    <button id="mt-blast-find" class="pks-action-btn" style="background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:5px 10px;font-size:10px;">Find Owners</button>
                </div>
                <div id="mt-blast-owner-info" style="font-size:10px;color:${t.sectionText};min-height:14px;"></div>
            </div>
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">3. Send</div>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                    <span style="font-size:10px;color:${t.sectionText};">Delay:</span>
                    <button id="mt-delay-dec" style="all:unset;width:22px;height:22px;background:${t.inputBg};border:1px solid ${t.border};border-radius:4px;color:${t.valueText};text-align:center;cursor:pointer;font-size:12px;line-height:22px;">\u2212</button>
                    <span id="mt-delay-val" style="font-size:11px;color:${t.valueText};font-weight:700;min-width:40px;text-align:center;">20s</span>
                    <button id="mt-delay-inc" style="all:unset;width:22px;height:22px;background:${t.inputBg};border:1px solid ${t.border};border-radius:4px;color:${t.valueText};text-align:center;cursor:pointer;font-size:12px;line-height:22px;">+</button>
                </div>
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <button id="mt-blast-send" class="pks-action-btn" style="flex:1;background:${t.accent};color:#050508;padding:8px;" disabled>\u25b6 Send to All Owners</button>
                    <button id="mt-blast-stop" class="pks-action-btn" style="background:#2a1a1a;color:#ff4466;border-color:#ff446633;padding:8px;display:none;">\u25a0 Stop</button>
                </div>
                <div id="mt-blast-progress-wrap" style="display:none;height:4px;background:${t.inputBg};border-radius:2px;overflow:hidden;margin-bottom:6px;"><div id="mt-blast-progress-bar" style="height:100%;width:0%;background:${t.accent};border-radius:2px;transition:width 0.3s;"></div></div>
                <div id="mt-blast-log" style="max-height:100px;overflow-y:auto;background:${t.inputBg};border:1px solid ${t.border};border-radius:5px;padding:4px;"></div>
            </div>
        `;
        container.appendChild(blastPanel);

        const customPanel = document.createElement('div'); customPanel.id = 'mt-mode-custom'; customPanel.style.display = 'none';
        customPanel.innerHTML = `
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">1. Your Items (max 4)</div>
                <button id="mt-custom-load" class="pks-action-btn" style="width:100%;background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:7px;font-size:10px;margin-bottom:8px;">Load My Inventory</button>
                <div id="mt-custom-my-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;max-height:168px;overflow-y:auto;overflow-x:hidden;"></div>
            </div>
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">2. Add Targets</div>
                <div style="display:flex;gap:5px;margin-bottom:6px;">
                    <input type="text" id="mt-custom-user" placeholder="Username or ID" style="flex:1;background:${t.inputBg};border:1px solid ${t.inputBorder};border-radius:5px;color:${t.valueText};font-size:11px;padding:5px 8px;outline:none;font-family:inherit;">
                    <input type="text" id="mt-custom-asset" placeholder="Asset ID" style="width:90px;background:${t.inputBg};border:1px solid ${t.inputBorder};border-radius:5px;color:${t.valueText};font-size:11px;padding:5px 8px;outline:none;font-family:inherit;">
                    <button id="mt-custom-add" class="pks-action-btn" style="background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:5px 10px;font-size:10px;">Add</button>
                </div>
                <div id="mt-custom-targets" style="max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;"></div>
            </div>
            <div>
                <button id="mt-custom-send" class="pks-action-btn" style="width:100%;background:${t.accent};color:#050508;padding:8px;" disabled>\u25b6 Send All Trades</button>
                <div id="mt-custom-log" style="max-height:100px;overflow-y:auto;background:${t.inputBg};border:1px solid ${t.border};border-radius:5px;padding:4px;margin-top:6px;"></div>
            </div>
        `;
        container.appendChild(customPanel);

        const itemCard = (item, selected, maxed) => {
            const card = document.createElement('div');
            card.style.cssText = `background:${t.inputBg};border:1px solid ${selected ? t.accent : t.border};border-radius:6px;padding:3px;cursor:${maxed ? 'not-allowed' : 'pointer'};opacity:${maxed ? '0.25' : '1'};text-align:center;transition:border-color 0.15s;overflow:hidden;`;
            const thumb = MT.thumbs[item.assetId] || '';
            card.innerHTML = `${thumb ? `<img src="${thumb}" style="width:100%;aspect-ratio:1;object-fit:contain;border-radius:4px;background:${t.headerBg};display:block;">` : `<div style="width:100%;aspect-ratio:1;background:${t.headerBg};border-radius:4px;"></div>`}<div style="font-size:8px;color:${t.valueText};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${item.name || 'Item'}</div>`;
            return card;
        };

        const renderMyGrid = (gridId, s, sendBtnId, sendReady) => {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            grid.innerHTML = '';
            s.myItems.forEach((item) => {
                const sel = s.mySelected.some((x) => x.userAssetId === item.userAssetId);
                const maxed = s.mySelected.length >= 4 && !sel;
                const card = itemCard(item, sel, maxed);
                if (!maxed) card.addEventListener('click', () => {
                    const idx = s.mySelected.findIndex((x) => x.userAssetId === item.userAssetId);
                    if (idx >= 0) s.mySelected.splice(idx, 1); else if (s.mySelected.length < 4) s.mySelected.push(item);
                    renderMyGrid(gridId, s, sendBtnId, sendReady);
                    sendReady();
                });
                grid.appendChild(card);
            });
        };

        const loadInventory = async (btnId, s, gridId, sendBtnId, sendReady, mode) => {
            const btn = document.getElementById(btnId);
            btn.disabled = true; btn.textContent = 'Loading\u2026';
            try {
                const items = await MT.fetchMyInventory();
                s.myItems = items.map((e) => ({ userAssetId: e.userAssetId || e.id, assetId: e.assetId, name: e.name || ('Asset ' + e.assetId) }));
                s.mySelected = [];
                const ids = [...new Set(s.myItems.map((i) => i.assetId).filter(Boolean))];
                if (ids.length) await MT.getAssetThumbs(ids);
                renderMyGrid(gridId, s, sendBtnId, sendReady);
                btn.textContent = `Loaded (${s.myItems.length})`; btn.disabled = false;
            } catch (e) { btn.textContent = 'Load My Inventory'; btn.disabled = false; mtLog('Error: ' + e.message, 'err', mode); }
        };

        /* ---- BLAST mode ---- */
        const blastSendReady = () => { const b = document.getElementById('mt-blast-send'); if (b) b.disabled = !bs.mySelected.length || !bs.targetOwners.length; };
        document.getElementById('mt-blast-load').addEventListener('click', () => loadInventory('mt-blast-load', bs, 'mt-blast-my-grid', 'mt-blast-send', blastSendReady, 'blast'));

        document.getElementById('mt-blast-find').addEventListener('click', async () => {
            const assetId = parseInt(document.getElementById('mt-blast-assetid').value.trim(), 10);
            if (!assetId) { mtLog('Enter an asset ID', 'err', 'blast'); return; }
            const btn = document.getElementById('mt-blast-find');
            btn.disabled = true; btn.textContent = '\u2026';
            const info = document.getElementById('mt-blast-owner-info');
            if (info) info.textContent = 'Finding owners\u2026';
            try {
                const owners = await MT.fetchAssetOwners(assetId);
                bs.targetAssetId = assetId; bs.targetOwners = owners;
                if (info) info.textContent = `Found ${owners.length} owners`;
                mtLog(`Found ${owners.length} owners of asset ${assetId}`, 'ok', 'blast');
                blastSendReady();
            } catch (e) { mtLog('Error: ' + e.message, 'err', 'blast'); if (info) info.textContent = ''; }
            btn.disabled = false; btn.textContent = 'Find Owners';
        });

        let blastDelay = 20;
        const updateDelay = () => { const el = document.getElementById('mt-delay-val'); if (el) el.textContent = blastDelay + 's'; };
        document.getElementById('mt-delay-dec').addEventListener('click', () => { if (blastDelay > 5) blastDelay -= 5; updateDelay(); });
        document.getElementById('mt-delay-inc').addEventListener('click', () => { if (blastDelay < 120) blastDelay += 5; updateDelay(); });

        document.getElementById('mt-blast-send').addEventListener('click', async () => {
            if (!bs.mySelected.length || !bs.targetOwners.length) return;
            bs.stopped = false;
            const sendBtn = document.getElementById('mt-blast-send');
            const stopBtn = document.getElementById('mt-blast-stop');
            const progWrap = document.getElementById('mt-blast-progress-wrap');
            const progBar = document.getElementById('mt-blast-progress-bar');
            if (sendBtn) sendBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = '';
            if (progWrap) progWrap.style.display = 'block';
            const myId = await MT.ensureMyId();
            let sent = 0, failed = 0;
            mtLog(`Blasting to ${bs.targetOwners.length} owners\u2026`, 'info', 'blast');
            for (let i = 0; i < bs.targetOwners.length; i++) {
                if (bs.stopped) { mtLog('Stopped.', 'info', 'blast'); break; }
                if (progBar) progBar.style.width = Math.round((i / bs.targetOwners.length) * 100) + '%';
                const owner = bs.targetOwners[i];
                try {
                    const r = await MT.sendTrade(myId, bs.mySelected.map((x) => x.userAssetId), owner.userId, [owner.userAssetId]);
                    if (r.ok) { sent++; mtLog(`\u2713 [${i + 1}/${bs.targetOwners.length}] ${owner.username}`, 'ok', 'blast'); }
                    else throw new Error('HTTP ' + r.status);
                } catch (e) { failed++; mtLog(`\u2717 ${owner.username}: ${e.message}`, 'err', 'blast'); }
                if (i < bs.targetOwners.length - 1 && !bs.stopped) await new Promise((res) => setTimeout(res, blastDelay * 1000));
            }
            if (progBar) progBar.style.width = '100%';
            mtLog(`Done! Sent: ${sent} | Failed: ${failed}`, sent > 0 ? 'ok' : 'err', 'blast');
            notify(`Mass Trader: sent ${sent}${failed ? `, ${failed} failed` : ''}`, sent > 0 ? 'success' : 'error');
            if (sendBtn) sendBtn.style.display = '';
            if (stopBtn) stopBtn.style.display = 'none';
        });
        document.getElementById('mt-blast-stop').addEventListener('click', () => { bs.stopped = true; });

        /* ---- CUSTOM mode ---- */
        const customSendReady = () => {
            const btn = document.getElementById('mt-custom-send');
            if (!btn) return;
            const ready = cs.targets.filter((x) => x.status === 'ready').length;
            btn.disabled = !cs.mySelected.length || !ready;
            btn.textContent = ready ? `\u25b6 Send ${ready} Trade${ready > 1 ? 's' : ''}` : '\u25b6 Send All Trades';
        };
        document.getElementById('mt-custom-load').addEventListener('click', () => loadInventory('mt-custom-load', cs, 'mt-custom-my-grid', 'mt-custom-send', customSendReady, 'custom'));

        const renderTargets = () => {
            const list = document.getElementById('mt-custom-targets');
            if (!list) return;
            list.innerHTML = '';
            cs.targets.forEach((target, i) => {
                const row = document.createElement('div');
                row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;background:${t.inputBg};border:1px solid ${t.border};border-radius:5px;font-size:10px;`;
                const sc = target.status === 'ready' ? '#00e87a' : target.status === 'error' ? '#ff4466' : target.status === 'sent' ? '#38bdf8' : t.sectionText;
                const si = target.status === 'ready' ? '\u2713' : target.status === 'error' ? '\u2717' : target.status === 'sent' ? '\u2192' : '\u2026';
                row.innerHTML = `<span style="color:${sc};font-weight:700;flex-shrink:0;">${si}</span><span style="flex:1;color:${t.valueText};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${target.username}</span><span style="color:${t.sectionText};font-size:9px;flex-shrink:0;">${target.assetName || target.assetId}</span>`;
                if (target.status !== 'sent') {
                    const rm = document.createElement('button');
                    rm.style.cssText = 'all:unset;color:#ff4466;cursor:pointer;font-size:12px;padding:0 2px;font-weight:700;flex-shrink:0;';
                    rm.textContent = '\u00d7';
                    rm.addEventListener('click', () => { cs.targets.splice(i, 1); renderTargets(); customSendReady(); });
                    row.appendChild(rm);
                }
                list.appendChild(row);
            });
        };

        document.getElementById('mt-custom-add').addEventListener('click', async () => {
            const userRaw = document.getElementById('mt-custom-user').value.trim();
            const assetRaw = document.getElementById('mt-custom-asset').value.trim();
            if (!userRaw || !assetRaw || !/^\d+$/.test(assetRaw)) { mtLog('Enter username/ID and asset ID', 'err', 'custom'); return; }
            const assetId = parseInt(assetRaw, 10);
            const entry = { userId: null, username: userRaw, assetId, assetName: '', userAssetId: null, status: 'loading' };
            cs.targets.push(entry); renderTargets();
            try {
                const u = await MT.resolveUser(userRaw);
                entry.userId = u.userId; entry.username = u.username;
                entry.assetName = await MT.getAssetName(assetId);
                const uaid = await MT.findUserAsset(entry.userId, assetId);
                if (uaid) { entry.userAssetId = uaid; entry.status = 'ready'; mtLog(`\u2713 ${entry.username} has ${entry.assetName || assetId}`, 'ok', 'custom'); }
                else { entry.status = 'error'; mtLog(`\u2717 ${entry.username} doesn\u2019t have item ${assetId}`, 'err', 'custom'); }
            } catch (e) { entry.status = 'error'; mtLog('Error: ' + e.message, 'err', 'custom'); }
            renderTargets(); customSendReady();
            document.getElementById('mt-custom-user').value = '';
            document.getElementById('mt-custom-asset').value = '';
        });

        document.getElementById('mt-custom-send').addEventListener('click', async () => {
            const ready = cs.targets.filter((x) => x.status === 'ready');
            if (!cs.mySelected.length || !ready.length) return;
            const myId = await MT.ensureMyId();
            mtLog(`Sending ${ready.length} trades\u2026`, 'info', 'custom');
            let sent = 0;
            for (let i = 0; i < ready.length; i++) {
                const target = ready[i];
                try {
                    const r = await MT.sendTrade(myId, cs.mySelected.map((x) => x.userAssetId), target.userId, [target.userAssetId]);
                    if (r.ok) { target.status = 'sent'; sent++; mtLog(`Sent to ${target.username}`, 'ok', 'custom'); }
                    else throw new Error('HTTP ' + r.status);
                } catch (e) { mtLog(`${target.username}: ${e.message}`, 'err', 'custom'); }
                renderTargets();
                if (i < ready.length - 1) await new Promise((res) => setTimeout(res, 20000));
            }
            mtLog('Done!', 'ok', 'custom');
            notify(`Mass Trader: sent ${sent}/${ready.length} trades`, sent > 0 ? 'success' : 'error');
            customSendReady();
        });
    };


    const buildPanel = (authInfo = {}) => {
        const daysLeft = authInfo.daysLeft;
        const daysStr  = daysLeft === Infinity || daysLeft === undefined ? '\u221e' : String(daysLeft);

        const style = document.createElement('style');
        style.id = 'pks-panel-style';
        style.textContent = `
            /* ── design tokens (deduped surfaces/lines) ───────────────── */
            #pks-panel {
                --pks-surface:#15151d; --pks-surface-2:#101017; --pks-surface-3:#0a0a10;
                --pks-line:#262633; --pks-line-soft:#1d1d28; --pks-radius:9px;
            }
            #pks-panel * { box-sizing:border-box; }
            #pks-panel, #pks-panel input, #pks-panel select, #pks-panel button, #pks-panel span, #pks-panel div, #pks-panel label {
                font-family:var(--pks-font),'Share Tech Mono',monospace;
            }
            @keyframes pks-panel-in { from{opacity:0;transform:translateY(-10px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
            @keyframes pks-fade-in { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }
            @keyframes pks-border-flow { 0%{background-position:0% 50%;} 100%{background-position:200% 50%;} }
            #pks-panel [id^="pks-tab-"][style*="block"] { animation:pks-fade-in 0.22s ease; }
            #pks-panel input[type=number], #pks-panel input[type=text], #pks-panel select {
                background:var(--pks-surface);border:1px solid var(--pks-line);border-radius:var(--pks-radius);color:#e6e6f2;font-size:11px;padding:6px 9px;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;outline:none;
            }
            #pks-panel input[type=text]:hover, #pks-panel input[type=number]:hover, #pks-panel select:hover { background:#1a1a24; }
            #pks-panel input[type=color] { padding:2px;width:38px;height:28px;cursor:pointer;background:var(--pks-surface);border:1px solid var(--pks-line);border-radius:7px; }
            #pks-panel input[type=checkbox] { -webkit-appearance:none;appearance:none;width:32px;height:18px;border-radius:9px;background:var(--pks-surface-3);border:1px solid var(--pks-line);cursor:pointer;position:relative;transition:background 0.2s,border-color 0.2s;flex-shrink:0; }
            #pks-panel input[type=checkbox]::after { content:'';position:absolute;top:1px;left:1px;width:14px;height:14px;border-radius:50%;background:#54545f;transition:transform 0.2s,background 0.2s; }
            #pks-panel input[type=checkbox]:checked::after { transform:translateX(14px);background:#fff; }
            #pks-panel select { cursor:pointer; }
            #pks-panel ::-webkit-scrollbar { width:6px;height:6px; }
            #pks-panel ::-webkit-scrollbar-track { background:transparent; }
            #pks-panel ::-webkit-scrollbar-thumb { background:#2c2c3a;border-radius:3px;border:1px solid transparent;background-clip:padding-box; }
            #pks-panel ::-webkit-scrollbar-thumb:hover { background:#3a3a4c; }
            #pks-panel label { cursor:pointer; }
            #pks-tab-bar::-webkit-scrollbar { display:none; }
            .pks-tab-btn { all:unset;padding:11px 5px 9px;font-size:8.5px;font-weight:700;letter-spacing:0.07em;cursor:pointer;color:#5a5a68;transition:color 0.15s,background 0.15s,border-color 0.15s;border-bottom:2px solid transparent;white-space:nowrap;flex:1;text-align:center;position:relative;border-radius:7px 7px 0 0; }
            .pks-tab-btn:hover { color:#a8a8bb;background:rgba(255,255,255,0.03); }
            .pks-tab-btn svg { transition:transform 0.15s; }
            .pks-tab-btn:hover svg { transform:translateY(-1px); }
            .pks-section-title { color:#3a3a48;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;margin:16px 0 9px;font-weight:700;display:flex;align-items:center;gap:8px; }
            .pks-section-title::after { content:'';flex:1;height:1px;background:linear-gradient(90deg,currentColor,transparent);opacity:0.35; }
            .pks-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:8px;padding:1px 0; }
            .pks-row label { color:#b0b0c0;font-size:11px;flex:1; }
            .pks-row .pks-row-right { display:flex;align-items:center;gap:6px;flex-shrink:0; }
            .pks-glass-master { display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 10px;padding:7px 10px;border:1px solid rgba(255,255,255,0.12);border-radius:8px;background:linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02));box-shadow:0 2px 10px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.06);transition:border-color 0.18s; }
            .pks-glass-master:hover { border-color:rgba(255,255,255,0.22); }
            .pks-glass-master label { color:#dfe3f5!important;font-size:11px;font-weight:600;letter-spacing:0.05em;flex:1;cursor:pointer; }
            .pks-glass-master .pks-glass-star { color:#8ea2ff;margin-right:2px; }
            .pks-stat { flex:1;background:linear-gradient(160deg,var(--pks-surface),var(--pks-surface-2));border:1px solid var(--pks-line-soft);border-radius:10px;padding:10px 8px;text-align:center;transition:border-color 0.18s,transform 0.18s; }
            .pks-stat:hover { transform:translateY(-1px);border-color:var(--pks-line); }
            .pks-stat-val { color:#00e87a;font-size:21px;font-weight:700;display:block;line-height:1;letter-spacing:-0.02em; }
            .pks-stat-lbl { color:#45454f;font-size:8px;text-transform:uppercase;letter-spacing:0.13em;margin-top:5px;display:block; }
            .pks-action-btn { all:unset;flex:1;text-align:center;padding:9px 0;border-radius:var(--pks-radius);font-size:11px;font-weight:700;letter-spacing:0.08em;cursor:pointer;transition:filter 0.15s,transform 0.12s,box-shadow 0.15s;border:1px solid transparent;position:relative; }
            .pks-action-btn:hover { transform:translateY(-1px); }
            .pks-action-btn:active { transform:scale(0.97)!important; }
            .pks-hk-record { all:unset;padding:5px 13px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--pks-line);background:var(--pks-surface);color:#bcbccc;min-width:52px;text-align:center;transition:border-color 0.15s,color 0.15s,background 0.15s; }
            .pks-hk-record:hover { background:#1c1c26;border-color:#33334a; }
            .pks-hk-record.recording { border-color:#f0a500!important;color:#f0a500!important;animation:pks-blink 0.8s infinite; }
            @keyframes pks-blink { 0%,100%{opacity:1}50%{opacity:0.3} }
            .pks-theme-swatch { all:unset;padding:8px 10px;border-radius:8px;font-size:10px;font-weight:700;letter-spacing:0.04em;cursor:pointer;border:1px solid var(--pks-line-soft);background:var(--pks-surface-2);text-align:center;transition:filter 0.15s,transform 0.15s,box-shadow 0.15s;display:flex;align-items:center;gap:7px; }
            .pks-theme-swatch:hover { filter:brightness(1.3);transform:translateY(-1px); }
            .pks-theme-swatch.active { border-width:1.5px;box-shadow:0 2px 14px -4px currentColor; }
            .pks-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
            .pks-currency-pill { display:flex;align-items:center;gap:5px;background:var(--pks-surface);border:1px solid var(--pks-line-soft);border-radius:7px;padding:3px 9px;font-size:11px; }
            .pks-unit-label { color:#4a4a56;font-size:10px; }
            .pks-win-btn { all:unset;width:11px;height:11px;border-radius:50%;cursor:pointer;display:block;flex-shrink:0;transition:filter 0.15s,transform 0.1s,box-shadow 0.15s;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.25); }
            .pks-win-btn:hover { filter:brightness(1.3);transform:scale(1.18); }
            .pks-win-btn:active { transform:scale(0.92); }
            .pks-page-badge { display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.09);color:#6a6a7a;margin-bottom:9px; }
            .pks-mode-pill { display:inline-flex;border:1px solid var(--pks-line);border-radius:8px;overflow:hidden;background:var(--pks-surface); }
            .pks-mode-pill button { all:unset;padding:5px 11px;font-size:9.5px;font-weight:700;letter-spacing:0.06em;cursor:pointer;color:#52525e;background:transparent;transition:background 0.15s,color 0.15s;white-space:nowrap; }
            .pks-mode-pill button:hover { color:#9a9aae; }
            .pks-mode-pill button.active { background:#2a2a3a;color:#eaeaf5; }
            .pks-mode-pill button:not(:last-child) { border-right:1px solid var(--pks-line); }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'pks-panel';
        panel.style.cssText = `all:initial;position:fixed;top:18px;right:18px;z-index:2147483647;font-family:var(--pks-font),'Share Tech Mono',monospace;background:#0c0c0e;border:1px solid #2a2a35;border-radius:16px;width:374px;box-shadow:0 14px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04);overflow:hidden;user-select:none;transform-origin:top right;animation:pks-panel-in 0.34s cubic-bezier(0.22,1,0.36,1);`;

        panel.innerHTML = `
            <div id="pks-top-border" style="height:3px;width:100%;background:linear-gradient(90deg,#00e5ff,#a855f7,#fbbf24);background-size:200% 100%;animation:pks-border-flow 6s linear infinite;flex-shrink:0;"></div>
            <div id="pks-header" style="padding:13px 15px;background:#111116;cursor:move;border-bottom:1px solid #1a1a22;position:relative;">
                <div style="display:flex;align-items:center;gap:11px;">
                    <div style="position:relative;flex-shrink:0;width:40px;height:40px;">
                        <div style="position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(from 0deg,rgba(0,232,122,0.5),rgba(0,232,122,0.05),rgba(0,232,122,0.5));opacity:0.55;"></div>
                        <img id="pks-avatar-img" src="" alt="" style="position:relative;width:40px;height:40px;border-radius:50%;border:2px solid rgba(0,232,122,0.35);background:#1a1a2a;object-fit:cover;display:none;">
                        <div id="pks-avatar-anon" style="position:relative;width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,0.12);background:#1a1a2a;display:none;align-items:center;justify-content:center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        </div>
                        <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;background:#00e87a;border-radius:50%;border:2px solid #111116;box-shadow:0 0 6px #00e87a;z-index:1;"></div>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div id="pks-header-title" style="font-size:9px;letter-spacing:0.24em;text-transform:uppercase;line-height:1;margin-bottom:3px;font-weight:700;">Interium</div>
                        <div id="pks-profile-name" style="color:#fff;font-size:13.5px;font-weight:700;letter-spacing:0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:112px;line-height:1.2;">Loading\u2026</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><svg style="display:inline-block;vertical-align:-1.5px;flex:none;" width="11" height="11" xmlns="http://www.w3.org/2000/svg" viewBox="30 114 24 24"><path fill="#02B757" d="M37,123v2h2.6c0.1-0.5,0.1-1.5,0-2H37z"/><path fill="#02B757" d="M42,114c-6.6,0-12,5.4-12,12c0,6.6,5.4,12,12,12s12-5.4,12-12C54,119.4,48.6,114,42,114z M47,131v1 c0,0.6-0.4,1-1,1s-1-0.4-1-1v-1h-3c-0.2,0-0.4-0.1-0.6-0.2l-4.4-3.5v2.7c0,0.6-0.4,1-1,1s-1-0.4-1-1v-8c0-0.6,0.4-1,1-1h4 c1.1,0,1.7,1.1,1.7,3c0,0.6-0.1,1.2-0.2,1.7c-0.4,1.2-1.2,1.3-1.5,1.3h-0.1l2.5,2H47c0.3,0,0.5-0.5,0.5-1c0-0.4-0.1-1-0.5-1h-2 c-1.4,0-2.5-1.3-2.5-3c0-0.7,0.2-1.4,0.5-1.9c0.5-0.7,1.2-1.1,2-1.1v-1c0-0.6,0.4-1,1-1s1,0.4,1,1v1h1c0.6,0,1,0.4,1,1s-0.4,1-1,1 h-3c-0.1,0-0.2,0-0.3,0.2s-0.2,0.5-0.2,0.8c0,0.4,0.2,1,0.5,1h2c1.4,0,2.5,1.3,2.5,3S48.4,131,47,131z"/></svg><span id="pks-profile-robux" style="color:#fff;font-weight:700;">\u2014</span></div>
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><svg style="display:inline-block;vertical-align:-1.5px;flex:none;" width="11" height="11" xmlns="http://www.w3.org/2000/svg" viewBox="30 142 24 24"><path fill="#CC9E71" d="M51,149h-2l-2-2v-2l-3-3l-14,14l3,3h2l2,2v2l3,3l14-14L51,149z M44.7,156.7c-0.2,0.2-0.5,0.3-0.7,0.3 s-0.5-0.1-0.7-0.3l-3.3-3.3l-1.3,1.3c-0.2,0.2-0.5,0.3-0.7,0.3s-0.5-0.1-0.7-0.3c-0.4-0.4-0.4-1,0-1.4l4-4c0.4-0.4,1-0.4,1.4,0 s0.4,1,0,1.4l-1.3,1.3l3.3,3.3C45.1,155.7,45.1,156.3,44.7,156.7z"/></svg><span id="pks-profile-tickets" style="color:#fff;font-weight:700;">\u2014</span></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:center;flex-shrink:0;margin-left:3px;">
                        <button id="pks-min-btn" class="pks-win-btn" title="Minimise" style="background:#febc2e;"></button>
                        <button id="pks-close-btn" class="pks-win-btn" title="Close" style="background:#ff5f57;"></button>
                    </div>
                </div>
            </div>
            <div id="pks-body">
                <div id="pks-tab-bar" style="display:flex;align-items:flex-end;padding:0 2px;background:#0d0d0f;border-bottom:1px solid #1a1a24;overflow-x:auto;scrollbar-width:none;">
                    <button class="pks-tab-btn active" data-tab="hex"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M2 5l3 2.2L8 2l3 5.2L14 5l-1.3 8H3.3z"/></svg>PROFILE</button>
                    <button class="pks-tab-btn" data-tab="trade"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><path d="M7 16V4L3 8m4-4l4 4M9 1v12l4-4m-4 4l4-4"/></svg>TRADE</button>
                    <button class="pks-tab-btn" data-tab="misc"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><circle cx="8" cy="8" r="2"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>MISC</button>
                    <button class="pks-tab-btn" data-tab="settings"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4"/></svg>CFG</button>
                </div>
                <div id="pks-tab-misc" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div style="margin-bottom:4px;"><span class="pks-page-badge">Universal \u2014 all pages</span></div>
                    <div class="pks-section-title">Sidebar Style</div>
                    <div class="pks-row"><label>Enable sidebar styling</label><input type="checkbox" id="cfg-sidebarEnabled"></div>
                    <div class="pks-row"><label>Mode</label><div class="pks-mode-pill" id="pks-sidebar-mode-pill"><button data-mode="transparent" class="active">Transparent</button><button data-mode="blur">Blur</button><button data-mode="colour">Colour</button></div></div>
                    <div class="pks-row" id="pks-sidebar-blur-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Blur amount</label><div class="pks-row-right"><input type="number" id="cfg-sidebarBlurAmount" min="1" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row" id="pks-sidebar-colour-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour</label><input type="color" id="cfg-sidebarColour"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Opacity</label><div class="pks-row-right"><input type="number" id="cfg-sidebarOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Navbar Style</div>
                    <div class="pks-row"><label>Enable navbar styling</label><input type="checkbox" id="cfg-navbarEnabled"></div>
                    <div class="pks-row"><label>Mode</label><div class="pks-mode-pill" id="pks-navbar-mode-pill"><button data-mode="transparent" class="active">Transparent</button><button data-mode="blur">Blur</button><button data-mode="colour">Colour</button></div></div>
                    <div class="pks-row" id="pks-navbar-colour-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour</label><input type="color" id="cfg-navbarColour"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Opacity</label><div class="pks-row-right"><input type="number" id="cfg-navbarOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Glass gear dropdown (Blur mode)</label><input type="checkbox" id="cfg-navbarDropdownGlass"></div>
                    <div class="pks-section-title">Background Image</div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-miscBgUrl" placeholder="Direct image / GIF / MP4 URL - any host (press Enter)" style="width:100%;font-size:10px;"></div>
                    <div class="pks-row"><label>Blur background</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgBlur"><input type="number" id="cfg-miscBgBlurAmount" min="1" max="30" step="1" style="width:50px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Dark overlay</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgDarkOverlay"><input type="number" id="cfg-miscBgDarkOpacity" min="0" max="95" step="5" style="width:50px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Effects</div>
                    <div class="pks-row"><label>Background effect</label><select id="cfg-effectType" style="width:130px;"><option value="none">None</option><option value="rain">Rain</option><option value="snow">Snow</option><option value="stars">Stars</option><option value="matrix">Matrix</option></select></div>
                    <div class="pks-row"><label>Intensity</label><div class="pks-row-right"><input type="number" id="cfg-effectIntensity" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Speed</label><div class="pks-row-right"><input type="number" id="cfg-effectSpeed" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Colour (blank = auto)</label><div class="pks-row-right"><input type="color" id="cfg-effectColor"><button id="cfg-effectColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-section-title">Other</div>
                    <div class="pks-row"><label>Robux icon (2021)</label><select id="cfg-robuxIcon" style="width:130px;"><option value="off">Off</option><option value="trades">Trades only</option><option value="all">Everywhere</option></select></div>
                    <div class="pks-row"><label>Hide ads</label><input type="checkbox" id="cfg-miscHideAds"></div>
                    <div class="pks-row"><label>Remove alert banner</label><input type="checkbox" id="cfg-miscHideAlert"></div>
                    <div class="pks-row"><label>Hide nav bar entirely</label><input type="checkbox" id="cfg-miscHideNavbar"></div>
                    <div class="pks-row"><label>Transparent footer</label><input type="checkbox" id="cfg-miscFooterTransparent"></div>
                    <div class="pks-section-title">Fonts</div>
                    <div class="pks-row"><label>Page font</label><select id="cfg-miscPageFont" style="width:160px;"><option value="Default (Site Font)">Default (Site Font)</option><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option><option value="Source Sans Pro Light">Source Sans Pro Light</option></select></div>
                    <div class="pks-row"><label>GUI font</label><select id="cfg-miscGuiFont" style="width:160px;"><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option></select></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/home</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-home"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-home"></div>
                    <div class="pks-row"><label>Transparent page frames</label><input type="checkbox" id="cfg-miscHomeFramesTransparent"></div>
                    <div class="pks-row"><label>Hide My Feed</label><input type="checkbox" id="cfg-miscHideMyFeed"></div>
                    <div class="pks-row"><label>Hide Blog / News</label><input type="checkbox" id="cfg-miscHideBlogNews"></div>
                    <div class="pks-row"><label>Modern game cards (home + games)</label><input type="checkbox" id="cfg-miscModernGameCards"></div>
                    <div class="pks-row"><label>Transparent friend cards</label><input type="checkbox" id="cfg-miscFriendsFrameTransparent"></div>
                    <div class="pks-row"><label>Merge friend request cards</label><input type="checkbox" id="cfg-miscFriendRequestMerge"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/friends</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-friends"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-friends"></div>
                    <div class="pks-row"><label>Glassify friends tabs</label><input type="checkbox" id="cfg-miscFriendsTabsGlassify"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/games</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-games"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-games"></div>
                    <div class="pks-row"><label>Glassify game page</label><input type="checkbox" id="cfg-miscGamesGlassify"></div>
                    <div class="pks-row"><label>Hero backdrop (blurred thumb)</label><input type="checkbox" id="cfg-miscGamesHeroBackdrop"></div>
                    <div class="pks-row"><label>Hide comments</label><input type="checkbox" id="cfg-miscGamesHideComments"></div>
                    <div class="pks-row"><label>Hide recommended games</label><input type="checkbox" id="cfg-miscGamesHideRecommended"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/trades \u2014 trade pages</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-trades"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-trades"></div>
                    <div class="pks-row"><label>Glassify trades list</label><input type="checkbox" id="cfg-tradesGlassify"></div>
                    <div class="pks-row"><label>Glassify send-trade page</label><input type="checkbox" id="cfg-sendTradeGlassify"></div>
                    <div class="pks-row"><label>Glassy dropdowns</label><input type="checkbox" id="cfg-tradesDropdownGlass"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/Catalog.aspx</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-catalog"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-catalog"></div>
                    <div class="pks-row"><label>Transparent main frame</label><input type="checkbox" id="cfg-miscCatalogFrameTransparent"></div>
                    <div class="pks-row"><label>Hide sidebar</label><input type="checkbox" id="cfg-miscCatalogHideSidebar"></div>
                    <div class="pks-row"><label>Glassify item cards</label><input type="checkbox" id="cfg-miscCatalogItemCards"></div>
                    <div class="pks-row"><label>Glassy dropdowns</label><input type="checkbox" id="cfg-miscCatalogDropdownGlass"></div>
                    <div class="pks-row"><label>Glassify item page</label><input type="checkbox" id="cfg-miscItemPageGlass"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/groups</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-groups"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-groups"></div>
                    <div class="pks-row"><label>Glassify groups page</label><input type="checkbox" id="cfg-miscGroupsGlassify"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/develop</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-develop"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-develop"></div>
                    <div class="pks-row"><label>Glassify develop page</label><input type="checkbox" id="cfg-miscDevelopGlassify"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/messages</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-messages"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-messages"></div>
                    <div class="pks-row"><label>Glassify messages page</label><input type="checkbox" id="cfg-miscMessagesGlassify"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/inventory</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-inventory"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-inventory"></div>
                    <div class="pks-row"><label>Glassify inventory</label><input type="checkbox" id="cfg-miscInventoryGlassify"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/profile</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-profile"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-profile"></div>
                    <div class="pks-row"><label>Glassify profile</label><input type="checkbox" id="cfg-miscProfileFrameTransparent"></div>
                    <div class="pks-row"><label>Glassify profile tabs (About / Creations)</label><input type="checkbox" id="cfg-miscProfileTabsGlassify"></div>
                    <div class="pks-row"><label>Animated username colour</label><input type="checkbox" id="cfg-miscProfileNameAnimate"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 1</label><input type="color" id="cfg-miscProfileNameColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 2</label><input type="color" id="cfg-miscProfileNameColor2"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/My/Avatar</span></div>
                    <div class="pks-glass-master"><label for="pks-glassify-avatar"><span class="pks-glass-star">\u2726</span> Glassify page</label><input type="checkbox" id="pks-glassify-avatar"></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscAvatarFrameTransparent"></div>
                    <div class="pks-row"><label>Blur category dropdown</label><input type="checkbox" id="cfg-miscAvatarBlurDropdown"></div>
                    <div class="pks-row"><label>Glassify item frames</label><input type="checkbox" id="cfg-avatarGlassify"></div>
                    <div class="pks-row"><label>Glassify avatar editor</label><input type="checkbox" id="cfg-avatarEditorGlass"></div>
                    <div class="pks-row"><label>Avatar background</label><input type="checkbox" id="cfg-avatarBgEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Background blur</label><div class="pks-row-right"><input type="number" id="cfg-avatarBgBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Custom URL (image / gif / mp4)</label></div>
                    <div class="pks-row"><input type="text" id="cfg-avatarBgImage" placeholder="https://… .png / .gif / .mp4 — press Enter" style="flex:1;min-width:0;"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">Watermark</span></div>
                    <div class="pks-row"><label>Show watermark</label><input type="checkbox" id="cfg-watermarkEnabled"></div>
                    <div class="pks-row"><label>Position</label><select id="cfg-watermarkPosition" style="width:130px;"><option value="bottom-left">Bottom Left</option><option value="bottom-right">Bottom Right</option><option value="bottom-center">Bottom Center</option><option value="top-left">Top Left</option><option value="top-right">Top Right</option><option value="top-center">Top Center</option></select></div>
                    <div class="pks-row"><label>Accent colour</label><div class="pks-row-right"><input type="color" id="cfg-watermarkAccentColor"><button id="cfg-watermarkAccentColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-row"><label>Scale</label><div class="pks-row-right"><input type="number" id="cfg-watermarkScale" min="60" max="200" step="10" style="width:60px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Opacity</label><div class="pks-row-right"><input type="number" id="cfg-watermarkOpacity" min="10" max="100" step="5" style="width:60px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Show session time</label><input type="checkbox" id="cfg-watermarkShowTime"></div>
                    <div class="pks-row"><label>Show ping</label><input type="checkbox" id="cfg-watermarkShowPing"></div>
                    <div class="pks-row"><label>Show username</label><input type="checkbox" id="cfg-watermarkShowUser"></div>
                    <div style="margin-top:4px;"><button id="pks-wm-reset-pos" class="pks-action-btn" style="width:100%;background:#16161f;color:#666;border-color:#252535;padding:7px;font-size:10px;">\u21ba Reset watermark position</button></div>
                    <div style="margin-top:8px;"><button id="pks-misc-apply" class="pks-action-btn" style="width:100%;background:#16161f;color:#888;border-color:#2a2a35;padding:8px;">\u21ba Re-apply All Misc Settings</button></div>
                </div>
                <div id="pks-tab-trade" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;"></div>
                <div id="pks-tab-hex" style="padding:12px 13px;display:block;max-height:460px;overflow-y:auto;">
                    <div style="margin-bottom:6px;"><span class="pks-page-badge">Profile Banner</span></div>
                    <div class="pks-row"><label>Enable banner</label><input type="checkbox" id="cfg-profileBannerEnabled"></div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-profileBannerImage" placeholder="Direct image / GIF / MP4 URL - any host (press Enter)" style="width:100%;font-size:10px;"></div>
                    <div class="pks-row"><label>Blur</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Brightness</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerBrightness" min="30" max="150" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Tint colour</label><input type="color" id="cfg-profileBannerTint"></div>
                    <div class="pks-row"><label>Tint opacity</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerTintOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Gradient tint</label><input type="checkbox" id="cfg-profileBannerTintGradient"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 2</label><input type="color" id="cfg-profileBannerTint2"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Angle</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerTintAngle" min="0" max="360" step="15" style="width:55px;"><span class="pks-unit-label">°</span></div></div>
                    <div style="padding:8px 10px;background:#13131c;border:1px solid #1e1e2a;border-radius:6px;margin-top:8px;">
                        <div style="color:#444;font-size:9px;line-height:1.85;letter-spacing:0.06em;">Banner settings are saved locally in your browser and shown on <span style="color:#00e87a;">your own</span> profile only.</div>
                    </div>
                </div>
                <div id="pks-tab-settings" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div class="pks-section-title">Theme</div>
                    <div id="pks-theme-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:6px;"></div>
                    <div class="pks-section-title">GUI Scale</div>
                    <div class="pks-row"><label>Panel scale</label><div class="pks-row-right"><input type="number" id="cfg-guiScale" min="70" max="150" step="5" style="width:64px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Keybinds</div>
                    <div class="pks-row"><label>Toggle GUI</label><button class="pks-hk-record" id="pks-hk-record-toggle-gui" data-cfg="hotkeyToggleGui">Insert</button></div>
                    <div class="pks-section-title">Panel Appearance</div>
                    <div class="pks-row"><label>Custom accent colour</label><div class="pks-row-right"><input type="checkbox" id="cfg-customAccentEnabled"><input type="color" id="cfg-customAccentColor"></div></div>
                    <div class="pks-row"><label>Glass / blur panel</label><input type="checkbox" id="cfg-panelGlass"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Opacity</label><div class="pks-row-right"><input type="number" id="cfg-panelOpacity" min="20" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Blur</label><div class="pks-row-right"><input type="number" id="cfg-panelBlur" min="0" max="60" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Corner radius</label><div class="pks-row-right"><input type="number" id="cfg-panelRadius" min="0" max="28" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Gradient background</label><input type="checkbox" id="cfg-panelGradientEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 1</label><input type="color" id="cfg-panelGradientColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 2</label><input type="color" id="cfg-panelGradientColor2"></div>
                    <div class="pks-section-title">Notifications</div>
                    <div class="pks-row"><label>Show notifications</label><input type="checkbox" id="cfg-showNotifications"></div>
                    <div class="pks-row"><label>Duration</label><div class="pks-row-right"><input type="number" id="cfg-notificationDuration" min="1000" max="30000" step="500" style="width:75px;"><span class="pks-unit-label">ms</span></div></div>
                    <div class="pks-row"><label>Position</label><select id="cfg-notificationPosition" style="width:120px;"><option value="top-center">Top Center</option><option value="bottom-center">Bottom Center</option><option value="top-right">Top Right</option><option value="bottom-right">Bottom Right</option></select></div>
                    <div class="pks-section-title">Privacy</div>
                    <div class="pks-row"><label>Anonymous mode</label><input type="checkbox" id="cfg-anonymous"></div>
                    <div class="pks-section-title">Config (JSON)</div>
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <button id="pks-cfg-export" class="pks-action-btn" style="background:#16161f;color:#8a8aff;border-color:#252540;padding:8px;">\u2913 Export</button>
                        <button id="pks-cfg-import" class="pks-action-btn" style="background:#16161f;color:#00e87a;border-color:#1e3a2a;padding:8px;">\u2911 Import</button>
                    </div>
                    <textarea id="pks-cfg-json" spellcheck="false" placeholder="Paste config JSON here, then press Import\u2026" style="width:100%;height:84px;resize:vertical;background:#0c0c12;border:1px solid #232330;border-radius:7px;color:#cfd3e6;font-family:var(--pks-font),monospace;font-size:9.5px;line-height:1.5;padding:8px;outline:none;"></textarea>
                    <div style="color:#444;font-size:9px;line-height:1.8;letter-spacing:0.04em;margin-top:5px;">Export copies your settings to the box (and clipboard). Paste a config and Import to load it.</div>
                    <div style="margin-top:10px;border-top:1px solid #1a1a24;padding-top:12px;">
                        <button id="pks-reset-btn" class="pks-action-btn" style="width:100%;background:#1e1414;color:#ff4466;border-color:#ff446633;padding:8px;">\u21ba Reset all settings</button>
                    </div>
                    <div style="margin-top:8px;text-align:center;color:#1e1e2e;font-size:9px;letter-spacing:0.1em;">Interium \u00b7 GUI adapted from Hexium by @CardCounting</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        const applyGuiScale = () => {
            const s = (cfg.guiScale ?? 100) / 100;
            panel.style.transform = `scale(${s})`;
            panel.style.transformOrigin = 'top right';
            panel.style.width = '374px';
        };
        applyGuiScale();
        updatePanelGlow();

        const updateLarpPreview = () => {
            const prev = document.getElementById('pks-larp-preview');
            const t = getTheme(), on = !!cfg.larpEnabled;
            if (prev) prev.style.opacity = on ? '1' : '0.45';
            const rob = document.getElementById('pks-larp-prev-robux');
            const tix = document.getElementById('pks-larp-prev-tix');
            if (rob) rob.textContent = formatLarp(cfg.larpRobux);
            if (tix) { tix.textContent = formatLarp(cfg.larpTix); tix.style.setProperty('color', '#f0a500', 'important'); }
            const st = document.getElementById('pks-larp-status');
            if (st) st.innerHTML = `Status: <span style="color:#ccc">${on ? 'Faking balance' : 'Off'}</span>`;
            const dot = document.getElementById('pks-larp-dot');
            if (dot) { dot.style.background = on ? t.accent : '#2e2e3a'; dot.style.boxShadow = on ? `0 0 8px ${t.accent}` : 'none'; }
        };

        const initModePill = (pillId, cfgKey, onChange) => {
            const pill = document.getElementById(pillId);
            if (!pill) return;
            pill.querySelectorAll('button').forEach(b => { b.classList.toggle('active', b.dataset.mode === cfg[cfgKey]); });
            pill.addEventListener('click', (e) => {
                const btn = e.target.closest('button'); if (!btn) return;
                pill.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                cfg[cfgKey] = btn.dataset.mode; saveCfg(cfg); onChange?.(); applySidebarNavStyle(); applySidebarDirect(); updateModeVisibility();
            });
        };

        const updateModeVisibility = () => {
            const sbBlurRow  = document.getElementById('pks-sidebar-blur-row');
            const sbColorRow = document.getElementById('pks-sidebar-colour-row');
            if (sbBlurRow)  sbBlurRow.style.display  = (cfg.sidebarMode === 'blur' || cfg.navbarMode === 'blur') ? '' : 'none';
            if (sbColorRow) sbColorRow.style.display = cfg.sidebarMode === 'colour' ? '' : 'none';
            const nbColorRow = document.getElementById('pks-navbar-colour-row');
            if (nbColorRow) nbColorRow.style.display = cfg.navbarMode === 'colour' ? '' : 'none';
        };

        initModePill('pks-sidebar-mode-pill', 'sidebarMode', null);
        initModePill('pks-navbar-mode-pill', 'navbarMode', null);
        updateModeVisibility();

        const themeGrid = document.getElementById('pks-theme-grid');
        Object.entries(THEMES).forEach(([key, t]) => {
            const btn = document.createElement('button');
            btn.className = 'pks-theme-swatch' + (cfg.theme === key ? ' active' : '');
            btn.style.color = t.accent; btn.style.borderColor = cfg.theme === key ? t.accent : '#1e1e2a';
            btn.innerHTML = `<span class="pks-dot" style="background:${t.accent};box-shadow:0 0 6px ${t.accent}88;"></span>${t.name}`;
            btn.addEventListener('click', () => {
                cfg.theme = key; saveCfg(cfg);
                themeGrid.querySelectorAll('.pks-theme-swatch').forEach((b, i) => { const tk = Object.keys(THEMES)[i]; b.classList.toggle('active', tk === key); b.style.borderColor = tk === key ? THEMES[tk].accent : '#1e1e2a'; });
                applyThemeToDom();
            });
            themeGrid.appendChild(btn);
        });

        const fieldMap = {
            'cfg-showNotifications':'showNotifications','cfg-notificationDuration':'notificationDuration','cfg-notificationPosition':'notificationPosition',
            'cfg-anonymous':'anonymous','cfg-guiScale':'guiScale',
            'cfg-customAccentEnabled':'customAccentEnabled','cfg-customAccentColor':'customAccentColor',
            'cfg-panelGlass':'panelGlass','cfg-panelOpacity':'panelOpacity','cfg-panelBlur':'panelBlur','cfg-panelRadius':'panelRadius',
            'cfg-panelGradientEnabled':'panelGradientEnabled','cfg-panelGradientColor1':'panelGradientColor1','cfg-panelGradientColor2':'panelGradientColor2',
            'cfg-effectType':'effectType','cfg-effectIntensity':'effectIntensity','cfg-effectSpeed':'effectSpeed','cfg-effectColor':'effectColor',
            'cfg-sidebarEnabled':'sidebarEnabled','cfg-sidebarBlurAmount':'sidebarBlurAmount','cfg-sidebarColour':'sidebarColour','cfg-sidebarOpacity':'sidebarOpacity',
            'cfg-navbarEnabled':'navbarEnabled','cfg-navbarColour':'navbarColour','cfg-navbarOpacity':'navbarOpacity',
            'cfg-miscBgUrl':'miscBgUrl','cfg-miscBgBlur':'miscBgBlur','cfg-miscBgBlurAmount':'miscBgBlurAmount',
            'cfg-miscBgDarkOverlay':'miscBgDarkOverlay','cfg-miscBgDarkOpacity':'miscBgDarkOpacity',
            'cfg-miscHideAds':'miscHideAds','cfg-miscHideAlert':'miscHideAlert','cfg-miscHideNavbar':'miscHideNavbar',
            'cfg-miscFooterTransparent':'miscFooterTransparent',
            'cfg-miscPageFont':'miscPageFont','cfg-miscGuiFont':'miscGuiFont',
            'cfg-miscHomeFramesTransparent':'miscHomeFramesTransparent',
            'cfg-miscHideMyFeed':'miscHideMyFeed','cfg-miscHideBlogNews':'miscHideBlogNews',
            'cfg-miscModernGameCards':'miscModernGameCards',
            'cfg-miscGamesGlassify':'miscGamesGlassify','cfg-miscGamesHeroBackdrop':'miscGamesHeroBackdrop',
            'cfg-miscGamesHideComments':'miscGamesHideComments','cfg-miscGamesHideRecommended':'miscGamesHideRecommended',
            'cfg-miscCatalogFrameTransparent':'miscCatalogFrameTransparent',
            'cfg-miscCatalogHideSidebar':'miscCatalogHideSidebar','cfg-miscCatalogItemCards':'miscCatalogItemCards','cfg-miscCatalogDropdownGlass':'miscCatalogDropdownGlass','cfg-miscItemPageGlass':'miscItemPageGlass','cfg-miscGroupsGlassify':'miscGroupsGlassify',
            'cfg-miscProfileFrameTransparent':'miscProfileFrameTransparent',
            'cfg-miscProfileNameAnimate':'miscProfileNameAnimate',
            'cfg-miscProfileNameColor1':'miscProfileNameColor1','cfg-miscProfileNameColor2':'miscProfileNameColor2',
            'cfg-miscFriendsFrameTransparent':'miscFriendsFrameTransparent','cfg-miscFriendRequestMerge':'miscFriendRequestMerge','cfg-miscMessagesGlassify':'miscMessagesGlassify','cfg-miscInventoryGlassify':'miscInventoryGlassify','cfg-miscDevelopGlassify':'miscDevelopGlassify','cfg-miscProfileTabsGlassify':'miscProfileTabsGlassify','cfg-miscFriendsTabsGlassify':'miscFriendsTabsGlassify','cfg-navbarDropdownGlass':'navbarDropdownGlass',
            'cfg-miscAvatarFrameTransparent':'miscAvatarFrameTransparent','cfg-avatarGlassify':'avatarGlassify','cfg-avatarEditorGlass':'avatarEditorGlass',
            'cfg-miscAvatarBlurDropdown':'miscAvatarBlurDropdown',
            'cfg-avatarBgEnabled':'avatarBgEnabled','cfg-avatarBgBlur':'avatarBgBlur',
            'cfg-tradesBgColor':'tradesBgColor','cfg-tradesOpacity':'tradesOpacity','cfg-tradesBlur':'tradesBlur','cfg-tradesAccent':'tradesAccent',
            'cfg-profileBannerEnabled':'profileBannerEnabled','cfg-profileBannerImage':'profileBannerImage','cfg-profileBannerBlur':'profileBannerBlur','cfg-profileBannerTint':'profileBannerTint','cfg-profileBannerTintOpacity':'profileBannerTintOpacity','cfg-profileBannerBrightness':'profileBannerBrightness','cfg-hideHexBadge':'hideHexBadge','cfg-profileBannerTintGradient':'profileBannerTintGradient','cfg-profileBannerTint2':'profileBannerTint2','cfg-profileBannerTintAngle':'profileBannerTintAngle','cfg-tradesGlassCards':'tradesGlassCards','cfg-tradesMetric':'tradesMetric','cfg-tradesPillOpacity':'tradesPillOpacity','cfg-robuxIcon':'robuxIcon','cfg-tradesGlassify':'tradesGlassify','cfg-sendTradeGlassify':'sendTradeGlassify','cfg-tradesDropdownGlass':'tradesDropdownGlass',
            'cfg-watermarkEnabled':'watermarkEnabled','cfg-watermarkPosition':'watermarkPosition',
            'cfg-watermarkAccentColor':'watermarkAccentColor','cfg-watermarkScale':'watermarkScale','cfg-watermarkOpacity':'watermarkOpacity',
            'cfg-watermarkShowTime':'watermarkShowTime','cfg-watermarkShowPing':'watermarkShowPing','cfg-watermarkShowUser':'watermarkShowUser',
        };

        const OPTIONAL_COLOR_FIELDS = new Set(['cfg-watermarkAccentColor','cfg-sidebarColour','cfg-navbarColour','cfg-effectColor']);

        const syncFieldsFromCfg = () => {
            for (const [id, key] of Object.entries(fieldMap)) {
                const el = document.getElementById(id); if (!el) continue;
                if (el.type === 'checkbox') el.checked = !!cfg[key];
                else if (el.type === 'color') { if (cfg[key]?.trim()) el.value = cfg[key]; }
                else el.value = cfg[key] ?? '';
            }
            const clickEl  = document.getElementById('pks-r-click-ms');
            const reloadEl = document.getElementById('pks-r-reload-ms');
            if (clickEl) clickEl.value = cfg.clickInterval; if (reloadEl) reloadEl.value = cfg.hardRefreshInterval;
            [['pks-hk-record-toggle-gui','hotkeyToggleGui'],['pks-hk-record-refresher','hotkeyRefresher'],['pks-hk-record-hardrefresh','hotkeyHardRefresh']].forEach(([elId, cfgKey]) => {
                const el = document.getElementById(elId); if (el) el.textContent = cfg[cfgKey] || 'none';
            });
            ['pks-sidebar-mode-pill','pks-navbar-mode-pill'].forEach(pillId => {
                const pill = document.getElementById(pillId);
                const cfgKey = pillId === 'pks-sidebar-mode-pill' ? 'sidebarMode' : 'navbarMode';
                pill?.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === cfg[cfgKey]));
            });
            const larpR = document.getElementById('cfg-larpRobux'); if (larpR) larpR.value = cfg.larpRobux ? String(cfg.larpRobux) : '';
            const larpT = document.getElementById('cfg-larpTix');   if (larpT) larpT.value = cfg.larpTix   ? String(cfg.larpTix)   : '';
            const larpE = document.getElementById('cfg-larpEnabled'); if (larpE) larpE.checked = !!cfg.larpEnabled;
            const larpV = document.getElementById('cfg-larpVerify'); if (larpV) larpV.checked = !!cfg.larpVerify;
            updateLarpPreview();
            updateModeVisibility();
        };
        syncFieldsFromCfg();

        const reapplyAll = () => {
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); updateModeVisibility();
            applyEffects(); applyAvatarGlass(); applyAvatarEditorGlass(); applyAvatarBg();
            if (isTradePage()) applyTradeStyle();
            applyTradesCustom();
            applyProfileBannerForPage();
        };

        panel.addEventListener('change', (e) => {
            const el = e.target; const id = el.id; if (!id) return;
            if (id === 'pks-r-click-ms')      { cfg.clickInterval       = Math.max(100,  parseInt(el.value) || 1500); saveCfg(cfg); return; }
            if (id === 'pks-r-reload-ms')     { cfg.hardRefreshInterval = Math.max(5000, parseInt(el.value) || 60000); saveCfg(cfg); return; }
            if (id === 'cfg-miscBgUrl') return;
            const key = fieldMap[id]; if (!key) return;
            if (el.type === 'checkbox')     cfg[key] = el.checked;
            else if (el.type === 'number')  cfg[key] = parseFloat(el.value) || DEFAULTS[key];
            else if (el.type === 'color')   cfg[key] = el.value;
            else                            cfg[key] = el.value || (OPTIONAL_COLOR_FIELDS.has(id) ? '' : DEFAULTS[key]);
            saveCfg(cfg);
            reapplyAll();
            if (id === 'cfg-tradesMetric' && _tradesRepaint) _tradesRepaint();
            if (id === 'cfg-tradesPillOpacity') applyTradesCustom();
            if (id === 'cfg-anonymous') { updateProfileUI(); updateWatermark(); }
            if (id === 'cfg-guiScale') applyGuiScale();
            if (id === 'cfg-miscPageFont') applyPageFont(el.value);
            if (id === 'cfg-miscGuiFont')  applyGuiFont(el.value);
        });

        // \u2500\u2500 Per-page "Glassify page" master switches \u2500\u2500
        // One switch per page badge that flips EVERY glassify / glass-surface
        // key of that page at once. Masters are not cfg keys themselves:
        // their state is derived from the group (checked = all on,
        // indeterminate = mixed), and the granular checkboxes stay in sync
        // in both directions.
        const GLASSIFY_PAGE_GROUPS = {
            home:      { label: '/home',      keys: ['miscHomeFramesTransparent', 'miscModernGameCards', 'miscFriendsFrameTransparent'] },
            friends:   { label: '/friends',   keys: ['miscFriendsTabsGlassify'] },
            games:     { label: '/games',     keys: ['miscGamesGlassify', 'miscGamesHeroBackdrop', 'miscModernGameCards'] },
            trades:    { label: '/trades',    keys: ['tradesGlassify', 'sendTradeGlassify', 'tradesDropdownGlass', 'tradesGlassCards'] },
            catalog:   { label: '/catalog',   keys: ['miscCatalogFrameTransparent', 'miscCatalogItemCards', 'miscCatalogDropdownGlass', 'miscItemPageGlass'] },
            groups:    { label: '/groups',    keys: ['miscGroupsGlassify'] },
            develop:   { label: '/develop',   keys: ['miscDevelopGlassify'] },
            messages:  { label: '/messages',  keys: ['miscMessagesGlassify'] },
            inventory: { label: '/inventory', keys: ['miscInventoryGlassify'] },
            profile:   { label: '/profile',   keys: ['miscProfileFrameTransparent', 'miscProfileTabsGlassify'] },
            avatar:    { label: '/my/avatar', keys: ['miscAvatarFrameTransparent', 'miscAvatarBlurDropdown', 'avatarGlassify', 'avatarEditorGlass'] },
        };
        const syncGlassMasters = () => {
            for (const [pid, group] of Object.entries(GLASSIFY_PAGE_GROUPS)) {
                const box = document.getElementById('pks-glassify-' + pid); if (!box) continue;
                const on = group.keys.filter(k => !!cfg[k]).length;
                box.checked = on === group.keys.length;
                box.indeterminate = on > 0 && on < group.keys.length;
            }
        };
        syncGlassMasters();
        for (const [pid, group] of Object.entries(GLASSIFY_PAGE_GROUPS)) {
            document.getElementById('pks-glassify-' + pid)?.addEventListener('change', (e) => {
                const on = e.target.checked;
                e.target.indeterminate = false;
                for (const k of group.keys) {
                    cfg[k] = on;
                    const box = document.getElementById('cfg-' + k);
                    if (box && box.type === 'checkbox') box.checked = on;
                }
                saveCfg(cfg); reapplyAll(); syncGlassMasters();
                notify((on ? 'Glassified ' : 'Un-glassified ') + group.label, 'info');
            });
        }
        // Keep master states honest when any granular toggle changes. This
        // listener is registered AFTER the generic fieldMap handler above,
        // so cfg is already updated when it runs.
        panel.addEventListener('change', (e) => {
            if (e.target?.id && fieldMap[e.target.id]) syncGlassMasters();
        });

        const bgUrlInput = document.getElementById('cfg-miscBgUrl');
        if (bgUrlInput) {
            bgUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { cfg.miscBgUrl = bgUrlInput.value; saveCfg(cfg); applyMisc(); notify('Background image applied', 'info'); }
            });
        }

        const avBgInput = document.getElementById('cfg-avatarBgImage');
        if (avBgInput) {
            avBgInput.value = cfg.avatarBgImage || '';
            avBgInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    cfg.avatarBgImage = avBgInput.value.trim();
                    cfg.avatarBgEnabled = !!cfg.avatarBgImage;
                    const cb = document.getElementById('cfg-avatarBgEnabled'); if (cb) cb.checked = cfg.avatarBgEnabled;
                    saveCfg(cfg); applyAvatarBg();
                    const avCard = document.getElementById('pks-avatar-tools'); if (avCard) { avCard.remove(); injectAvatarBgStrip(); }
                    notify(cfg.avatarBgEnabled ? 'Avatar background applied' : 'Avatar background cleared', 'info');
                }
            });
        }

        document.getElementById('cfg-watermarkAccentColorClear')?.addEventListener('click', () => {
            cfg.watermarkAccentColor = ''; saveCfg(cfg); applyMisc(); applyCardStyle(); updateWatermark();
            notify('Colour cleared \u2014 using theme default', 'info');
        });

        document.getElementById('cfg-effectColorClear')?.addEventListener('click', () => {
            cfg.effectColor = ''; saveCfg(cfg); applyEffects();
            notify('Effect colour cleared \u2014 using auto', 'info');
        });

        const larpRobuxEl = document.getElementById('cfg-larpRobux');
        const larpTixEl   = document.getElementById('cfg-larpTix');
        const larpToggle  = document.getElementById('cfg-larpEnabled');
        const commitLarp = () => {
            cfg.larpRobux = parseInt((larpRobuxEl?.value || '').replace(/[^\d]/g, '')) || 0;
            cfg.larpTix   = parseInt((larpTixEl?.value   || '').replace(/[^\d]/g, '')) || 0;
            saveCfg(cfg); applyLarp(); updateLarpPreview();
        };
        larpRobuxEl?.addEventListener('input', commitLarp);
        larpTixEl?.addEventListener('input', commitLarp);
        larpToggle?.addEventListener('change', () => {
            cfg.larpEnabled = larpToggle.checked; saveCfg(cfg); applyLarp(); updateLarpPreview();
        });
        const verifyToggle = document.getElementById('cfg-larpVerify');
        verifyToggle?.addEventListener('change', () => {
            cfg.larpVerify = verifyToggle.checked; saveCfg(cfg); applyFakeVerify();
            notify(cfg.larpVerify ? 'Fake verify on' : 'Fake verify off', 'info');
        });

        const _larpCardCache = {};
        const renderLarpFakeList = () => {
            const list = document.getElementById('pks-larp-fakelist');
            if (!list) return;
            list.innerHTML = '';
            const ids = cfg.avatarFakeItems || [];
            if (!ids.length) {
                list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:18px;color:#3a3a48;font-size:10px;">No fake items yet</div>`;
                return;
            }
            ids.forEach(id => {
                const card = document.createElement('div');
                card.style.cssText = `position:relative;background:#16161f;border:1px solid #252535;border-radius:8px;overflow:hidden;cursor:pointer;transition:border-color 0.15s,transform 0.12s;`;
                const qty = Math.max(1, parseInt((cfg.avatarFakeQty || {})[id]) || 1);
                card.innerHTML = `
                    <div style="width:100%;aspect-ratio:1;background:#0a0b0e;overflow:hidden;">
                        <img src="https://www.pekora.zip/thumbs/asset.ashx?assetId=${id}&width=110&height=110&format=png" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.opacity=0;">
                    </div>
                    ${qty > 1 ? `<div style="position:absolute;top:4px;right:4px;background:#00e87a;color:#050508;font-size:9px;font-weight:800;padding:1px 5px;border-radius:9px;">×${qty}</div>` : ''}
                    <div style="padding:3px 4px;font-size:9px;color:#9a9ab0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;" title="Asset ${id}">${escHtml(_larpCardCache[id] || ('#' + id))}</div>
                    <div class="pks-larp-rm" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(120,10,30,0.78);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.06em;opacity:0;transition:opacity 0.15s;">REMOVE</div>
                `;
                const overlay = card.querySelector('.pks-larp-rm');
                card.addEventListener('mouseenter', () => { card.style.borderColor = '#ff4466'; card.style.transform = 'translateY(-2px)'; overlay.style.opacity = '1'; });
                card.addEventListener('mouseleave', () => { card.style.borderColor = '#252535'; card.style.transform = 'none'; overlay.style.opacity = '0'; });
                card.addEventListener('click', () => { removeFakeAvatarItem(id); renderLarpFakeList(); notify('Removed fake item', 'info'); });
                list.appendChild(card);
                if (_larpCardCache[id] === undefined) {
                    _larpCardCache[id] = null;
                    fetchFakeItemData(id).then(d => {
                        if (d?.name) { _larpCardCache[id] = d.name; const lbl = card.querySelector('div[title]'); if (lbl) lbl.textContent = d.name; }
                    });
                }
            });
        };
        document.getElementById('pks-larp-add-item')?.addEventListener('click', async () => {
            const inp = document.getElementById('pks-larp-assetid');
            const qtyInp = document.getElementById('pks-larp-qty');
            const id = (inp?.value || '').replace(/[^\d]/g, '');
            if (!id) { notify('Enter a valid asset ID', 'error'); return; }
            const qty = Math.max(1, parseInt(qtyInp?.value) || 1);
            cfg.avatarFakeQty = Object.assign({}, cfg.avatarFakeQty, { [id]: qty }); saveCfg(cfg);
            const btn = document.getElementById('pks-larp-add-item');
            if (btn) { btn.disabled = true; btn.textContent = '…'; }
            await addFakeAvatarItem(id, true);
            applyCatalogOwned();
            if (btn) { btn.disabled = false; btn.textContent = 'Add'; }
            if (inp) inp.value = '';
            if (qtyInp) qtyInp.value = '1';
            renderLarpFakeList();
            notify('Fake item saved — faked as owned + worn', 'success');
        });
        renderLarpFakeList();

        const TABS = ['hex','trade','misc','settings'];
        try { buildMassTradeUI(); } catch (e) { console.warn('[Interium] Mass Trader UI failed to build', e); }
        panel.querySelectorAll('.pks-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pks-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                TABS.forEach(t => { const el = document.getElementById(`pks-tab-${t}`); if (el) el.style.display = btn.dataset.tab === t ? 'block' : 'none'; });
                applyThemeToDom();
            });
        });

        document.getElementById('pks-r-start')?.addEventListener('click', startRefresher);
        document.getElementById('pks-r-stop')?.addEventListener('click', stopRefresher);
        document.getElementById('pks-misc-apply')?.addEventListener('click', () => {
            applyMisc(); applyCardStyle(); applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency();
            if (isTradePage()) applyTradeStyle();
            notify('Misc settings applied', 'info');
        });
        document.getElementById('pks-hex-save')?.addEventListener('click', (e) => saveProfileBanner(e.currentTarget));
        document.getElementById('cfg-profileBannerImage')?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            cfg.profileBannerImage = e.target.value.trim();
            if (cfg.profileBannerImage) cfg.profileBannerEnabled = true;
            const en = document.getElementById('cfg-profileBannerEnabled'); if (en) en.checked = cfg.profileBannerEnabled;
            saveCfg(cfg); applyProfileBannerForPage();
            notify('Banner preview updated — press Save to share it', 'info');
        });
        document.getElementById('pks-wm-reset-pos')?.addEventListener('click', () => {
            state.watermark.dragX = null; state.watermark.dragY = null;
            const wm = document.getElementById('pks-watermark');
            if (wm) { wm.style.left = ''; wm.style.top = ''; wm.style.bottom = ''; wm.style.right = ''; wm.style.transform = ''; }
            updateWatermark(); notify('Watermark position reset', 'info');
        });

        panel.querySelectorAll('.pks-hk-record').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pks-hk-record.recording').forEach(b => {
                    if (b !== btn) { b.classList.remove('recording'); b.textContent = cfg[b.dataset.cfg] || 'none'; }
                });
                if (btn.classList.contains('recording')) { btn.classList.remove('recording'); btn.textContent = cfg[btn.dataset.cfg] || 'none'; return; }
                btn.classList.add('recording'); btn.textContent = '\u2026';
                const onKey = (e) => {
                    e.preventDefault(); e.stopPropagation(); document.removeEventListener('keydown', onKey, true);
                    btn.classList.remove('recording');
                    if (e.key === 'Escape') { btn.textContent = cfg[btn.dataset.cfg] || 'none'; return; }
                    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                    cfg[btn.dataset.cfg] = key; saveCfg(cfg); btn.textContent = key;
                };
                document.addEventListener('keydown', onKey, true);
            });
        });

        document.getElementById('pks-reset-btn')?.addEventListener('click', () => {
            cfg = Object.assign({}, DEFAULTS); saveCfg(cfg); syncFieldsFromCfg();
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark(); applyGuiScale();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); applyEffects(); applyLarp();
            notify('Settings reset to defaults', 'info');
        });

        const reapplyEverything = () => {
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark(); applyGuiScale();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); applyEffects();
            applyLarp(); applyFakeVerify(); applyTradesCustom(); applyProfileBannerForPage();
        };
        document.getElementById('pks-cfg-export')?.addEventListener('click', () => {
            const json = JSON.stringify(cfg, null, 2);
            const box = document.getElementById('pks-cfg-json'); if (box) box.value = json;
            try { navigator.clipboard?.writeText(json); } catch {}
            notify('Config exported (copied to clipboard)', 'success');
        });
        document.getElementById('pks-cfg-import')?.addEventListener('click', () => {
            const box = document.getElementById('pks-cfg-json');
            const raw = (box?.value || '').trim();
            if (!raw) { notify('Paste config JSON first', 'error'); return; }
            let parsed;
            try { parsed = JSON.parse(raw); } catch { notify('Invalid JSON', 'error'); return; }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { notify('Invalid config', 'error'); return; }
            const next = Object.assign({}, DEFAULTS);
            for (const k of Object.keys(DEFAULTS)) if (k in parsed) next[k] = parsed[k];
            cfg = next; saveCfg(cfg); syncFieldsFromCfg(); reapplyEverything();
            document.getElementById('pks-theme-grid')?.querySelectorAll('.pks-theme-swatch').forEach((b, i) => {
                const tk = Object.keys(THEMES)[i];
                b.classList.toggle('active', tk === cfg.theme);
                b.style.borderColor = tk === cfg.theme ? THEMES[tk].accent : '#1e1e2a';
            });
            notify('Config imported', 'success');
        });

        const body   = document.getElementById('pks-body');
        const minBtn = document.getElementById('pks-min-btn');
        const closeB = document.getElementById('pks-close-btn');
        let minimised = false;
        minBtn?.addEventListener('click', () => {
            minimised = !minimised; body.style.display = minimised ? 'none' : '';
            minBtn.title = minimised ? 'Restore' : 'Minimise';
        });
        closeB?.addEventListener('click', () => {
            panel.style.transition = 'opacity 0.18s,transform 0.18s';
            panel.style.opacity = '0'; panel.style.transform = 'scale(0.94)';
            stopRefresher();
            setTimeout(() => panel.remove(), 200);
        });

        (() => {
            const header = document.getElementById('pks-header');
            let ox = 0, oy = 0, sx = 0, sy = 0;
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                sx = e.clientX; sy = e.clientY; const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
                const onMove = (e2) => { panel.style.right = 'auto'; panel.style.left = `${ox + e2.clientX - sx}px`; panel.style.top = `${oy + e2.clientY - sy}px`; };
                const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            });
        })();

        const trySetAvatar = () => {
            if (!state.profile.id) return;
            const img = document.getElementById('pks-avatar-img');
            const anonEl = document.getElementById('pks-avatar-anon');
            if (!img) return;
            fetch(`https://www.pekora.zip/apisite/thumbnails/v1/users/avatar-headshot?userIds=${state.profile.id}&size=60x60&format=Png`, { credentials:'include' })
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    const url = d?.data?.[0]?.imageUrl;
                    if (url) img.src = url;
                    if (!cfg.anonymous) { img.style.display = 'block'; if (anonEl) anonEl.style.display = 'none'; }
                    else { img.style.display = 'none'; if (anonEl) anonEl.style.display = 'flex'; }
                }).catch(() => { if (!cfg.anonymous) img.style.display = 'block'; });
        };

        applyThemeToDom(); applyMisc(); applyCardStyle(); applyEffects(); applyLarp();
        applySidebarNavStyle(); applySidebarDirect(); injectSidebarLinks(); applyPageFrameTransparency();
        applyPageFont(cfg.miscPageFont || 'Default (Site Font)');
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
        if (isTradePage()) applyTradeStyle();
        fetchProfile().then(trySetAvatar);
        setInterval(() => { if (!document.hidden) fetchProfile().then(trySetAvatar); }, 30000); /* PERF: no profile polling from background tabs */
        panelLog('Panel ready. Configure intervals and press START.', 'info');
    };

    const isAvatarPage = () => /\/My\/Avatar/i.test(location.pathname) || /(^|\/)avatar(\/|$)/i.test(location.pathname);
    const AV_WRAP_SEL = '[class*="avatarCardWrapper"]';

    const isCatalogItemPage = () => /\/catalog\/\d+/i.test(location.pathname);
    const currentCatalogAssetId = () => { const m = location.pathname.match(/\/catalog\/(\d+)/i); return m ? m[1] : null; };

    const AVATAR_BG_BASE = 'https://cdn.jsdelivr.net/gh/warmpain9/Interium@main/assets/avatar-bgs/';
    const AVATAR_BG_PRESET_CANDIDATES = (() => {
        const exts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const out = [];
        for (let i = 1; i <= 32; i++) for (const e of exts) out.push(`${AVATAR_BG_BASE}${i}.${e}`);
        return out;
    })();

    const applyAvatarBg = () => {
        let el = document.getElementById('pks-avatar-bg-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-bg-style'; document.head.appendChild(el); }
        const vid = document.getElementById('pks-avatar-bg-video');
        const raw = (cfg.avatarBgImage || '').trim().replace(/\.gifv(\?.*)?$/i, '.mp4'); // imgur .gifv -> direct .mp4
        if (!cfg.avatarBgEnabled || !raw) { el.textContent = ''; vid?.remove(); applyAvatarControls(); return; }
        const url  = raw.replace(/'/g, "\\'");
        const blur = Math.max(0, cfg.avatarBgBlur ?? 0);
        const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(raw);
        if (isVideo) {
            /* Do NOT touch the frame's children: forcing position:relative on
               them yanked the site's absolutely-positioned 3D button into the
               flow (it drifted to the top-left). Instead the bg sits on a
               NEGATIVE z-index layer; isolation:isolate makes the frame a
               stacking context so z-index:-1 stays above the frame's own
               background but below ALL of its content. */
            el.textContent = `
            [class*="avatarThumbContainer"]{position:relative!important;overflow:hidden!important;isolation:isolate!important;}
            #pks-avatar-bg-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;${blur ? `filter:blur(${blur}px);transform:scale(1.12);` : ''}}
        `;
            const frame = document.querySelector('[class*="avatarThumbContainer"]');
            if (frame) {
                let v = vid;
                if (!v) {
                    v = document.createElement('video');
                    v.id = 'pks-avatar-bg-video';
                    v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true;
                }
                // Inline styles: the video must never participate in layout,
                // even if the injected stylesheet loses a specificity fight.
                v.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:-1;pointer-events:none;${blur ? `filter:blur(${blur}px);transform:scale(1.12);` : ''}`;
                if (v.getAttribute('src') !== raw) v.setAttribute('src', raw);
                // append as LAST child (not prepend): the site styles the avatar
                // renderer via structural selectors like :first-child, and a
                // prepended element broke the preview layout.
                if (v.parentElement !== frame) frame.appendChild(v);
                v.muted = true;
                v.play?.().catch(() => {});
            }
        } else {
            vid?.remove();
            /* Same as the video branch: children stay UNTOUCHED (the old
               "> *{position:relative;z-index:1}" lift hijacked the site's
               absolutely-positioned 3D button into the flow -> it drifted to
               the top-left whenever a bg was applied). The ::before bg lives
               on z-index:-1 under an isolated stacking context instead. */
            el.textContent = `
            [class*="avatarThumbContainer"]{position:relative!important;overflow:hidden!important;isolation:isolate!important;}
            [class*="avatarThumbContainer"]::before{content:'';position:absolute;inset:0;background-image:url('${url}');background-size:cover;background-position:center;background-repeat:no-repeat;${blur ? `filter:blur(${blur}px);transform:scale(1.12);` : ''}z-index:-1;pointer-events:none;}
        `;
        }
        // Keep the frame's position/isolation anchor fresh right after a
        // background is applied (no pill pinning happens anymore).
        applyAvatarControls();
    };

    const applyAvatarGlass = () => {
        let el = document.getElementById('pks-avatar-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-glass-style'; document.head.appendChild(el); }
        el.textContent = cfg.avatarGlassify
            ? `[class*="avatarCardContainer"]{${GLASS_CSS}border-radius:12px!important;overflow:hidden!important;}[class*="avatarCardImage"]{background:transparent!important;}`
            : '';
    };

    // Standalone "Glassify avatar editor" (Hexium game-page glass recipe,
    // applied ONLY to the avatar editor block on /My/Avatar).
    const applyAvatarEditorGlass = () => {
        let el = document.getElementById('pks-avatar-editor-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-editor-glass-style'; document.head.appendChild(el); }
        el.textContent = (cfg.avatarEditorGlass && isAvatarPage())
            ? `[class*="contentContainer"],[class*="subSectionContainer"]{${GLASS_CSS}border-radius:16px!important;padding:16px!important;}
[class*="buttonCol-"],[class*="submenuContainer-"][class~="section-content"]{${GLASS_CSS}}
[class*="buttonCol-"]{border-radius:12px 12px 0 0!important;border-bottom:0!important;}
[class*="submenuContainer-"][class~="section-content"]{border-radius:0 0 12px 12px!important;border-top:0!important;margin-top:0!important;}
[class*="buttonCol-"] [class*="vTab-"],[class*="buttonCol-"] [class*="vTabLabel-"],[class*="buttonCol-"] [class*="vTabUnselected-"]{background:transparent!important;background-color:transparent!important;}
p[class*="vTabUnselected-"]{box-shadow:none!important;}`
            : '';
    };

    const applyAvatarControls = () => {
        if (!isAvatarPage()) return;
        if (!document.getElementById('pks-avatar-controls-style')) {
            const st = document.createElement('style');
            st.id = 'pks-avatar-controls-style';
            // Hexium look: hide the site 3D toggle button; give the avatar
            // preview frame an always-on glass outline that survives re-renders.
            st.textContent = '';
            document.head.appendChild(st);
        }
        // Pinning the site's 2D/3D pill into the preview frame (Hexium look)
        // kept breaking on React re-renders when a custom image/gif was
        // applied (the pill drifted up-left). Per user request the pill now
        // stays exactly where the site renders it: no re-parenting and no
        // inline pinning at all. The frame only keeps position:relative as
        // the anchor for the background image/video overlay.
        const frames = [...document.querySelectorAll('[class*="avatarThumbContainer"]')];
        if (!frames.length) return;
        const frame = frames.find(f => f.getClientRects().length > 0 && f.offsetWidth > 80) || frames[0];
        frame.style.setProperty('position', 'relative', 'important');
    };

    // Hexium-style avatar Background card: glass panel under the preview
    // with a 5-column grid of preset tiles + custom URL input.
    const injectAvatarBgStrip = () => {
        if (!isAvatarPage()) return;
        if (document.getElementById('pks-avatar-tools')) return;
        const anchor = document.querySelector('[class*="avatarThumbContainer"]');
        if (!anchor || !anchor.parentElement) return;
        const card = document.createElement('div');
        card.id = 'pks-avatar-tools';
        card.style.cssText = `margin-top:14px;padding:14px;border-radius:14px;background:${GLASS_BG};backdrop-filter:${GLASS_FILTER};-webkit-backdrop-filter:${GLASS_FILTER};border:1px solid ${GLASS_BORDER_COLOR};box-shadow:${GLASS_SHADOW};font-family:var(--pks-font),'Share Tech Mono',monospace;color:#d0d0e0;position:relative;z-index:2;`;
        card.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:12px;font-weight:700;letter-spacing:0.12em;color:#fff;text-transform:uppercase;">Background</span>
            </div>
            <div id="pks-av-bg-hint" style="font-size:10px;color:#777;margin-bottom:10px;">Choose a background below.</div>
            <div id="pks-av-bg-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px;max-height:240px;overflow-y:auto;"></div>
            <input type="text" id="pks-av-bgimg" placeholder="Custom URL: image / gif / mp4 (press Enter)" style="width:100%;box-sizing:border-box;background:#16161f;border:1px solid #2a2a3a;border-radius:7px;color:#e6e6f2;font-size:12px;padding:7px 9px;outline:none;font-family:inherit;">
        `;
        anchor.parentElement.insertBefore(card, anchor.nextSibling);

        const grid = card.querySelector('#pks-av-bg-grid');
        const hint = card.querySelector('#pks-av-bg-hint');
        const loaded = [];
        const presetNum = (u) => parseInt((u.match(/(\d+)\.\w+$/) || [])[1]) || 0;
        const renderBgGrid = () => {
            grid.innerHTML = '';
            const off = !cfg.avatarBgEnabled || !cfg.avatarBgImage;
            const none = document.createElement('div');
            none.title = 'No background';
            none.textContent = 'OFF';
            none.style.cssText = `aspect-ratio:1;border-radius:8px;background:#16161f;border:2px solid ${off ? '#fff' : '#2a2a3a'};cursor:pointer;display:flex;align-items:center;justify-content:center;color:#777;font-size:9px;font-weight:700;`;
            none.addEventListener('click', () => {
                cfg.avatarBgEnabled = false; saveCfg(cfg); applyAvatarBg(); renderBgGrid();
                const cb = document.getElementById('cfg-avatarBgEnabled'); if (cb) cb.checked = false;
            });
            grid.appendChild(none);
            loaded.forEach(url => {
                const sel = cfg.avatarBgEnabled && cfg.avatarBgImage === url;
                const tile = document.createElement('div');
                tile.style.cssText = `aspect-ratio:1;border-radius:8px;background-image:url('${url}');background-size:cover;background-position:center;border:2px solid ${sel ? '#fff' : 'transparent'};cursor:pointer;box-shadow:${sel ? '0 0 0 1px #fff,0 0 10px #ffffff66' : '0 1px 4px rgba(0,0,0,0.4)'};transition:transform 0.12s;`;
                tile.addEventListener('mouseenter', () => { tile.style.transform = 'scale(1.07)'; });
                tile.addEventListener('mouseleave', () => { tile.style.transform = 'scale(1)'; });
                tile.addEventListener('click', () => {
                    cfg.avatarBgImage = url; cfg.avatarBgEnabled = true; saveCfg(cfg);
                    applyAvatarBg(); renderBgGrid();
                    const cb = document.getElementById('cfg-avatarBgEnabled'); if (cb) cb.checked = true;
                    const inp = document.getElementById('cfg-avatarBgImage'); if (inp) inp.value = url;
                });
                grid.appendChild(tile);
            });
        };
        renderBgGrid();

        // Probe the repo folder; only files that actually exist become tiles.
        let pending = AVATAR_BG_PRESET_CANDIDATES.length;
        const done = () => {
            console.info(`[Interium] avatar bg presets: ${loaded.length} found at ${AVATAR_BG_BASE}`);
            if (!loaded.length) { hint.textContent = 'No preset images found - is assets/avatar-bgs/ pushed to GitHub?'; hint.style.color = '#c96'; }
        };
        AVATAR_BG_PRESET_CANDIDATES.forEach(url => {
            const probe = new Image();
            probe.onload = () => { loaded.push(url); loaded.sort((a, b) => presetNum(a) - presetNum(b)); renderBgGrid(); if (--pending === 0) done(); };
            probe.onerror = () => { if (--pending === 0) done(); };
            probe.src = url;
        });

        const bgImg = card.querySelector('#pks-av-bgimg');
        if (cfg.avatarBgImage && !AVATAR_BG_PRESET_CANDIDATES.includes(cfg.avatarBgImage)) bgImg.value = cfg.avatarBgImage;
        bgImg.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            cfg.avatarBgImage = bgImg.value.trim();
            cfg.avatarBgEnabled = !!cfg.avatarBgImage;
            saveCfg(cfg); applyAvatarBg(); renderBgGrid();
            const cb = document.getElementById('cfg-avatarBgEnabled'); if (cb) cb.checked = cfg.avatarBgEnabled;
            notify(cfg.avatarBgEnabled ? 'Avatar background applied' : 'Avatar background cleared', 'info');
        });
    };

    const isFriendsPage = () => /\/friends/i.test(location.pathname);
    const declineFriend = (uid) => postApi(`https://www.pekora.zip/apisite/friends/v1/users/${uid}/decline-friend-request`, {});
    const unfriendUser  = (uid) => postApi(`https://www.pekora.zip/apisite/friends/v1/users/${uid}/unfriend`, {});

    const collectRequestIds = async () => {
        const ids = new Set();
        try {
            let cursor = '';
            for (let i = 0; i < 50; i++) {
                const url = `https://www.pekora.zip/apisite/friends/v1/my/friends/requests?limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
                const r = await apiGet(url);
                if (!r.ok) break;
                const d = await r.json();
                (d.data || []).forEach(u => { const id = u.id || u.userId; if (id) ids.add(String(id)); });
                cursor = d.nextPageCursor;
                if (!cursor) break;
            }
        } catch {}
        if (ids.size === 0) {
            document.querySelectorAll('[class*="manageRequestCard"]').forEach(card => {
                const wrap = card.closest('[class*="friendCardWrapper"]') || card.parentElement;
                const m = wrap?.querySelector('a[href*="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/);
                if (m) ids.add(m[1]);
            });
        }
        return [...ids];
    };

    const addFriendRemoveButtons = () => {
        document.querySelectorAll('[class*="friendCardWrapper"]').forEach(wrap => {
            if (wrap.querySelector('[class*="manageRequestCard"]')) return;
            if (wrap.querySelector('.pks-remove-friend')) return; 
            const uid = wrap.querySelector('a[href*="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/)?.[1];
            if (!uid) return;
            const host = wrap.querySelector('[class*="friendCard"]') || wrap;
            host.style.position = 'relative';
            const btn = document.createElement('button');
            btn.className = 'pks-remove-friend';
            btn.title = 'Remove friend';
            btn.innerHTML = '✕';
            btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:5;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,0.35);color:#fff;font-size:12px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s,transform 0.12s;';
            let armed = false, tmr = null;
            btn.addEventListener('mouseenter', () => { if (!armed) btn.style.background = 'rgba(216,40,60,0.9)'; });
            btn.addEventListener('mouseleave', () => { if (!armed) btn.style.background = 'rgba(0,0,0,0.35)'; });
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); e.stopPropagation();
                if (btn.disabled) return;
                if (!armed) { armed = true; btn.style.background = '#d8283c'; btn.style.transform = 'scale(1.15)'; btn.title = 'Click again to remove'; tmr = setTimeout(() => { armed = false; btn.style.transform = 'none'; btn.style.background = 'rgba(0,0,0,0.35)'; btn.title = 'Remove friend'; }, 2500); return; }
                clearTimeout(tmr); armed = false; btn.disabled = true; btn.innerHTML = '…';
                try {
                    const r = await unfriendUser(uid);
                    if (r.ok) { notify('Removed friend', 'success'); wrap.style.transition = 'opacity 0.25s'; wrap.style.opacity = '0'; setTimeout(() => wrap.remove(), 260); }
                    else { notify('Could not remove friend', 'error'); btn.disabled = false; btn.innerHTML = '✕'; }
                } catch { notify('Could not remove friend', 'error'); btn.disabled = false; btn.innerHTML = '✕'; }
            });
            host.appendChild(btn);
        });
    };

    const doBulk = async (btn, label, collectFn, actionFn, noun) => {
        btn.disabled = true; btn.textContent = 'Loading…';
        const ids = await collectFn();
        if (!ids.length) { notify(`No ${noun} found`, 'info'); btn.disabled = false; btn.textContent = label; return; }
        let done = 0, fail = 0;
        for (const id of ids) {
            btn.textContent = `${label} ${done + fail + 1}/${ids.length}…`;
            try { const r = await actionFn(id); r.ok ? done++ : fail++; } catch { fail++; }
            await new Promise(res => setTimeout(res, 120));
        }
        notify(`${label}: ${done} ${noun}${fail ? ` (${fail} failed)` : ''}`, fail ? 'info' : 'success');
        btn.disabled = false; btn.textContent = label;
        setTimeout(() => location.reload(), 700);
    };

    const mkBulkBtn = (id, label, t, runFn) => {
        const btn = document.createElement('button');
        btn.id = id; btn.textContent = label;
        btn.style.cssText = `margin-left:14px;vertical-align:middle;background:${t.accent};color:#050508;border:none;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--pks-font),'Exo 2',sans-serif;letter-spacing:0.04em;box-shadow:0 2px 10px ${t.accent}55;`;
        let armed = false, armTimer = null;
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            if (!armed) { armed = true; btn.textContent = 'Click again to confirm'; armTimer = setTimeout(() => { armed = false; btn.textContent = label; }, 3000); return; }
            clearTimeout(armTimer); armed = false;
            await runFn(btn);
        });
        return btn;
    };

    let _bulkObserver = null;
    const injectFriendsButtons = () => {
        if (!isFriendsPage()) { _bulkObserver?.disconnect(); _bulkObserver = null; return; }
        const tryInject = () => {
            const t = getTheme();
            const heads = [...document.querySelectorAll('h2')];
            const reqH2 = heads.find(h => /FRIEND REQUESTS/i.test(h.textContent || ''));
            const activeTabName = (document.querySelector('[class*="entryActive"]')?.textContent || '').trim().toLowerCase();
            const onRequestsTab = activeTabName ? activeTabName === 'friend requests' : !!reqH2;
            // The site reuses the same <h2> element across tab switches, so the
            // button used to survive into Friends / Followers / Followings.
            const oldBulk = document.getElementById('pks-bulk-ignore');
            if (oldBulk && (!onRequestsTab || !reqH2)) oldBulk.remove();
            if (onRequestsTab && reqH2 && !reqH2.querySelector('#pks-bulk-ignore'))
                reqH2.appendChild(mkBulkBtn('pks-bulk-ignore', 'Bulk Ignore', t, (b) => doBulk(b, 'Bulk Ignore', collectRequestIds, declineFriend, 'requests')));
            const activeTab = (document.querySelector('[class*="entryActive"]')?.textContent || '').trim().toLowerCase();
            if (activeTab === 'friends') addFriendRemoveButtons();
            return true;
        };
        tryInject();
        if (_bulkObserver) return;
        let scheduled = false;
        _bulkObserver = new MutationObserver(() => {
            if (scheduled) return; scheduled = true;
            requestAnimationFrame(() => { scheduled = false; tryInject(); });
        });
        _bulkObserver.observe(document.body, { childList: true, subtree: true });
    };

    const applyAgeOverride = () => {
        document.querySelectorAll('[class*="ageSpan-"]').forEach(el => {
            if (el.textContent !== '13+') el.textContent = '13+';
        });
    };

    const removeNagAlerts = () => {
        document.querySelectorAll('.alert-pjx.alert-warning').forEach(el => el.remove());
    };

    const monitorDOM = () => {
        if (state.dom.observer) state.dom.observer.disconnect();
        let debounce = null;
        const runDomPass = () => {
            if (cfg.sidebarEnabled) applySidebarDirect();
            if (cfg.miscFriendsFrameTransparent) applyFriendsTransparencyDirect();
            applyRequestCardMergeDirect();
            if (cfg.miscProfileFrameTransparent) applyWearingGlassDirect();
            injectSidebarLinks();
            applyAgeOverride();
            ensureTradesOverlay();
            removeNagAlerts();
            injectProfileTradeButton();
            applyAvatarControls(); injectAvatarBgStrip(); applyAvatarGlass(); applyAvatarEditorGlass(); if (cfg.avatarBgEnabled) applyAvatarBg();
            applyBadges();
            applyProfileBannerForPage();
        };
        state.dom.runPass = runDomPass;
        state.dom.observer = new MutationObserver(() => {
            if (debounce) return;
            /* PERF: the restyle pass is visual-only work -- skip it entirely
               in background tabs and run ONE catch-up pass on refocus. */
            if (document.hidden) { state.dom.hiddenSkip = true; return; }
            debounce = setTimeout(() => { debounce = null; runDomPass(); }, 60);
        });
        state.dom.observer.observe(document.body, { childList:true, subtree:true });
        if (!state.dom.visWired) {
            state.dom.visWired = true;
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && state.dom.hiddenSkip) { state.dom.hiddenSkip = false; state.dom.runPass?.(); }
            });
        }
        applyAgeOverride();
        removeNagAlerts();
        injectProfileTradeButton();
        applyAvatarControls(); injectAvatarBgStrip(); applyAvatarGlass(); applyAvatarEditorGlass(); if (cfg.avatarBgEnabled) applyAvatarBg();
        applyBadges();
        applyProfileBannerForPage();
    };

    const monitorNavigation = () => {
        const origPush    = history.pushState;
        const origReplace = history.replaceState;
        const onNav = () => {
            const url = location.href; if (url === state.session.lastUrl) return;
            state.session.lastUrl = url;
            applyMisc(); applyAvatarEditorGlass();
            _tradeWindowInjected = false;
            _tradesPageInjected = false;
            _tradesInjecting = false;
            _tradesClosed = false;
            const _trOv = document.getElementById('pks-tr-overlay');
            if (_trOv) { if (_trOv._onKey) document.removeEventListener('keydown', _trOv._onKey); _trOv.remove(); }
            document.getElementById('pks-tr-hide')?.remove();
            twMyItems = []; twTheirItems = [];
            twMySelected = []; twTheirSelected = [];
            twMyPage = 0; twTheirPage = 0;
            twMySearch = ''; twTheirSearch = '';
            if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
            setTimeout(() => {
                applyPageFrameTransparency();
                applyRobuxJssIconFix(); /* JSS sheets (group robux glyphs) mount after nav */
                applyCardStyle(); /* page-gated blocks (item page glass) must rebuild on SPA nav */
                applySidebarNavStyle();
                applySidebarDirect();
                if (isTradePage()) applyTradeStyle();
                if (isTradeWindow()) injectTradeWindow();
                if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
                if (isAvatarPage()) injectAvatarTools();
                if (isCatalogItemPage()) applyCatalogOwned();
                applyGamesHeroBackdrop();
                injectFriendsButtons();
                if (!isTradeWindow() && cfg.effectType !== 'none' && !document.getElementById('pks-effects-canvas')) applyEffects();
            }, 400);
        };
        history.pushState    = function (...a) { origPush.apply(this, a);    onNav(); };
        history.replaceState = function (...a) { origReplace.apply(this, a); onNav(); };
        window.addEventListener('popstate', onNav);
    };

    const init = () => {
        injectFont();

        const run = (authInfo) => {
            state.authInfo = authInfo || {};
            buildPanel(authInfo);
            try {
                if (_lsGet(PANEL_HIDDEN_KEY, false)) {
                    const p = document.getElementById('pks-panel');
                    if (p) p.style.display = 'none';
                }
            } catch {}
            buildWatermark();
            setupHotkeys();
            monitorDOM();
            if (isTradeWindow()) injectTradeWindow();
            if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
            if (isAvatarPage()) injectAvatarTools();
            if (isCatalogItemPage()) applyCatalogOwned();
            injectFriendsButtons();
            setTimeout(() => notify('Welcome to Interium!', 'success'), 800);
        };

        const authInfo = {};
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(authInfo));
        else run(authInfo);


        console.log('%cINTERIUM UI', 'color:#a855f7;font-weight:900;font-size:14px;letter-spacing:2px;');
        console.log('[Interium] UI runtime loaded — trading features live in the trading runtime.');

        monitorNavigation();
    };

    init();
})();
