// ─────────────────────────────────────────────────────────────────────
// Interium UI runtime — themes, panel, watermark, page styling
// Ported from the Interium 1.0.5 GUI with these changes:
//   • ALL trading features removed (trading lives in the separate
//     dist/interium-trading-*.js runtime — this file never touches trades)
//   • Auto-refresher / auto-clicker removed
//   • "LARP" fake-balance / fake-verify / fake-item tools removed
//   • Every call to the private hexium.zxwxtt.workers.dev server removed
//     (no auth gate, announcements, badges or remote profile saves)
// The only network requests made here go to pekora.zip itself (your own
// profile info + avatar headshot for the panel header). Settings are
// stored locally in Tampermonkey storage under "interium_ui_cfg_v1".
// ─────────────────────────────────────────────────────────────────────
(function () {
    'use strict';

    if (typeof GM_getValue !== 'function') {
        console.warn('[Interium] Not running in a Tampermonkey context — aborting.');
        return;
    }

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
        miscProfileFrameTransparent:false,
        miscProfileNameAnimate:     false,
        miscProfileNameColor1:      '#5100e8',
        miscProfileNameColor2:      '#f238f8',
        miscFriendsFrameTransparent:false,
        miscAvatarFrameTransparent: false,
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
        avatarFakeItems:        [],
        avatarFakeQty:          {},
        anonymous:             false,
    };

    const loadCfg = () => {
        try {
            const s = GM_getValue('interium_ui_cfg_v1', null);
            return s ? Object.assign({}, DEFAULTS, JSON.parse(s)) : Object.assign({}, DEFAULTS);
        } catch { return Object.assign({}, DEFAULTS); }
    };
    const saveCfg = (c) => { try { GM_setValue('interium_ui_cfg_v1', JSON.stringify(c)); } catch {} };
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
                css += `${SIDEBAR_SELECTORS} { background:rgba(15,15,22,${(op * 0.45).toFixed(3)})!important;backdrop-filter:blur(${blur}px) saturate(150%)!important;-webkit-backdrop-filter:blur(${blur}px) saturate(150%)!important;border-color:rgba(255,255,255,0.09)!important;box-shadow:none!important; }`;
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
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:rgba(15,15,22,${(op * 0.45).toFixed(3)})!important;backdrop-filter:blur(${blur}px) saturate(150%)!important;-webkit-backdrop-filter:blur(${blur}px) saturate(150%)!important;border-bottom:1px solid rgba(255,255,255,0.08)!important;box-shadow:none!important;}`;
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
                    if (inner && inner.querySelector('a[href*="/profile"], a[href="/home"]')) return inner;
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
            // Real glass: keep the tint translucent so the backdrop blur is visible.
            card.style.setProperty('background', `rgba(15,15,22,${(op * 0.45).toFixed(3)})`, 'important');
            card.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(150%)`, 'important');
            card.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(150%)`, 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.09)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
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

    const applyPageFrameTransparency = () => {
        let el = document.getElementById('pks-frame-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-frame-style'; document.head.appendChild(el); }
        const t = getTheme();
        let css = `[class*="headshotWrapper"]{background:transparent!important;background-color:transparent!important;box-shadow:none!important;}`;
        css += `li[class*="messagesContainer-"]{display:none!important;}`;
        css += `[class*="dropdownWrapper"]{position:relative!important;z-index:1500!important;}[class*="dropdownNew"],[class*="dropdownClass"]{z-index:1500!important;}`;
        css += `[class*="userStatus"],[class*="statHeader"],[class*="statText"]{font-weight:700!important;}`;
        const FRAME_CSS = `background:transparent!important;backdrop-filter:blur(0px)!important;border-color:rgba(255,255,255,0.06)!important;box-shadow:none!important;`;
        if (cfg.miscHomeFramesTransparent) {
            css += `.container.container-0-2-162,.container-0-2-162{${FRAME_CSS}}.myFeedContainer-0-2-176,.blogNewsContainer-0-2-177,.homeGamesContainer-0-2-172{${FRAME_CSS}}`;
            css += `[class*="friendSection"] .section-content,[class*="friendSection"]{background:transparent!important;}[class*="thumbnailWrapper"]{box-shadow:none!important;}`;
        }
        if (cfg.miscCatalogFrameTransparent) {
            // Catalog listing page + item detail page (hash-proof wildcards).
            css += `[class*="catalogPage-"],[class*="catalogContainer-"],[class*="searchResultsContainer-"],[class*="resultsWrapper-"],[class*="searchOptionsContainer-"]{${FRAME_CSS}}`;
            css += `[class*="itemDetailsContainer-"],[class*="itemDetails-"],[class*="itemThumbContainer-"]{${FRAME_CSS}}`;
        }
        if (cfg.miscProfileFrameTransparent) {
            let glassEl = document.getElementById('pks-profile-glass-style');
            if (!glassEl) { glassEl = document.createElement('style'); glassEl.id = 'pks-profile-glass-style'; document.head.appendChild(glassEl); }
            glassEl.textContent = `
                .card,
                [class*="card-0-2-"],
                .card-body,
                [class*="cardBody-0-2-"],
                .avatarImageCard-0-2-334,
                .groupCard-0-2-402 {
                    background: rgba(255,255,255,0.05) !important;
                    backdrop-filter: blur(20px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                    border: 1px solid rgba(255,255,255,0.15) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.15) !important;
                }
                .avatarWrapper-0-2-191,
                .avatarContainer-0-2-189,
                .image-0-2-193,
                .listItemFriend-0-2-188,
                .friendLink-0-2-190 {
                    background: transparent !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .avatarWrapper-0-2-191 {
                    backdrop-filter: blur(12px) !important;
                    -webkit-backdrop-filter: blur(12px) !important;
                }
                /* backdrop-filter makes each card its own stacking context, which
                   buries the Past Usernames popover under the next glass frame.
                   Lift the hovered card so its popover paints above its siblings. */
                .card:hover,
                [class*="card-0-2-"]:hover:not([class*="dropdown"]),
                [class*="cardBody-0-2-"]:hover {
                    position: relative !important;
                    z-index: 100 !important;
                }
                .popover,
                [class*="popover"] {
                    z-index: 2000 !important;
                }
            `;
        } else {
            document.getElementById('pks-profile-glass-style')?.remove();
        }
        if (cfg.miscFriendsFrameTransparent) {
            // Truly transparent - no glass, no blur (real Friends page classes).
            css += `[class*="friendsContainer-"],[class*="friendCard-"],[class*="manageRequestCard-"]{background:transparent!important;background-color:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-color:rgba(255,255,255,0.08)!important;box-shadow:none!important;}`;
            css += `[class*="friendCardWrapper-"]{background:transparent!important;box-shadow:none!important;border:1px solid rgba(255,255,255,0.10)!important;border-radius:10px!important;}`;
            css += `[class*="friendsContainer-"] [class*="username-"],[class*="manageRequestCard-"] [class*="username-"]{color:#fff!important;}`;
            css += `[class*="friendsContainer-"] [class*="imageWrapper-"],[class*="manageRequestCard-"] [class*="imageWrapper-"]{border-color:rgba(255,255,255,0.10)!important;background:transparent!important;}`;
        }
        if (cfg.miscAvatarFrameTransparent) css += `.avatarCardContainer-0-2-570,.catalogContainer-0-2-4{${FRAME_CSS}}.pillToggle-0-2-553{background:rgba(255,255,255,0.05)!important;border-color:rgba(255,255,255,0.1)!important;}`;
        if (cfg.miscFooterTransparent) css += `[class*="footerContainer"],footer[class*="footerContainer"]{background:transparent!important;border-top:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;backdrop-filter:none!important;}`;
        if (cfg.miscGamesGlassify) {
            const accentDark = darkenHex(t.accent, 0.62);
            const GLASS = `background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;`;
            css += `
                /* every major frame → glass */
                [class*="callsToAction"],[class*="recommendedGamesContainer"],[class*="serverContainer"],[class*="subSectionContainer"],[class*="gameDescription"],[class*="contentContainer"]{${GLASS}padding:16px!important;}
                [class*="callsToAction"]{padding:14px!important;}
                [class*="carouselGameDetails"],[class*="thumbContainer"],[class*="innerCarousel"],[class*="carouselItem"]{border-radius:16px!important;overflow:hidden!important;}
                [class*="gameName"],[class*="containerHeader"] h3{color:#fff!important;}
                [class*="creatorName"]{color:${t.accent}!important;}
                [class*="descriptionText"]{color:#dfe3f0!important;background:transparent!important;}
                [class*="voteText"],[class*="voteNumbers"],[class*="playerCount"],[class*="creatorLabel"]{color:#e6e9f5!important;}
                /* game stats → modern glass chips */
                [class*="gameStatsContainer"]{display:flex!important;flex-wrap:wrap!important;gap:8px!important;border:none!important;padding:0!important;margin-top:12px!important;}
                [class*="gameStat-"]{list-style:none!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:8px 13px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="gameStat-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="gameStatLabel"]{color:#9aa0c0!important;}
                [class*="gameStatStat"]{color:#fff!important;font-weight:700!important;}
                [class*="reportAbuseContainer"] a,[class*="abuseLink"]{color:${t.accent}!important;}
                /* comments → glass */
                [class*="commentContainer"]{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:10px!important;margin-bottom:8px!important;}
                [class*="createCommentContainer"],[class*="commentBox"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;}
                [class*="commentBox"] input,[class*="createCommentContainer"] input{background:transparent!important;color:#fff!important;border:none!important;}
                /* modern, sleek buttons */
                [class*="actionButtonsContainer"]{gap:8px!important;}
                [class*="playButtonContainer"] button,[class*="buttonWrapper"] button{background:linear-gradient(135deg,${t.accent},${accentDark})!important;border:none!important;border-radius:14px!important;box-shadow:0 6px 22px ${t.accent}55!important;transition:transform 0.16s ease,box-shadow 0.16s ease,filter 0.16s ease!important;}
                [class*="playButtonContainer"] button:hover,[class*="buttonWrapper"] button:hover{transform:translateY(-2px) scale(1.02)!important;filter:brightness(1.08)!important;box-shadow:0 12px 30px ${t.accent}88!important;}
                [class*="playButtonContainer"] button [class*="iconPlay"]{filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))!important;}
                [class*="favoriteButton"],[class*="followButton"]{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:rgba(255,255,255,0.06)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:14px!important;padding:8px 14px!important;transition:background 0.15s ease,border-color 0.15s ease,transform 0.15s ease!important;}
                [class*="favoriteButton"]:hover,[class*="followButton"]:hover{background:rgba(255,255,255,0.11)!important;border-color:${t.accent}99!important;transform:translateY(-1px)!important;}
                [class*="favoriteLabel"],[class*="followLabel"]{color:#fff!important;font-weight:600!important;}
                /* About / Store / Servers tabs → modern glass segmented control */
                [class*="buttonCol"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;}
                [class*="vTab-"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;overflow:hidden!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
                [class*="vTab-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="vTabLabel"]{color:#cfd3e6!important;font-weight:600!important;margin:0!important;padding:9px 16px!important;text-align:center!important;cursor:pointer!important;}
                [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 0 -2px 0 ${t.accent}!important;}
                [class*="vTabUnselected"]{color:#8a90ad!important;}
            `;
        }
        css += `[class*="gameContainer"] [class*="background-"],[class*="gameContainer"] [class*="thumbContainer"],[class*="gameContainer"] [class*="carouselGameDetails"],[class*="gameContainer"] [class*="descriptionContainer"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (!cfg.miscGamesGlassify) css += `[class*="gameContainer"] [class*="contentContainer"],[class*="gameContainer"] [class*="callsToAction"],[class*="gameContainer"] [class*="recommendedGamesContainer"],[class*="gameContainer"] [class*="commentsContainer"],[class*="gameContainer"] [class*="createCommentContainer"],[class*="gameContainer"] [class*="commentBox"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (cfg.miscGamesHideRecommended) css += `[class*="recommendedGamesContainer"]{display:none!important;}`;
        if (cfg.miscGamesHideComments) css += `[class*="commentsContainer"]{display:none!important;}[class*="containerHeader"]:has(+[class*="commentsContainer"]){display:none!important;}`;
        el.textContent = css;
        applyGamesHeroBackdrop();
        applyMessagesGlass();
    };

    const applyMessagesGlass = () => {
        if (!document.querySelector('div[class*="messagesContainer-"]')) {
            document.getElementById('pks-messages-glass-style')?.remove();
            return;
        }
        let el = document.getElementById('pks-messages-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-messages-glass-style'; document.head.appendChild(el); }
        const t = getTheme();
        const GLASS = `background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;`;
        const M = 'div[class*="messagesContainer-"]';
        el.textContent = `
            ${M}{${GLASS}padding:18px!important;color:#e6e9f5!important;}
            /* tabs (Inbox / Sent / Notifications / Archive) */
            ${M} [class*="vTab-0-2"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;overflow:hidden!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
            ${M} [class*="vTab-0-2"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
            ${M} [class*="vTabLabel"]{margin:0!important;padding:10px 16px!important;color:#cfd3e6!important;font-weight:600!important;cursor:pointer!important;}
            ${M} [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 3px 0 0 ${t.accent}!important;}
            ${M} [class*="vTabUnselected"]{color:#8a90ad!important;}
            ${M} [class*="count-0-2"]{background:${t.accent}!important;color:#050508!important;border-radius:10px!important;padding:1px 7px!important;font-weight:700!important;margin-left:6px!important;}
            ${M} [class*="btnBottomSeperator"]{display:none!important;}
            /* message rows → individual glass cards */
            ${M} [class*="messageRow-"]{${GLASS}display:flex!important;align-items:center!important;gap:12px!important;padding:12px 14px!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
            ${M} [class*="messageRow-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;background:rgba(255,255,255,0.08)!important;}
            ${M} [class*="userImage-"] img{border-radius:50%!important;border:1px solid rgba(255,255,255,0.15)!important;}
            ${M} [class*="username-"]{color:#fff!important;font-weight:700!important;}
            ${M} [class*="subjectUnread"]{color:${t.accent}!important;font-weight:700!important;}
            ${M} [class*="subject-0-2"]:not([class*="subjectUnread"]){color:#dfe3f0!important;}
            ${M} [class*="body-0-2"]{color:#9aa0c0!important;}
            ${M} [class*="divider-top"]{display:none!important;}
            /* action + pagination buttons → glass */
            ${M} button{background:rgba(255,255,255,0.06)!important;color:#e6e9f5!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:10px!important;transition:all 0.15s ease!important;}
            ${M} button:hover:not(:disabled){border-color:${t.accent}99!important;background:rgba(255,255,255,0.1)!important;transform:translateY(-1px)!important;}
            ${M} button:disabled{opacity:0.4!important;}
            /* checkboxes */
            ${M} input[type="checkbox"]{accent-color:${t.accent}!important;cursor:pointer!important;}
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
            const op   = (cfg.panelOpacity ?? 85) / 100;
            const blur = cfg.panelBlur ?? 14;
            const c    = hexToRgbObj(t.panelBg) || { r: 12, g: 12, b: 14 };
            panel.style.setProperty('background', `rgba(${c.r},${c.g},${c.b},${op})`, 'important');
            panel.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
            panel.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
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
    const getCsrf = () => {
        const m = document.cookie.match(/rbxcsrf4=([^;]+)/);
        return m ? m[1] : _csrfToken || '';
    };

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

    // ── Interium: removed-feature stubs ──────────────────────────────
    // Trading, the auto-refresher, LARP/fake-item tools and every call to
    // the private hexium worker server were removed from this build.
    // Trading is handled by Interium's own trading runtime file. These
    // no-op stubs keep the remaining UI code paths safe.
    const _noop = () => {};
    const isTradePage = () => false;
    const isTradeWindow = () => false;
    const applyTradeStyle = _noop, applyTradesCustom = _noop, ensureTradesOverlay = _noop,
          injectTradeWindow = _noop, buildMassTradeUI = _noop, injectProfileTradeButton = _noop;
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
        el.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483647;display:inline-flex;align-items:center;gap:9px;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:10px 14px;width:auto;max-width:340px;white-space:nowrap;font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:11px;color:#e0e0e0;box-shadow:0 0 18px ${c.border}33,0 4px 14px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,top 0.2s,bottom 0.2s;pointer-events:none;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden;`;
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
            wm.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483640;display:flex;align-items:center;gap:0;font-family:var(--pks-font),'Share Tech Mono',monospace;font-weight:600;letter-spacing:0.06em;background:rgba(5,5,8,0.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:${5*scale}px ${12*scale}px;pointer-events:auto;user-select:none;overflow:hidden;opacity:${op};cursor:grab;`;
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
        setInterval(updateWatermark, 1000);
        measurePing();
        state.watermark.pingTimer = setInterval(measurePing, 10000);
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
        const sig = `${img}|${blur}|${bright}|${tint}|${tint2}|${angle}|${grad}|${tintOp}`;
        if (layer.getAttribute('data-sig') === sig) return;
        layer.setAttribute('data-sig', sig);
        layer.innerHTML = `
            <div style="position:absolute;inset:-${blur * 2 + 2}px;background-image:url('${img}');background-size:cover;background-position:center;filter:blur(${blur}px) brightness(${bright});"></div>
            <div style="position:absolute;inset:0;background:${tintBg};opacity:${tintOp};"></div>`;
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
        if (!cfg.miscModernGameCards && !cfg.miscCatalogItemCards) { cs.textContent = ''; return; }
        const t = getTheme();
        let cssOut = '';
        if (cfg.miscModernGameCards) {
            cssOut += `[class*="gameCardContainer"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(14px) saturate(160%)!important;-webkit-backdrop-filter:blur(14px) saturate(160%)!important;border-radius:14px!important;border:1px solid ${t.cardBorder}!important;box-shadow:${t.cardGlow}!important;transition:border-color 0.22s,box-shadow 0.22s,transform 0.18s!important;overflow:hidden!important;}[class*="gameCardContainer"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;transform:translateY(-3px)!important;z-index:2!important;}[class*="gameCardTitle"]{color:#fff!important;}`;
        }
        if (cfg.miscCatalogItemCards) {
            cssOut += `
                /* catalog listing cards (scoped under the results grid so
                   avatarCardWrapper etc. on other pages are not affected) */
                [class*="resultsContainer-"] [class*="cardWrapper-"]{background:rgba(255,255,255,0.045)!important;backdrop-filter:blur(13px) saturate(160%)!important;-webkit-backdrop-filter:blur(13px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:14px!important;box-shadow:0 8px 28px rgba(0,0,0,0.28)!important;padding:8px!important;overflow:hidden!important;transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease!important;}
                [class*="resultsContainer-"] [class*="cardWrapper-"]:hover{transform:translateY(-4px)!important;box-shadow:0 14px 38px rgba(0,0,0,0.45)!important;border-color:${t.accent}77!important;}
                [class*="resultsContainer-"] [class*="cardImage-"]{background:transparent!important;}
                [class*="resultsContainer-"] [class*="cardImage-"] img{border:none!important;border-radius:10px!important;background:transparent!important;}
                [class*="resultsContainer-"] [class*="cardItemLink-"] span{color:#fff!important;font-weight:700!important;}
                [class*="resultsContainer-"] [class*="salesCounter-"]{color:#9aa0c0!important;}
                [class*="resultsContainer-"] [class*="salesCounterValue-"]{color:#fff!important;}
                [class*="resultsContainer-"] [class*="itemStatusSaleBadge-"]{border-radius:6px!important;}
                [class*="catalogPage-"] [class*="selectorClosed-"]{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;color:#fff!important;}
                [class*="breadcrumbsContainer-"],[class*="breadcrumbsContainer-"] span{color:#dfe3f0!important;}
            `;
            const catDark = darkenHex(t.accent, 0.6);
            cssOut += `
                [class*="catalogContainer"]{background:transparent!important;}
                [class*="catalogContainer"] h1,[class*="catalogContainer"] h2,[class*="catalogContainer"] [class*="bottom-0-2"],[class*="catalogContainer"] [class*="top-0-2"]{color:#fff!important;}
                [class*="catalogContainer"] h3,[class*="catalogContainer"] label,[class*="catalogContainer"] summary,[class*="catalogContainer"] p,[class*="catalogContainer"] [class*="sortByLabel"]{color:#dfe3f0!important;}
                [class*="catalogContainer"] a{color:${t.accent}!important;}
                [class*="catalogContainer"] input[type="text"],[class*="catalogContainer"] select{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;color:#fff!important;padding:5px 9px!important;}
                [class*="catalogContainer"] select option{background:#16161f!important;color:#fff!important;}
                [class*="catalogContainer"] [class*="caret-0-2"]{background:transparent!important;border:none!important;color:#fff!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2,[class*="catalogContainer"] [class*="button-0-2"]{background:linear-gradient(135deg,${t.accent},${catDark})!important;border:none!important;color:#050508!important;border-radius:8px!important;font-weight:700!important;transition:filter 0.15s ease!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2:hover,[class*="catalogContainer"] [class*="button-0-2"]:hover{filter:brightness(1.12)!important;color:#050508!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]{background:rgba(255,255,255,0.04)!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:8px!important;margin-bottom:4px!important;padding:2px 8px!important;transition:background 0.15s ease,border-color 0.15s ease!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]:hover{background:${t.accent}1f!important;border-color:${t.accent}66!important;}
                [class*="catalogContainer"] [class*="separator-0-2"]{border-color:rgba(255,255,255,0.1)!important;background:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="divider-right"]{border-color:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="wrapper-0-2"]{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(12px) saturate(150%)!important;-webkit-backdrop-filter:blur(12px) saturate(150%)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:10px!important;}
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

    const applyMisc = () => {
        let miscStyle = document.getElementById('pks-misc-style');
        if (!miscStyle) { miscStyle = document.createElement('style'); miscStyle.id = 'pks-misc-style'; document.head.appendChild(miscStyle); }
        const t = getTheme();
        let css = '';
        css += `img[src*="headshot"],img[src*="thumbnail"]{background-color:transparent!important;}[class*="avatarHeadshotContainer"],[class*="avatarContainer"],[class*="avatarWrapper"],[class*="userIconContainer"],[class*="userIcon"]{background-color:transparent!important;}`;
        css += `[class*="iconCard"],[class*="iconCard"] [class*="imageWrapper"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;

        css += `
            [class*="moneyContainer"]{overflow:visible!important;}
            [class*="moneyContainer"] .col-lg-10{flex:0 0 100%!important;max-width:100%!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border-radius:16px!important;padding:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;}
            [class*="moneyContainer"] table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;}
            [class*="moneyContainer"] thead{background:rgba(255,255,255,0.05)!important;border:none!important;}
            [class*="moneyContainer"] thead th{color:#9aa0c0!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:0.05em!important;font-size:11px!important;border:none!important;padding:11px 14px!important;}
            [class*="moneyContainer"] thead tr th:first-child{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important;}
            [class*="moneyContainer"] thead tr th:last-child{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;}
            [class*="moneyContainer"] tbody tr{transition:background 0.15s ease!important;}
            [class*="moneyContainer"] tbody tr:hover{background:rgba(255,255,255,0.06)!important;}
            [class*="moneyContainer"] tbody td{color:#dfe3f0!important;border:none!important;border-top:1px solid rgba(255,255,255,0.06)!important;padding:12px 14px!important;vertical-align:middle!important;}
            [class*="moneyContainer"] tbody [class*="image-"]{border:1px solid rgba(255,255,255,0.15)!important;}
            [class*="senderName"]{color:#fff!important;font-weight:600!important;}
            [class*="viewDetails"]{color:${t.accent}!important;font-weight:700!important;cursor:pointer!important;}
            [class*="viewDetails"]:hover{text-decoration:underline!important;}
            [class*="tradeTypeActions"]{color:#cfd3e6!important;}
            [class*="tradeTypeActions"] a{color:${t.accent}!important;}
            [class*="tradeTypeActions"] select{background:rgba(255,255,255,0.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;padding:4px 8px!important;}
        `;
        css += `
            [class*="modalWrapper"]{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;z-index:2147483647!important;margin:0!important;max-width:92vw!important;background:rgba(20,20,30,0.5)!important;backdrop-filter:blur(26px) saturate(170%)!important;-webkit-backdrop-filter:blur(26px) saturate(170%)!important;border:none!important;border-radius:16px!important;box-shadow:0 20px 60px rgba(0,0,0,0.6)!important;color:#fff!important;overflow:hidden!important;}
            [class*="modalWrapper"] [class*="innerSection"]{background:transparent!important;border:none!important;}
            [class*="modalWrapper"] [class*="title-"]{color:#fff!important;font-weight:700!important;}
            [class*="modalWrapper"] p,[class*="modalWrapper"] span{color:#e6e9f5;}
            [class*="modalWrapper"] a{color:${t.accent}!important;}
            [class*="modalWrapper"] [class*="robuxLabel"]{color:#3fd07e!important;}
            [class*="modalWrapper"] [class*="imageWrapper"]{background:transparent!important;}
            [class*="modalWrapper"] [class*="col-0-2"]{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:10px!important;}
            [class*="modalWrapper"] [class*="divider-right"],[class*="modalWrapper"] [class*="divider-top"]{border-color:rgba(255,255,255,0.14)!important;}
            [class*="modalWrapper"] [class*="closeButton"]{color:#fff!important;cursor:pointer!important;opacity:0.85!important;}
            [class*="modalWrapper"] [class*="closeButton"]:hover{opacity:1!important;}
            /* Profile friend-action buttons (Unfriend / Message / Chat) → modern glass */
            [class*="actionContainer"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;}
            [class*="actionContainer"] [class*="buttonContainer"]{margin:0!important;}
            [class*="actionContainer"] button{background:rgba(255,255,255,0.06)!important;backdrop-filter:blur(10px) saturate(160%)!important;-webkit-backdrop-filter:blur(10px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;color:#fff!important;font-weight:600!important;letter-spacing:0.02em!important;padding:8px 18px!important;box-shadow:0 4px 16px rgba(0,0,0,0.25)!important;transition:background 0.16s ease,border-color 0.16s ease,transform 0.14s ease,box-shadow 0.16s ease!important;}
            [class*="actionContainer"] button:hover{background:rgba(255,255,255,0.12)!important;border-color:${t.accent}!important;transform:translateY(-2px)!important;box-shadow:0 8px 24px ${t.accent}55!important;}
            /* Remove the (disabled) Chat button entirely */
            [class*="actionContainer"] [class*="newDisabledCancelButton"]{display:none!important;}
            [class*="actionContainer"] [class*="buttonContainer"]:has([class*="newDisabledCancelButton"]){display:none!important;}
            /* About / Creations tab bar → transparent frame (scoped to profile, beats glassify) */
            [class*="buttonCol"]{background:transparent!important;border:none!important;box-shadow:none!important;}
            [class*="buttonCol"] [class*="vTab-"]{background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
            /* Auto-remove the OBC flair icon everywhere */
            .icon-obc,[class*="icon-obc"]{display:none!important;}
        `;
        if (cfg.miscBgUrl?.trim()) {
            const blur = cfg.miscBgBlur ? `blur(${cfg.miscBgBlurAmount ?? 8}px)` : 'none';
            const darkOp = cfg.miscBgDarkOverlay ? ((cfg.miscBgDarkOpacity ?? 50) / 100) : 0;
            css += `body{background-image:url('${cfg.miscBgUrl.trim()}')!important;background-size:cover!important;background-position:center!important;background-attachment:fixed!important;background-repeat:no-repeat!important;}body::before{content:'';position:fixed;inset:0;z-index:0;background:inherit;filter:${blur};pointer-events:none;}body::after{content:'';position:fixed;inset:0;z-index:1;background:rgba(0,0,0,${darkOp});pointer-events:none;}body>*{position:relative;z-index:2;}#pks-panel,#pks-watermark{z-index:2147483647!important;}`;
        }
        if (cfg.miscHideAds) css += `[class*="adWrapper"],[class*="adImage"]{display:none!important;}`;
        if (cfg.miscHideAlert) css += `[class*="alertBg"],[class*="alertText"],[class*="alertLink"],[class*="fakeAlert"]{display:none!important;}`;
        if (cfg.miscHideNavbar) css += `.navbar-wrapper-main,.navbar-0-2-49,nav.navbar,[class*="navBar"]{display:none!important;}.main-0-2-1{padding-top:0!important;}`;
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
                    try { GM_setValue(PANEL_HIDDEN_KEY, false); } catch {}
                    buildPanel(state.authInfo || {});
                } else {
                    const willHide = panel.style.display !== 'none';
                    panel.style.display = willHide ? 'none' : '';
                    try { GM_setValue(PANEL_HIDDEN_KEY, willHide); } catch {}
                }
            }
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
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><span style="color:#00e87a;font-size:7.5px;font-weight:700;">R$</span><span id="pks-profile-robux" style="color:#fff;font-weight:700;">\u2014</span></div>
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><span style="color:#f0a500;font-size:7.5px;font-weight:700;">TIX</span><span id="pks-profile-tickets" style="color:#fff;font-weight:700;">\u2014</span></div>
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
                    <div class="pks-section-title">Background Image</div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-miscBgUrl" placeholder="https://i.imgur.com/\u2026 (press Enter to apply)" style="width:100%;font-size:10px;"></div>
                    <div class="pks-row"><label>Blur background</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgBlur"><input type="number" id="cfg-miscBgBlurAmount" min="1" max="30" step="1" style="width:50px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Dark overlay</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgDarkOverlay"><input type="number" id="cfg-miscBgDarkOpacity" min="0" max="95" step="5" style="width:50px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Effects</div>
                    <div class="pks-row"><label>Background effect</label><select id="cfg-effectType" style="width:130px;"><option value="none">None</option><option value="rain">Rain</option><option value="snow">Snow</option><option value="stars">Stars</option><option value="matrix">Matrix</option></select></div>
                    <div class="pks-row"><label>Intensity</label><div class="pks-row-right"><input type="number" id="cfg-effectIntensity" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Speed</label><div class="pks-row-right"><input type="number" id="cfg-effectSpeed" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Colour (blank = auto)</label><div class="pks-row-right"><input type="color" id="cfg-effectColor"><button id="cfg-effectColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-section-title">Other</div>
                    <div class="pks-row"><label>Hide ads</label><input type="checkbox" id="cfg-miscHideAds"></div>
                    <div class="pks-row"><label>Remove alert banner</label><input type="checkbox" id="cfg-miscHideAlert"></div>
                    <div class="pks-row"><label>Hide nav bar entirely</label><input type="checkbox" id="cfg-miscHideNavbar"></div>
                    <div class="pks-row"><label>Transparent footer</label><input type="checkbox" id="cfg-miscFooterTransparent"></div>
                    <div class="pks-section-title">Fonts</div>
                    <div class="pks-row"><label>Page font</label><select id="cfg-miscPageFont" style="width:160px;"><option value="Default (Site Font)">Default (Site Font)</option><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option><option value="Source Sans Pro Light">Source Sans Pro Light</option></select></div>
                    <div class="pks-row"><label>GUI font</label><select id="cfg-miscGuiFont" style="width:160px;"><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option></select></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/home</span></div>
                    <div class="pks-row"><label>Transparent page frames</label><input type="checkbox" id="cfg-miscHomeFramesTransparent"></div>
                    <div class="pks-row"><label>Hide My Feed</label><input type="checkbox" id="cfg-miscHideMyFeed"></div>
                    <div class="pks-row"><label>Hide Blog / News</label><input type="checkbox" id="cfg-miscHideBlogNews"></div>
                    <div class="pks-row"><label>Modern game cards</label><input type="checkbox" id="cfg-miscModernGameCards"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/games</span></div>
                    <div class="pks-row"><label>Glassify game page</label><input type="checkbox" id="cfg-miscGamesGlassify"></div>
                    <div class="pks-row"><label>Hero backdrop (blurred thumb)</label><input type="checkbox" id="cfg-miscGamesHeroBackdrop"></div>
                    <div class="pks-row"><label>Hide comments</label><input type="checkbox" id="cfg-miscGamesHideComments"></div>
                    <div class="pks-row"><label>Hide recommended games</label><input type="checkbox" id="cfg-miscGamesHideRecommended"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/Catalog.aspx</span></div>
                    <div class="pks-row"><label>Transparent main frame</label><input type="checkbox" id="cfg-miscCatalogFrameTransparent"></div>
                    <div class="pks-row"><label>Hide sidebar</label><input type="checkbox" id="cfg-miscCatalogHideSidebar"></div>
                    <div class="pks-row"><label>Glassify item cards</label><input type="checkbox" id="cfg-miscCatalogItemCards"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/profile</span></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscProfileFrameTransparent"></div>
                    <div class="pks-row"><label>Animated username colour</label><input type="checkbox" id="cfg-miscProfileNameAnimate"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 1</label><input type="color" id="cfg-miscProfileNameColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 2</label><input type="color" id="cfg-miscProfileNameColor2"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/friends</span></div>
                    <div class="pks-row"><label>Transparent friend cards</label><input type="checkbox" id="cfg-miscFriendsFrameTransparent"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/My/Avatar</span></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscAvatarFrameTransparent"></div>
                    <div class="pks-row"><label>Glassify item frames</label><input type="checkbox" id="cfg-avatarGlassify"></div>
                    <div class="pks-row"><label>Avatar background</label><input type="checkbox" id="cfg-avatarBgEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Background blur</label><div class="pks-row-right"><input type="number" id="cfg-avatarBgBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
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
                <div id="pks-tab-hex" style="padding:12px 13px;display:block;max-height:460px;overflow-y:auto;">
                    <div style="margin-bottom:6px;"><span class="pks-page-badge">Profile Banner</span></div>
                    <div class="pks-row"><label>Enable banner</label><input type="checkbox" id="cfg-profileBannerEnabled"></div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-profileBannerImage" placeholder="https://i.imgur.com/… (press Enter)" style="width:100%;font-size:10px;"></div>
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
            'cfg-miscCatalogHideSidebar':'miscCatalogHideSidebar','cfg-miscCatalogItemCards':'miscCatalogItemCards',
            'cfg-miscProfileFrameTransparent':'miscProfileFrameTransparent',
            'cfg-miscProfileNameAnimate':'miscProfileNameAnimate',
            'cfg-miscProfileNameColor1':'miscProfileNameColor1','cfg-miscProfileNameColor2':'miscProfileNameColor2',
            'cfg-miscFriendsFrameTransparent':'miscFriendsFrameTransparent',
            'cfg-miscAvatarFrameTransparent':'miscAvatarFrameTransparent','cfg-avatarGlassify':'avatarGlassify',
            'cfg-avatarBgEnabled':'avatarBgEnabled','cfg-avatarBgBlur':'avatarBgBlur',
            'cfg-tradesBgColor':'tradesBgColor','cfg-tradesOpacity':'tradesOpacity','cfg-tradesBlur':'tradesBlur','cfg-tradesAccent':'tradesAccent',
            'cfg-profileBannerEnabled':'profileBannerEnabled','cfg-profileBannerImage':'profileBannerImage','cfg-profileBannerBlur':'profileBannerBlur','cfg-profileBannerTint':'profileBannerTint','cfg-profileBannerTintOpacity':'profileBannerTintOpacity','cfg-profileBannerBrightness':'profileBannerBrightness','cfg-hideHexBadge':'hideHexBadge','cfg-profileBannerTintGradient':'profileBannerTintGradient','cfg-profileBannerTint2':'profileBannerTint2','cfg-profileBannerTintAngle':'profileBannerTintAngle','cfg-tradesGlassCards':'tradesGlassCards','cfg-tradesMetric':'tradesMetric','cfg-tradesPillOpacity':'tradesPillOpacity',
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
            applyEffects(); applyAvatarGlass(); applyAvatarBg();
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

        const bgUrlInput = document.getElementById('cfg-miscBgUrl');
        if (bgUrlInput) {
            bgUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { cfg.miscBgUrl = bgUrlInput.value; saveCfg(cfg); applyMisc(); notify('Background image applied', 'info'); }
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

        const TABS = ['hex','misc','settings'];
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
        setInterval(() => fetchProfile().then(trySetAvatar), 30000);
        panelLog('Panel ready. Configure intervals and press START.', 'info');
    };

    const isAvatarPage = () => /\/My\/Avatar/i.test(location.pathname) || /(^|\/)avatar(\/|$)/i.test(location.pathname);
    const AV_WRAP_SEL = '[class*="avatarCardWrapper"]';

    const isCatalogItemPage = () => /\/catalog\/\d+/i.test(location.pathname);
    const currentCatalogAssetId = () => { const m = location.pathname.match(/\/catalog\/(\d+)/i); return m ? m[1] : null; };

    const AVATAR_BG_PRESETS = [
    ];

    const applyAvatarBg = () => {
        let el = document.getElementById('pks-avatar-bg-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-bg-style'; document.head.appendChild(el); }
        if (!cfg.avatarBgEnabled || !cfg.avatarBgImage?.trim()) { el.textContent = ''; return; }
        const url  = cfg.avatarBgImage.trim().replace(/'/g, "\\'");
        const blur = Math.max(0, cfg.avatarBgBlur ?? 0);
        el.textContent = `
            [class*="avatarThumbContainer"]{position:relative!important;overflow:hidden!important;}
            [class*="avatarThumbContainer"]::before{content:'';position:absolute;inset:0;background-image:url('${url}');background-size:cover;background-position:center;background-repeat:no-repeat;${blur ? `filter:blur(${blur}px);transform:scale(1.12);` : ''}z-index:0;pointer-events:none;}
            [class*="avatarThumbContainer"] > *{position:relative;z-index:1;}
        `;
    };

    const applyAvatarGlass = () => {
        let el = document.getElementById('pks-avatar-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-glass-style'; document.head.appendChild(el); }
        el.textContent = cfg.avatarGlassify
            ? `[class*="avatarCardContainer"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(14px) saturate(160%)!important;-webkit-backdrop-filter:blur(14px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;box-shadow:0 8px 28px rgba(0,0,0,0.25)!important;overflow:hidden!important;}[class*="avatarCardImage"]{background:transparent!important;}`
            : '';
    };

    const applyAvatarControls = () => {
        if (!isAvatarPage()) return;
        if (!document.getElementById('pks-avatar-controls-style')) {
            const st = document.createElement('style');
            st.id = 'pks-avatar-controls-style';
            st.textContent = `[class*="thumbnail3DButtonContainer"]{display:none!important;}`;
            document.head.appendChild(st);
        }
        const frame = document.querySelector('[class*="avatarThumbContainer"]');
        if (!frame) return;
        frame.style.setProperty('position', 'relative', 'important');
        const pill = [...document.querySelectorAll('[class*="pillToggle"]')].find(p => p.querySelector('input[name="avatarType"]'));
        if (pill && pill.parentElement !== frame) {
            pill.style.setProperty('position', 'absolute', 'important');
            pill.style.setProperty('top', '8px', 'important');
            pill.style.setProperty('right', '8px', 'important');
            pill.style.setProperty('z-index', '30', 'important');
            pill.style.setProperty('margin', '0', 'important');
            frame.appendChild(pill);
        }
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
            if (reqH2 && !reqH2.querySelector('#pks-bulk-ignore'))
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
        state.dom.observer = new MutationObserver(() => {
            if (debounce) return;
            debounce = setTimeout(() => {
                debounce = null;
                if (cfg.sidebarEnabled) applySidebarDirect();
                injectSidebarLinks();
                applyAgeOverride();
                ensureTradesOverlay();
                removeNagAlerts();
                injectProfileTradeButton();
                applyAvatarControls();
                applyBadges();
                applyProfileBannerForPage();
            }, 60);
        });
        state.dom.observer.observe(document.body, { childList:true, subtree:true });
        applyAgeOverride();
        removeNagAlerts();
        injectProfileTradeButton();
        applyAvatarControls();
        applyBadges();
        applyProfileBannerForPage();
    };

    const monitorNavigation = () => {
        const origPush    = history.pushState;
        const origReplace = history.replaceState;
        const onNav = () => {
            const url = location.href; if (url === state.session.lastUrl) return;
            state.session.lastUrl = url;
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
                if (GM_getValue(PANEL_HIDDEN_KEY, false)) {
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
