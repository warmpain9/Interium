(function () {
    'use strict';

    if (window.InteriumUI) return;

    const core = window.InteriumCore;
    const trading = window.InteriumTrading;
    const cfg = core ? core.config() : {};

    const SITE_API = (typeof location !== 'undefined' && location.origin && !location.origin.startsWith('null') ? location.origin : 'https://www.echocr.xyz') + '/apisite';
    const ASSET_BASE = 'https://raw.githubusercontent.com/warmpain9/Interium/v2-echocore/assets/';

    const state = {
        user: { id: null, name: 'Guest', robux: 0, tickets: 0, avatarUrl: '' },
        panelOpen: true,
        panelMinimized: false,
        ping: 0,
        fps: 60,
        drag: { active: false, ox: 0, oy: 0, px: 0, py: 0 },
        wmDrag: { active: false, ox: 0, oy: 0, px: 0, py: 0 }
    };

    const injectFonts = () => {
        if (document.getElementById('int-fonts')) return;
        const link = document.createElement('link');
        link.id = 'int-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Share+Tech+Mono&family=Rajdhani:wght@500;700&family=Space+Grotesk:wght@500;700&display=swap';
        document.head.appendChild(link);
    };

    const injectStyles = () => {
        let el = document.getElementById('int-ui-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'int-ui-styles';
            (document.head || document.documentElement).appendChild(el);
        }

        const t = core?.themes[cfg.theme] || core?.themes.void;
        const c = core ? core.config() : cfg;

        el.textContent = `
            @keyframes int-flow {
                0% { background-position: 0% 50%; }
                100% { background-position: 200% 50%; }
            }

            :root {
                --int-card-scale: ${c.cardImageScale || 1.18};
                --int-panel-scale: ${(c.guiScale || 100) / 100};
                --int-page-font: ${c.miscPageFont && c.miscPageFont !== 'Default (Site Font)' ? `'${c.miscPageFont}', sans-serif` : 'inherit'};
                --int-gui-font: ${c.miscGuiFont ? `'${c.miscGuiFont}', monospace` : `'Share Tech Mono', monospace`};
            }

            body {
                font-family: var(--int-page-font) !important;
            }

            /* --- Inventory Thumbnail & Layout Fix --- */
            [class*="itemCard-"] {
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                background: var(--int-surface) !important;
                backdrop-filter: var(--int-blur) !important;
                -webkit-backdrop-filter: var(--int-blur) !important;
                border: 1px solid var(--int-border) !important;
                border-radius: var(--int-radius) !important;
                padding: 10px !important;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease !important;
                overflow: visible !important;
            }

            [class*="itemCard-"]:hover {
                transform: translateY(-2px) !important;
                border-color: var(--int-border-hover) !important;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4), 0 0 16px var(--int-accent-glow) !important;
            }

            [class*="itemCard-"] [class*="itemImage-"] {
                aspect-ratio: 1 / 1 !important;
                width: 100% !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 0 8px 0 !important;
                overflow: hidden !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: rgba(255, 255, 255, 0.02) !important;
                border-radius: calc(var(--int-radius) - 4px) !important;
                position: relative !important;
            }

            [class*="itemCard-"] [class*="image-"] {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            [class*="itemCard-"] img {
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: 100% !important;
                object-fit: contain !important;
                transform: scale(var(--int-card-scale)) !important;
                transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }

            [class*="itemCard-"]:hover img {
                transform: scale(calc(var(--int-card-scale) * 1.08)) !important;
            }

            [class*="itemCard-"] [class*="serial-"] {
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                float: none !important;
                margin: 0 !important;
                z-index: 6 !important;
                background: rgba(13, 15, 22, 0.8) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.14) !important;
                border-radius: 6px !important;
                padding: 2px 7px !important;
                font-weight: 700 !important;
                font-size: 11px !important;
                letter-spacing: 0.3px !important;
                color: #fff !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
            }

            /* --- Glassify Surfaces --- */
            nav.navbar, [class*="navbar-"] {
                ${c.navbarEnabled ? `
                    background: ${c.navbarMode === 'transparent' ? 'transparent' : c.navbarColour + Math.round((c.navbarOpacity / 100) * 255).toString(16).padStart(2, '0')} !important;
                    ${c.navbarMode === 'blur' ? `backdrop-filter: blur(${c.navbarBlurAmount || 18}px) saturate(180%) !important; -webkit-backdrop-filter: blur(${c.navbarBlurAmount || 18}px) saturate(180%) !important;` : ''}
                    border-bottom: 1px solid var(--int-border) !important;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
                ` : ''}
            }

            [class*="categoryBgDesktop-"], [class*="sidebar-"] {
                ${c.sidebarEnabled ? `
                    background: ${c.sidebarMode === 'transparent' ? 'transparent' : c.sidebarColour + Math.round((c.sidebarOpacity / 100) * 255).toString(16).padStart(2, '0')} !important;
                    ${c.sidebarMode === 'blur' ? `backdrop-filter: blur(${c.sidebarBlurAmount || 16}px) saturate(180%) !important; -webkit-backdrop-filter: blur(${c.sidebarBlurAmount || 16}px) saturate(180%) !important;` : ''}
                    border: 1px solid var(--int-border) !important;
                    border-radius: var(--int-radius) !important;
                ` : ''}
            }

            [class*="cardWrapper-"], [class*="cardContainer-"] {
                background: var(--int-surface) !important;
                backdrop-filter: var(--int-blur) !important;
                -webkit-backdrop-filter: var(--int-blur) !important;
                border: 1px solid var(--int-border) !important;
                border-radius: var(--int-radius) !important;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease !important;
            }

            [class*="cardWrapper-"]:hover, [class*="cardContainer-"]:hover {
                transform: translateY(-2px) !important;
                border-color: var(--int-border-hover) !important;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4), 0 0 16px var(--int-accent-glow) !important;
            }

            /* --- Card Item Meta --- */
            .int-card-meta {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 6px;
                font-family: var(--int-gui-font);
            }

            .int-meta-row {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
            }

            .int-val {
                font-size: 11px;
                font-weight: 700;
                color: var(--int-accent);
                background: rgba(124, 92, 255, 0.12);
                border: 1px solid var(--int-accent-glow);
                border-radius: 5px;
                padding: 1px 6px;
            }

            .int-rap {
                font-size: 11px;
                font-weight: 600;
                color: var(--int-text-muted);
            }

            .int-badge {
                align-self: flex-start;
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.5px;
                padding: 1px 5px;
                border-radius: 4px;
                text-transform: uppercase;
            }

            .int-proj {
                background: rgba(239, 68, 68, 0.16);
                border: 1px solid rgba(239, 68, 68, 0.45);
                color: #f87171;
            }

            .int-rare {
                background: rgba(16, 185, 129, 0.16);
                border: 1px solid rgba(16, 185, 129, 0.45);
                color: #34d399;
            }

            /* --- Floating HUD Panel --- */
            #int-panel {
                all: initial;
                position: fixed;
                top: 22px;
                right: 22px;
                z-index: 2147483647;
                width: 420px;
                max-width: calc(100vw - 32px);
                background: var(--int-bg-solid);
                background: var(--int-bg);
                backdrop-filter: var(--int-blur);
                -webkit-backdrop-filter: var(--int-blur);
                border: 1px solid var(--int-border);
                border-radius: 20px;
                box-shadow: var(--int-shadow), 0 0 0 1px rgba(255, 255, 255, 0.04);
                font-family: var(--int-gui-font);
                color: var(--int-text);
                overflow: hidden;
                user-select: none;
                transform-origin: top right;
                transform: scale(var(--int-panel-scale));
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
            }

            #int-panel.int-hidden {
                display: none !important;
            }

            #int-panel-border {
                height: 3px;
                width: 100%;
                background: var(--int-border-flow);
                background-size: 200% 100%;
                animation: int-flow 6s linear infinite;
            }

            #int-panel-header {
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid var(--int-border);
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: grab;
            }

            #int-panel-header:active {
                cursor: grabbing;
            }

            .int-header-avatar {
                position: relative;
                width: 38px;
                height: 38px;
                flex-shrink: 0;
            }

            .int-avatar-glow {
                position: absolute;
                inset: -2px;
                border-radius: 50%;
                background: conic-gradient(from 0deg, var(--int-accent), transparent, var(--int-accent));
                opacity: 0.6;
            }

            .int-avatar-img {
                position: relative;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                border: 2px solid var(--int-accent);
                background: #111;
                object-fit: cover;
            }

            .int-online-dot {
                position: absolute;
                bottom: 0;
                right: 0;
                width: 9px;
                height: 9px;
                background: #10b981;
                border-radius: 50%;
                border: 2px solid #0c0d12;
                box-shadow: 0 0 8px #10b981;
            }

            .int-header-user {
                flex: 1;
                min-width: 0;
            }

            .int-header-tag {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.2em;
                text-transform: uppercase;
                color: var(--int-accent);
                line-height: 1;
                margin-bottom: 3px;
            }

            .int-header-name {
                font-size: 13.5px;
                font-weight: 700;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
            }

            .int-currency-wrap {
                display: flex;
                flex-direction: column;
                gap: 4px;
                align-items: flex-end;
            }

            .int-curr-pill {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 2px 8px;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid var(--int-border);
                border-radius: 9999px;
                font-size: 10px;
                font-weight: 700;
            }

            .int-curr-robux {
                color: #10b981;
            }

            .int-curr-tickets {
                color: #f0a500;
            }

            .int-win-controls {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-left: 2px;
            }

            .int-win-btn {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                transition: opacity 0.15s;
            }

            .int-win-btn:hover {
                opacity: 0.8;
            }

            .int-btn-min { background: #febc2e; }
            .int-btn-close { background: #ff5f57; }

            /* --- Tab Navigation --- */
            #int-tab-bar {
                display: flex;
                align-items: flex-end;
                background: rgba(0, 0, 0, 0.25);
                border-bottom: 1px solid var(--int-border);
                padding: 0 4px;
                overflow-x: auto;
                scrollbar-width: none;
            }

            .int-tab-btn {
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--int-text-muted);
                padding: 8px 12px;
                font-family: inherit;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                cursor: pointer;
                transition: color 0.15s, border-color 0.15s;
                white-space: nowrap;
            }

            .int-tab-btn:hover {
                color: #fff;
            }

            .int-tab-btn.int-active {
                color: #fff;
                border-bottom-color: var(--int-accent);
            }

            /* --- Tab Content Panes --- */
            #int-tab-container {
                max-height: 480px;
                overflow-y: auto;
                padding: 14px 16px;
            }

            .int-tab-pane {
                display: none;
                flex-direction: column;
                gap: 12px;
            }

            .int-tab-pane.int-active {
                display: flex;
            }

            .int-section-title {
                font-size: 10.5px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--int-accent);
                margin-top: 4px;
                border-bottom: 1px solid var(--int-border);
                padding-bottom: 4px;
            }

            .int-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                font-size: 12px;
                color: var(--int-text);
            }

            .int-row-sub {
                padding-left: 10px;
                font-size: 11px;
                color: var(--int-text-muted);
            }

            .int-input-txt, .int-select-ctrl {
                background: rgba(0, 0, 0, 0.35);
                border: 1px solid var(--int-border);
                border-radius: 6px;
                padding: 5px 8px;
                color: #fff;
                font-family: inherit;
                font-size: 11px;
                outline: none;
            }

            .int-input-txt:focus, .int-select-ctrl:focus {
                border-color: var(--int-accent);
            }

            .int-mode-pill {
                display: inline-flex;
                background: rgba(0, 0, 0, 0.4);
                border: 1px solid var(--int-border);
                border-radius: 6px;
                overflow: hidden;
            }

            .int-mode-btn {
                background: transparent;
                border: none;
                padding: 3px 8px;
                color: var(--int-text-muted);
                font-family: inherit;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
            }

            .int-mode-btn.int-active {
                background: var(--int-accent);
                color: #fff;
            }

            /* Theme Grid */
            .int-themes-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
            }

            .int-theme-box {
                padding: 8px 6px;
                border-radius: 8px;
                border: 1px solid var(--int-border);
                background: rgba(0, 0, 0, 0.25);
                color: var(--int-text-muted);
                font-size: 11px;
                font-weight: 700;
                text-align: center;
                cursor: pointer;
                transition: all 0.15s;
            }

            .int-theme-box:hover {
                color: #fff;
                border-color: var(--int-border-hover);
            }

            .int-theme-box.int-active {
                border-color: var(--int-accent);
                color: #fff;
                box-shadow: 0 0 12px var(--int-accent-glow);
                background: rgba(255, 255, 255, 0.04);
            }

            /* Toggle Switch */
            .int-switch {
                position: relative;
                display: inline-block;
                width: 34px;
                height: 18px;
                flex-shrink: 0;
            }

            .int-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .int-slider {
                position: absolute;
                cursor: pointer;
                inset: 0;
                background-color: rgba(255, 255, 255, 0.12);
                border: 1px solid var(--int-border);
                transition: 0.2s;
                border-radius: 34px;
            }

            .int-slider:before {
                position: absolute;
                content: "";
                height: 12px;
                width: 12px;
                left: 2px;
                bottom: 2px;
                background-color: #fff;
                transition: 0.2s;
                border-radius: 50%;
            }

            .int-switch input:checked + .int-slider {
                background-color: var(--int-accent);
                border-color: var(--int-accent);
            }

            .int-switch input:checked + .int-slider:before {
                transform: translateX(16px);
            }

            /* Watermark Widget */
            #int-watermark {
                position: fixed;
                bottom: 14px;
                left: 14px;
                z-index: 2147483640;
                background: rgba(10, 11, 16, 0.8);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid var(--int-border);
                border-radius: 8px;
                padding: 4px 10px;
                font-family: var(--int-gui-font);
                font-size: 11px;
                font-weight: 700;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: grab;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
                user-select: none;
            }

            #int-watermark:active {
                cursor: grabbing;
            }

            .int-wm-tag {
                color: var(--int-accent);
                letter-spacing: 0.1em;
            }

            .int-wm-divider {
                color: rgba(255, 255, 255, 0.2);
            }

            /* Custom Background Layer */
            #int-custom-bg {
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                background-size: cover;
                background-position: center;
            }

            #int-custom-bg-overlay {
                position: absolute;
                inset: 0;
                background: #000;
            }

            /* Avatar In-Page Tool */
            #int-avatar-tools {
                margin-top: 14px;
                padding: 14px;
                border-radius: var(--int-radius);
                background: var(--int-surface);
                backdrop-filter: var(--int-blur);
                -webkit-backdrop-filter: var(--int-blur);
                border: 1px solid var(--int-border);
                font-family: var(--int-gui-font);
                color: var(--int-text);
            }
        `;
    };

    const fetchUserData = async () => {
        try {
            const uRes = await fetch(`${SITE_API}/users/v1/users/authenticated`, { credentials: 'include' });
            if (!uRes.ok) return;
            const u = await uRes.json();
            state.user.id = u.id || u.userId;
            state.user.name = u.displayName || u.name || 'User';

            const cRes = await fetch(`${SITE_API}/economy/v1/users/${state.user.id}/currency`, { credentials: 'include' });
            if (cRes.ok) {
                const cur = await cRes.json();
                state.user.robux = cur.robux ?? 0;
                state.user.tickets = cur.tickets ?? 0;
            }

            const hRes = await fetch(`${SITE_API}/thumbnails/v1/users/avatar-headshot?userIds=${state.user.id}&size=60x60&format=Png`, { credentials: 'include' });
            if (hRes.ok) {
                const hd = await hRes.json();
                state.user.avatarUrl = hd?.data?.[0]?.imageUrl || '';
            }

            updateHeaderUI();
        } catch (e) {
            console.warn('[Interium] User fetch error:', e);
        }
    };

    const updateHeaderUI = () => {
        const nameEl = document.getElementById('int-header-name');
        const robuxEl = document.getElementById('int-header-robux');
        const ticketsEl = document.getElementById('int-header-tickets');
        const imgEl = document.getElementById('int-header-img');

        if (nameEl) nameEl.textContent = state.user.name;
        if (robuxEl) robuxEl.textContent = Number(state.user.robux).toLocaleString();
        if (ticketsEl) ticketsEl.textContent = Number(state.user.tickets).toLocaleString();
        if (imgEl && state.user.avatarUrl) imgEl.src = state.user.avatarUrl;
    };

    /* --- Particle Canvas Engine --- */
    let fxCanvas = null, fxCtx = null, fxRaf = null, fxParticles = [], fxLast = 0;
    const stopEffects = () => {
        if (fxRaf) cancelAnimationFrame(fxRaf);
        fxRaf = null;
        if (fxCanvas) { fxCanvas.remove(); fxCanvas = null; fxCtx = null; }
        fxParticles = [];
    };

    const initEffects = () => {
        const c = core ? core.config() : cfg;
        const type = c.effectType || 'none';
        stopEffects();
        if (type === 'none' || !document.body) return;

        fxCanvas = document.createElement('canvas');
        fxCanvas.id = 'int-effects-canvas';
        fxCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1;';
        document.body.insertBefore(fxCanvas, document.body.firstChild);
        fxCtx = fxCanvas.getContext('2d');

        const resize = () => {
            fxCanvas.width = window.innerWidth;
            fxCanvas.height = window.innerHeight;
            spawnParticles(type, fxCanvas.width, fxCanvas.height);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

        fxLast = performance.now();
        const loop = (now) => {
            const dt = Math.min(3, (now - fxLast) / 16.67);
            fxLast = now;
            drawParticles(type, dt);
            fxRaf = requestAnimationFrame(loop);
        };
        fxRaf = requestAnimationFrame(loop);
    };

    const spawnParticles = (type, w, h) => {
        fxParticles = [];
        const c = core ? core.config() : cfg;
        const intensity = (c.effectIntensity || 50) / 100;

        if (type === 'snow') {
            const count = Math.round(50 + intensity * 150);
            for (let i = 0; i < count; i++) {
                fxParticles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 1 + Math.random() * 2.5,
                    vy: 0.5 + Math.random() * 1.2,
                    drift: 0.2 + Math.random() * 0.8
                });
            }
        } else if (type === 'rain') {
            const count = Math.round(80 + intensity * 240);
            for (let i = 0; i < count; i++) {
                fxParticles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    len: 8 + Math.random() * 16,
                    vy: 7 + Math.random() * 8,
                    vx: -1 - Math.random() * 1.5
                });
            }
        } else if (type === 'stars') {
            const count = Math.round(60 + intensity * 180);
            for (let i = 0; i < count; i++) {
                fxParticles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: 0.5 + Math.random() * 1.5,
                    alpha: Math.random(),
                    dAlpha: 0.01 + Math.random() * 0.02
                });
            }
        } else if (type === 'matrix') {
            const cols = Math.floor(w / 18);
            for (let i = 0; i < cols; i++) {
                fxParticles.push({
                    x: i * 18,
                    y: Math.random() * h,
                    speed: 2 + Math.random() * 4
                });
            }
        }
    };

    const drawParticles = (type, dt) => {
        if (!fxCtx || !fxCanvas) return;
        const w = fxCanvas.width, h = fxCanvas.height;
        const c = core ? core.config() : cfg;
        const spd = (c.effectSpeed || 50) / 50;
        const col = c.effectColor || (core?.themes[c.theme]?.accent || '#fff');

        if (type === 'matrix') {
            fxCtx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            fxCtx.fillRect(0, 0, w, h);
            fxCtx.fillStyle = col;
            fxCtx.font = '14px monospace';
            const chars = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ'.split('');
            for (const p of fxParticles) {
                const char = chars[Math.floor(Math.random() * chars.length)];
                fxCtx.fillText(char, p.x, p.y);
                p.y += p.speed * spd * dt;
                if (p.y > h && Math.random() > 0.97) p.y = 0;
            }
            return;
        }

        fxCtx.clearRect(0, 0, w, h);

        if (type === 'snow') {
            fxCtx.fillStyle = col;
            for (const p of fxParticles) {
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                fxCtx.fill();
                p.y += p.vy * spd * dt;
                p.x += Math.sin(p.y * 0.02) * p.drift;
                if (p.y > h) p.y = -5;
                if (p.x > w) p.x = 0;
                if (p.x < 0) p.x = w;
            }
        } else if (type === 'rain') {
            fxCtx.strokeStyle = col;
            fxCtx.lineWidth = 1.2;
            for (const p of fxParticles) {
                fxCtx.beginPath();
                fxCtx.moveTo(p.x, p.y);
                fxCtx.lineTo(p.x + p.vx * 2, p.y + p.len);
                fxCtx.stroke();
                p.y += p.vy * spd * dt;
                p.x += p.vx * spd * dt;
                if (p.y > h) { p.y = -p.len; p.x = Math.random() * w; }
            }
        } else if (type === 'stars') {
            for (const p of fxParticles) {
                p.alpha += p.dAlpha;
                if (p.alpha > 1 || p.alpha < 0) p.dAlpha = -p.dAlpha;
                fxCtx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, p.alpha))})`;
                fxCtx.beginPath();
                fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                fxCtx.fill();
            }
        }
    };

    /* --- Custom Background --- */
    const applyCustomBackground = () => {
        const c = core ? core.config() : cfg;
        let bg = document.getElementById('int-custom-bg');
        if (!c.miscBgUrl) {
            if (bg) bg.remove();
            return;
        }
        if (!bg) {
            bg = document.createElement('div');
            bg.id = 'int-custom-bg';
            bg.innerHTML = `<div id="int-custom-bg-overlay"></div>`;
            document.body.insertBefore(bg, document.body.firstChild);
        }
        bg.style.backgroundImage = `url('${c.miscBgUrl}')`;
        bg.style.filter = c.miscBgBlur ? `blur(${c.miscBgBlurAmount || 12}px)` : 'none';
        const ov = bg.querySelector('#int-custom-bg-overlay');
        if (ov) {
            ov.style.opacity = c.miscBgDarkOverlay ? (c.miscBgDarkOpacity || 55) / 100 : 0;
        }
    };

    /* --- Watermark HUD --- */
    let lastFrameTime = performance.now();
    let frameCount = 0;
    const calcFps = () => {
        const now = performance.now();
        frameCount++;
        if (now >= lastFrameTime + 1000) {
            state.fps = Math.round((frameCount * 1000) / (now - lastFrameTime));
            frameCount = 0;
            lastFrameTime = now;
            updateWatermark();
        }
        requestAnimationFrame(calcFps);
    };

    const updateWatermark = () => {
        const c = core ? core.config() : cfg;
        let wm = document.getElementById('int-watermark');
        if (!c.watermarkEnabled) {
            if (wm) wm.remove();
            return;
        }
        if (!wm) {
            wm = document.createElement('div');
            wm.id = 'int-watermark';
            document.body.appendChild(wm);

            wm.addEventListener('mousedown', (e) => {
                state.wmDrag.active = true;
                const r = wm.getBoundingClientRect();
                state.wmDrag.ox = r.left;
                state.wmDrag.oy = r.top;
                state.wmDrag.px = e.clientX;
                state.wmDrag.py = e.clientY;
                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!state.wmDrag.active) return;
                const dx = e.clientX - state.wmDrag.px;
                const dy = e.clientY - state.wmDrag.py;
                wm.style.left = `${state.wmDrag.ox + dx}px`;
                wm.style.top = `${state.wmDrag.oy + dy}px`;
                wm.style.bottom = 'auto';
                wm.style.right = 'auto';
            });

            window.addEventListener('mouseup', () => {
                state.wmDrag.active = false;
            });
        }

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        wm.innerHTML = `
            <span class="int-wm-tag">INTERIUM</span>
            ${c.watermarkShowTime ? `<span class="int-wm-divider">|</span><span>${timeStr}</span>` : ''}
            ${c.watermarkShowFps ? `<span class="int-wm-divider">|</span><span>${state.fps} FPS</span>` : ''}
            ${c.watermarkShowPing ? `<span class="int-wm-divider">|</span><span>${state.ping || 18}ms</span>` : ''}
            ${c.watermarkShowUser && state.user.name ? `<span class="int-wm-divider">|</span><span>${state.user.name}</span>` : ''}
        `;
        wm.style.opacity = (c.watermarkOpacity || 85) / 100;
        wm.style.transform = `scale(${(c.watermarkScale || 100) / 100})`;
    };

    /* --- Avatar In-Page Tool --- */
    const renderAvatarTools = () => {
        if (!location.pathname.match(/\/avatar/i) && !location.pathname.match(/\/My\/Avatar/i)) return;
        if (document.getElementById('int-avatar-tools')) return;

        const anchor = document.querySelector('[class*="avatarThumbContainer"], [class*="avatarCardWrapper"]');
        if (!anchor || !anchor.parentElement) return;

        const card = document.createElement('div');
        card.id = 'int-avatar-tools';
        card.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--int-accent);">Avatar Background</span>
                <span style="font-size:10px;color:var(--int-text-muted);">23 Presets</span>
            </div>
            <div id="int-av-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:180px;overflow-y:auto;margin-bottom:10px;"></div>
            <input type="text" id="int-av-custom" class="int-input-txt" placeholder="Custom URL: image / gif / mp4 (press Enter)" style="width:100%;box-sizing:border-box;" />
        `;
        anchor.parentElement.insertBefore(card, anchor.nextSibling);

        const grid = card.querySelector('#int-av-grid');
        const c = core ? core.config() : cfg;

        // OFF tile
        const offTile = document.createElement('div');
        offTile.style.cssText = 'aspect-ratio:1;border-radius:6px;background:rgba(0,0,0,0.4);border:1px solid var(--int-border);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;font-weight:700;color:var(--int-text-muted);';
        offTile.textContent = 'OFF';
        offTile.addEventListener('click', () => {
            core?.saveConfig({ avatarBgEnabled: false, avatarBgImage: '' });
            applyAvatarBg();
        });
        grid.appendChild(offTile);

        // 23 presets
        for (let i = 1; i <= 23; i++) {
            const url = `${ASSET_BASE}avatar-bgs/${i}.png`;
            const tile = document.createElement('div');
            tile.style.cssText = `aspect-ratio:1;border-radius:6px;background-image:url('${url}');background-size:cover;background-position:center;border:1px solid var(--int-border);cursor:pointer;transition:transform 0.12s;`;
            tile.addEventListener('mouseenter', () => tile.style.transform = 'scale(1.08)');
            tile.addEventListener('mouseleave', () => tile.style.transform = 'scale(1)');
            tile.addEventListener('click', () => {
                core?.saveConfig({ avatarBgEnabled: true, avatarBgImage: url });
                applyAvatarBg();
            });
            grid.appendChild(tile);
        }

        const customInp = card.querySelector('#int-av-custom');
        if (c.avatarBgImage) customInp.value = c.avatarBgImage;
        customInp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = customInp.value.trim();
                core?.saveConfig({ avatarBgEnabled: !!val, avatarBgImage: val });
                applyAvatarBg();
            }
        });
    };

    const applyAvatarBg = () => {
        const c = core ? core.config() : cfg;
        const host = document.querySelector('[class*="avatarCardWrapper"], [class*="avatarThumbContainer"]');
        if (!host) return;

        let bgEl = host.querySelector('#int-avatar-bg-layer');
        if (!c.avatarBgEnabled || !c.avatarBgImage) {
            if (bgEl) bgEl.remove();
            return;
        }

        if (!bgEl) {
            bgEl = document.createElement('div');
            bgEl.id = 'int-avatar-bg-layer';
            bgEl.style.cssText = 'position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;pointer-events:none;background-size:cover;background-position:center;';
            host.insertBefore(bgEl, host.firstChild);
        }
        bgEl.style.backgroundImage = `url('${c.avatarBgImage}')`;
        bgEl.style.filter = c.avatarBgBlur ? `blur(${c.avatarBgBlur}px)` : 'none';
    };

    /* --- Floating HUD Panel Construction --- */
    const renderHUD = () => {
        if (document.getElementById('int-panel')) return;

        const c = core ? core.config() : cfg;

        const panel = document.createElement('div');
        panel.id = 'int-panel';
        panel.innerHTML = `
            <div id="int-panel-border"></div>
            <div id="int-panel-header">
                <div class="int-header-avatar">
                    <div class="int-avatar-glow"></div>
                    <img id="int-header-img" class="int-avatar-img" src="" alt="" />
                    <div class="int-online-dot"></div>
                </div>
                <div class="int-header-user">
                    <div class="int-header-tag">INTERIUM v${core?.version || '2.0'}</div>
                    <div id="int-header-name" class="int-header-name">${state.user.name}</div>
                </div>
                <div class="int-currency-wrap">
                    <div class="int-curr-pill int-curr-robux">
                        <span>R$</span>
                        <span id="int-header-robux">${state.user.robux}</span>
                    </div>
                    <div class="int-curr-pill int-curr-tickets">
                        <span>Tx</span>
                        <span id="int-header-tickets">${state.user.tickets}</span>
                    </div>
                </div>
                <div class="int-win-controls">
                    <button class="int-win-btn int-btn-min" id="int-btn-min" title="Minimize"></button>
                    <button class="int-win-btn int-btn-close" id="int-btn-close" title="Hide"></button>
                </div>
            </div>
            <div id="int-panel-body">
                <div id="int-tab-bar">
                    <button class="int-tab-btn int-active" data-tab="profile">PROFILE</button>
                    <button class="int-tab-btn" data-tab="market">MARKET</button>
                    <button class="int-tab-btn" data-tab="trade">TRADE</button>
                    <button class="int-tab-btn" data-tab="visuals">VISUALS</button>
                    <button class="int-tab-btn" data-tab="cfg">CFG</button>
                </div>
                <div id="int-tab-container">
                    <!-- PROFILE TAB -->
                    <div class="int-tab-pane int-active" id="int-pane-profile">
                        <div class="int-section-title">Profile Banner</div>
                        <div class="int-row">
                            <span>Enable Profile Banner</span>
                            <label class="int-switch">
                                <input type="checkbox" id="cfg-profileBannerEnabled" ${c.profileBannerEnabled ? 'checked' : ''}>
                                <span class="int-slider"></span>
                            </label>
                        </div>
                        <div class="int-row">
                            <input type="text" class="int-input-txt" id="cfg-profileBannerImage" placeholder="Direct Image / GIF URL (press Enter)" style="width:100%;" value="${c.profileBannerImage || ''}">
                        </div>
                        <div class="int-row">
                            <span class="int-row-sub">Blur Amount</span>
                            <div style="display:flex;align-items:center;gap:4px;">
                                <input type="number" class="int-input-txt" id="cfg-profileBannerBlur" min="0" max="40" step="1" style="width:50px;" value="${c.profileBannerBlur || 0}">
                                <span style="font-size:10px;color:var(--int-text-muted);">px</span>
                            </div>
                        </div>
                        <div class="int-row">
                            <span class="int-row-sub">Brightness</span>
                            <div style="display:flex;align-items:center;gap:4px;">
                                <input type="number" class="int-input-txt" id="cfg-profileBannerBrightness" min="20" max="150" step="5" style="width:50px;" value="${c.profileBannerBrightness || 100}">
                                <span style="font-size:10px;color:var(--int-text-muted);">%</span>
                            </div>
                        </div>
                        <div style="font-size:11px;color:var(--int-text-muted);padding:8px;background:rgba(0,0,0,0.25);border-radius:6px;line-height:1.5;">
                            Profile banners are rendered client-side on your user profile card.
                        </div>
                    </div>

                    <!-- MARKET TAB -->
                    <div class="int-tab-pane" id="int-pane-market">
                        <div style="display:flex;gap:8px;">
                            <input type="text" class="int-input-txt" id="int-mkt-search" placeholder="Search limiteds..." style="flex:1;">
                            <select class="int-select-ctrl" id="int-mkt-sort">
                                <option value="value">Value</option>
                                <option value="rap">RAP</option>
                                <option value="demand">Demand</option>
                                <option value="name">Name</option>
                            </select>
                        </div>
                        <div id="int-mkt-list" style="display:flex;flex-direction:column;gap:6px;max-height:360px;overflow-y:auto;margin-top:6px;"></div>
                    </div>

                    <!-- TRADE TAB -->
                    <div class="int-tab-pane" id="int-pane-trade">
                        <div class="int-section-title">Trade Evaluator</div>
                        <div style="font-size:11px;color:var(--int-text-muted);">
                            Evaluate fairness and differential using live Echomons market values.
                        </div>
                        <div style="display:flex;gap:8px;margin-top:4px;">
                            <div style="flex:1;">
                                <div style="font-size:10px;color:var(--int-text-muted);margin-bottom:3px;">Your Items (IDs)</div>
                                <input type="text" class="int-input-txt" id="int-tc-give" placeholder="e.g. 190272, 83451" style="width:100%;">
                            </div>
                            <div style="flex:1;">
                                <div style="font-size:10px;color:var(--int-text-muted);margin-bottom:3px;">Their Items (IDs)</div>
                                <input type="text" class="int-input-txt" id="int-tc-recv" placeholder="e.g. 982145" style="width:100%;">
                            </div>
                        </div>
                        <div id="int-tc-result" style="padding:10px;background:rgba(0,0,0,0.3);border-radius:8px;border:1px solid var(--int-border);font-size:12px;margin-top:4px;">
                            Enter Asset IDs above to analyze.
                        </div>
                    </div>

                    <!-- VISUALS TAB -->
                    <div class="int-tab-pane" id="int-pane-visuals">
                        <div class="int-section-title">Universal Navigation</div>
                        <div class="int-row">
                            <span>Navbar Styling</span>
                            <div class="int-mode-pill" id="int-navbar-mode-pill">
                                <button class="int-mode-btn ${c.navbarMode === 'blur' ? 'int-active' : ''}" data-mode="blur">Blur</button>
                                <button class="int-mode-btn ${c.navbarMode === 'transparent' ? 'int-active' : ''}" data-mode="transparent">Clear</button>
                                <button class="int-mode-btn ${c.navbarMode === 'solid' ? 'int-active' : ''}" data-mode="solid">Solid</button>
                            </div>
                        </div>
                        <div class="int-row">
                            <span>Sidebar Styling</span>
                            <div class="int-mode-pill" id="int-sidebar-mode-pill">
                                <button class="int-mode-btn ${c.sidebarMode === 'blur' ? 'int-active' : ''}" data-mode="blur">Blur</button>
                                <button class="int-mode-btn ${c.sidebarMode === 'transparent' ? 'int-active' : ''}" data-mode="transparent">Clear</button>
                                <button class="int-mode-btn ${c.sidebarMode === 'solid' ? 'int-active' : ''}" data-mode="solid">Solid</button>
                            </div>
                        </div>

                        <div class="int-section-title">Background Effects & Media</div>
                        <div class="int-row">
                            <span>Particle Canvas</span>
                            <select class="int-select-ctrl" id="cfg-effectType">
                                <option value="none" ${c.effectType === 'none' ? 'selected' : ''}>None</option>
                                <option value="snow" ${c.effectType === 'snow' ? 'selected' : ''}>Snow</option>
                                <option value="rain" ${c.effectType === 'rain' ? 'selected' : ''}>Rain</option>
                                <option value="stars" ${c.effectType === 'stars' ? 'selected' : ''}>Stars</option>
                                <option value="matrix" ${c.effectType === 'matrix' ? 'selected' : ''}>Matrix</option>
                            </select>
                        </div>
                        <div class="int-row">
                            <span class="int-row-sub">Effect Intensity</span>
                            <input type="range" id="cfg-effectIntensity" min="10" max="100" step="5" value="${c.effectIntensity || 50}" style="width:110px;">
                        </div>
                        <div class="int-row">
                            <span>Custom Background URL</span>
                            <input type="text" class="int-input-txt" id="cfg-miscBgUrl" placeholder="Image / GIF URL" style="width:140px;" value="${c.miscBgUrl || ''}">
                        </div>

                        <div class="int-section-title">Inventory Card Engine</div>
                        <div class="int-row">
                            <span>1:1 Aspect-Ratio Image Fix</span>
                            <label class="int-switch">
                                <input type="checkbox" id="cfg-inventoryFixCards" ${c.inventoryFixCards !== false ? 'checked' : ''}>
                                <span class="int-slider"></span>
                            </label>
                        </div>
                        <div class="int-row">
                            <span class="int-row-sub">Image Scale Factor</span>
                            <input type="number" class="int-input-txt" id="cfg-cardImageScale" min="1" max="1.5" step="0.02" style="width:55px;" value="${c.cardImageScale || 1.18}">
                        </div>
                        <div class="int-row">
                            <span>Live Echomons Badges</span>
                            <label class="int-switch">
                                <input type="checkbox" id="cfg-itemBadges" ${c.itemBadges !== false ? 'checked' : ''}>
                                <span class="int-slider"></span>
                            </label>
                        </div>

                        <div class="int-section-title">Watermark HUD</div>
                        <div class="int-row">
                            <span>Enable Screen Watermark</span>
                            <label class="int-switch">
                                <input type="checkbox" id="cfg-watermarkEnabled" ${c.watermarkEnabled ? 'checked' : ''}>
                                <span class="int-slider"></span>
                            </label>
                        </div>

                        <div class="int-section-title">Custom Typography</div>
                        <div class="int-row">
                            <span>GUI Monospace Font</span>
                            <select class="int-select-ctrl" id="cfg-miscGuiFont">
                                <option value="Share Tech Mono" ${c.miscGuiFont === 'Share Tech Mono' ? 'selected' : ''}>Share Tech Mono</option>
                                <option value="JetBrains Mono" ${c.miscGuiFont === 'JetBrains Mono' ? 'selected' : ''}>JetBrains Mono</option>
                                <option value="Inter" ${c.miscGuiFont === 'Inter' ? 'selected' : ''}>Inter</option>
                                <option value="Space Grotesk" ${c.miscGuiFont === 'Space Grotesk' ? 'selected' : ''}>Space Grotesk</option>
                                <option value="Rajdhani" ${c.miscGuiFont === 'Rajdhani' ? 'selected' : ''}>Rajdhani</option>
                            </select>
                        </div>
                    </div>

                    <!-- CFG / SETTINGS TAB -->
                    <div class="int-tab-pane" id="int-pane-cfg">
                        <div class="int-section-title">Theme Preset</div>
                        <div class="int-themes-grid">
                            <div class="int-theme-box ${c.theme === 'void' ? 'int-active' : ''}" data-theme="void">Void</div>
                            <div class="int-theme-box ${c.theme === 'crimson' ? 'int-active' : ''}" data-theme="crimson">Crimson</div>
                            <div class="int-theme-box ${c.theme === 'arctic' ? 'int-active' : ''}" data-theme="arctic">Arctic</div>
                            <div class="int-theme-box ${c.theme === 'midnight' ? 'int-active' : ''}" data-theme="midnight">Midnight</div>
                            <div class="int-theme-box ${c.theme === 'matrix' ? 'int-active' : ''}" data-theme="matrix">Matrix</div>
                            <div class="int-theme-box ${c.theme === 'rose' ? 'int-active' : ''}" data-theme="rose">Rose</div>
                            <div class="int-theme-box ${c.theme === 'mono' ? 'int-active' : ''}" data-theme="mono">Mono</div>
                            <div class="int-theme-box ${c.theme === 'sakura' ? 'int-active' : ''}" data-theme="sakura">Sakura</div>
                        </div>

                        <div class="int-section-title">HUD Scale & Hotkeys</div>
                        <div class="int-row">
                            <span>GUI Scale</span>
                            <div style="display:flex;align-items:center;gap:4px;">
                                <input type="number" class="int-input-txt" id="cfg-guiScale" min="70" max="140" step="5" style="width:55px;" value="${c.guiScale || 100}">
                                <span style="font-size:10px;color:var(--int-text-muted);">%</span>
                            </div>
                        </div>
                        <div class="int-row">
                            <span>Toggle GUI Hotkey</span>
                            <input type="text" class="int-input-txt" id="cfg-hotkeyToggleGui" style="width:70px;text-align:center;" value="${c.hotkeyToggleGui || 'Insert'}">
                        </div>

                        <div class="int-section-title">Configuration Backup</div>
                        <div style="display:flex;gap:6px;">
                            <button id="int-cfg-export" class="int-mode-btn" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid var(--int-border);padding:6px;border-radius:6px;color:#fff;">Copy JSON</button>
                            <button id="int-cfg-reset" class="int-mode-btn" style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);padding:6px 12px;border-radius:6px;color:#f87171;">Reset</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        bindPanelEvents(panel);
    };

    const bindPanelEvents = (panel) => {
        const header = panel.querySelector('#int-panel-header');
        const minBtn = panel.querySelector('#int-btn-min');
        const closeBtn = panel.querySelector('#int-btn-close');
        const body = panel.querySelector('#int-panel-body');

        // Draggable
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.int-win-btn')) return;
            state.drag.active = true;
            const r = panel.getBoundingClientRect();
            state.drag.ox = r.left;
            state.drag.oy = r.top;
            state.drag.px = e.clientX;
            state.drag.py = e.clientY;
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!state.drag.active) return;
            const dx = e.clientX - state.drag.px;
            const dy = e.clientY - state.drag.py;
            panel.style.left = `${state.drag.ox + dx}px`;
            panel.style.top = `${state.drag.oy + dy}px`;
            panel.style.right = 'auto';
        });

        window.addEventListener('mouseup', () => {
            state.drag.active = false;
        });

        // Min & Close
        minBtn.addEventListener('click', () => {
            state.panelMinimized = !state.panelMinimized;
            body.style.display = state.panelMinimized ? 'none' : 'block';
        });

        closeBtn.addEventListener('click', () => {
            panel.classList.add('int-hidden');
            state.panelOpen = false;
        });

        // Tabs
        const tabBtns = panel.querySelectorAll('.int-tab-btn');
        const panes = panel.querySelectorAll('.int-tab-pane');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.toggle('int-active', b === btn));
                panes.forEach(p => p.classList.toggle('int-active', p.id === `int-pane-${target}`));
                if (target === 'market') populateMarketList();
            });
        });

        // Themes
        panel.querySelectorAll('.int-theme-box').forEach(box => {
            box.addEventListener('click', () => {
                const t = box.dataset.theme;
                panel.querySelectorAll('.int-theme-box').forEach(b => b.classList.toggle('int-active', b === box));
                core?.saveConfig({ theme: t });
                injectStyles();
            });
        });

        // Navbar Mode Pills
        panel.querySelectorAll('#int-navbar-mode-pill button').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('#int-navbar-mode-pill button').forEach(b => b.classList.remove('int-active'));
                btn.classList.add('int-active');
                core?.saveConfig({ navbarMode: btn.dataset.mode });
                injectStyles();
            });
        });

        // Sidebar Mode Pills
        panel.querySelectorAll('#int-sidebar-mode-pill button').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('#int-sidebar-mode-pill button').forEach(b => b.classList.remove('int-active'));
                btn.classList.add('int-active');
                core?.saveConfig({ sidebarMode: btn.dataset.mode });
                injectStyles();
            });
        });

        // Effects Selector
        const effectSel = panel.querySelector('#cfg-effectType');
        effectSel?.addEventListener('change', () => {
            core?.saveConfig({ effectType: effectSel.value });
            initEffects();
        });

        const intensitySlider = panel.querySelector('#cfg-effectIntensity');
        intensitySlider?.addEventListener('input', () => {
            core?.saveConfig({ effectIntensity: Number(intensitySlider.value) });
            initEffects();
        });

        // Custom Background Input
        const bgInput = panel.querySelector('#cfg-miscBgUrl');
        bgInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                core?.saveConfig({ miscBgUrl: bgInput.value.trim() });
                applyCustomBackground();
            }
        });

        // Scale & Image Fix
        const cardScaleInp = panel.querySelector('#cfg-cardImageScale');
        cardScaleInp?.addEventListener('change', () => {
            core?.saveConfig({ cardImageScale: Number(cardScaleInp.value) });
            injectStyles();
        });

        const fixCardsCb = panel.querySelector('#cfg-inventoryFixCards');
        fixCardsCb?.addEventListener('change', () => {
            core?.saveConfig({ inventoryFixCards: fixCardsCb.checked });
            injectStyles();
        });

        const badgesCb = panel.querySelector('#cfg-itemBadges');
        badgesCb?.addEventListener('change', () => {
            core?.saveConfig({ itemBadges: badgesCb.checked });
        });

        // GUI Scale
        const guiScaleInp = panel.querySelector('#cfg-guiScale');
        guiScaleInp?.addEventListener('change', () => {
            const sc = Number(guiScaleInp.value);
            core?.saveConfig({ guiScale: sc });
            injectStyles();
        });

        // Watermark toggle
        const wmCb = panel.querySelector('#cfg-watermarkEnabled');
        wmCb?.addEventListener('change', () => {
            core?.saveConfig({ watermarkEnabled: wmCb.checked });
            updateWatermark();
        });

        // Fonts
        const fontSel = panel.querySelector('#cfg-miscGuiFont');
        fontSel?.addEventListener('change', () => {
            core?.saveConfig({ miscGuiFont: fontSel.value });
            injectStyles();
        });

        // Config export / reset
        panel.querySelector('#int-cfg-export')?.addEventListener('click', () => {
            navigator.clipboard?.writeText(JSON.stringify(core?.config() || {}, null, 2));
            alert('Interium config copied to clipboard!');
        });

        panel.querySelector('#int-cfg-reset')?.addEventListener('click', () => {
            if (confirm('Reset Interium config to defaults?')) {
                localStorage.removeItem('int_config');
                location.reload();
            }
        });

        // Hotkey Toggle Handler
        window.addEventListener('keydown', (e) => {
            const hotkey = core?.config().hotkeyToggleGui || 'Insert';
            if (e.key === hotkey || e.code === hotkey) {
                state.panelOpen = !state.panelOpen;
                panel.classList.toggle('int-hidden', !state.panelOpen);
            }
        });

        // Market Search & Sort
        const mktSearch = panel.querySelector('#int-mkt-search');
        const mktSort = panel.querySelector('#int-mkt-sort');
        const renderMkt = () => populateMarketList(mktSearch.value, mktSort.value);
        mktSearch?.addEventListener('input', renderMkt);
        mktSort?.addEventListener('change', renderMkt);

        // Trade Calc
        const tcGive = panel.querySelector('#int-tc-give');
        const tcRecv = panel.querySelector('#int-tc-recv');
        const tcRes = panel.querySelector('#int-tc-result');
        const updateTc = () => {
            if (!trading) return;
            const parseIds = (val) => (val || '').split(',').map(s => s.trim()).filter(Boolean);
            const gives = parseIds(tcGive?.value);
            const recvs = parseIds(tcRecv?.value);
            if (!gives.length && !recvs.length) {
                tcRes.innerHTML = 'Enter Asset IDs above to analyze.';
                return;
            }
            const s = trading.getTradeSummary(gives, recvs);
            const diff = s.diff.value;
            const ratio = s.diff.valRatio;
            const col = ratio > 0 ? '#10b981' : (ratio < 0 ? '#ff4466' : 'var(--int-text-muted)');

            tcRes.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span>Give: <strong>★ ${s.give.value.toLocaleString()}</strong> (R$ ${s.give.rap.toLocaleString()})</span>
                    <span>Get: <strong>★ ${s.receive.value.toLocaleString()}</strong> (R$ ${s.receive.rap.toLocaleString()})</span>
                </div>
                <div style="font-weight:700;color:${col};">
                    Differential: ${diff >= 0 ? '+' : ''}${diff.toLocaleString()} (${ratio >= 0 ? '+' : ''}${ratio.toFixed(1)}%)
                </div>
            `;
        };
        tcGive?.addEventListener('input', updateTc);
        tcRecv?.addEventListener('input', updateTc);
    };

    const populateMarketList = (q = '', sortBy = 'value') => {
        const list = document.getElementById('int-mkt-list');
        if (!list || !trading) return;

        let items = trading.getAllItems();
        if (q.trim()) {
            const query = q.toLowerCase().trim();
            items = items.filter(it => it.name.toLowerCase().includes(query) || it.id.includes(query));
        }

        items.sort((a, b) => {
            if (sortBy === 'value') return b.value - a.value;
            if (sortBy === 'rap') return b.rap - a.rap;
            if (sortBy === 'demand') return b.demand - a.demand;
            return a.name.localeCompare(b.name);
        });

        if (!items.length) {
            list.innerHTML = `<div style="text-align:center;padding:16px;color:var(--int-text-muted);font-size:11px;">No items found</div>`;
            return;
        }

        list.innerHTML = items.map(item => `
            <a href="/catalog/${item.id}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--int-surface);border:1px solid var(--int-border);border-radius:8px;text-decoration:none;color:inherit;">
                <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                    <span style="font-size:12px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</span>
                    ${item.isProjected ? '<span class="int-badge int-proj">PROJ</span>' : ''}
                    ${item.isRare ? '<span class="int-badge int-rare">RARE</span>' : ''}
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                    <span class="int-val">★ ${trading.formatNum(item.value)}</span>
                    <span class="int-rap">R$ ${trading.formatNum(item.rap)}</span>
                </div>
            </a>
        `).join('');
    };

    const init = () => {
        injectFonts();
        injectStyles();
        applyCustomBackground();
        initEffects();
        calcFps();

        if (document.body) {
            renderHUD();
            renderAvatarTools();
            fetchUserData();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                renderHUD();
                renderAvatarTools();
                fetchUserData();
            });
        }

        setInterval(() => {
            if (!document.hidden) fetchUserData();
        }, 30000);
    };

    init();

    window.InteriumUI = Object.freeze({
        init,
        injectStyles,
        renderHUD,
        updateWatermark
    });
})();
