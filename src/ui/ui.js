(function () {
    'use strict';

    if (window.InteriumUI) return;

    const core = window.InteriumCore;
    const trading = window.InteriumTrading;
    const cfg = core ? core.config() : {};

    const injectStyles = () => {
        let el = document.getElementById('int-ui-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'int-ui-styles';
            (document.head || document.documentElement).appendChild(el);
        }

        el.textContent = `
            :root {
                --int-card-scale: ${cfg.cardImageScale || 1.18};
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
                margin: 0 0 10px 0 !important;
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
                background: rgba(13, 15, 22, 0.75) !important;
                backdrop-filter: blur(8px) !important;
                -webkit-backdrop-filter: blur(8px) !important;
                border: 1px solid rgba(255, 255, 255, 0.12) !important;
                border-radius: 6px !important;
                padding: 2px 7px !important;
                font-weight: 700 !important;
                font-size: 11px !important;
                letter-spacing: 0.3px !important;
                color: #fff !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
            }

            /* --- Glassify Site Elements --- */
            nav.navbar, [class*="navbar-"] {
                background: var(--int-bg) !important;
                backdrop-filter: var(--int-blur) !important;
                -webkit-backdrop-filter: var(--int-blur) !important;
                border-bottom: 1px solid var(--int-border) !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
            }

            [class*="categoryBgDesktop-"], [class*="sidebar-"] {
                background: var(--int-surface) !important;
                backdrop-filter: var(--int-blur) !important;
                -webkit-backdrop-filter: var(--int-blur) !important;
                border: 1px solid var(--int-border) !important;
                border-radius: var(--int-radius) !important;
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

            /* --- Card Item Meta & Badges --- */
            .int-card-meta {
                display: flex;
                flex-direction: column;
                gap: 4px;
                margin-top: 6px;
                font-family: inherit;
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

            /* --- Floating HUD Trigger Pill --- */
            #int-hud-pill {
                position: fixed;
                bottom: 22px;
                right: 22px;
                z-index: 99998;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px;
                background: var(--int-bg);
                backdrop-filter: var(--int-blur);
                -webkit-backdrop-filter: var(--int-blur);
                border: 1px solid var(--int-border);
                border-radius: 9999px;
                color: var(--int-text);
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 14px var(--int-accent-glow);
                user-select: none;
                transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease, box-shadow 0.2s ease;
            }

            #int-hud-pill:hover {
                transform: translateY(-2px) scale(1.02);
                border-color: var(--int-border-hover);
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 22px var(--int-accent-glow);
            }

            #int-hud-pill svg {
                width: 16px;
                height: 16px;
                fill: var(--int-accent);
            }

            /* --- Glass HUD Modal --- */
            #int-hud-overlay {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(0, 0, 0, 0.65);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.22s ease;
            }

            #int-hud-overlay.int-open {
                opacity: 1;
                pointer-events: auto;
            }

            #int-hud-modal {
                width: 780px;
                max-width: 94vw;
                height: 580px;
                max-height: 88vh;
                background: var(--int-bg-solid);
                background: var(--int-bg);
                backdrop-filter: var(--int-blur);
                -webkit-backdrop-filter: var(--int-blur);
                border: 1px solid var(--int-border);
                border-radius: 18px;
                box-shadow: var(--int-shadow), 0 0 32px var(--int-accent-glow);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: scale(0.96) translateY(10px);
                transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
            }

            #int-hud-overlay.int-open #int-hud-modal {
                transform: scale(1) translateY(0);
            }

            .int-hud-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 20px;
                border-bottom: 1px solid var(--int-border);
                background: rgba(255, 255, 255, 0.02);
                user-select: none;
            }

            .int-hud-brand {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                font-weight: 700;
                color: var(--int-text);
            }

            .int-hud-brand svg {
                width: 20px;
                height: 20px;
                fill: var(--int-accent);
            }

            .int-hud-status {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 11px;
                font-weight: 500;
                color: #34d399;
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.25);
                border-radius: 9999px;
                padding: 1px 8px;
            }

            .int-hud-status::before {
                content: '';
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #34d399;
                box-shadow: 0 0 6px #34d399;
            }

            .int-hud-close {
                background: transparent;
                border: none;
                color: var(--int-text-muted);
                font-size: 18px;
                cursor: pointer;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                transition: color 0.15s, background-color 0.15s;
            }

            .int-hud-close:hover {
                color: #fff;
                background: rgba(255, 255, 255, 0.08);
            }

            /* --- Tab Navigation --- */
            .int-tabs {
                display: flex;
                gap: 6px;
                padding: 10px 20px;
                border-bottom: 1px solid var(--int-border);
                background: rgba(255, 255, 255, 0.01);
            }

            .int-tab-btn {
                background: transparent;
                border: 1px solid transparent;
                border-radius: 8px;
                padding: 6px 14px;
                color: var(--int-text-muted);
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.18s ease;
            }

            .int-tab-btn:hover {
                color: var(--int-text);
                background: var(--int-surface-hover);
            }

            .int-tab-btn.int-active {
                color: #fff;
                background: var(--int-surface-hover);
                border-color: var(--int-border);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }

            /* --- Tab Panes --- */
            .int-tab-content {
                flex: 1;
                overflow-y: auto;
                padding: 18px 20px;
                color: var(--int-text);
            }

            .int-pane {
                display: none;
                height: 100%;
            }

            .int-pane.int-active {
                display: flex;
                flex-direction: column;
            }

            /* --- Search & Grid --- */
            .int-filter-bar {
                display: flex;
                gap: 10px;
                margin-bottom: 14px;
            }

            .int-input {
                flex: 1;
                background: rgba(0, 0, 0, 0.25);
                border: 1px solid var(--int-border);
                border-radius: 8px;
                padding: 8px 12px;
                color: #fff;
                font-size: 13px;
                outline: none;
                transition: border-color 0.15s;
            }

            .int-input:focus {
                border-color: var(--int-accent);
            }

            .int-select {
                background: rgba(0, 0, 0, 0.25);
                border: 1px solid var(--int-border);
                border-radius: 8px;
                padding: 8px 12px;
                color: #fff;
                font-size: 13px;
                outline: none;
                cursor: pointer;
            }

            .int-select option {
                background: #111;
                color: #fff;
            }

            .int-market-list {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding-right: 4px;
            }

            .int-market-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 14px;
                background: var(--int-surface);
                border: 1px solid var(--int-border);
                border-radius: 10px;
                text-decoration: none;
                color: inherit;
                transition: transform 0.15s, border-color 0.15s, background-color 0.15s;
            }

            .int-market-row:hover {
                transform: translateX(2px);
                border-color: var(--int-border-hover);
                background: var(--int-surface-hover);
            }

            .int-market-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .int-market-name {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
            }

            .int-market-meta {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 12px;
            }

            /* --- Settings Pane --- */
            .int-setting-group {
                background: var(--int-surface);
                border: 1px solid var(--int-border);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 14px;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }

            .int-setting-title {
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                color: var(--int-text-muted);
            }

            .int-setting-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .int-setting-label {
                font-size: 13px;
                font-weight: 500;
                color: var(--int-text);
            }

            .int-theme-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
            }

            .int-theme-btn {
                padding: 8px 12px;
                border-radius: 8px;
                border: 1px solid var(--int-border);
                background: rgba(0, 0, 0, 0.2);
                color: var(--int-text);
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                text-align: center;
                transition: all 0.15s;
            }

            .int-theme-btn:hover {
                border-color: var(--int-border-hover);
                background: var(--int-surface-hover);
            }

            .int-theme-btn.int-active {
                border-color: var(--int-accent);
                color: #fff;
                box-shadow: 0 0 12px var(--int-accent-glow);
            }

            .int-switch {
                position: relative;
                display: inline-block;
                width: 38px;
                height: 22px;
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
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
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

            /* Custom scrollbars */
            .int-market-list::-webkit-scrollbar,
            .int-tab-content::-webkit-scrollbar {
                width: 6px;
            }
            .int-market-list::-webkit-scrollbar-track,
            .int-tab-content::-webkit-scrollbar-track {
                background: transparent;
            }
            .int-market-list::-webkit-scrollbar-thumb,
            .int-tab-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.12);
                border-radius: 3px;
            }
        `;
    };

    const LOGO_SVG = `<svg viewBox="0 0 24 24"><polygon points="12 2 2 22 22 22"/></svg>`;

    const renderHUD = () => {
        if (document.getElementById('int-hud-pill')) return;

        const pill = document.createElement('div');
        pill.id = 'int-hud-pill';
        pill.innerHTML = `${LOGO_SVG}<span>Interium</span>`;
        document.body.appendChild(pill);

        const overlay = document.createElement('div');
        overlay.id = 'int-hud-overlay';
        overlay.innerHTML = `
            <div id="int-hud-modal">
                <div class="int-hud-header">
                    <div class="int-hud-brand">
                        ${LOGO_SVG}
                        <span>Interium v${core?.version || '2.0.0'}</span>
                        <span class="int-hud-status">Echomons Live</span>
                    </div>
                    <button class="int-hud-close" title="Close (Esc)">&times;</button>
                </div>
                <div class="int-tabs">
                    <button class="int-tab-btn int-active" data-tab="market">Market</button>
                    <button class="int-tab-btn" data-tab="trade">Trade Calc</button>
                    <button class="int-tab-btn" data-tab="settings">Visuals</button>
                </div>
                <div class="int-tab-content">
                    <div class="int-pane int-active" id="int-pane-market">
                        <div class="int-filter-bar">
                            <input type="text" class="int-input" id="int-market-search" placeholder="Search limiteds by name..." />
                            <select class="int-select" id="int-market-sort">
                                <option value="value">Sort: Value</option>
                                <option value="rap">Sort: RAP</option>
                                <option value="demand">Sort: Demand</option>
                                <option value="name">Sort: Name</option>
                            </select>
                        </div>
                        <div class="int-market-list" id="int-market-items"></div>
                    </div>
                    <div class="int-pane" id="int-pane-trade">
                        <div class="int-setting-group">
                            <div class="int-setting-title">Trade Value Evaluator</div>
                            <div style="font-size: 13px; color: var(--int-text-muted); line-height: 1.5;">
                                Enter asset IDs separated by comma to compute fair exchange differentials according to live Echomons values.
                            </div>
                            <div style="display: flex; gap: 12px; margin-top: 8px;">
                                <div style="flex: 1;">
                                    <label class="int-setting-label" style="display:block; margin-bottom: 6px;">Your Offer (Asset IDs)</label>
                                    <input type="text" class="int-input" id="int-trade-give" placeholder="e.g. 19027209, 1285307" style="width: 100%;" />
                                </div>
                                <div style="flex: 1;">
                                    <label class="int-setting-label" style="display:block; margin-bottom: 6px;">Their Offer (Asset IDs)</label>
                                    <input type="text" class="int-input" id="int-trade-recv" placeholder="e.g. 9834571" style="width: 100%;" />
                                </div>
                            </div>
                            <div id="int-trade-result" style="margin-top: 12px; padding: 12px; border-radius: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--int-border); font-size: 13px;">
                                Enter IDs to preview trade summary.
                            </div>
                        </div>
                    </div>
                    <div class="int-pane" id="int-pane-settings">
                        <div class="int-setting-group">
                            <div class="int-setting-title">Theme Preset</div>
                            <div class="int-theme-grid">
                                <button class="int-theme-btn ${cfg.theme === 'void' ? 'int-active' : ''}" data-theme="void">Void</button>
                                <button class="int-theme-btn ${cfg.theme === 'midnight' ? 'int-active' : ''}" data-theme="midnight">Midnight</button>
                                <button class="int-theme-btn ${cfg.theme === 'emerald' ? 'int-active' : ''}" data-theme="emerald">Emerald</button>
                                <button class="int-theme-btn ${cfg.theme === 'crimson' ? 'int-active' : ''}" data-theme="crimson">Crimson</button>
                            </div>
                        </div>
                        <div class="int-setting-group">
                            <div class="int-setting-title">Visual Customizations</div>
                            <div class="int-setting-row">
                                <span class="int-setting-label">Glassify Surfaces (Navbar, Sidebar, Cards)</span>
                                <label class="int-switch">
                                    <input type="checkbox" id="int-toggle-glassify" ${cfg.glassifyInventory !== false ? 'checked' : ''}>
                                    <span class="int-slider"></span>
                                </label>
                            </div>
                            <div class="int-setting-row">
                                <span class="int-setting-label">Inventory Image Sizing Auto-Fix (1:1 Ratio)</span>
                                <label class="int-switch">
                                    <input type="checkbox" id="int-toggle-imgscale" ${cfg.cardImageScale ? 'checked' : 'checked'}>
                                    <span class="int-slider"></span>
                                </label>
                            </div>
                            <div class="int-setting-row">
                                <span class="int-setting-label">Live Market Badges on Cards (Value & RAP)</span>
                                <label class="int-switch">
                                    <input type="checkbox" id="int-toggle-badges" ${cfg.itemBadges !== false ? 'checked' : ''}>
                                    <span class="int-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const toggleModal = (show) => {
            const willOpen = typeof show === 'boolean' ? show : !overlay.classList.contains('int-open');
            if (willOpen) {
                overlay.classList.add('int-open');
                populateMarketList();
            } else {
                overlay.classList.remove('int-open');
            }
        };

        pill.addEventListener('click', () => toggleModal(true));
        overlay.querySelector('.int-hud-close').addEventListener('click', () => toggleModal(false));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) toggleModal(false);
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('int-open')) {
                toggleModal(false);
            }
            if ((e.ctrlKey || e.metaKey) && e.code === (cfg.panelHotkey || 'KeyI')) {
                e.preventDefault();
                toggleModal();
            }
        });

        // Tabs
        const tabBtns = overlay.querySelectorAll('.int-tab-btn');
        const panes = overlay.querySelectorAll('.int-pane');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.toggle('int-active', b === btn));
                panes.forEach(p => p.classList.toggle('int-active', p.id === `int-pane-${target}`));
            });
        });

        // Themes
        overlay.querySelectorAll('.int-theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = btn.dataset.theme;
                overlay.querySelectorAll('.int-theme-btn').forEach(b => b.classList.toggle('int-active', b === btn));
                core?.saveConfig({ theme: t });
            });
        });

        // Market filter
        const searchInput = overlay.querySelector('#int-market-search');
        const sortSelect = overlay.querySelector('#int-market-sort');
        const renderList = () => populateMarketList(searchInput.value, sortSelect.value);
        searchInput?.addEventListener('input', renderList);
        sortSelect?.addEventListener('change', renderList);

        // Trade Calc
        const giveInput = overlay.querySelector('#int-trade-give');
        const recvInput = overlay.querySelector('#int-trade-recv');
        const tradeRes = overlay.querySelector('#int-trade-result');
        const updateTradeCalc = () => {
            if (!trading) return;
            const parseIds = (val) => (val || '').split(',').map(s => s.trim()).filter(Boolean);
            const gives = parseIds(giveInput?.value);
            const recvs = parseIds(recvInput?.value);
            if (!gives.length && !recvs.length) {
                tradeRes.innerHTML = 'Enter IDs to preview trade summary.';
                return;
            }
            const s = trading.getTradeSummary(gives, recvs);
            const ratio = s.diff.valRatio;
            const color = ratio > 0 ? '#34d399' : (ratio < 0 ? '#f87171' : 'var(--int-text-muted)');
            tradeRes.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span>Your Side: <strong>★ ${s.give.value.toLocaleString()}</strong> (R$ ${s.give.rap.toLocaleString()})</span>
                    <span>Their Side: <strong>★ ${s.receive.value.toLocaleString()}</strong> (R$ ${s.receive.rap.toLocaleString()})</span>
                </div>
                <div style="font-weight: 700; color: ${color};">
                    Differential: ${ratio >= 0 ? '+' : ''}${s.diff.value.toLocaleString()} Value (${ratio >= 0 ? '+' : ''}${ratio.toFixed(1)}%)
                </div>
            `;
        };
        giveInput?.addEventListener('input', updateTradeCalc);
        recvInput?.addEventListener('input', updateTradeCalc);
    };

    const populateMarketList = (query = '', sortBy = 'value') => {
        const container = document.getElementById('int-market-items');
        if (!container || !trading) return;

        let items = trading.getAllItems();
        if (query.trim()) {
            const q = query.toLowerCase().trim();
            items = items.filter(it => it.name.toLowerCase().includes(q) || it.id.includes(q));
        }

        items.sort((a, b) => {
            if (sortBy === 'value') return b.value - a.value;
            if (sortBy === 'rap') return b.rap - a.rap;
            if (sortBy === 'demand') return b.demand - a.demand;
            return a.name.localeCompare(b.name);
        });

        if (!items.length) {
            container.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--int-text-muted);">No items found</div>`;
            return;
        }

        container.innerHTML = items.map(item => `
            <a href="/catalog/${item.id}" target="_blank" rel="noopener noreferrer" class="int-market-row">
                <div class="int-market-info">
                    <span class="int-market-name">${item.name}</span>
                    ${item.isProjected ? '<span class="int-badge int-proj">PROJ</span>' : ''}
                    ${item.isRare ? '<span class="int-badge int-rare">RARE</span>' : ''}
                </div>
                <div class="int-market-meta">
                    <span class="int-val">★ ${trading.formatNum(item.value)}</span>
                    <span class="int-rap">R$ ${trading.formatNum(item.rap)}</span>
                </div>
            </a>
        `).join('');
    };

    const init = () => {
        injectStyles();
        if (document.body) {
            renderHUD();
        } else {
            document.addEventListener('DOMContentLoaded', renderHUD);
        }
    };

    init();

    window.InteriumUI = Object.freeze({
        init,
        injectStyles,
        renderHUD
    });
})();
