(function () {
    'use strict';

    if (window.InteriumCore) return;

    const VERSION = '2.0.0';

    const DEFAULT_CONFIG = {
        theme: 'void',
        accentColor: '',
        guiScale: 100,
        hotkeyToggleGui: 'Insert',
        anonymous: false,

        // Universal Navigation & Surfaces
        navbarEnabled: true,
        navbarMode: 'blur',
        navbarBlurAmount: 18,
        navbarOpacity: 75,
        navbarColour: '#0d0f16',
        navbarDropdownGlass: true,

        sidebarEnabled: true,
        sidebarMode: 'blur',
        sidebarBlurAmount: 16,
        sidebarOpacity: 65,
        sidebarColour: '#0d0f16',

        // Background & Effects
        miscBgUrl: '',
        miscBgBlur: true,
        miscBgBlurAmount: 12,
        miscBgDarkOverlay: true,
        miscBgDarkOpacity: 55,

        effectType: 'none',
        effectIntensity: 50,
        effectSpeed: 50,
        effectColor: '',

        // Watermark HUD
        watermarkEnabled: true,
        watermarkPosition: 'bottom-left',
        watermarkAccentColor: '',
        watermarkScale: 100,
        watermarkOpacity: 85,
        watermarkShowTime: true,
        watermarkShowPing: true,
        watermarkShowFps: true,
        watermarkShowUser: true,

        // Page Glassify Toggles
        glassifyHome: true,
        glassifyFriends: true,
        glassifyGames: true,
        glassifyTrades: true,
        glassifyCatalog: true,
        glassifyGroups: true,
        glassifyMessages: true,
        glassifyInventory: true,
        glassifyProfile: true,
        glassifyAvatar: true,

        // Inventory & Catalog Visual Fixes
        inventoryFixCards: true,
        cardImageScale: 1.18,
        itemBadges: true,
        showRapOnCards: true,
        showValueOnCards: true,
        showProjectedWarning: true,

        // Avatar & Profile
        avatarBgEnabled: false,
        avatarBgImage: '',
        avatarBgBlur: 0,

        profileBannerEnabled: false,
        profileBannerImage: '',
        profileBannerBlur: 0,
        profileBannerBrightness: 100,
        profileBannerTint: '#000000',
        profileBannerTintOpacity: 35,

        // Custom Fonts
        miscPageFont: 'Default (Site Font)',
        miscGuiFont: 'Share Tech Mono'
    };

    const storage = {
        get(key, fallback) {
            try {
                if (typeof GM_getValue === 'function') {
                    return GM_getValue(key, fallback);
                }
                const raw = localStorage.getItem('int_' + key);
                return raw !== null ? JSON.parse(raw) : fallback;
            } catch {
                return fallback;
            }
        },
        set(key, val) {
            try {
                if (typeof GM_setValue === 'function') {
                    GM_setValue(key, val);
                }
                localStorage.setItem('int_' + key, JSON.stringify(val));
            } catch {}
        }
    };

    let config = Object.assign({}, DEFAULT_CONFIG, storage.get('config', {}));

    const THEMES = {
        void: {
            name: 'Void',
            accent: '#c084fc',
            accentDim: '#9333ea',
            accentGlow: 'rgba(192, 132, 252, 0.28)',
            borderFlow: 'linear-gradient(90deg, #c084fc, #818cf8, #38bdf8)',
            bg: 'rgba(12, 13, 18, 0.82)',
            bgSolid: '#0c0d12',
            surface: 'rgba(255, 255, 255, 0.035)',
            surfaceHover: 'rgba(255, 255, 255, 0.07)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(192, 132, 252, 0.35)',
            text: '#f2f4f8',
            textMuted: '#8a92a6'
        },
        crimson: {
            name: 'Crimson',
            accent: '#ff4466',
            accentDim: '#cc2244',
            accentGlow: 'rgba(255, 68, 102, 0.28)',
            borderFlow: 'linear-gradient(90deg, #ff4466, #ff8800, #ff4466)',
            bg: 'rgba(15, 11, 12, 0.84)',
            bgSolid: '#0f0b0c',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(255, 68, 102, 0.35)',
            text: '#fdf2f4',
            textMuted: '#9e858a'
        },
        arctic: {
            name: 'Arctic',
            accent: '#38bdf8',
            accentDim: '#0284c7',
            accentGlow: 'rgba(56, 189, 248, 0.28)',
            borderFlow: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)',
            bg: 'rgba(10, 12, 18, 0.82)',
            bgSolid: '#0a0c12',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.075)',
            borderHover: 'rgba(56, 189, 248, 0.35)',
            text: '#e6edf3',
            textMuted: '#7d8590'
        },
        midnight: {
            name: 'Midnight',
            accent: '#f0a500',
            accentDim: '#c07800',
            accentGlow: 'rgba(240, 165, 0, 0.28)',
            borderFlow: 'linear-gradient(90deg, #f0a500, #fbbf24, #f0a500)',
            bg: 'rgba(12, 11, 9, 0.84)',
            bgSolid: '#0c0b09',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(240, 165, 0, 0.35)',
            text: '#fbf5e8',
            textMuted: '#9a8d75'
        },
        matrix: {
            name: 'Matrix',
            accent: '#00ff41',
            accentDim: '#00bb30',
            accentGlow: 'rgba(0, 255, 65, 0.28)',
            borderFlow: 'linear-gradient(90deg, #00ff41, #00cc30, #00ff41)',
            bg: 'rgba(7, 13, 8, 0.84)',
            bgSolid: '#070d08',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(0, 255, 65, 0.35)',
            text: '#eafaea',
            textMuted: '#76947b'
        },
        rose: {
            name: 'Rose',
            accent: '#fb7185',
            accentDim: '#e11d48',
            accentGlow: 'rgba(251, 113, 133, 0.28)',
            borderFlow: 'linear-gradient(90deg, #fb7185, #fda4af, #fb7185)',
            bg: 'rgba(15, 10, 13, 0.84)',
            bgSolid: '#0f0a0d',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(251, 113, 133, 0.35)',
            text: '#fdf2f4',
            textMuted: '#9e858d'
        },
        mono: {
            name: 'Mono',
            accent: '#ffffff',
            accentDim: '#a1a1aa',
            accentGlow: 'rgba(255, 255, 255, 0.22)',
            borderFlow: 'linear-gradient(90deg, #ffffff, #71717a, #ffffff)',
            bg: 'rgba(11, 11, 13, 0.85)',
            bgSolid: '#0b0b0d',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(255, 255, 255, 0.35)',
            text: '#f4f4f5',
            textMuted: '#8b8b94'
        },
        sakura: {
            name: 'Sakura',
            accent: '#f472b6',
            accentDim: '#db2777',
            accentGlow: 'rgba(244, 114, 182, 0.28)',
            borderFlow: 'linear-gradient(90deg, #f472b6, #fbcfe8, #f472b6)',
            bg: 'rgba(16, 11, 15, 0.84)',
            bgSolid: '#100b0f',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(244, 114, 182, 0.35)',
            text: '#fdf2f8',
            textMuted: '#9e8593'
        }
    };

    const listeners = new Map();
    const on = (evt, fn) => {
        if (!listeners.has(evt)) listeners.set(evt, new Set());
        listeners.get(evt).add(fn);
        return () => listeners.get(evt)?.delete(fn);
    };
    const emit = (evt, data) => {
        listeners.get(evt)?.forEach(fn => {
            try { fn(data); } catch (e) { console.error('[Interium] Event error:', e); }
        });
    };

    const applyTheme = () => {
        let el = document.getElementById('int-theme-vars');
        if (!el) {
            el = document.createElement('style');
            el.id = 'int-theme-vars';
            (document.head || document.documentElement).appendChild(el);
        }
        const t = THEMES[config.theme] || THEMES.void;
        const accent = config.accentColor || t.accent;
        el.textContent = `
            :root {
                --int-bg: ${t.bg};
                --int-bg-solid: ${t.bgSolid};
                --int-surface: ${t.surface};
                --int-surface-hover: ${t.surfaceHover};
                --int-border: ${t.border};
                --int-border-hover: ${t.borderHover};
                --int-blur: blur(16px) saturate(170%);
                --int-radius: 12px;
                --int-accent: ${accent};
                --int-accent-dim: ${t.accentDim};
                --int-accent-glow: ${t.accentGlow};
                --int-border-flow: ${t.borderFlow};
                --int-text: ${t.text};
                --int-text-muted: ${t.textMuted};
                --int-shadow: 0 14px 44px rgba(0, 0, 0, 0.6);
            }
        `;
    };

    const saveConfig = (newCfg) => {
        config = Object.assign({}, config, newCfg);
        storage.set('config', config);
        applyTheme();
        emit('config:changed', config);
    };

    applyTheme();

    window.InteriumCore = Object.freeze({
        version: VERSION,
        config: () => config,
        saveConfig,
        storage,
        themes: THEMES,
        on,
        emit
    });
})();
