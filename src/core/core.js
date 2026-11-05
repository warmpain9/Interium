(function () {
    'use strict';

    if (window.InteriumCore) return;

    const VERSION = '2.0.0';

    const DEFAULT_CONFIG = {
        theme: 'void',
        accentColor: '#7c5cff',
        glassifyInventory: true,
        glassifyCatalog: true,
        glassifyNavbar: true,
        cardImageScale: 1.18,
        itemBadges: true,
        showRapOnCards: true,
        showValueOnCards: true,
        showProjectedWarning: true,
        compactCards: true,
        panelHotkey: 'KeyI',
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

    const saveConfig = (newCfg) => {
        config = Object.assign({}, config, newCfg);
        storage.set('config', config);
        applyTheme();
        emit('config:changed', config);
    };

    const THEMES = {
        void: {
            name: 'Void Dark',
            bg: 'rgba(13, 15, 22, 0.76)',
            bgSolid: '#0d0f16',
            surface: 'rgba(255, 255, 255, 0.035)',
            surfaceHover: 'rgba(255, 255, 255, 0.065)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(255, 255, 255, 0.18)',
            text: '#f2f4f8',
            textMuted: '#8a92a6',
            accent: '#7c5cff',
            accentGlow: 'rgba(124, 92, 255, 0.25)',
        },
        midnight: {
            name: 'Midnight',
            bg: 'rgba(10, 12, 18, 0.82)',
            bgSolid: '#0a0c12',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.055)',
            border: 'rgba(255, 255, 255, 0.065)',
            borderHover: 'rgba(56, 189, 248, 0.3)',
            text: '#e6edf3',
            textMuted: '#7d8590',
            accent: '#38bdf8',
            accentGlow: 'rgba(56, 189, 248, 0.25)',
        },
        emerald: {
            name: 'Emerald',
            bg: 'rgba(11, 18, 15, 0.8)',
            bgSolid: '#0b120f',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.06)',
            border: 'rgba(255, 255, 255, 0.07)',
            borderHover: 'rgba(52, 211, 153, 0.3)',
            text: '#eef6f2',
            textMuted: '#7fa393',
            accent: '#10b981',
            accentGlow: 'rgba(16, 185, 129, 0.25)',
        },
        crimson: {
            name: 'Crimson',
            bg: 'rgba(18, 12, 14, 0.82)',
            bgSolid: '#120c0e',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.06)',
            border: 'rgba(255, 255, 255, 0.075)',
            borderHover: 'rgba(244, 63, 94, 0.3)',
            text: '#fdf2f4',
            textMuted: '#9e858a',
            accent: '#f43f5e',
            accentGlow: 'rgba(244, 63, 94, 0.25)',
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
                --int-blur: blur(18px) saturate(160%);
                --int-radius: 12px;
                --int-accent: ${accent};
                --int-accent-glow: ${t.accentGlow};
                --int-text: ${t.text};
                --int-text-muted: ${t.textMuted};
                --int-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
            }
        `;
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
