# Private BrainiLab Growth tools

The website publishes none of this directory. Real exports, SQLite data, OAuth client configuration and refresh tokens belong in ignored `data/` on the private operator machine. Never commit or upload them as website assets. The admin Growth screen reads private Supabase reports through owner/editor RPCs and the existing MFA gate; it has no Google token.

## Current workflow

1. Import each official Search Console ZIP with `python tools/growth/gsc_import.py EXPORT.zip --property sc-domain:brainilabgames.com --captured-at ISO_TIMESTAMP_WITH_TIMEZONE`.
2. Generate the report with `python tools/growth/report_gsc.py --inventory PRIVATE_PUBLIC_AUDIT.json`. The default output is `tools/growth/data/growth-report.json`.
3. In `/admin/#growth`, import that JSON. Review a proposal, record a decision, implement and verify the approved change, then record its publication URL. Saving a decision does not deploy content.

Imports are idempotent, keep historical snapshots and never overwrite an existing decision or its original baseline. Reports distinguish property totals from page/query rows. Hidden queries and absent pages are not zero traffic. Follow-up requires matching filters, non-overlapping equal-length periods and a verified publication date. A before/after difference is not proof of causality.

## Google read-only connection

BrainiLab Growth was authorized, switched to production with owner approval, and verified against the real API on 2026-10-01. The setup below is recovery documentation, not a request to repeat consent.

An existing Google Search Console browser session does not grant this tool offline API access.

1. In a Google Cloud project you control, enable the Search Console API and configure the OAuth consent screen. If the app is in external testing, add the Search Console account as a test user. Google may limit refresh-token lifetime for testing apps.
2. Create an OAuth client of type **Desktop app**. Save the downloaded JSON directly as `tools/growth/data/google-client.json`. Do not paste credentials into chat or the admin UI.
3. Run `python tools/growth/gsc_sync.py authorize`. Open the printed Google URL and authorize the single `webmasters.readonly` scope. The loopback callback checks random state and PKCE. The private refresh token stays on this machine.
4. Run `python tools/growth/gsc_sync.py sync --start YYYY-MM-DD --end YYYY-MM-DD`. Use a complete period ending at least three UTC days ago; Search Console dates are Pacific dates. All three scopes must be fetched successfully before importing: the property, Number Route and Math Rush.
5. Generate/import the report as above. Check `python tools/growth/gsc_sync.py status`. Token presence alone is not a successful data connection; `data/connection-status.json` records only a completed sync.

The Codex heartbeat `brainilab-growth-dades-i-oportunitats` runs at 09:15 Europe/Madrid in the existing chat. It depends on the local computer and Codex being available; registration is not proof of a future unattended run. Google data collection and authenticated Supabase management ingestion were manually verified. No service-role key is placed in the frontend and the admin MFA gate remains unchanged.

Run `python tools/growth/daily_gsc.py --inventory PRIVATE_PUBLIC_AUDIT.json`. It collects a rolling 31-day window ending three UTC days before execution, exports the report privately, and stores a hash. A same-day retry reuses a matching export. Always finish a pending Supabase import even when the local export was reused. Before ingesting, save a private database backup; call the existing `brainilab_growth.ingest(report::jsonb, null)` via the authenticated management connector and compare prior opportunity revisions/states/baselines afterwards. A second ingestion must add no opportunities or events. Never impersonate an actor or use browser session tokens from scripts.

The report now includes observed query/page pairs, up to twelve explainable leads, downloadable editorial briefs, and a dated public-audit summary. Triage thresholds (10 impressions, 3% CTR, position 20) are product rules, not benchmarks. Reopen current pages and verify intent before writing: a visible query can be unrelated. The audit covers saved HTML checks only; it does not measure performance, Google indexing or AI citations. Organic game completions, sign-ups and Plus attribution are explicitly unconnected, not reported as zero.

The API requests final web data, paginates with an explicit cap, and rejects a capped result rather than silently treating it as complete. Google may still return only top rows. Failed Google requests leave the previous successful report available. Export periods are explicit so that rolling windows are not accidentally used as post-change evidence.

Official references: [Google installed-app OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [Search Console authorization](https://developers.google.com/webmaster-tools/v1/how-tos/authorizing), [Search Analytics data limitations](https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data).

## Checks

`python -m unittest discover -s tools/growth -v`

`node tools/test-admin-growth.mjs` (uses the existing private test environment's JSDOM_MODULE when jsdom is not installed locally).
