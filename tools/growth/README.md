# Private BrainiLab Growth tools

## Growth work areas

Growth opens at **Next moves**, the existing decision workbench. The work-area
navigation provides direct access to SEO Explorer, Search & indexing, Visits &
play, Content, Distribution, Decisions and Research & data. Each source keeps its
own dates, quality limitations and metric definitions. The historical property
summary belongs to Search & indexing; GA4 acquisition and the separate account
confirmation report belong to Visits & play.

On narrow screens a labelled native selector provides the same eight areas.
Switching areas retains the mounted tools, filters, pagination, open disclosures
and unsaved decision notes. It performs no query, import, publication or decision
write. Saved-record and query/page shortcuts reveal their destination before
moving focus, keeping the admin's `#growth` route intact. A confirmed save retains the selected area; a fresh Growth session
starts at Next moves. The existing leave-with-unsaved-changes guard still applies.
No navigation preference or private report is added to browser storage.

Verify with `node tools/test-growth-navigation.mjs` and the existing workbench,
admin, SEO Explorer, decision queue and measurement suites. Native keyboard and
responsive checks remain separate from automated DOM tests or a conformance claim.

Learn article/course comparisons now share the existing inert Article comparator.
The ordinary crawl reuses its successful HTML responses in a bounded local
Node/JSDOM pass (`JSDOM_MODULE` points to the existing local dependency). Saved
captures/revisions can seed `learn-schema-latest.json` with original dates and
exact hash/CAS, without another crawl. `Learn schema`, page detail and full CSV
show matching, equivalent, different and unknown evidence; historical corrections
do not reopen work. See the Learn section of `SEO-EXPLORER.md`.

Dynamic quiz schema evidence is now attached by the ordinary SEO export without
new crawling or gameplay calls. Reuse today's `quiz-schema-latest.json`; refresh
published prompt-only banks through the existing management connector only when
needed, then record with exact hash/CAS. The six-quiz overview, page review and
CSV preserve dated evidence, reviewed equivalents and unknown cases. See
`SEO-EXPLORER.md` → Dynamic quiz question declarations for the SQL/record contract.

## Sessions with a recorded start and Google indexing

[Play and indexing evidence](PLAY-INDEXING.md) documents the two independent,
dated report sections: GA4-reported sessions containing an existing start event,
and Google's URL Inspection indexed-version verdicts. They preserve missing data,
source scopes, consent/coverage limitations and private history without adding
tracking, indexing requests, player access or scoring changes.

## Our own SEO Explorer

The [SEO Explorer](SEO-EXPLORER.md) adds anonymous public-page checks, deduplicated
known backlinks and a disclosed technical Page/Domain Trust checklist. It reuses
existing Search Console keywords. External reputation and global backlink totals
remain unmeasured. No Ahrefs account, subscription or new analytics is involved.

## YouTube Studio and draft upload packs

Owner authorization on 13 October 2026: the existing Growth heartbeat reads signed-in YouTube Studio, researches video ideas and prepares upload packs. **No video uploading, scheduling, public metadata edits, Studio experiments or Community posting is authorized.** No media generators are activated. Use the native browser session; the owner explicitly permitted the Codex sidebar on 13 October. This is a native Codex step, not a hidden browser endpoint or YouTube Analytics API connection.

Before the usual daily runner, read the current BrainiLab channel `UCy35EdjSpdYufOLJBybevsA` in Studio. Capture actual date range, overview and selected long/Short observations separately, search terms when available, and Trends recommendations/audience-interest labels. Save UI evidence privately. Keep approximate displays, source/format/age and unavailable values honest; recommended videos are inspiration, not market volume or scripts to copy. The UI may not display the analytics timezone; preserve null rather than guessing.

Normalize the observed fields into schema 1 described by `youtube_studio.validate`. Include SHA-256 hashes of actual UI capture files. Run `youtube_studio.py --private PRIVATE record --input OBSERVATION.json --expected-sha256 HASH` (`missing` for first use). It keeps successful history, rejects stale/CAS-conflicting records and stores no credentials. On a real failure use `failure --reason session_unavailable|wrong_channel|ui_unavailable|invalid_capture`. It retains successful observations and prevents a failed refresh being presented as current.

