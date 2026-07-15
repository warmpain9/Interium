# Security

The loader executes the current `main` branch, so repository security matters. Protect releases with review and branch protection. Never add obfuscated code, analytics, credential collection, or undisclosed hosts. Report vulnerabilities through GitHub Security Advisories.

Before release, run `npm run build && npm run check && npm test`, review the network table, and inspect the generated diff.
