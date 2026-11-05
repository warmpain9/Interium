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
        menuOpen: true,
        ping: 18,
        fps: 60,
        activeCategory: 'visuals',
        activeSub: 'inventory',
        drag: { active: false, ox: 0, oy: 0, px: 0, py: 0 },
        openDropdown: null
    };

    const injectStyles = () => {
        let el = document.getElementById('int-csgo-replica-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'int-csgo-replica-styles';
            (document.head || document.documentElement).appendChild(el);
        }

        const c = core ? core.config() : cfg;

        el.textContent = `
            @keyframes int-rainbow-flow {
                0% { background-position: 0% 50%; }
                100% { background-position: 200% 50%; }
            }

            :root {
                --int-card-scale: ${c.cardImageScale || 1.18};
                --int-menu-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Roboto, sans-serif;
                --int-mono-font: 'JetBrains Mono', 'Segoe UI Mono', monospace;
            }

            /* --- Inventory Thumbnail 1:1 Aspect-Ratio Fix --- */
            [class*="itemCard-"] {
                display: flex !important;
                flex-direction: column !important;
                position: relative !important;
                background: #0d0d10 !important;
                background: var(--int-surface) !important;
                backdrop-filter: var(--int-blur) !important;
                -webkit-backdrop-filter: var(--int-blur) !important;
                border: 1px solid var(--int-border) !important;
                border-radius: 6px !important;
                padding: 10px !important;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease !important;
                overflow: visible !important;
            }

            [class*="itemCard-"]:hover {
                transform: translateY(-2px) !important;
                border-color: var(--int-border-hover) !important;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6), 0 0 16px var(--int-accent-glow) !important;
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
                background: rgba(0, 0, 0, 0.35) !important;
                border-radius: 4px !important;
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
                transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
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
                background: rgba(10, 10, 14, 0.88) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.16) !important;
                border-radius: 3px !important;
                padding: 2px 6px !important;
                font-family: var(--int-mono-font) !important;
                font-weight: 700 !important;
                font-size: 10.5px !important;
                color: #fff !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7) !important;
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
                    border-radius: 6px !important;
                ` : ''}
            }

            /* Card Meta Badges */
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
                font-size: 10px;
                font-weight: 700;
                color: var(--int-accent);
                background: rgba(124, 58, 237, 0.14);
                border: 1px solid var(--int-accent-glow);
                border-radius: 3px;
                padding: 1px 5px;
            }

            .int-rap {
                font-size: 10px;
                font-weight: 600;
                color: var(--int-text-muted);
            }

            .int-badge {
                font-size: 9px;
                font-weight: 800;
                letter-spacing: 0.5px;
                padding: 1px 4px;
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

            /* ========================================================= */
            /* --- CS:GO INTERIUM CHEAT MENU (1:1 EXACT REPLICA) --- */
            /* ========================================================= */

            #int-menu-root {
                all: initial;
                position: fixed;
                top: calc(50% - 240px);
                left: calc(50% - 330px);
                z-index: 2147483647;
                width: 660px;
                height: 480px;
                background: #0a0a0c;
                border: 1px solid #1a1a24;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.03);
                display: flex;
                font-family: var(--int-menu-font);
                color: #d0d0d8;
                user-select: none;
                overflow: hidden;
            }

            #int-menu-root.int-hidden {
                display: none !important;
            }

            /* Top Rainbow Border */
            #int-menu-top-line {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, #ff2a5f 0%, #a855f7 35%, #00e5ff 65%, #00ff7f 85%, #ffbb00 100%);
                background-size: 200% 100%;
                animation: int-rainbow-flow 5s linear infinite;
                z-index: 10;
            }

            /* --- Left Sidebar --- */
            #int-menu-sidebar {
                width: 140px;
                background: #08080a;
                border-right: 1px solid #16161e;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                flex-shrink: 0;
            }

            /* Sidebar Header Logo */
            #int-menu-logo-box {
                height: 42px;
                border-bottom: 1px solid #16161e;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 12px;
                cursor: grab;
            }

            #int-menu-logo-box:active {
                cursor: grabbing;
            }

            .int-logo-txt {
                font-size: 13px;
                font-weight: 800;
                letter-spacing: 0.12em;
                color: #ffffff;
                text-transform: uppercase;
            }

            .int-logo-chevron {
                width: 14px;
                height: 14px;
                fill: #ffffff;
            }

            /* Navigation Tree */
            #int-nav-tree {
                flex: 1;
                overflow-y: auto;
                padding: 8px 0;
                display: flex;
                flex-direction: column;
                scrollbar-width: none;
            }

            #int-nav-tree::-webkit-scrollbar {
                display: none;
            }

            .int-cat-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 7px 12px;
                color: #888899;
                font-size: 11.5px;
                font-weight: 700;
                cursor: pointer;
                transition: color 0.12s;
            }

            .int-cat-header:hover {
                color: #ffffff;
            }

            .int-cat-header.int-active {
                color: #ffffff;
            }

            .int-cat-header svg {
                width: 13px;
                height: 13px;
                fill: currentColor;
                flex-shrink: 0;
            }

            .int-sub-list {
                display: none;
                flex-direction: column;
                padding: 2px 0 6px;
            }

            .int-cat-group.int-expanded .int-sub-list {
                display: flex;
            }

            .int-sub-item {
                padding: 5px 12px 5px 33px;
                color: #666677;
                font-size: 10.5px;
                font-weight: 600;
                cursor: pointer;
                transition: color 0.12s;
            }

            .int-sub-item:hover {
                color: #b0b0be;
            }

            .int-sub-item.int-active {
                color: #ffffff;
            }

            /* Bottom Sidebar User Info */
            #int-sidebar-user {
                padding: 10px 12px;
                border-top: 1px solid #16161e;
                display: flex;
                align-items: center;
                gap: 10px;
                background: #060608;
            }

            .int-user-sq {
                width: 32px;
                height: 32px;
                background: #ffffff;
                border-radius: 2px;
                flex-shrink: 0;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .int-user-sq img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .int-user-meta {
                min-width: 0;
                flex: 1;
            }

            .int-user-nick {
                font-size: 11px;
                font-weight: 700;
                color: #ffffff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
            }

            .int-user-sub {
                font-size: 9.5px;
                color: #666677;
                line-height: 1.2;
            }

            .int-user-curr {
                font-size: 9px;
                font-family: var(--int-mono-font);
                color: #10b981;
                margin-top: 2px;
            }

            /* --- Main Content Area (Two Columns) --- */
            #int-menu-body {
                flex: 1;
                display: flex;
                background: #0a0a0c;
                overflow: hidden;
                position: relative;
            }

            .int-content-pane {
                display: none;
                flex: 1;
                width: 100%;
                height: 100%;
            }

            .int-content-pane.int-active {
                display: flex;
            }

            .int-content-col {
                flex: 1;
                padding: 14px 16px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .int-content-col:first-child {
                border-right: 1px solid #16161e;
            }

            /* Controls: Checkbox Row */
            .int-ctl-checkbox {
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                user-select: none;
                padding: 2px 0;
            }

            .int-chk-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .int-chk-box {
                width: 12px;
                height: 12px;
                border: 1px solid #555566;
                border-radius: 2px;
                background: transparent;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: border-color 0.12s;
            }

            .int-chk-box::after {
                content: '';
                width: 6px;
                height: 6px;
                background: #ffffff;
                border-radius: 1px;
                opacity: 0;
                transition: opacity 0.12s;
            }

            .int-ctl-checkbox:hover .int-chk-box {
                border-color: #888899;
            }

            .int-ctl-checkbox.int-checked .int-chk-box {
                border-color: #ffffff;
            }

            .int-ctl-checkbox.int-checked .int-chk-box::after {
                opacity: 1;
            }

            .int-chk-label {
                font-size: 11.5px;
                color: #d0d0d8;
                font-weight: 500;
            }

            .int-chk-bind {
                font-size: 10px;
                font-weight: 700;
                font-family: var(--int-mono-font);
                color: #666677;
                letter-spacing: 0.05em;
            }

            /* Controls: Combobox Row (Exact CS:GO layout: [ Value ] ≡ [ Label ]) */
            .int-ctl-combo {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 3px 0;
                font-size: 11.5px;
                cursor: pointer;
                position: relative;
            }

            .int-combo-val {
                color: #ffffff;
                font-weight: 600;
                min-width: 60px;
            }

            .int-combo-icon {
                color: #555566;
                font-size: 12px;
                line-height: 1;
            }

            .int-combo-name {
                color: #888899;
                font-weight: 500;
            }

            .int-combo-popup {
                display: none;
                position: absolute;
                top: 100%;
                left: 0;
                background: #111116;
                border: 1px solid #22222e;
                border-radius: 3px;
                z-index: 100;
                min-width: 140px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
            }

            .int-combo-popup.int-open {
                display: flex;
                flex-direction: column;
            }

            .int-combo-option {
                padding: 6px 10px;
                font-size: 11px;
                color: #b0b0be;
                cursor: pointer;
            }

            .int-combo-option:hover {
                background: rgba(255, 255, 255, 0.06);
                color: #ffffff;
            }

            /* Controls: Slider Row */
            .int-ctl-slider {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 4px 0;
            }

            .int-sld-meta {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: #888899;
            }

            .int-sld-num {
                color: #ffffff;
                font-family: var(--int-mono-font);
                font-weight: 700;
            }

            .int-sld-input {
                -webkit-appearance: none;
                width: 100%;
                height: 3px;
                background: #1a1a24;
                border-radius: 1px;
                outline: none;
            }

            .int-sld-input::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 8px;
                height: 12px;
                border-radius: 1px;
                background: #ffffff;
                cursor: pointer;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
            }

            /* Controls: Text Input */
            .int-ctl-input {
                background: #0f0f14;
                border: 1px solid #1f1f2a;
                border-radius: 2px;
                padding: 5px 8px;
                color: #ffffff;
                font-family: inherit;
                font-size: 11px;
                outline: none;
                width: 100%;
                box-sizing: border-box;
            }

            .int-ctl-input:focus {
                border-color: #555566;
            }

            /* Separator */
            .int-ctl-sep {
                height: 1px;
                background: #16161e;
                margin: 4px 0;
            }

            /* Resize handle */
            #int-menu-resize {
                position: absolute;
                bottom: 3px;
                right: 3px;
                width: 7px;
                height: 7px;
                border-right: 2px solid #333344;
                border-bottom: 2px solid #333344;
            }

            /* ========================================================= */
            /* --- TOP-LEFT WATERMARK (EXACT CS:GO REPLICA) --- */
            /* ========================================================= */

            #int-watermark-pill {
                position: fixed;
                top: 8px;
                left: 8px;
                z-index: 2147483640;
                background: #08080a;
                border: 1px solid #16161e;
                border-radius: 2px;
                padding: 3px 8px;
                font-family: var(--int-menu-font);
                font-size: 11px;
                font-weight: 700;
                color: #ffffff;
                display: flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7);
                user-select: none;
            }

            #int-watermark-pill::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, #ff2a5f, #a855f7, #00e5ff);
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
        } catch (e) {
            console.warn('[Interium] User fetch error:', e);
        }
    };

    const updateUserUI = () => {
        const nameEl = document.getElementById('int-user-nick');
        const currEl = document.getElementById('int-user-curr');
        const avatarEl = document.getElementById('int-user-img');

        if (nameEl) nameEl.textContent = state.user.name;
        if (currEl) currEl.textContent = `R$ ${Number(state.user.robux).toLocaleString()} | Tx ${Number(state.user.tickets).toLocaleString()}`;
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

    /* --- Top-Left CS:GO Watermark --- */
    const renderWatermark = () => {
        let wm = document.getElementById('int-watermark-pill');
        if (!wm) {
            wm = document.createElement('div');
            wm.id = 'int-watermark-pill';
            wm.innerHTML = `<span>INTERIUM</span>`;
            document.body.appendChild(wm);

            wm.addEventListener('click', () => {
                state.menuOpen = !state.menuOpen;
                document.getElementById('int-menu-root')?.classList.toggle('int-hidden', !state.menuOpen);
            });
        }
    };

    /* --- Avatar In-Page Tool --- */
    const renderAvatarTools = () => {
        if (!location.pathname.match(/\/avatar/i) && !location.pathname.match(/\/My\/Avatar/i)) return;
        if (document.getElementById('int-avatar-tools')) return;

        const anchor = document.querySelector('[class*="avatarThumbContainer"], [class*="avatarCardWrapper"]');
        if (!anchor || !anchor.parentElement) return;

        const card = document.createElement('div');
        card.id = 'int-avatar-tools';
        card.style.cssText = 'margin-top:14px;background:#0c0c0e;border:1px solid #1a1a24;padding:12px;border-radius:4px;';
        card.innerHTML = `
            <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#fff;margin-bottom:8px;">Avatar Background Presets</div>
            <div id="int-av-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;max-height:160px;overflow-y:auto;margin-bottom:8px;"></div>
            <input type="text" id="int-av-custom" class="int-ctl-input" placeholder="Custom URL: image / gif / mp4 (press Enter)" />
        `;
        anchor.parentElement.insertBefore(card, anchor.nextSibling);

        const grid = card.querySelector('#int-av-grid');
        const c = core ? core.config() : cfg;

        const offTile = document.createElement('div');
        offTile.style.cssText = 'aspect-ratio:1;border-radius:2px;background:#14141a;border:1px solid #282834;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:9.5px;font-weight:700;color:#666677;';
        offTile.textContent = 'OFF';
        offTile.addEventListener('click', () => {
            core?.saveConfig({ avatarBgEnabled: false, avatarBgImage: '' });
            applyAvatarBg();
        });
        grid.appendChild(offTile);

        for (let i = 1; i <= 23; i++) {
            const url = `${ASSET_BASE}avatar-bgs/${i}.png`;
            const tile = document.createElement('div');
            tile.style.cssText = `aspect-ratio:1;border-radius:2px;background-image:url('${url}');background-size:cover;background-position:center;border:1px solid #282834;cursor:pointer;transition:transform 0.12s;`;
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

    /* --- Build 1:1 CS:GO Interium Menu Window --- */
    const ICONS = {
        legit: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" stroke-width="2"/><line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="2"/><line x1="19" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/></svg>`,
        rage: `<svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M19 11v1a7 7 0 0 1-14 0v-1M12 19v4m-4 0h8"/></svg>`,
        visuals: `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
        changer: `<svg viewBox="0 0 24 24"><path d="M20.38 3.46L16 2 12 5.5 8 2l-4.38 1.46a2 2 0 0 0-1.34 1.89V19a2 2 0 0 0 2 2h15.44a2 2 0 0 0 2-2V5.35a2 2 0 0 0-1.34-1.89z"/></svg>`,
        misc: `<svg viewBox="0 0 24 24"><line x1="4" y1="21" x2="4" y2="14" stroke="currentColor" stroke-width="2"/><line x1="4" y1="10" x2="4" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="20" y1="21" x2="20" y2="16" stroke="currentColor" stroke-width="2"/><line x1="20" y1="12" x2="20" y2="3" stroke="currentColor" stroke-width="2"/></svg>`,
        other: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>`
    };

    const renderMenu = () => {
        if (document.getElementById('int-menu-root')) return;

        const c = core ? core.config() : cfg;

        const menu = document.createElement('div');
        menu.id = 'int-menu-root';
        menu.innerHTML = `
            <div id="int-menu-top-line"></div>
            <!-- LEFT SIDEBAR -->
            <div id="int-menu-sidebar">
                <div>
                    <div id="int-menu-logo-box">
                        <svg class="int-logo-chevron" viewBox="0 0 24 24"><polygon points="12 2 2 22 22 22"/></svg>
                        <span class="int-logo-txt">INTERIUM</span>
                    </div>
                    <div id="int-nav-tree">
                        <!-- MARKET CATEGORY -->
                        <div class="int-cat-group" data-cat="market">
                            <div class="int-cat-header">${ICONS.legit}<span>Market</span></div>
                            <div class="int-sub-list">
                                <div class="int-sub-item" data-sub="echomons">Echomons</div>
                                <div class="int-sub-item" data-sub="search">Item Search</div>
                            </div>
                        </div>

                        <!-- TRADING CATEGORY -->
                        <div class="int-cat-group" data-cat="trade">
                            <div class="int-cat-header">${ICONS.rage}<span>Trading</span></div>
                            <div class="int-sub-list">
                                <div class="int-sub-item" data-sub="evaluator">Evaluator</div>
                                <div class="int-sub-item" data-sub="calculator">Delta Calc</div>
                            </div>
                        </div>

                        <!-- VISUALS CATEGORY (Active by default) -->
                        <div class="int-cat-group int-expanded" data-cat="visuals">
                            <div class="int-cat-header int-active">${ICONS.visuals}<span>Visuals</span></div>
                            <div class="int-sub-list">
                                <div class="int-sub-item int-active" data-sub="inventory">Inventory</div>
                                <div class="int-sub-item" data-sub="surfaces">Surfaces</div>
                                <div class="int-sub-item" data-sub="effects">Effects</div>
                            </div>
                        </div>

                        <!-- CHANGER CATEGORY -->
                        <div class="int-cat-group" data-cat="changer">
                            <div class="int-cat-header">${ICONS.changer}<span>Changer</span></div>
                            <div class="int-sub-list">
                                <div class="int-sub-item" data-sub="avatar">Avatar BGs</div>
                                <div class="int-sub-item" data-sub="banner">Banner</div>
                            </div>
                        </div>

                        <!-- MISC CATEGORY -->
                        <div class="int-cat-group" data-cat="misc">
                            <div class="int-cat-header">${ICONS.misc}<span>Misc</span></div>
                            <div class="int-sub-list">
                                <div class="int-sub-item" data-sub="main">Main</div>
                                <div class="int-sub-item" data-sub="watermark">Watermark</div>
                                <div class="int-sub-item" data-sub="fonts">Fonts</div>
                            </div>
                        </div>

                        <!-- CONFIGS / OTHER CATEGORY -->
                        <div class="int-cat-group" data-cat="configs">
                            <div class="int-cat-header">${ICONS.other}<span>Other</span></div>
                            <div class="int-sub-list">
                                <div class="int-sub-item" data-sub="themes">Themes</div>
                                <div class="int-sub-item" data-sub="settings">Settings</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SIDEBAR BOTTOM PROFILE -->
                <div id="int-sidebar-user">
                    <div class="int-user-sq">
                        <img id="int-user-img" src="" alt="" />
                    </div>
                    <div class="int-user-meta">
                        <div id="int-user-nick" class="int-user-nick">${state.user.name}</div>
                        <div class="int-user-sub">Days: Lifetime</div>
                        <div id="int-user-curr" class="int-user-curr">R$ ${state.user.robux}</div>
                    </div>
                </div>
            </div>

            <!-- RIGHT CONTENT AREA -->
            <div id="int-menu-body">
                <!-- VISUALS -> INVENTORY SUBTAB -->
                <div class="int-content-pane int-active" id="pane-visuals-inventory">
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox ${c.inventoryFixCards !== false ? 'int-checked' : ''}" data-cfg="inventoryFixCards">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">1:1 Aspect-Ratio Fix</span></div>
                        </div>
                        <div class="int-ctl-slider">
                            <div class="int-sld-meta"><span>Image Render Scale</span><span class="int-sld-num" id="val-cardImageScale">${c.cardImageScale || 1.18}x</span></div>
                            <input type="range" class="int-sld-input" id="cfg-cardImageScale" min="1.0" max="1.45" step="0.02" value="${c.cardImageScale || 1.18}">
                        </div>
                        <div class="int-ctl-checkbox ${c.itemBadges !== false ? 'int-checked' : ''}" data-cfg="itemBadges">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Live Echomons Badges</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.showValueOnCards !== false ? 'int-checked' : ''}" data-cfg="showValueOnCards">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Show Value Rating</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.showRapOnCards !== false ? 'int-checked' : ''}" data-cfg="showRapOnCards">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Show Recent Average Price</span></div>
                        </div>
                        <div class="int-ctl-sep"></div>
                        <div class="int-ctl-checkbox ${c.showProjectedWarning !== false ? 'int-checked' : ''}" data-cfg="showProjectedWarning">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Projected Item Warning</span></div>
                            <span class="int-chk-bind">PROJ</span>
                        </div>
                    </div>
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox int-checked">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Absolute Serial Badge</span></div>
                        </div>
                        <div class="int-ctl-checkbox int-checked">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Smooth Hover Animation</span></div>
                        </div>
                        <div class="int-ctl-checkbox int-checked">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Catalog Quality Match</span></div>
                        </div>
                    </div>
                </div>

                <!-- VISUALS -> SURFACES SUBTAB -->
                <div class="int-content-pane" id="pane-visuals-surfaces">
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox ${c.navbarEnabled ? 'int-checked' : ''}" data-cfg="navbarEnabled">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Navbar Glassify</span></div>
                        </div>
                        <div class="int-ctl-combo" data-cfg-combo="navbarMode">
                            <span class="int-combo-val">${c.navbarMode === 'blur' ? 'Blur' : (c.navbarMode === 'transparent' ? 'Clear' : 'Solid')}</span>
                            <span class="int-combo-icon">&#8801;</span>
                            <span class="int-combo-name">Navbar Mode</span>
                            <div class="int-combo-popup">
                                <div class="int-combo-option" data-val="blur">Blur</div>
                                <div class="int-combo-option" data-val="transparent">Clear</div>
                                <div class="int-combo-option" data-val="solid">Solid</div>
                            </div>
                        </div>
                        <div class="int-ctl-checkbox ${c.sidebarEnabled ? 'int-checked' : ''}" data-cfg="sidebarEnabled">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Sidebar Glassify</span></div>
                        </div>
                        <div class="int-ctl-combo" data-cfg-combo="sidebarMode">
                            <span class="int-combo-val">${c.sidebarMode === 'blur' ? 'Blur' : (c.sidebarMode === 'transparent' ? 'Clear' : 'Solid')}</span>
                            <span class="int-combo-icon">&#8801;</span>
                            <span class="int-combo-name">Sidebar Mode</span>
                            <div class="int-combo-popup">
                                <div class="int-combo-option" data-val="blur">Blur</div>
                                <div class="int-combo-option" data-val="transparent">Clear</div>
                                <div class="int-combo-option" data-val="solid">Solid</div>
                            </div>
                        </div>
                    </div>
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox ${c.glassifyCatalog !== false ? 'int-checked' : ''}" data-cfg="glassifyCatalog">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Glassify Catalog Cards</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.glassifyTrades !== false ? 'int-checked' : ''}" data-cfg="glassifyTrades">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Glassify Trade Pages</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.glassifyProfile !== false ? 'int-checked' : ''}" data-cfg="glassifyProfile">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Glassify Profile Page</span></div>
                        </div>
                    </div>
                </div>

                <!-- VISUALS -> EFFECTS SUBTAB -->
                <div class="int-content-pane" id="pane-visuals-effects">
                    <div class="int-content-col">
                        <div class="int-ctl-combo" data-cfg-combo="effectType">
                            <span class="int-combo-val">${c.effectType || 'none'}</span>
                            <span class="int-combo-icon">&#8801;</span>
                            <span class="int-combo-name">Particle Effect</span>
                            <div class="int-combo-popup">
                                <div class="int-combo-option" data-val="none">None</div>
                                <div class="int-combo-option" data-val="snow">Snow</div>
                                <div class="int-combo-option" data-val="rain">Rain</div>
                                <div class="int-combo-option" data-val="stars">Stars</div>
                                <div class="int-combo-option" data-val="matrix">Matrix</div>
                            </div>
                        </div>
                        <div class="int-ctl-slider">
                            <div class="int-sld-meta"><span>Particle Intensity</span><span class="int-sld-num" id="val-effectIntensity">${c.effectIntensity || 50}%</span></div>
                            <input type="range" class="int-sld-input" id="cfg-effectIntensity" min="10" max="100" step="5" value="${c.effectIntensity || 50}">
                        </div>
                        <div class="int-ctl-slider">
                            <div class="int-sld-meta"><span>Particle Speed</span><span class="int-sld-num" id="val-effectSpeed">${c.effectSpeed || 50}%</span></div>
                            <input type="range" class="int-sld-input" id="cfg-effectSpeed" min="10" max="100" step="5" value="${c.effectSpeed || 50}">
                        </div>
                    </div>
                    <div class="int-content-col">
                        <div style="font-size:11px;color:#888899;margin-bottom:4px;">Custom Background Media</div>
                        <input type="text" class="int-ctl-input" id="cfg-miscBgUrl" placeholder="Direct Image / GIF URL (press Enter)" value="${c.miscBgUrl || ''}">
                        <div class="int-ctl-checkbox ${c.miscBgBlur ? 'int-checked' : ''}" data-cfg="miscBgBlur" style="margin-top:6px;">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Background Blur Filter</span></div>
                        </div>
                    </div>
                </div>

                <!-- MARKET SUBTABS -->
                <div class="int-content-pane" id="pane-market-echomons">
                    <div class="int-content-col" style="flex: 2;">
                        <div style="display:flex;gap:6px;margin-bottom:6px;">
                            <input type="text" class="int-ctl-input" id="int-mkt-search" placeholder="Search 75 limiteds..." style="flex:1;">
                            <div class="int-ctl-combo" data-cfg-combo="mktSort" style="flex-shrink:0;">
                                <span class="int-combo-val" id="val-mktSort">Value</span>
                                <span class="int-combo-icon">&#8801;</span>
                                <span class="int-combo-name">Sort</span>
                                <div class="int-combo-popup">
                                    <div class="int-combo-option" data-val="value">Value</div>
                                    <div class="int-combo-option" data-val="rap">RAP</div>
                                    <div class="int-combo-option" data-val="demand">Demand</div>
                                    <div class="int-combo-option" data-val="name">Name</div>
                                </div>
                            </div>
                        </div>
                        <div id="int-mkt-list" style="display:flex;flex-direction:column;gap:5px;max-height:380px;overflow-y:auto;padding-right:4px;"></div>
                    </div>
                </div>

                <!-- TRADING SUBTABS -->
                <div class="int-content-pane" id="pane-trade-evaluator">
                    <div class="int-content-col">
                        <div style="font-size:11px;color:#888899;">Your Offer (Asset IDs)</div>
                        <input type="text" class="int-ctl-input" id="int-tc-give" placeholder="e.g. 190272, 83451">
                        <div style="font-size:11px;color:#888899;margin-top:8px;">Their Offer (Asset IDs)</div>
                        <input type="text" class="int-ctl-input" id="int-tc-recv" placeholder="e.g. 982145">
                    </div>
                    <div class="int-content-col">
                        <div style="font-size:11px;font-weight:700;color:#fff;margin-bottom:6px;">Trade Valuation Delta</div>
                        <div id="int-tc-result" style="padding:10px;background:#0d0d10;border:1px solid #1c1c24;border-radius:2px;font-size:11px;line-height:1.6;">
                            Enter Asset IDs to calculate exact Win/Loss differential.
                        </div>
                    </div>
                </div>

                <!-- CHANGER SUBTABS -->
                <div class="int-content-pane" id="pane-changer-avatar">
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox ${c.avatarBgEnabled ? 'int-checked' : ''}" data-cfg="avatarBgEnabled">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Avatar Background Enabled</span></div>
                        </div>
                        <div style="font-size:10.5px;color:#666677;margin:4px 0;">23 Presets on /my/avatar</div>
                        <input type="text" class="int-ctl-input" id="cfg-avatarBgImage" placeholder="Custom URL (press Enter)" value="${c.avatarBgImage || ''}">
                    </div>
                </div>

                <!-- MISC -> WATERMARK SUBTAB -->
                <div class="int-content-pane" id="pane-misc-watermark">
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox ${c.watermarkEnabled ? 'int-checked' : ''}" data-cfg="watermarkEnabled">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Top-Left Watermark Pill</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.watermarkShowFps !== false ? 'int-checked' : ''}" data-cfg="watermarkShowFps">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Show FPS Counter</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.watermarkShowPing !== false ? 'int-checked' : ''}" data-cfg="watermarkShowPing">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Show Ping Latency</span></div>
                        </div>
                    </div>
                    <div class="int-content-col">
                        <div class="int-ctl-checkbox ${c.watermarkShowTime !== false ? 'int-checked' : ''}" data-cfg="watermarkShowTime">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Show System Time</span></div>
                        </div>
                        <div class="int-ctl-checkbox ${c.watermarkShowUser !== false ? 'int-checked' : ''}" data-cfg="watermarkShowUser">
                            <div class="int-chk-left"><div class="int-chk-box"></div><span class="int-chk-label">Show Username</span></div>
                        </div>
                    </div>
                </div>

                <!-- CONFIGS -> THEMES SUBTAB -->
                <div class="int-content-pane" id="pane-configs-themes">
                    <div class="int-content-col">
                        <div class="int-ctl-combo" data-cfg-combo="theme">
                            <span class="int-combo-val">${c.theme || 'void'}</span>
                            <span class="int-combo-icon">&#8801;</span>
                            <span class="int-combo-name">Theme Preset</span>
                            <div class="int-combo-popup">
                                <div class="int-combo-option" data-val="void">Void</div>
                                <div class="int-combo-option" data-val="crimson">Crimson</div>
                                <div class="int-combo-option" data-val="arctic">Arctic</div>
                                <div class="int-combo-option" data-val="midnight">Midnight</div>
                                <div class="int-combo-option" data-val="matrix">Matrix</div>
                                <div class="int-combo-option" data-val="rose">Rose</div>
                                <div class="int-combo-option" data-val="mono">Mono</div>
                                <div class="int-combo-option" data-val="sakura">Sakura</div>
                            </div>
                        </div>
                        <div class="int-ctl-slider">
                            <div class="int-sld-meta"><span>GUI Scale</span><span class="int-sld-num" id="val-guiScale">${c.guiScale || 100}%</span></div>
                            <input type="range" class="int-sld-input" id="cfg-guiScale" min="75" max="130" step="5" value="${c.guiScale || 100}">
                        </div>
                    </div>
                    <div class="int-content-col">
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <div class="int-ctl-checkbox">
                                <div class="int-chk-left"><span class="int-chk-label">Toggle Menu Key</span></div>
                                <span class="int-chk-bind">${c.hotkeyToggleGui || 'INSERT'}</span>
                            </div>
                            <div class="int-ctl-sep"></div>
                            <button id="int-btn-export" style="background:#111116;border:1px solid #22222e;padding:6px;border-radius:2px;color:#d0d0d8;font-size:11px;cursor:pointer;">Copy Config JSON</button>
                            <button id="int-btn-reset" style="background:#1a1012;border:1px solid #33181a;padding:6px;border-radius:2px;color:#f87171;font-size:11px;cursor:pointer;">Reset Defaults</button>
                        </div>
                    </div>
                </div>

                <div id="int-menu-resize"></div>
            </div>
        `;
        document.body.appendChild(menu);

        bindMenuEvents(menu);
    };

    const bindMenuEvents = (menu) => {
        const logoBox = menu.querySelector('#int-menu-logo-box');

        // Draggable
        logoBox.addEventListener('mousedown', (e) => {
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

        // Navigation Categories & Sub-items
        menu.querySelectorAll('.int-cat-header').forEach(hdr => {
            hdr.addEventListener('click', () => {
                const group = hdr.closest('.int-cat-group');
                menu.querySelectorAll('.int-cat-group').forEach(g => {
                    if (g !== group) g.classList.remove('int-expanded');
                });
                group.classList.toggle('int-expanded');
                menu.querySelectorAll('.int-cat-header').forEach(h => h.classList.remove('int-active'));
                hdr.classList.add('int-active');

                const firstSub = group.querySelector('.int-sub-item');
                if (firstSub) firstSub.click();
            });
        });

        menu.querySelectorAll('.int-sub-item').forEach(sub => {
            sub.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.querySelectorAll('.int-sub-item').forEach(s => s.classList.remove('int-active'));
                sub.classList.add('int-active');

                const cat = sub.closest('.int-cat-group').dataset.cat;
                const subName = sub.dataset.sub;
                state.activeCategory = cat;
                state.activeSub = subName;

                menu.querySelectorAll('.int-content-pane').forEach(p => p.classList.remove('int-active'));
                const targetPane = menu.querySelector(`#pane-${cat}-${subName}`) || menu.querySelector(`[id^="pane-${cat}"]`);
                if (targetPane) targetPane.classList.add('int-active');

                if (cat === 'market') populateMarketList();
            });
        });

        // Checkboxes
        menu.querySelectorAll('.int-ctl-checkbox').forEach(chk => {
            chk.addEventListener('click', () => {
                const isChecked = chk.classList.toggle('int-checked');
                const field = chk.dataset.cfg;
                if (field) {
                    core?.saveConfig({ [field]: isChecked });
                    injectStyles();
                    if (field === 'watermarkEnabled') renderWatermark();
                }
            });
        });

        // Sliders
        const bindSlider = (id, prop, unit = '') => {
            const el = menu.querySelector(`#${id}`);
            const valEl = menu.querySelector(`#val-${id.replace('cfg-', '')}`);
            el?.addEventListener('input', () => {
                const val = Number(el.value);
                if (valEl) valEl.textContent = `${val}${unit}`;
                core?.saveConfig({ [prop]: val });
                injectStyles();
                if (prop === 'effectIntensity' || prop === 'effectSpeed') initEffects();
            });
        };

        bindSlider('cfg-cardImageScale', 'cardImageScale', 'x');
        bindSlider('cfg-effectIntensity', 'effectIntensity', '%');
        bindSlider('cfg-effectSpeed', 'effectSpeed', '%');
        bindSlider('cfg-guiScale', 'guiScale', '%');

        // Combobox Popups
        menu.querySelectorAll('.int-ctl-combo').forEach(combo => {
            const popup = combo.querySelector('.int-combo-popup');
            const valSpan = combo.querySelector('.int-combo-val');
            const prop = combo.dataset.cfgCombo;

            combo.addEventListener('click', (e) => {
                if (e.target.closest('.int-combo-option')) return;
                const isOpen = popup.classList.contains('int-open');
                menu.querySelectorAll('.int-combo-popup').forEach(p => p.classList.remove('int-open'));
                if (!isOpen) popup.classList.add('int-open');
            });

            popup.querySelectorAll('.int-combo-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    const val = opt.dataset.val;
                    valSpan.textContent = opt.textContent;
                    popup.classList.remove('int-open');
                    if (prop === 'mktSort') {
                        populateMarketList('', val);
                    } else if (prop) {
                        core?.saveConfig({ [prop]: val });
                        injectStyles();
                        if (prop === 'effectType') initEffects();
                    }
                });
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.int-ctl-combo')) {
                menu.querySelectorAll('.int-combo-popup').forEach(p => p.classList.remove('int-open'));
            }
        });

        // Hotkey Toggle Handler (Default: INSERT)
        window.addEventListener('keydown', (e) => {
            const hotkey = core?.config().hotkeyToggleGui || 'Insert';
            if (e.key === hotkey || e.code === hotkey) {
                state.menuOpen = !state.menuOpen;
                menu.classList.toggle('int-hidden', !state.menuOpen);
            }
        });

        // Market Search
        const mktSearch = menu.querySelector('#int-mkt-search');
        mktSearch?.addEventListener('input', () => populateMarketList(mktSearch.value));

        // Trade Evaluator
        const tcGive = menu.querySelector('#int-tc-give');
        const tcRecv = menu.querySelector('#int-tc-recv');
        const tcRes = menu.querySelector('#int-tc-result');
        const updateTc = () => {
            if (!trading) return;
            const parseIds = (val) => (val || '').split(',').map(s => s.trim()).filter(Boolean);
            const gives = parseIds(tcGive?.value);
            const recvs = parseIds(tcRecv?.value);
            if (!gives.length && !recvs.length) {
                tcRes.innerHTML = 'Enter Asset IDs to calculate exact Win/Loss differential.';
                return;
            }
            const s = trading.getTradeSummary(gives, recvs);
            const diff = s.diff.value;
            const ratio = s.diff.valRatio;
            const col = ratio > 0 ? '#10b981' : (ratio < 0 ? '#ff4466' : '#a1a1aa');

            tcRes.innerHTML = `
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;border-bottom:1px solid #1c1c24;padding-bottom:4px;">
                    <span>Give: <strong>★ ${s.give.value.toLocaleString()}</strong></span>
                    <span>Get: <strong>★ ${s.receive.value.toLocaleString()}</strong></span>
                </div>
                <div style="font-weight:700;color:${col};">
                    Delta: ${diff >= 0 ? '+' : ''}${diff.toLocaleString()} (${ratio >= 0 ? '+' : ''}${ratio.toFixed(1)}%)
                </div>
            `;
        };
        tcGive?.addEventListener('input', updateTc);
        tcRecv?.addEventListener('input', updateTc);

        // Export & Reset
        menu.querySelector('#int-btn-export')?.addEventListener('click', () => {
            navigator.clipboard?.writeText(JSON.stringify(core?.config() || {}, null, 2));
            alert('Config copied to clipboard!');
        });

        menu.querySelector('#int-btn-reset')?.addEventListener('click', () => {
            if (confirm('Reset to defaults?')) {
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
            list.innerHTML = `<div style="text-align:center;padding:12px;color:#666677;font-size:11px;">No items found</div>`;
            return;
        }

        list.innerHTML = items.map(item => `
            <a href="/catalog/${item.id}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;background:#0d0d10;border:1px solid #1a1a24;border-radius:2px;text-decoration:none;color:inherit;">
                <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                    <span style="font-size:11px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</span>
                    ${item.isProjected ? '<span class="int-badge int-proj">PROJ</span>' : ''}
                    ${item.isRare ? '<span class="int-badge int-rare">RARE</span>' : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    <span class="int-val">★ ${trading.formatNum(item.value)}</span>
                    <span class="int-rap">R$ ${trading.formatNum(item.rap)}</span>
                </div>
            </a>
        `).join('');
    };

    const init = () => {
        injectStyles();
        applyCustomBackground();
        initEffects();
        renderWatermark();

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
        renderWatermark
    });
})();