Enable only in private `video-policy.json` with `{"enabled":true,"publishingAuthorized":false}`. `measurement.attach_measurement` then enriches the daily Growth report with dated `youtubeStudio` and `videoPlanning`; same-day reuse updates the export hash. `handoff.py` includes a distinct draft-only `videoResearch` queue with stable identities, data provenance and prior drafts. A query merely typed without an actual returned signal is excluded. Older-than-seven-day observations and failed refreshes do not produce executable video candidates; the ordinary GSC/GA4 cycle continues.

Compare three candidates and verify their website destinations, actual current upload history, both local pack libraries and the existing calendar. Do not choose by different-age view totals, copy a competitor's script, duplicate a scheduled video or revive a deferred post. Low/very-low audience interest needs a specific experimental justification; it is not a reason to manufacture a daily quota. Prepare at most **one new pack per local day**; retries resume it.

Curate a full original plan as in the previously prepared local pilot: titles, actual script/questions with checked answers/sources, three thumbnail prompts, metadata, resources, destination and feedback. Bind `youtubeEvidence.snapshotSha256` and `references` to the actual Studio snapshot and document `fitExplanation`, `currentUploadReview`, `currentCalendarReview`, and an `experimentalJustification` when required. Run `video_packs.py --report GROWTH.json --plans REVIEWED_PLANS.json --studio PRIVATE/youtube-studio-latest.json --output NEW_DRAFT_FOLDER --as-of YYYY-MM-DD`. This automatic path accepts one plan, keeps unknowns and source periods, checks current published inventory and preserves existing/human-edited output. It does not invent video files, durations, chapters, subtitle timestamps or publication dates.

Visible questions must use one line of at most 60 characters, and each ABC choice one line of at most three words. The generator rejects oversized copy before writing any artifact; rewrite it naturally without truncating facts or changing the answer. Explanations and spoken scripts are separate from this display limit. Final visual fit still requires the actual template/render.

Register only verified artifacts using `video_drafts.py --private PRIVATE --pack-directory PACK_FOLDER --expected-sha256 HASH`. It verifies the full manifest, preserves human/deferred decisions, rejects changed identities and duplicate destination/format drafts, backs up registry history and is idempotent. Prior manual pilot packs can be registered without counting as a new automatic pack. The registry lives outside Git. Rerun the usual exporter after recording a pack to refresh the handoff. Complete the existing backed-up Supabase ingest, preserving opportunity states and baselines; preparation is never a publication.

For one reviewed correction to an existing prepared draft, generate a new folder, then add `--revise-id EXACT_ID --expected-manifest-sha256 PREVIOUS_HASH` to registration. Review the old and new questions/sources first. Both manifests and the previous artifacts must match their hashes; human edits or deferred/dismissed states stop the revision. This preserves the original identity, creation time, preparation day, authorization and version history, and does not count as a new automatic pack. Never change an ID or format to bypass duplicate/day checks.

The creator produces/reviews media. Metadata stays preproduction until checked against the actual final render; add chapters only from real timing and subtitles from actual audio. New videos and posts need a future explicit publication request. This cycle requires the local computer, Codex and signed-in Studio session; it does not run independently in the cloud. Tests cover recording/CAS/history, failures, unknowns, stale/typed evidence, source binding, draft idempotence, human edits and global daily preparation limits.

The website publishes none of this directory. Real exports, SQLite data, OAuth client configuration and refresh tokens belong in ignored `data/` on the private operator machine. Never commit or upload them as website assets. The admin Growth screen reads private Supabase reports through owner/editor RPCs and the existing MFA gate; it has no Google token.

## Current workflow

### Workbench: resume, review and measure

