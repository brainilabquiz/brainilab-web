# BrainiLab V41.9 — Automatic guest rankings

Completed scored games create a persistent anonymous Supabase player on demand. Visiting a page, Try First and practice do not create a player or submit a result. Registered players enter rankings automatically on completion unless they explicitly choose Hide. Generated public aliases avoid publishing private account names and OAuth photos automatically.

The overall Brain Score ranking continues to count Daily games. Play Anytime counts in the corresponding game ranking. Existing Daily replay protection and ranking moderation remain in place. Completed zero-point games are eligible.

Guest progress is claimed on login using a random, hashed, expiring claim token. Unique sessions transfer to the account; an existing account Daily takes precedence over the matching guest Daily. The retired guest is hidden. Signing out resets the local player state.

## Deployment

1. Apply `supabase/step28_automatic_guest_rankings.sql` once after Step 27. It runs in a transaction; do not rerun after success.
2. Enable Supabase Authentication > Sign In / Providers > Allow anonymous sign-ins.
3. Regenerate bundles with UTF-8 Python: `python tools/rebuild-bundles.py`.
4. Push reviewed code to GitHub main. Cloudflare Worker brainilab-web automatically deploys using `npx wrangler deploy` and assets from the repository root. The optional dist minification build is not the configured deployment input.
5. Verify version 41.9.0, guest completion/ranking, reload persistence and registered Daily auto-enrollment.

Steps 1 and 2 were applied and verified on 2026-09-09 in project wvgcdlxebbybthyuajgb. Three new triggers and the true profile default were confirmed. Keep the existing email confirmation and manual-linking settings unchanged.

## Validation

- `node tools/test-guest-auth.mjs`: 16 checks of real source modules with mocked Supabase.
- `node tools/test-guest-rankings.mjs`: 27 SQL checks with PGlite. Install @electric-sql/pglite and supply PGLITE_MODULE if it is not resolvable locally. Supporting progression/analytics functions are fixtures; this is not a full production database clone.
- `python tools/qa_v41_8.py`: existing regression suite updated for current build identity, using the active Python interpreter. Requires beautifulsoup4 and Node. Passed: 73 JS files, 43 HTML files, 1,074 local references, game/content and SEO checks.
- Generated shell, cloud and ranking bundles pass Node syntax checks.

## Recovery

If a frontend regression appears, Cloudflare can restore the previous deployment. Leave Step 28 installed while investigating; it preserves existing tables and game history. If anonymous signup must be paused, disable Allow anonymous sign-ins; this stops new guest identities but does not remove existing users. Guest sessions are browser-local identities: clearing browser storage loses access until previously linked to a permanent account.
