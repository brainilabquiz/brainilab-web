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

## Automatic execution (owner-authorized 2026-10-01)

The daily exporter also writes private `data/codex-handoff.json`, including on same-day reuse. Each task has a stable URL identity, the evidence snapshot, actual query/page rows and acceptance criteria. The native Codex heartbeat reads this queue and executes work in the existing chat; no separate message gateway, exposed token or other chat is required. This is a daily local cycle, not an always-on cloud worker.

Always reconcile queue entries with current Supabase decisions. Resume unfinished approved work; skip dismissed/published/monitoring. Start at most one coherent improvement per run. Read current source and public pages before acting; a stale proposal may already be solved. If evidence is weak or the change unnecessary, record that finding rather than manufacture an edit. New article ideas join the existing one-article-per-day editorial plan, not an additional publishing stream.

Before any write, save a private backup and inspect Git changes and the opportunity revision. Record automatic approval under the explicit owner authorization, without impersonating a user (`actor=null`). Use a transaction with `WHERE id=... AND revision=... AND state=...`; add the event only from the rows actually updated. Zero updated rows means a concurrent change: stop and reread. Never replace the proposal or baseline. Implement and test, open/attach a PR, merge using the expected SHA, then verify Cloudflare and the public URL. Only then record `published_at`, change reference and the next revision, with an event describing the tested result. Failed deployment stays unfinished and must be resumed, not duplicated.

Follow-up needs equal, non-overlapping post-publication periods in Search Console Pacific dates. A successful release is not a demonstrated SEO improvement. Record completed cycles in `outputs/BrainiLab-Growth-seguiment.md` and update the resume point.

## OpenSEO research integration

### Search intent and acquisition briefs (2026-10-07)

Each Codex task now carries an `acquisitionBrief`: the reader's need, an existing
destination, query-fit evidence, a useful next step, and a measurement plan.
`search_intent.py` contains a small reviewed route map for existing number games,
flag quizzes and the beginner maths course. Exact phrases are conservative
research candidates, not an automatic judgment about intent. Unknown/ambiguous
queries remain visible for research. A query such as "number route" alone does
not prove a game search; cross-page rows cannot establish a match.

Matching observed candidates precede other observed leads; provider-only ideas
follow them. Sorting is stable within each tier. Current remote decisions still
take precedence: resume approved work and skip published/monitoring/dismissed.
Task IDs, evidence, original baselines and the one-change limit are preserved.
No extra dashboard, tracking, database schema or content quota is introduced.

Group equivalent searches into an existing destination rather than a new page
per wording. Preserve distinct useful scopes such as Europe and World Flags.
Informational articles remain valuable: answer the reader before suggesting
practice. Confirm the live page and intent before any change. The measurement
plan is explicitly not observed results: search clicks, reading signals, games,
confirmed accounts and subscriptions are separate stages with separate coverage.
Do not infer Academy completion from an article_read event.

Distribution briefs require one destination and a specific feedback question;
check the launch log and the actual human authorization before sending anything.
Do not buy ranking links, create filler to reach word counts, invent expertise,
or treat AI-generated audiences/keywords as measured demand. There is no special
schema requirement for Google's AI features. Source review and decisions:
[video application notes](VIDEO-APPLICATION-2026-10-07.md).
Validate with `python -m unittest discover -s tools/growth -p "test_*.py"`.

The Growth report accepts a separate validated OpenSEO snapshot and the admin
shows project context, site audit and keyword workflows with their real state.
Read [OPENSEO.md](OPENSEO.md) before running them. `openseo.py record` preserves
history and guards against stale writes; rerunning the daily exporter refreshes
provider evidence even when Google's same-day report is reused. The Codex handoff
contains research tasks plus reviewed execution tasks. Missing tools or results
remain explicitly unverified. Installation is not a completed audit, and estimated
search demand never replaces first-party clicks. No credentials enter the site.

## Validation commands

## Measurement baseline (2026-10-01)

### Automatic acquisition (2026-10-04)

