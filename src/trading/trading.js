(function () {
    'use strict';

    if (window.InteriumTrading) return;

    const API_BASE = (typeof location !== 'undefined' && location.origin && !location.origin.startsWith('null') ? location.origin : 'https://www.echocr.xyz') + '/apisite';

    let csrfToken = '';
    const marketCache = new Map();
    let marketLoaded = false;
    let marketLoadingPromise = null;

    const request = async (path, options = {}) => {
        const headers = Object.assign({
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }, options.headers || {});

        if (csrfToken && options.method && options.method !== 'GET') {
            headers['x-csrf-token'] = csrfToken;
        }

        const res = await fetch(API_BASE + path, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: 'include'
        });

        const newCsrf = res.headers.get('x-csrf-token');
        if (newCsrf) csrfToken = newCsrf;

        if (res.status === 403 && !options._retried && res.headers.get('x-csrf-token')) {
            csrfToken = res.headers.get('x-csrf-token');
            return request(path, Object.assign({}, options, { _retried: true }));
        }

        return res;
    };

    const fetchMarketItems = async (force = false) => {
        if (!force && marketLoaded) return marketCache;
        if (marketLoadingPromise) return marketLoadingPromise;

        marketLoadingPromise = (async () => {
            try {
                const res = await request('/echomons/v1/items');
                if (!res.ok) throw new Error(`Market HTTP ${res.status}`);
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data?.data || data?.items || []);

                marketCache.clear();
                for (const item of list) {
                    const id = String(item.assetId || item.id || '');
                    if (!id) continue;
                    marketCache.set(id, {
                        id,
                        name: item.name || '',
                        value: Number(item.value ?? item.recentAveragePrice ?? 0),
                        rap: Number(item.recentAveragePrice ?? item.rap ?? 0),
                        demand: Number(item.demand ?? 0),
                        trend: Number(item.trend ?? 0),
                        isProjected: Boolean(item.isProjected),
                        isRare: Boolean(item.isRare),
                        isHyped: Boolean(item.isHyped),
                        copies: Number(item.totalCopies ?? item.copies ?? 0),
                        owners: Number(item.totalOwners ?? item.owners ?? 0)
                    });
                }
                marketLoaded = true;
                window.InteriumCore?.emit('market:updated', marketCache);
            } catch (err) {
                console.warn('[Interium] Echomons sync failed:', err);
            } finally {
                marketLoadingPromise = null;
            }
            return marketCache;
        })();

        return marketLoadingPromise;
    };

    const formatNum = (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (num >= 10000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        return num.toLocaleString();
    };

    const parseAssetId = (el) => {
        if (!el) return null;
        if (el.dataset.assetId) return el.dataset.assetId;

        const anchor = el.tagName === 'A' ? el : el.querySelector('a[href*="/catalog/"]');
        if (anchor) {
            const m = anchor.href.match(/\/catalog\/(\d+)/);
            if (m) return m[1];
        }

        const img = el.querySelector('img[src*="assetId="], img[src*="assetIds="]');
        if (img) {
            const m = img.src.match(/assetIds?=(\d+)/);
            if (m) return m[1];
        }
        return null;
    };

    const decorateCard = (card) => {
        if (card.dataset.intDecorated) return;
        const assetId = parseAssetId(card);
        if (!assetId) return;

        const item = marketCache.get(assetId);
        if (!item) return;

        card.dataset.intDecorated = 'true';

        let badgeContainer = card.querySelector('.int-card-meta');
        if (!badgeContainer) {
            badgeContainer = document.createElement('div');
            badgeContainer.className = 'int-card-meta';

            const nameEl = card.querySelector('[class*="itemName-"], [class*="cardTitle-"], [class*="name-"]');
            if (nameEl && nameEl.parentNode) {
                nameEl.parentNode.insertBefore(badgeContainer, nameEl.nextSibling);
            } else {
                card.appendChild(badgeContainer);
            }
        }

        badgeContainer.innerHTML = `
            <div class="int-meta-row">
                <span class="int-val" title="Value: ${item.value.toLocaleString()}">★ ${formatNum(item.value)}</span>
                <span class="int-rap" title="RAP: ${item.rap.toLocaleString()}">R$ ${formatNum(item.rap)}</span>
            </div>
            ${item.isProjected ? '<span class="int-badge int-proj" title="Projected: artificial RAP inflation">PROJ</span>' : ''}
            ${item.isRare ? '<span class="int-badge int-rare" title="Rare limited">RARE</span>' : ''}
        `;
    };

    let observer = null;
    const initCardObserver = () => {
        if (observer) return;
        const selector = '[class*="itemCard-"], [class*="cardWrapper-"], [class*="cardContainer-"]';

        const scan = () => {
            const cards = document.querySelectorAll(selector);
            for (let i = 0; i < cards.length; i++) {
                decorateCard(cards[i]);
            }
        };

        scan();

        observer = new MutationObserver(() => {
            if (marketLoaded) {
                requestAnimationFrame(scan);
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    };

    const getTradeSummary = (giveAssetIds, receiveAssetIds) => {
        let giveVal = 0, giveRap = 0;
        let recvVal = 0, recvRap = 0;

        for (const id of giveAssetIds) {
            const item = marketCache.get(String(id));
            if (item) {
                giveVal += item.value;
                giveRap += item.rap;
            }
        }

        for (const id of receiveAssetIds) {
            const item = marketCache.get(String(id));
            if (item) {
                recvVal += item.value;
                recvRap += item.rap;
            }
        }

        const valDiff = recvVal - giveVal;
        const rapDiff = recvRap - giveRap;
        const valRatio = giveVal > 0 ? (valDiff / giveVal) * 100 : 0;

        return {
            give: { value: giveVal, rap: giveRap },
            receive: { value: recvVal, rap: recvRap },
            diff: { value: valDiff, rap: rapDiff, valRatio }
        };
    };

    const fetchCollectibles = async (userId) => {
        const items = [];
        let cursor = '';
        for (let p = 0; p < 25; p++) {
            const q = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
            const res = await request(`/inventory/v1/users/${userId}/assets/collectibles?limit=100${q}`);
            if (!res.ok) break;
            const data = await res.json();
            const rows = data.data || [];
            for (const row of rows) {
                items.push(row);
            }
            if (!data.nextPageCursor) break;
            cursor = data.nextPageCursor;
        }
        return items;
    };

    const sendTrade = async (targetUserId, givesUserAssetIds, receivesUserAssetIds) => {
        const payload = {
            offers: [
                {
                    userId: Number(targetUserId),
                    userAssetIds: receivesUserAssetIds.map(Number),
                    robux: 0
                },
                {
                    userId: 0,
                    userAssetIds: givesUserAssetIds.map(Number),
                    robux: 0
                }
            ]
        };
        const res = await request('/trades/v1/trades/send', {
            method: 'POST',
            body: payload
        });
        return res;
    };

    fetchMarketItems().then(() => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initCardObserver);
        } else {
            initCardObserver();
        }
    });

    window.InteriumTrading = Object.freeze({
        fetchMarketItems,
        getItem: (id) => marketCache.get(String(id)) || null,
        getAllItems: () => Array.from(marketCache.values()),
        getTradeSummary,
        fetchCollectibles,
        sendTrade,
        formatNum
    });
})();