The first Growth panel now builds a read-only worklist from the current loaded
decisions. Approved work comes first, followed by conflicts, comparable published
results and pending reviews. Published/follow-up decisions are measurement work,
never promoted as another edit; dismissed decisions stay excluded. Duplicate or
incomplete records cannot authorise resuming work. Open recorded decision/history
uses the existing card and preserves unsaved notes.

The SEO Explorer queue, matched rows and page evidence open the same card's
relevant disclosure: published/follow-up records reveal Follow-up and change
history; pending/approved/set-aside records reveal the recorded proposal. The
loaded validated decision state controls this choice, never an imported proposal
status. Opening a set-aside proposal for reading does not reopen its decision.
Other disclosures and unsaved fields remain intact. This performs no request,
save, status transition or comparison recalculation. The workbench's existing
correct disclosure behaviour is unchanged. Validate with
`tools/test-growth-decision-open.mjs` and the existing queue/workbench/follow-up
suites.

Each publication keeps its original baseline and shows the earliest complete
equal-length follow-up in Search Console Pacific dates, starting after the
publication day. The loaded report must match property, Web filters, timezone,
non-overlapping period length and one exact-page observation. An unfinished
window, missing reference, different scope, missing counts or absent page has an
explicit reason. Missing is not zero, and query rows never replace page totals.
Before/after values are descriptive, not a causal finding or traffic forecast.

Known exact-page original baseline counts stay visible and exported while a
follow-up window is incomplete or the loaded report is incompatible. They do
not make the comparison ready. The follow-up cells stay empty in CSV and say
Not comparable yet on screen until the existing comparison guards pass. An
absent or invalid original count remains unknown; no zero or rate is inferred.

The folded measurement plan also shows the independently dated Google/organic
landing-session/start observation, when present. It is not joined to keywords,
compared with a GSC denominator or presented as post-change play. Source dates,
quality and missing counts stay visible. No new query or tracking is triggered.

Search, next-move filters and five-row pagination keep the worklist usable. The
33-column CSV exports every matching row, including original/required/loaded
periods, filters, separate play dates and unknowns, not only the visible page.
The panel adds no API, migration, permissions, automation or decision mutation.
Validate with `test-growth-followup.mjs`, `test-growth-workbench.mjs` and the
existing admin, decision-queue and page-play suites.

### Distribution workspace

`/admin/#growth` now prepares campaign links and editable invitations for the published games, quizzes, articles and Academy catalogue. Source/medium/campaign/content use short public labels; directory traffic uses `referral`, social uses `social`, email uses `email`. Share these URLs externally, never on internal navigation. The tools copy or download text; they do not send, publish or count a prepared invitation as a launch.

The directory table reads an allowlisted snapshot of the existing private outreach registry. It distinguishes verified listings (with verification date and public URL), receipts awaiting review, uncertain sends and items needing private review. It does not crawl or resubmit automatically. A domain check also covers identifiable organisation domains from email/exclusion records, without exposing addresses or message bodies. Consumer mail providers cannot identify an organisation; always reconcile the complete private registry before sending.

Resource submissions recorded as `submittedResource` are included alongside the older `resource`, `resourceUrls` and `destination` fields. A human-confirmed receipt remains pending, an uncertain send remains uncertain, and an observation or confirmation date is never substituted for an unknown submission time. Producer changes invalidate the same-day distribution cache while retaining its previous snapshot and leaving the outreach registry untouched.

Refresh the published Supabase catalogue first, then run:

```text
python tools/growth/distribution.py --registry PRIVATE_OUTREACH_REGISTRY.json --catalog PRIVATE_PUBLISHED_CATALOG.json --games games/index.html --private ORIGINAL_PRIVATE_DATA_DIRECTORY
```

Only dated public resource metadata, directory organisations/domains, saved submission/listing state and dates are attached to `growth-report.json`. No OAuth tokens, personal contact fields, messages or Gmail links are exported. Snapshot history is retained; invalid input does not replace the last successful observation. `daily_gsc.py` enriches a matching same-day export and changes its hash when this snapshot changes. Finish the normal backed-up, idempotent Supabase ingest to display it in the admin. The local daily runner must call `distribution.refresh` before `daily_gsc.run`; it still depends on the computer/Codex, not an independent cloud scheduler.

