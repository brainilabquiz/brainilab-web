# BrainiLab V41.0 — Stable V1 / Step 1

## Scope

This build closes the first production-readiness block without activating live billing or ads.

### Removed development leakage
- Removed the always-visible `LOCAL STRIPE TEST` panel.
- Removed seeded 12-day streak and seeded Daily score from initial HTML.
- Removed fake community counters, leaderboard rows, personal bests and recent-result seeds.
- Local results no longer invent percentile positions.

### Auth hardening
- Google/email account actions now require the real Supabase Auth backend.
- If Auth is unavailable, BrainiLab shows an error instead of creating a fake local account.
- Password-reset success is only shown after a real backend request.
- Removed early-development / Step 2 copy from the auth modal.

### Social / ranking / feedback hardening
- Rankings never fall back to generated fake users.
- Friends/groups mutations never fall back to generated local identities.
- Suggestions never claim success when they were only stored in localStorage.

### Reliability
- Added branded root `404.html`.
- Updated service-worker/cache identity to V41.0.
- Updated all JS/CSS cache-busting to `v=41.0`.
- Added conservative security headers (no CSP yet, because hosting/domain decisions are Step 2).

### Monetization
- Stripe/Plus logic is retained.
- Scheduled cancellation support from Step 20.1/V40.6.1 is retained.
- Ads remain launch-gated. Deliberate local `?ads_test=1` tooling is retained but cannot activate on a public hostname.

## QA performed
Historical V41 result: static syntax, internal-link, asset and HTML contract checks passed. The generated QA JSON snapshots have since been removed; their original versions remain in Git history. For current deployment validation use `node tools/test-home-entry.mjs`, `python tools/check-editorial.py` and `python tools/check-build.py` after building.

## Not part of Step 1
- Production domain/hosting
- Stripe Live credentials/prices/webhook
- AdSense publisher/slot IDs
- CMP/legal/fiscal production configuration