`python tools/growth/ga4_acquisition.py --private PRIVATE_DATA_DIR` refreshes
aggregate sessions, engaged sessions and events, plus GA4 session channels and
source/medium rows. It uses the existing separate Analytics read-only token;
no new OAuth, scope, tracking event or visitor identifier is required. Defaults:
28 property-calendar dates ending two UTC days ago. The actual property timezone
is taken from the API and displayed separately from Search Console dates.

All three queries must complete with consistent pagination, headers and timezone
before replacing `measurement-latest.json`. Successful same-day/per-period runs
are reused. Errors preserve the previous snapshot; a concurrent file change
aborts replacement. Prior observations are retained in private measurement-history.
The exporter accepts legacy manual observations and API schema version 2, strips
unrecognized fields, and never replaces a newer attached observation with an older
one. Unreturned channel rows are absent, not inferred zeros. API totals are queried
separately; the UI does not sum detailed rows or calculate account conversion rates.

Growth shows channels and sources, collection date, property timezone and quality
warnings; snapshots older than 48 hours are labeled. Source labels containing
email-like or malformed values are withheld before persistence. No recipients,
message text, visitor IDs or tokens are part of this snapshot. Direct is unknown
referral attribution, not proof of typed-in traffic. Internal testing and consent
coverage can affect all counts. Today's outreach falls outside the data window.
Use `test_acquisition.py` and `tools/test-growth-acquisition.mjs` for validation.
Official dimensions: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema

### Content insights (2026-10-04)

Growth now shows a private Content section above opportunities, with search,
content-type filters and ordering by views or active users. Article, Academy
lesson, course introduction and library rows are distinct; classify lessons
against the current published Supabase course inventory before importing.
`content_measurement.py` validates and attaches `data/content-measurement-latest.json`
to both new and reused Growth exports through `measurement.py`. The timestamp,
source and period remain visible. Older observations cannot replace newer ones.
No counts are embedded in frontend bundles or static public assets.

The initial observation was a manually verified GA4 Pages and screens snapshot.
Analytics API collection was authorized and verified on 4 October; the following
authorization steps are recovery documentation. The Search Console scope does not authorize
Analytics. After explicit owner approval, use `ga4_content.py authorize --private
PRIVATE_DATA_DIR` to request only `analytics.readonly` with PKCE/state and a local
callback. It uses the existing private desktop client but saves a separate
`google-analytics-token.json`; the Search Console token is preserved. Enable the
Google Analytics Data API in the authorized Google project if required. Do not
run authorization silently or copy tokens into the admin interface.

`python tools/growth/ga4_content.py sync --private PRIVATE_DATA_DIR --start YYYY-MM-DD --end YYYY-MM-DD`
reads aggregate page views, active users and article_read event counts from
property 555562532, limited to brainilabgames.com and /learn/. It requires a validated
inventory snapshot first, rejects partial/unstable results, retains history and
only replaces the snapshot after both queries succeed. End at least two UTC days
ago. Refresh inventory from published articles/courses before each collection.
Then run the daily exporter and the existing backed-up Supabase ingest procedure.
Authorize and verify the first real API sync before adding it to the daily cycle.

Missing rows/metrics remain null, not inferred zeros. Reading signals are event
counts, not unique readers or comprehension. Academy completion is unmeasured here;
course-introduction users cannot be added to lesson users. Samples may include
internal testing; no organic uplift is inferred. GA4 and GSC have separate dates.
Official API: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport

`measurement.py` attaches the private `data/measurement-latest.json` observation
to both fresh exports and same-day reuse. The current observation comes from the
signed-in GA4 Traffic acquisition report (3–30 September 2026, all users, 100%
of available data): 43 sessions, all Direct, 36 engaged sessions, 922 events.
It is a manually checked snapshot, not an API synchronization or an organic
conversion funnel. The dashboard preserves the separate GSC dates.

Consenting public visits now include `growth_entry_channel` and
`growth_entry_path` diagnostic parameters. Browser attribution expires after
30 minutes without measured activity and clears on consent withdrawal.
These simplified channels are not Google's official channel classification.
The Europe pilot emits `practice_start`/`practice_complete`; scored games keep
their existing `game_start`/`game_complete` events. Email sign-up requests emit
`registration_request` only after a successful request, never `sign_up`.
An email request or sign-in is not evidence of a newly verified account.