Referral sessions match a recorded domain or its subdomains with medium `referral` in the existing GA4 API snapshot. A missing row remains unknown, and a site-wide source row cannot prove that a particular listing caused a visit. Do not assign Direct to directories or infer conversions, unique people, backlinks or ranking gains. Compare the Analytics period with the submission/publication date. Listing status is the last verified observation, not a live check.

Validation: `node tools/test-growth-distribution.mjs` with the existing JSDOM test dependency; `python -m unittest discover -s tools/growth` covers redaction, publication evidence, duplicate domains, failures and dated snapshot preservation.

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

## Search intelligence

`search_performance.py --private <existing-private-data-directory>` reuses the
separate Search Console and Analytics read-only tokens. It collects two adjacent
28-day periods ending three UTC days ago: observed query/page pairs, property
totals, countries/devices, Google organic landing sessions and session events,
and recognised AI referral sources. Paths are normalised (trailing slash and
query removal); matching query/page rows use impression-weighted position.
Sensitive or unsupported query rows are withheld. No hidden query recovery,
keyword-to-session attribution, keyword conversions or AI citations are inferred.

Refresh before `daily_gsc.run`. Collection is all-or-nothing, checks concurrent
file changes, keeps history and reuses a successful same-day observation. Failures
must retain the last successful snapshot with its real date. `measurement.py`
attaches the snapshot to the private report; the existing admin RPC and ingest
store it without schema or access changes. Never publish private data files.
The handoff adds separate landing-page evidence to matching existing tasks;
decision reconciliation and the one-change-per-run limit remain mandatory.

Admin Growth provides query filters, transparent brand/intent rules, equal-period
comparison, countries/devices, landing outcomes, AI referrals, CSV exports and
review briefs. Event rows missing from GA4 remain unmeasured. Registration
requests are not confirmed accounts. Google and Analytics day boundaries differ.
The local runner must invoke this refresh using published code, then export and
perform the usual backed-up, revision-checked, idempotent private import.

Checks: `python -m unittest discover -s tools/growth -p 'test_*.py'` and
`node tools/test-growth-search.mjs` (JSDOM_MODULE can point to an existing jsdom).


## Private outreach counts

`distribution.py` includes an optional aggregate `outreach` summary from the full private contact ledger. It derives the last 14 sending dates and the current date in Europe/Madrid rather than trusting possibly unfinished daily-batch counters. Legacy ledgers with `dailyTarget: 20` or no `dailyTarget` retain the 20/day limit. An explicit `dailyTarget: null` removes only the internal daily cap when `policyAuthorization` includes a valid `effectiveLocalDate` no later than the observation date, `dailyLimit: null`, nonempty `humanAuthorization` text and `providerLimitsApply: true`. Invalid or unknown policies leave outreach counts unavailable. The aggregate exports only the effective date, null limit and provider-limits flag; the human authorization text stays private. Older 20/day reports remain valid, and historical batch counters are never rewritten. The UI shows the count without `/ 20` for the authorized uncapped policy; provider limits, contact quality, duplicate checks and all reconciliation stops still apply. Permanent bounces remain sends; reserved and uncertain messages consume capacity until reconciled in Gmail. Two permanent failures in the current sending cohort stop that batch. This panel never sends, retries or authorizes a message.

Explicit human-response and automatic-acknowledgement statuses are counted separately and describe each sending cohort, including later responses. They are not acceptance, delivery/read rates, published links or acquisition. Unknown/invalid/undated records cause a review warning, and an old date cannot imply today has available slots. Only allowlisted aggregate counts are exported; correspondence, contact identities, addresses, message URLs and source details stay private. The existing domain guard and full native Gmail checks remain necessary. No browser session, OAuth scope or database permission changes are introduced.

Checks: `python -m unittest discover -s tools/growth -p test_outreach_summary.py` and `node tools/test-growth-outreach.mjs`; existing distribution checks cover integration and backwards compatibility.
