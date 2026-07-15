# Interium

Interium is an **unofficial, open-source community userscript for Pekora**. It is not affiliated with, endorsed by, or operated by Pekora.

## Install

1. Install Tampermonkey.
2. Open `loader/interium-loader.user.js` in GitHub and choose **Raw**.
3. Confirm the installation in Tampermonkey.

The loader requests `dist/interium-main.js` from this repository on every matching page load. If GitHub is temporarily unavailable, it uses the last copy that downloaded and ran successfully.

## Why a loader?

The loader stays short enough to audit. The full script can improve without asking users to reinstall. This convenience also means the repository owner can change code that users run, so review commit history and only install from a repository you trust.

## Source policy

- `src/features/trading-interium.js` is the **only authoritative trading implementation**.
- No trading, mass-trading, trade-send, or trade-window code was imported from the supplied `src.js`.
- The project does not include the supplied Interium Worker authentication/profile/announcement backend.
- `src/core.js` contains only local settings and small appearance preferences.

## Network access

All network behavior is visible in source:

| Destination | Purpose | Credentials |
| --- | --- | --- |
| `raw.githubusercontent.com` | Download current Interium runtime | None |
| `pekora.zip` / `www.pekora.zip` | Read Pekora pages and same-origin inventory/trade data used by Trading Interium | Existing browser session, sent only to Pekora |
| `www.koromons.net` | Public item values, demand, and leaderboard data used by Trading Interium | None |

Interium does **not** read `document.cookie`, send cookies to GitHub/Koromons, include analytics, or contact the removed Interium Worker backend.

## Local settings

Settings are stored with Tampermonkey's `GM_setValue` (with localStorage fallback for development). Open Tampermonkey's script menu to edit, toggle, or reset them. Trading Interium retains its own documented local caches/settings.

## Build and verify

```bash
npm run build
npm run check
npm test
```

## Security

Read [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md). Report vulnerabilities privately before opening a public issue.

## License

MIT. See [LICENSE](LICENSE). Preserve upstream attribution in `src/features/trading-interium.js`.
