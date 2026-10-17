# Keep the header and account menu on the same current avatar

Two separate presentation problems could leave a header photo disagreeing with the illustrated avatar in the account menu.

The async auth header renderer awaited local auth/player wrappers, then painted the returned player snapshot. The account menu paints the current `BrainiData.player()` synchronously. A cosmetic change or logout between those awaits could therefore leave an old photo or prior account painted over the current portrait. The renderer now reads that same current player directly, without a queued snapshot. Its existing Promise interface, tooltip, session initialization and synchronization flows remain intact; it does not write any player data.

Static pages also loaded cloud code from the fixed `cloud.bundle.js?v=41.54.0` URL even though JavaScript is cached as immutable for a year. A browser could keep a previously downloaded renderer while the page's shell had already updated. The cloud bootstrap now goes through the existing `loadFeature` resolver, which uses the build's exact content-hash manifest. The existing SDK URL, lazy startup triggers and shared bootstrap Promise are unchanged.

## Evidence and verification

- `tools/test-header-avatar-race.mjs` loads the actual artwork, progression, account-menu and auth modules. On main `a1c996b` its controlled delayed snapshots overwrite both a newer illustrated avatar and the next owner's portrait. Both cases pass after this change, with player values unchanged.
- `tools/test-avatar-render-stability.mjs` continues to retain all five decoded portrait nodes across repeated updates and preserves failed-photo fallback. It checks the final existing auth tooltip and updated rank decoration.
- `tools/test-lazy-feature-cache.mjs` compares the cloud URL with the hash of actual minified build bytes. A completed script with the old fixed URL is deliberately present; the current hash must still load once, and concurrent callers must share the bootstrap.
- Public HTTP reads on 17 October found that both the legacy and current PR197 URLs returned the same current cloud bytes from this connection: SHA-256 `54ee128de532dfdf0d2cd44077e1adba9de8367158f6e9f9153f2826287c7c59`, with one shared-helper call and no direct avatar HTML assignment. This does **not** prove which bytes another browser previously cached. The concrete invalidation defect is the fixed URL under immutable caching, independently of the response returned during this capture.

No XP, scores, account permissions, session logic, consent, security headers, SDK version or backend data changes. This follow-up addresses avatar consistency and cloud cache invalidation; it does not claim a measured improvement in Core Web Vitals or elimination of every navigation flash.
