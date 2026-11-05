(function () {
    'use strict';

    if (window.InteriumUI) return;

    const core = window.InteriumCore;
    const trading = window.InteriumTrading;
    const cfg = core ? core.config() : {};

    const SITE_API = (typeof location !== 'undefined' && location.origin && !location.origin.startsWith('null') ? location.origin : 'https://www.echocr.xyz') + '/apisite';
    const ASSET_BASE = 'https://raw.githubusercontent.com/warmpain9/Interium/v2-echocore/assets/';

    const state = {
        user: { id: null, name: 'User', robux: 0, tickets: 0, avatarUrl: '' },
        panelOpen: true,
        panelMinimized: false,
        ping: 18,
        fps: 60,
        activeTab: 'visuals',
        drag: { active: false, ox: 0, oy: 0, px: 0, py: 0 },
        wmDrag: { active: false, ox: 0, oy: 0, px: 0, py: 0 }
    };

    const injectFonts = () => {
        if (document.getElementById('int-csgo-fonts')) return;
        const link = document.createElement('link');
        link.id = 'int-csgo-fonts';
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap';
        document.head.appendChild(link);
    };

    const injectStyles = () => {
        let el = document.getElementById('int-csgo-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'int-csgo-styles';
            (document.head || document.documentElement).appendChild(el);
        }

        const c = core ? core.config() : cfg;

        el.textContent = `
            @keyframes int-border-flow {
                0% { background-position: 0% 50%; }
                100% { background-position: 200% 50%; }
            }

            :root {
                --int-card-scale: ${c.cardImageScale || 1.18};
                --int-panel-scale: ${(c.guiScale || 100) / 100};
                --int-csgo-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;
                --int-mono-font: 'JetBrains Mono', 'Segoe UI Mono', monospace;
            }

            /* --- Inventory Thumbnail 1:1 Aspect-Ratio Fix --- */
            [class*="itemCard-"] {
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                background: #141419 !important;
                background: var(--int-surface) !important;
                backdrop-filter: var(--int-blur) !important;
                -webkit-backdrop-filter: var(--int-blur) !important;
                border: 1px solid var(--int-border) !important;
                border-radius: 8px !important;
                padding: 10px !important;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease !important;
                overflow: visible !important;
            }

            [class*="itemCard-"]:hover {
                transform: translateY(-2px) !important;
                border-color: var(--int-border-hover) !important;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5), 0 0 16px var(--int-accent-glow) !important;
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
                background: rgba(0, 0, 0, 0.3) !important;
                border-radius: 6px !important;
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
                background: rgba(18, 18, 24, 0.85) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.14) !important;
                border-radius: 4px !important;
                padding: 2px 6px !important;
                font-family: var(--int-mono-font) !important;
                font-weight: 700 !important;
                font-size: 11px !important;
                color: #fff !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6) !important;
            }

            /* --- Glassify Navbar & Sidebar --- */
            nav.navbar, [class*="navbar-"] {
                ${c.navbarEnabled ? `
                    background: ${c.navbarMode === 'transparent' ? 'transparent' : c.navbarColour + Math.round((c.navbarOpacity / 100) * 255).toString(16).padStart(2, '0')} !important;
                    ${c.navbarMode === 'blur' ? `backdrop-filter: blur(${c.navbarBlurAmount || 16}px) saturate(180%) !important; -webkit-backdrop-filter: blur(${c.navbarBlurAmount || 16}px) saturate(180%) !important;` : ''}
                    border-bottom: 1px solid var(--int-border) !important;
                ` : ''}
            }

            [class*="categoryBgDesktop-"], [class*="sidebar-"] {
                ${c.sidebarEnabled ? `
                    background: ${c.sidebarMode === 'transparent' ? 'transparent' : c.sidebarColour + Math.round((c.sidebarOpacity / 100) * 255).toString(16).padStart(2, '0')} !important;
                    ${c.sidebarMode === 'blur' ? `backdrop-filter: blur(${c.sidebarBlurAmount || 16}px) saturate(180%) !important; -webkit-backdrop-filter: blur(${c.sidebarBlurAmount || 16}px) saturate(180%) !important;` : ''}
                    border: 1px solid var(--int-border) !important;
                    border-radius: 8px !important;
                ` : ''}
            }

            /* --- Card Item Meta Pills --- */
            .int-card-meta {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 6px;
                font-family: var(--int-mono-font);
            }

            .int-meta-row {
                display: flex;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
            }

            .int-val {
                font-size: 10.5px;
                font-weight: 700;
                color: var(--int-accent);
                background: rgba(124, 58, 237, 0.12);
                border: 1px solid var(--int-accent-glow);
                border-radius: 4px;
                padding: 1px 5px;
            }

            .int-rap {
                font-size: 10.5px;
                font-weight: 600;
                color: var(--int-text-muted);
            }

            .int-badge {
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.5px;
                padding: 1px 5px;
                border-radius: 3px;
                text-transform: uppercase;
            }

            .int-proj {
                background: rgba(239, 68, 68, 0.18);
                border: 1px solid rgba(239, 68, 68, 0.45);
                color: #f87171;
            }

            .int-rare {
                background: rgba(16, 185, 129, 0.18);
                border: 1px solid rgba(16, 185, 129, 0.45);
                color: #34d399;
            }

            /* ============================================================== */
            /* --- CS:GO CHEAT MENU (DEAR IMGUI INTERIUM REPLICA) --- */
            /* ============================================================== */

            #int-csgo-menu {
                all: initial;
                position: fixed;
                top: calc(50% - 240px);
                left: calc(50% - 340px);
                z-index: 2147483647;
                width: 680px;
                height: 480px;
                background: #111116;
                border: 1px solid #262632;
                border-radius: 6px;
                box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05);
                display: flex;
                flex-direction: column;
                font-family: var(--int-csgo-font);
                color: #e4e4e7;
                overflow: hidden;
                user-select: none;
                transform-origin: center center;
                transform: scale(var(--int-panel-scale));
            }

            #int-csgo-menu.int-hidden {
                display: none !important;
            }

            /* Menu Header */
            #int-menu-header {
                height: 34px;
                background: #14141a;
                border-bottom: 1px solid #20202a;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 14px;
                cursor: grab;
                position: relative;
            }

            #int-menu-header:active {
                cursor: grabbing;
            }

            #int-menu-border-glow {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--int-border-flow);
                background-size: 200% 100%;
                animation: int-border-flow 4s linear infinite;
            }

            .int-menu-brand {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: #fff;
            }

            .int-menu-brand svg {
                width: 14px;
                height: 14px;
                fill: var(--int-accent);
            }

            .int-menu-tag {
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: var(--int-accent);
                background: rgba(124, 58, 237, 0.15);
                border: 1px solid var(--int-accent-glow);
                border-radius: 3px;
                padding: 1px 5px;
            }

            .int-menu-controls {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .int-menu-btn {
                background: transparent;
                border: none;
                color: #71717a;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 18px;
                height: 18px;
                border-radius: 3px;
                transition: color 0.15s, background 0.15s;
            }

            .int-menu-btn:hover {
                color: #fff;
                background: rgba(255, 255, 255, 0.08);
            }

            /* Main Layout: Sidebar + Canvas */
            #int-menu-main {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            /* Left Sidebar Navigation */
            #int-menu-sidebar {
                width: 150px;
                background: #0d0d11;
                border-right: 1px solid #1f1f28;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 10px 8px;
            }

            .int-nav-list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .int-nav-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 10px;
                background: transparent;
                border: 1px solid transparent;
                border-radius: 4px;
                color: #828292;
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.14s ease;
                text-align: left;
            }

            .int-nav-item svg {
                width: 15px;
                height: 15px;
                fill: currentColor;
                flex-shrink: 0;
            }

            .int-nav-item:hover {
                color: #e4e4e7;
                background: rgba(255, 255, 255, 0.03);
            }

            .int-nav-item.int-active {
                color: #fff;
                background: rgba(124, 58, 237, 0.15);
                border-color: rgba(124, 58, 237, 0.35);
            }

            .int-nav-item.int-active svg {
                fill: var(--int-accent);
            }

            /* Sidebar Profile Card */
            .int-sidebar-profile {
                background: #14141a;
                border: 1px solid #20202a;
                border-radius: 5px;
                padding: 8px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .int-sp-user {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .int-sp-avatar {
                position: relative;
                width: 28px;
                height: 28px;
                flex-shrink: 0;
            }

            .int-sp-avatar img {
                width: 28px;
                height: 28px;
                border-radius: 4px;
                border: 1px solid var(--int-accent);
                object-fit: cover;
                background: #1a1a24;
            }

            .int-sp-dot {
                position: absolute;
                bottom: -1px;
                right: -1px;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #10b981;
                border: 1.5px solid #14141a;
                box-shadow: 0 0 6px #10b981;
            }

            .int-sp-meta {
                min-width: 0;
                flex: 1;
            }

            .int-sp-name {
                font-size: 11.5px;
                font-weight: 700;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
            }

            .int-sp-sub {
                font-size: 9px;
                font-weight: 700;
                color: var(--int-accent);
                text-transform: uppercase;
                letter-spacing: 0.06em;
            }

            .int-sp-curr {
                display: flex;
                justify-content: space-between;
                font-family: var(--int-mono-font);
                font-size: 10px;
                font-weight: 700;
                border-top: 1px solid #1e1e28;
                padding-top: 4px;
            }

            .int-sp-robux { color: #10b981; }
            .int-sp-tickets { color: #f0a500; }

            /* Right Content Canvas */
            #int-menu-content {
                flex: 1;
                padding: 12px;
                overflow-y: auto;
                background: #101014;
            }

            .int-tab-pane {
                display: none;
                gap: 12px;
                height: 100%;
            }

            .int-tab-pane.int-active {
                display: grid;
                grid-template-columns: 1fr 1fr;
            }

            .int-col {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            /* --- ImGui Groupbox (Child Window) --- */
            .int-groupbox {
                background: #15151b;
                border: 1px solid #242430;
                border-radius: 5px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                position: relative;
            }

            .int-gb-header {
                font-size: 10.5px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--int-accent);
                display: flex;
                align-items: center;
                gap: 6px;
                padding-bottom: 6px;
                border-bottom: 1px solid #20202c;
            }

            .int-gb-header::before {
                content: '[';
                color: #555566;
            }

            .int-gb-header::after {
                content: ']';
                color: #555566;
            }

            /* --- ImGui Checkbox Widget --- */
            .int-checkbox-row {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                user-select: none;
            }

            .int-checkbox-box {
                width: 14px;
                height: 14px;
                background: #1a1a22;
                border: 1px solid #2f2f3e;
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
            }

            .int-checkbox-box::after {
                content: '';
                width: 4px;
                height: 7px;
                border: solid #fff;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg) translate(-0.5px, -0.5px);
                opacity: 0;
                transition: opacity 0.12s;
            }

            .int-checkbox-row:hover .int-checkbox-box {
                border-color: var(--int-accent);
            }

            .int-checkbox-row.int-checked .int-checkbox-box {
                background: var(--int-accent);
                border-color: var(--int-accent);
                box-shadow: 0 0 8px var(--int-accent-glow);
            }

            .int-checkbox-row.int-checked .int-checkbox-box::after {
                opacity: 1;
            }

            .int-checkbox-label {
                font-size: 11.5px;
                font-weight: 500;
                color: #d4d4d8;
            }

            /* --- ImGui Slider Widget --- */
            .int-slider-wrap {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .int-slider-header {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                font-weight: 500;
                color: #a1a1aa;
            }

            .int-slider-val {
                font-family: var(--int-mono-font);
                font-weight: 700;
                color: #fff;
            }

            .int-slider-ctrl {
                -webkit-appearance: none;
                width: 100%;
                height: 5px;
                background: #1d1d26;
                border: 1px solid #2a2a38;
                border-radius: 2px;
                outline: none;
            }

            .int-slider-ctrl::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 10px;
                height: 14px;
                border-radius: 2px;
                background: #fff;
                cursor: pointer;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
                border: 1px solid #ddd;
            }

            .int-slider-ctrl::-webkit-slider-thumb:hover {
                background: var(--int-accent);
            }

            /* --- ImGui Combobox Widget --- */
            .int-combo-wrap {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .int-combo-label {
                font-size: 11px;
                font-weight: 500;
                color: #a1a1aa;
            }

            .int-combo-select {
                background: #191922;
                border: 1px solid #2b2b3a;
                border-radius: 4px;
                padding: 5px 8px;
                color: #fff;
                font-family: inherit;
                font-size: 11px;
                outline: none;
                cursor: pointer;
            }

            .int-combo-select:focus {
                border-color: var(--int-accent);
            }

            .int-combo-select option {
                background: #14141c;
                color: #fff;
            }

            /* --- ImGui Button --- */
            .int-cs-btn {
                background: #1c1c26;
                border: 1px solid #2c2c3c;
                border-radius: 4px;
                padding: 6px 12px;
                color: #e4e4e7;
                font-family: inherit;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.12s ease;
                text-align: center;
            }

            .int-cs-btn:hover {
                background: var(--int-accent);
                border-color: var(--int-accent);
                color: #fff;
                box-shadow: 0 0 10px var(--int-accent-glow);
            }

            .int-cs-btn:active {
                transform: translateY(1px);
            }

            /* --- Theme Radio Grid --- */
            .int-themes-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
            }

            .int-theme-card {
                padding: 7px 4px;
                background: #1a1a24;
                border: 1px solid #2b2b3c;
                border-radius: 4px;
                text-align: center;
                font-size: 11px;
                font-weight: 600;
                color: #8a8a9a;
                cursor: pointer;
                transition: all 0.12s;
            }

            .int-theme-card:hover {
                color: #fff;
                border-color: var(--int-border-hover);
            }

            .int-theme-card.int-active {
                border-color: var(--int-accent);
                color: #fff;
                background: rgba(124, 58, 237, 0.15);
                box-shadow: 0 0 8px var(--int-accent-glow);
            }

            /* --- Watermark Capsule (CS:GO Cheat Style) --- */
            #int-watermark {
                position: fixed;
                top: 12px;
                left: 12px;
                z-index: 2147483640;
                background: rgba(13, 13, 18, 0.92);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid #262634;
                border-radius: 4px;
                padding: 5px 12px;
                font-family: var(--int-mono-font);
                font-size: 11px;
                font-weight: 700;
                color: #e4e4e7;
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: grab;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                user-select: none;
            }

            #int-watermark::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--int-border-flow);
                border-radius: 4px 4px 0 0;
            }

            #int-watermark:active {
                cursor: grabbing;
            }

            .int-wm-brand {
                color: var(--int-accent);
                letter-spacing: 0.08em;
            }

            .int-wm-sep {
                color: #3f3f4e;
            }

            /* --- Custom Scrollbar --- */
            #int-menu-content::-webkit-scrollbar,
            .int-scroll-box::-webkit-scrollbar {
                width: 4px;
            }

            #int-menu-content::-webkit-scrollbar-track,
            .int-scroll-box::-webkit-scrollbar-track {
                background: transparent;
            }

            #int-menu-content::-webkit-scrollbar-thumb,
            .int-scroll-box::-webkit-scrollbar-thumb {
                background: var(--int-accent);
                border-radius: 2px;
            }

            /* Custom BG */
            #int-custom-bg {
                position: fixed;
                inset: 0;
                z-index: 0;
                pointer-events: none;
                background-size: cover;
                background-position: center;
            }

            #int-custom-bg-dim {
                position: absolute;
                inset: 0;
                background: #000;
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

            updateUserUI();
            updateWatermark();
        } catch (e) {
            console.warn('[Interium] User fetch error:', e);
        }
    };

    const updateUserUI = () => {
        const nameEl = document.getElementById('int-sp-name');
        const robuxEl = document.getElementById('int-sp-robux');
        const ticketsEl = document.getElementById('int-sp-tickets');
        const avatarEl = document.getElementById('int-sp-avatar-img');

        if (nameEl) nameEl.textContent = state.user.name;
        if (robuxEl) robuxEl.textContent = Number(state.user.robux).toLocaleString();
        if (ticketsEl) ticketsEl.textContent = Number(state.user.tickets).toLocaleString();
        if (avatarEl && state.user.avatarUrl) avatarEl.src = state.user.avatarUrl;
    };

    /* --- Background Particle Canvas Engine --- */
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
            bg.innerHTML = `<div id="int-custom-bg-dim"></div>`;
            document.body.insertBefore(bg, document.body.firstChild);
        }
        bg.style.backgroundImage = `url('${c.miscBgUrl}')`;
        bg.style.filter = c.miscBgBlur ? `blur(${c.miscBgBlurAmount || 12}px)` : 'none';
        const dim = bg.querySelector('#int-custom-bg-dim');
        if (dim) {
            dim.style.opacity = c.miscBgDarkOverlay ? (c.miscBgDarkOpacity || 55) / 100 : 0;
        }
    };

    /* --- Watermark Capsule (CS:GO Cheat Style) --- */
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
            <span class="int-wm-brand">INTERIUM</span>
            ${c.watermarkShowUser && state.user.name ? `<span class="int-wm-sep">|</span><span>${state.user.name}</span>` : ''}
            ${c.watermarkShowFps ? `<span class="int-wm-sep">|</span><span>${state.fps} fps</span>` : ''}
            ${c.watermarkShowPing ? `<span class="int-wm-sep">|</span><span>${state.ping || 18} ms</span>` : ''}
            ${c.watermarkShowTime ? `<span class="int-wm-sep">|</span><span>${timeStr}</span>` : ''}
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
        card.className = 'int-groupbox';
        card.style.marginTop = '14px';
        card.innerHTML = `
            <div class="int-gb-header">AVATAR BACKGROUND PRESETS</div>
            <div id="int-av-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:160px;overflow-y:auto;"></div>
            <input type="text" id="int-av-custom" class="int-combo-select" placeholder="Custom URL: image / gif / mp4 (press Enter)" style="width:100%;box-sizing:border-box;" />
        `;
        anchor.parentElement.insertBefore(card, anchor.nextSibling);

        const grid = card.querySelector('#int-av-grid');
        const c = core ? core.config() : cfg;

        const offTile = document.createElement('div');
        offTile.style.cssText = 'aspect-ratio:1;border-radius:4px;background:#1a1a24;border:1px solid #2f2f3e;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;font-weight:700;color:#71717a;';
        offTile.textContent = 'OFF';
        offTile.addEventListener('click', () => {
            core?.saveConfig({ avatarBgEnabled: false, avatarBgImage: '' });
            applyAvatarBg();
        });
        grid.appendChild(offTile);

        for (let i = 1; i <= 23; i++) {
            const url = `${ASSET_BASE}avatar-bgs/${i}.png`;
            const tile = document.createElement('div');
            tile.style.cssText = `aspect-ratio:1;border-radius:4px;background-image:url('${url}');background-size:cover;background-position:center;border:1px solid #2f2f3e;cursor:pointer;transition:transform 0.12s;`;
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

    /* --- Build Authentic CS:GO Interium Menu --- */
    const ICONS = {
        visuals: `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
        market: `<svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>`,
        trade: `<svg viewBox="0 0 24 24"><path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>`,
        misc: `<svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>`,
        configs: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`
    };

    const renderMenu = () => {
        if (document.getElementById('int-csgo-menu')) return;

        const c = core ? core.config() : cfg;

        const menu = document.createElement('div');
        menu.id = 'int-csgo-menu';
        menu.innerHTML = `
            <div id="int-menu-border-glow"></div>
            <div id="int-menu-header">
                <div class="int-menu-brand">
                    <svg viewBox="0 0 24 24"><polygon points="12 2 2 22 22 22"/></svg>
                    <span>INTERIUM</span>
                    <span class="int-menu-tag">EchoCore v${core?.version || '2.0'}</span>
                </div>
                <div class="int-menu-controls">
                    <button class="int-menu-btn" id="int-cs-min" title="Minimize">—</button>
                    <button class="int-menu-btn" id="int-cs-close" title="Close (Insert)">✕</button>
                </div>
            </div>
            <div id="int-menu-main">
                <div id="int-menu-sidebar">
                    <div class="int-nav-list">
                        <button class="int-nav-item int-active" data-tab="visuals">${ICONS.visuals}<span>VISUALS</span></button>
                        <button class="int-nav-item" data-tab="market">${ICONS.market}<span>MARKET</span></button>
                        <button class="int-nav-item" data-tab="trade">${ICONS.trade}<span>TRADING</span></button>
                        <button class="int-nav-item" data-tab="misc">${ICONS.misc}<span>MISC</span></button>
                        <button class="int-nav-item" data-tab="configs">${ICONS.configs}<span>CONFIGS</span></button>
                    </div>
                    <div class="int-sidebar-profile">
                        <div class="int-sp-user">
                            <div class="int-sp-avatar">
                                <img id="int-sp-avatar-img" src="" alt="" />
                                <div class="int-sp-dot"></div>
                            </div>
                            <div class="int-sp-meta">
                                <div id="int-sp-name" class="int-sp-name">${state.user.name}</div>
                                <div class="int-sp-sub">Lifetime VIP</div>
                            </div>
                        </div>
                        <div class="int-sp-curr">
                            <span class="int-sp-robux">R$ <span id="int-sp-robux">${state.user.robux}</span></span>
                            <span class="int-sp-tickets">Tx <span id="int-sp-tickets">${state.user.tickets}</span></span>
                        </div>
                    </div>
                </div>
                <div id="int-menu-content">
                    <!-- VISUALS TAB -->
                    <div class="int-tab-pane int-active" id="int-tab-visuals">
                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">INVENTORY & CATALOG ENGINE</div>
                                <div class="int-checkbox-row ${c.inventoryFixCards !== false ? 'int-checked' : ''}" data-cfg="inventoryFixCards">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">1:1 Aspect-Ratio Thumbnail Fix</span>
                                </div>
                                <div class="int-slider-wrap">
                                    <div class="int-slider-header">
                                        <span>Render Scale</span>
                                        <span class="int-slider-val" id="val-cardImageScale">${c.cardImageScale || 1.18}x</span>
                                    </div>
                                    <input type="range" class="int-slider-ctrl" id="cfg-cardImageScale" min="1.0" max="1.45" step="0.02" value="${c.cardImageScale || 1.18}">
                                </div>
                                <div class="int-checkbox-row ${c.itemBadges !== false ? 'int-checked' : ''}" data-cfg="itemBadges">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Live Echomons Value & RAP Badges</span>
                                </div>
                                <div class="int-checkbox-row ${c.showProjectedWarning !== false ? 'int-checked' : ''}" data-cfg="showProjectedWarning">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Projected Item Warning Tags</span>
                                </div>
                            </div>

                            <div class="int-groupbox">
                                <div class="int-gb-header">SURFACES & GLASSIFY</div>
                                <div class="int-checkbox-row ${c.navbarEnabled ? 'int-checked' : ''}" data-cfg="navbarEnabled">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Navbar Glassify</span>
                                </div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Navbar Mode</span>
                                    <select class="int-combo-select" id="cfg-navbarMode">
                                        <option value="blur" ${c.navbarMode === 'blur' ? 'selected' : ''}>Blur (Frosted Glass)</option>
                                        <option value="transparent" ${c.navbarMode === 'transparent' ? 'selected' : ''}>Transparent</option>
                                        <option value="solid" ${c.navbarMode === 'solid' ? 'selected' : ''}>Solid Accent</option>
                                    </select>
                                </div>
                                <div class="int-checkbox-row ${c.sidebarEnabled ? 'int-checked' : ''}" data-cfg="sidebarEnabled">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Sidebar Glassify</span>
                                </div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Sidebar Mode</span>
                                    <select class="int-combo-select" id="cfg-sidebarMode">
                                        <option value="blur" ${c.sidebarMode === 'blur' ? 'selected' : ''}>Blur (Frosted Glass)</option>
                                        <option value="transparent" ${c.sidebarMode === 'transparent' ? 'selected' : ''}>Transparent</option>
                                        <option value="solid" ${c.sidebarMode === 'solid' ? 'selected' : ''}>Solid Accent</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">PARTICLE CANVAS & FX</div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Effect Preset</span>
                                    <select class="int-combo-select" id="cfg-effectType">
                                        <option value="none" ${c.effectType === 'none' ? 'selected' : ''}>Disabled</option>
                                        <option value="snow" ${c.effectType === 'snow' ? 'selected' : ''}>Snow Fall</option>
                                        <option value="rain" ${c.effectType === 'rain' ? 'selected' : ''}>Rain Stream</option>
                                        <option value="stars" ${c.effectType === 'stars' ? 'selected' : ''}>Starfield Shimmer</option>
                                        <option value="matrix" ${c.effectType === 'matrix' ? 'selected' : ''}>Matrix Rain</option>
                                    </select>
                                </div>
                                <div class="int-slider-wrap">
                                    <div class="int-slider-header">
                                        <span>Intensity</span>
                                        <span class="int-slider-val" id="val-effectIntensity">${c.effectIntensity || 50}%</span>
                                    </div>
                                    <input type="range" class="int-slider-ctrl" id="cfg-effectIntensity" min="10" max="100" step="5" value="${c.effectIntensity || 50}">
                                </div>
                                <div class="int-slider-wrap">
                                    <div class="int-slider-header">
                                        <span>Speed</span>
                                        <span class="int-slider-val" id="val-effectSpeed">${c.effectSpeed || 50}%</span>
                                    </div>
                                    <input type="range" class="int-slider-ctrl" id="cfg-effectSpeed" min="10" max="100" step="5" value="${c.effectSpeed || 50}">
                                </div>
                            </div>

                            <div class="int-groupbox">
                                <div class="int-gb-header">WATERMARK OVERLAY</div>
                                <div class="int-checkbox-row ${c.watermarkEnabled ? 'int-checked' : ''}" data-cfg="watermarkEnabled">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Enable HUD Watermark</span>
                                </div>
                                <div class="int-checkbox-row ${c.watermarkShowFps !== false ? 'int-checked' : ''}" data-cfg="watermarkShowFps">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Show FPS Indicator</span>
                                </div>
                                <div class="int-checkbox-row ${c.watermarkShowPing !== false ? 'int-checked' : ''}" data-cfg="watermarkShowPing">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Show Ping Latency</span>
                                </div>
                                <div class="int-checkbox-row ${c.watermarkShowTime !== false ? 'int-checked' : ''}" data-cfg="watermarkShowTime">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Show Clock Time</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MARKET TAB -->
                    <div class="int-tab-pane" id="int-tab-market">
                        <div class="int-col" style="grid-column: span 2;">
                            <div class="int-groupbox" style="height: 100%;">
                                <div class="int-gb-header">ECHOMONS LIVE MARKET EXPLORER</div>
                                <div style="display:flex;gap:8px;">
                                    <input type="text" class="int-combo-select" id="int-mkt-search" placeholder="Search 75 limited items by name or ID..." style="flex:1;">
                                    <select class="int-combo-select" id="int-mkt-sort" style="width:140px;">
                                        <option value="value">Sort: Value</option>
                                        <option value="rap">Sort: RAP</option>
                                        <option value="demand">Sort: Demand</option>
                                        <option value="name">Sort: Name</option>
                                    </select>
                                </div>
                                <div id="int-mkt-list" class="int-scroll-box" style="display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto;padding-right:4px;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- TRADING TAB -->
                    <div class="int-tab-pane" id="int-tab-trade">
                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">EXCHANGE EVALUATOR</div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Your Side (Asset IDs)</span>
                                    <input type="text" class="int-combo-select" id="int-tc-give" placeholder="e.g. 190272, 83451">
                                </div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Their Side (Asset IDs)</span>
                                    <input type="text" class="int-combo-select" id="int-tc-recv" placeholder="e.g. 982145">
                                </div>
                            </div>
                        </div>
                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">DELTA ANALYSIS</div>
                                <div id="int-tc-result" style="padding:12px;background:#101016;border:1px solid #20202c;border-radius:4px;font-size:11.5px;line-height:1.6;">
                                    Enter Asset IDs to calculate exact Win/Loss ratios via Echomons valuation.
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- MISC TAB -->
                    <div class="int-tab-pane" id="int-tab-misc">
                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">CUSTOM BACKGROUND MEDIA</div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Direct Media URL (Image / GIF / MP4)</span>
                                    <input type="text" class="int-combo-select" id="cfg-miscBgUrl" placeholder="https://..." value="${c.miscBgUrl || ''}">
                                </div>
                                <div class="int-checkbox-row ${c.miscBgBlur ? 'int-checked' : ''}" data-cfg="miscBgBlur">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Background Blur Filter</span>
                                </div>
                                <div class="int-slider-wrap">
                                    <div class="int-slider-header">
                                        <span>Dark Overlay</span>
                                        <span class="int-slider-val" id="val-miscBgDarkOpacity">${c.miscBgDarkOpacity || 55}%</span>
                                    </div>
                                    <input type="range" class="int-slider-ctrl" id="cfg-miscBgDarkOpacity" min="0" max="95" step="5" value="${c.miscBgDarkOpacity || 55}">
                                </div>
                            </div>

                            <div class="int-groupbox">
                                <div class="int-gb-header">USER PROFILE BANNER</div>
                                <div class="int-checkbox-row ${c.profileBannerEnabled ? 'int-checked' : ''}" data-cfg="profileBannerEnabled">
                                    <div class="int-checkbox-box"></div>
                                    <span class="int-checkbox-label">Enable Profile Card Banner</span>
                                </div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Banner Image URL</span>
                                    <input type="text" class="int-combo-select" id="cfg-profileBannerImage" placeholder="https://..." value="${c.profileBannerImage || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">CUSTOM TYPOGRAPHY</div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Menu Font</span>
                                    <select class="int-combo-select" id="cfg-miscGuiFont">
                                        <option value="Inter" ${c.miscGuiFont === 'Inter' ? 'selected' : ''}>Inter (Modern CS:GO)</option>
                                        <option value="JetBrains Mono" ${c.miscGuiFont === 'JetBrains Mono' ? 'selected' : ''}>JetBrains Mono</option>
                                        <option value="Share Tech Mono" ${c.miscGuiFont === 'Share Tech Mono' ? 'selected' : ''}>Share Tech Mono</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- CONFIGS TAB -->
                    <div class="int-tab-pane" id="int-tab-configs">
                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">ACCENT THEME PRESETS</div>
                                <div class="int-themes-grid">
                                    <div class="int-theme-card ${c.theme === 'void' ? 'int-active' : ''}" data-theme="void">Void</div>
                                    <div class="int-theme-card ${c.theme === 'crimson' ? 'int-active' : ''}" data-theme="crimson">Crimson</div>
                                    <div class="int-theme-card ${c.theme === 'arctic' ? 'int-active' : ''}" data-theme="arctic">Arctic</div>
                                    <div class="int-theme-card ${c.theme === 'midnight' ? 'int-active' : ''}" data-theme="midnight">Midnight</div>
                                    <div class="int-theme-card ${c.theme === 'matrix' ? 'int-active' : ''}" data-theme="matrix">Matrix</div>
                                    <div class="int-theme-card ${c.theme === 'rose' ? 'int-active' : ''}" data-theme="rose">Rose</div>
                                    <div class="int-theme-card ${c.theme === 'mono' ? 'int-active' : ''}" data-theme="mono">Mono</div>
                                    <div class="int-theme-card ${c.theme === 'sakura' ? 'int-active' : ''}" data-theme="sakura">Sakura</div>
                                </div>
                            </div>

                            <div class="int-groupbox">
                                <div class="int-gb-header">HOTKEY & SCALE</div>
                                <div class="int-slider-wrap">
                                    <div class="int-slider-header">
                                        <span>GUI Scale</span>
                                        <span class="int-slider-val" id="val-guiScale">${c.guiScale || 100}%</span>
                                    </div>
                                    <input type="range" class="int-slider-ctrl" id="cfg-guiScale" min="75" max="130" step="5" value="${c.guiScale || 100}">
                                </div>
                                <div class="int-combo-wrap">
                                    <span class="int-combo-label">Toggle Menu Key</span>
                                    <input type="text" class="int-combo-select" id="cfg-hotkeyToggleGui" style="text-align:center;font-weight:700;" value="${c.hotkeyToggleGui || 'Insert'}">
                                </div>
                            </div>
                        </div>

                        <div class="int-col">
                            <div class="int-groupbox">
                                <div class="int-gb-header">CONFIGURATION STORAGE</div>
                                <div style="display:flex;flex-direction:column;gap:8px;">
                                    <button class="int-cs-btn" id="int-cfg-export">Export Configuration (JSON)</button>
                                    <button class="int-cs-btn" id="int-cfg-reset" style="background:#26181b;border-color:#4a242a;color:#f87171;">Reset to Factory Defaults</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(menu);

        bindMenuEvents(menu);
    };

    const bindMenuEvents = (menu) => {
        const header = menu.querySelector('#int-menu-header');
        const minBtn = menu.querySelector('#int-cs-min');
        const closeBtn = menu.querySelector('#int-cs-close');
        const main = menu.querySelector('#int-menu-main');

        // Draggable
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.int-menu-btn')) return;
            state.drag.active = true;
            const r = menu.getBoundingClientRect();
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
            menu.style.left = `${state.drag.ox + dx}px`;
            menu.style.top = `${state.drag.oy + dy}px`;
        });

        window.addEventListener('mouseup', () => {
            state.drag.active = false;
        });

        // Min & Close
        minBtn.addEventListener('click', () => {
            state.panelMinimized = !state.panelMinimized;
            main.style.display = state.panelMinimized ? 'none' : 'flex';
            menu.style.height = state.panelMinimized ? '34px' : '480px';
        });

        closeBtn.addEventListener('click', () => {
            menu.classList.add('int-hidden');
            state.panelOpen = false;
        });

        // Sidebar Navigation
        const navItems = menu.querySelectorAll('.int-nav-item');
        const panes = menu.querySelectorAll('.int-tab-pane');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.tab;
                navItems.forEach(i => i.classList.toggle('int-active', i === item));
                panes.forEach(p => p.classList.toggle('int-active', p.id === `int-tab-${target}`));
                if (target === 'market') populateMarketList();
            });
        });

        // Checkboxes
        menu.querySelectorAll('.int-checkbox-row').forEach(row => {
            row.addEventListener('click', () => {
                const isChecked = row.classList.toggle('int-checked');
                const field = row.dataset.cfg;
                if (field) {
                    core?.saveConfig({ [field]: isChecked });
                    injectStyles();
                    if (field === 'watermarkEnabled') updateWatermark();
                }
            });
        });

        // Sliders
        const bindSlider = (id, prop, unit = '', mult = 1) => {
            const el = menu.querySelector(`#${id}`);
            const valEl = menu.querySelector(`#val-${id.replace('cfg-', '')}`);
            el?.addEventListener('input', () => {
                const val = Number(el.value);
                if (valEl) valEl.textContent = `${val}${unit}`;
                core?.saveConfig({ [prop]: val * mult });
                injectStyles();
                if (prop === 'effectIntensity' || prop === 'effectSpeed') initEffects();
                if (prop === 'miscBgDarkOpacity') applyCustomBackground();
            });
        };

        bindSlider('cfg-cardImageScale', 'cardImageScale', 'x');
        bindSlider('cfg-effectIntensity', 'effectIntensity', '%');
        bindSlider('cfg-effectSpeed', 'effectSpeed', '%');
        bindSlider('cfg-miscBgDarkOpacity', 'miscBgDarkOpacity', '%');
        bindSlider('cfg-guiScale', 'guiScale', '%');

        // Comboboxes
        const bindSelect = (id, prop, callback) => {
            const el = menu.querySelector(`#${id}`);
            el?.addEventListener('change', () => {
                core?.saveConfig({ [prop]: el.value });
                injectStyles();
                if (callback) callback();
            });
        };

        bindSelect('cfg-navbarMode', 'navbarMode');
        bindSelect('cfg-sidebarMode', 'sidebarMode');
        bindSelect('cfg-effectType', 'effectType', initEffects);
        bindSelect('cfg-miscGuiFont', 'miscGuiFont');

        // Theme Switcher
        menu.querySelectorAll('.int-theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const t = card.dataset.theme;
                menu.querySelectorAll('.int-theme-card').forEach(c => c.classList.toggle('int-active', c === card));
                core?.saveConfig({ theme: t });
                injectStyles();
            });
        });

        // Background input
        const bgInput = menu.querySelector('#cfg-miscBgUrl');
        bgInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                core?.saveConfig({ miscBgUrl: bgInput.value.trim() });
                applyCustomBackground();
            }
        });

        // Hotkey Toggle Handler
        window.addEventListener('keydown', (e) => {
            const hotkey = core?.config().hotkeyToggleGui || 'Insert';
            if (e.key === hotkey || e.code === hotkey) {
                state.panelOpen = !state.panelOpen;
                menu.classList.toggle('int-hidden', !state.panelOpen);
            }
        });

        // Market Search & Sort
        const mktSearch = menu.querySelector('#int-mkt-search');
        const mktSort = menu.querySelector('#int-mkt-sort');
        const renderMkt = () => populateMarketList(mktSearch.value, mktSort.value);
        mktSearch?.addEventListener('input', renderMkt);
        mktSort?.addEventListener('change', renderMkt);

        // Trade Calc
        const tcGive = menu.querySelector('#int-tc-give');
        const tcRecv = menu.querySelector('#int-tc-recv');
        const tcRes = menu.querySelector('#int-tc-result');
        const updateTc = () => {
            if (!trading) return;
            const parseIds = (val) => (val || '').split(',').map(s => s.trim()).filter(Boolean);
            const gives = parseIds(tcGive?.value);
            const recvs = parseIds(tcRecv?.value);
            if (!gives.length && !recvs.length) {
                tcRes.innerHTML = 'Enter Asset IDs to calculate exact Win/Loss ratios via Echomons valuation.';
                return;
            }
            const s = trading.getTradeSummary(gives, recvs);
            const diff = s.diff.value;
            const ratio = s.diff.valRatio;
            const col = ratio > 0 ? '#10b981' : (ratio < 0 ? '#ff4466' : '#a1a1aa');

            tcRes.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #20202c;">
                    <span>Give: <strong style="color:var(--int-accent);">★ ${s.give.value.toLocaleString()}</strong> (R$ ${s.give.rap.toLocaleString()})</span>
                    <span>Get: <strong style="color:var(--int-accent);">★ ${s.receive.value.toLocaleString()}</strong> (R$ ${s.receive.rap.toLocaleString()})</span>
                </div>
                <div style="font-weight:700;color:${col};font-size:12px;">
                    Differential: ${diff >= 0 ? '+' : ''}${diff.toLocaleString()} Value (${ratio >= 0 ? '+' : ''}${ratio.toFixed(1)}%)
                </div>
            `;
        };
        tcGive?.addEventListener('input', updateTc);
        tcRecv?.addEventListener('input', updateTc);

        // Config export / reset
        menu.querySelector('#int-cfg-export')?.addEventListener('click', () => {
            navigator.clipboard?.writeText(JSON.stringify(core?.config() || {}, null, 2));
            alert('Interium CS:GO config copied to clipboard!');
        });

        menu.querySelector('#int-cfg-reset')?.addEventListener('click', () => {
            if (confirm('Reset Interium config to defaults?')) {
                localStorage.removeItem('int_config');
                location.reload();
            }
        });
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
            list.innerHTML = `<div style="text-align:center;padding:16px;color:#71717a;font-size:11px;">No items found</div>`;
            return;
        }

        list.innerHTML = items.map(item => `
            <a href="/catalog/${item.id}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#15151c;border:1px solid #232330;border-radius:4px;text-decoration:none;color:inherit;">
                <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                    <span style="font-size:11.5px;font-weight:600;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</span>
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
            renderMenu();
            renderAvatarTools();
            fetchUserData();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                renderMenu();
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
        renderMenu,
        updateWatermark
    });
})();
