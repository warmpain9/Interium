# Interium

Interium is an **unofficial, open-source community userscript for Pekora**. It is not affiliated with, endorsed by, or operated by Pekora.

## Install

1. Install Tampermonkey.
2. Open `loader/interium-loader.user.js` in GitHub and choose **Raw**.
3. Confirm the installation in Tampermonkey.

The loader attaches the current runtimes (`src/core/core.js`, `src/trading/`, `src/ui/`) from this repository through jsDelivr using Tampermonkey `@require`, so every loader update ships the newest code without reinstalling.

## Why a loader?

The loader stays short enough to audit. The full script can improve without asking users to reinstall. This convenience also means the repository owner can change code that users run, so review commit history and only install from a repository you trust.

## Source policy

- `src/trading/` is the **only authoritative trading implementation**.
- The **Mass Trader** engine (ported from the supplied `src.js`) lives in `src/trading/` as `window.InteriumMassTrader`; its UI is the **TRADE** tab in `src/ui/`. It only **sends** standard trade offers that each recipient must **manually accept** in Pekora's own UI — it never auto-accepts, auto-declines, or auto-confirms trades.
- No fake-balance / fake-verification / "LARP" or trade-window styling code was imported from `src.js`; those deception features are intentionally excluded.
- The project does not include the supplied Interium/Hexium Worker authentication/profile/announcement backend.
- `src/core/core.js` contains only shared style constants, an asset URL helper and a module registry.

## Network access

All network behavior is visible in source:

| Destination | Purpose | Credentials |
| --- | --- | --- |
| `cdn.jsdelivr.net` | Download current Interium runtimes (Tampermonkey `@require`) | None |
| `pekora.zip` / `www.pekora.zip` | Read Pekora pages and same-origin inventory/trade data used by Trading Interium; the Mass Trader reads inventory/asset owners/thumbnails and **sends** trade offers via `/apisite/trades/v1/trades/send` (recipient must manually accept) | Existing browser session, sent only to Pekora |
| `www.koromons.net` | Public item values, demand, and leaderboard data used by Trading Interium | None |

Interium does **not** read `document.cookie` (the Mass Trader gets its CSRF token only from Pekora's own `x-csrf-token` challenge response header), send cookies to GitHub/Koromons, include analytics, auto-accept trades, or contact the removed Interium/Hexium Worker backend.

## Local settings

Settings are stored with Tampermonkey's `GM_setValue` (with localStorage fallback for development). Open Tampermonkey's script menu to edit, toggle, or reset them. Trading Interium retains its own documented local caches/settings.

## Build and verify

```bash
npm run check
npm test
```

## Security

Read [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md). Report vulnerabilities privately before opening a public issue.

## License

MIT. See [LICENSE](LICENSE). Preserve upstream attribution in `src/trading/`.