Next: verify processed game/account-interest events without presenting aggregate
event counts as people. Analytics acquisition and content refresh now use the
authorized read-only connection. Confirmed-account measurement remains separate.
Do not reuse the Search Console token for a broader scope or mark unknown
conversion counts as zero. No analytics data or credentials are public assets.

`python -m unittest discover -s tools/growth -v`

`node tools/test-admin-growth.mjs` (uses the existing private test environment's JSDOM_MODULE when jsdom is not installed locally).

## 2026-10-01 discovery and voluntary account experiment

Geography now gives Europe Flags, World Flags and World Capitals distinct, crawlable entry points and links to relevant reading. Google guidance reviewed: https://developers.google.com/search/docs/fundamentals/creating-helpful-content and https://developers.google.com/search/docs/crawling-indexing/links-crawlable . Existing URLs and canonical targets remain; this is not proof of indexing or increased traffic.

Guest result screens offer an optional free-account invitation. Europe practice remains local and unranked; the invitation does not promise to save that round. Signed-in users do not see it. Dismissal and loading failures preserve the result.

With statistics consent, account_prompt_click records the voluntary CTA click and account_prompt_open records successful form opening. Only allowlisted placement/game values plus the existing coarse arrival channel/path are sent. game_filter now includes the Games format and an allowlisted topic. Registration requests, verified registrations, existing sign-ins and paid subscriptions remain separate; no new sign_up event is inferred.

Evaluate after enough consented visits: organic arrivals -> play/completion -> invitation click -> form opening -> email request. Automatic GA4 ingestion remains pending. No historical counts are backfilled, and no SEO or conversion uplift is claimed on publication day.

## Confirmed accounts (2026-10-02)

Growth reads a private Supabase Auth confirmation ledger through the existing
owner/editor workspace RPC and MFA gate. It counts retained, email-confirmed,
non-anonymous accounts, excluding every account listed in `admin_users`.
The initial snapshot is a baseline, never a claim of new acquisition.
A trigger records the first confirmation once, including anonymous-to-permanent
transitions; repeat sign-ins and later email changes do not add registrations.
Account deletion cascades to this ledger and its optional arrival record.
Capture failures do not block registration; the report exposes missing-ledger gaps.

With existing statistics consent, email/Google signup saves only a coarse channel,
public landing path and timestamps in the browser for up to seven days. After
authentication, an RPC derives the account from `auth.uid()` and attaches the
arrival only to an eligible new confirmation. It rejects baseline/team accounts,
private paths and invalid timing; each account accepts one arrival. Revocation
clears pending storage and attempts to remove the signed-in account's attribution.
No account identifier is sent to Google Analytics and no GA4 `sign_up` is inferred.

The aggregate panel uses the last 30 UTC dates and explicitly shows when capture
started: earlier dates have no new-confirmation coverage. Browser channels are
self-reported diagnostic signals, not Google's attribution or causal evidence.
Cross-device confirmation, no consent, expired context or unavailable services
can leave confirmed accounts unattributed. Historical counts are not reconstructed.
Current totals represent retained accounts, not all-time gross registrations.

Migration `20261002042236_growth_confirmed_accounts.sql` was applied on 2 October.
Initial verified baseline: four nonstaff accounts, two excluded team accounts and
five excluded anonymous profiles; zero new confirmations at the initial check.
Three RLS-enabled private tables intentionally have no direct client policies or
table grants. Only guarded RPCs can access them.

Validation: `node tools/test-growth-confirmed.mjs` covers consent, eligibility,
expiry, retry, revocation races and aggregate rendering. The rollback-only
`tools/growth/test-confirmed-accounts.sql` checks the real trigger on a temporary
fixture table and account-scoped RPCs without creating or modifying Auth users.
It must be run through an authorized database management connection. All temporary
ledger changes roll back. No real new human signup was observed during these tests.
Live browser review was unavailable because Computer Use could not reliably
identify the current browser URL; do not present DOM tests as visual verification.
