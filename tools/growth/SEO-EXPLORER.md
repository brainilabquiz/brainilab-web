# BrainiLab SEO Explorer

Our own limited, dated SEO index adds known backlinks and page checks to the
existing Search intelligence keyword, landing-page and country/device views.
No Ahrefs account/API, paid data, tracking script, Google OAuth scope or database
migration is required.

## Use evidence to grow the site

The Keywords source selector separates Web query-only property rows from Google
Images queries and a 90-day Web query/page view. The last view links each observed
query to the actual game or article to inspect. No opportunity score, search-volume
estimate, predicted visitors or automatic content rewrite is generated. Impressions
sort evidence, not business priorities. Read the page and search intent first;
protect useful pages already corrected rather than changing them for a quota.

Collect additional sources once per valid day/period with:

```text
python tools/growth/seo_explorer.py --private PRIVATE --search-sources
```

Google Images uses type=image and byProperty aggregation; Web query/page uses
type=web and byPage. Both request final data for 90 complete days ending three
UTC days ago, reuse the existing readonly token, with bounded pagination and
private-format filtering. Their counts and overlapping windows must never be
added. The dated searchSources snapshot has independent CAS, history, daily cache
and newest-observation attachment, so old/failed local sources cannot erase it.

Visits from links reuses the existing validated GA4 acquisition snapshot, without
an extra API request or new tracking. One row per source host shows only referral
medium sessions/engaged sessions and separately inspected HTML destinations.
Normalise www; combine distinct source labels once, never repeat the same host's
traffic for each backlink. Show unknown when a host has no observed row. Do not
attribute these sessions to a particular link, landing page, player or account.
Direct, social, email and search remain separate, with GA4 dates/timezone/quality
flags and the separate HTML verification date. This helps choose which actual
arrival routes to check before spending effort on more distribution.

## What the numbers mean

- Keywords are actual Search Console query/page rows with real dates, filters and
  timezone. Hidden queries, global volume and keyword difficulty remain unknown.
- Backlinks are direct HTTPS anchors to public BrainiLab pages in fetched HTML.
  Repeated buttons with the same source/target/rel combination count once. Rows
  have an anchor, rel attributes, body hash and verification dates. First verified
  is our first observation, not link creation time.
- Referring domains are known source hosts, normalising www. They are not an
  estimate of all domains on the web or a count of independent owners.
- Page Trust — technical is our own checklist: HTTPS 10; available 2xx own-site
  page 20; one nonempty title 10; one nonempty description 10; one nonempty h1 10;
  exact self canonical 15; no meta/header noindex or none directive 15; present,
  parseable structured-data JSON 10. Valid JSON does not prove schema semantics.
- Domain Trust — technical is the arithmetic mean of inspected page scores.
  Requested/scored coverage is always shown. Unavailable pages are unscored,
  not zero and not removed from the coverage denominator.
- External reputation has no overall numeric rating. These checks do not establish expertise,
  factual reliability, Google authority, safety or spam risk. They are not Ahrefs
  DR, Moz DA or Majestic Trust Flow. All checks can pass while other problems or
  weak external reputation remain.

Author declarations and external-link counts are separate observations, not score
inputs or verified expertise/citations. Future formulas need a new named method.

## Evidence expansion (20 October)

The UI now shows eight pass/fail checks rather than turning the historical
weights into a displayed trust score. It also shows current verified incoming
HTML links for each page. These are technical observations, not a factual,
editorial or safety rating. Old v1 score fields stay intact for compatibility and
history; no new authority formula is introduced.

Reputation evidence is a separate view: verified source hosts, provenance of
owner-submitted listings, qualifying rel attributes, and dated Search Console
Links/manual-action/security observations. A submitted listing is not an
independent recommendation. Google Links and this HTML index are different
samples and must never be added. No issues reported by Google is not a site
endorsement, safety guarantee or proof of algorithmic ranking status.

`--ledger PRIVATE_LEDGER` expands the frontier using only listingUrl/publicUrl
from explicitly publication/placement/listing-verified form records. No free
text, correspondence, accounts, contact details or pending receipts are read into
the index. A historical publication still needs a successful current HTML check
before it counts as a verified backlink. Additional source registry entries may
be `{url, discovery}` objects with allowlisted provenance or legacy URL strings.
The only preserved external query parameter is numeric `page`, for exact public
pagination observed in a source report; arbitrary query data remain excluded.

`--keywords` collects query-only final Web Search results for 28 and 90 days,
ending three UTC days ago, using the existing webmasters.readonly authorization.
Both use byProperty aggregation, pagination and sensitive-format minimisation.
The 90-day list can reveal older observed queries, not new market demand. It
overlaps the 28-day list: do not add metrics, infer growth from the difference,
or combine them with query/page impressions. Google hides some queries and
returns top rows. Historical average position is not a live rank; global search
volume and keyword difficulty remain unknown. Two windows are cached per day;
failures retain the dated snapshot and history independently of the crawl.

Record actual UI observations with:

```text
python tools/growth/seo_explorer.py --private PRIVATE --reputation-input OBSERVATION.json --expected-reputation-sha256 HASH
```

Use `missing` only when the file does not exist. `seo_reputation.py` specifies the
allowlisted observation contract and preserves exact hashes/history. Screenshot
proof stays private; only aggregate facts, timestamps and evidence hashes enter
Growth. Source update dates stay null when the UI does not show one. This is not
an automatic API sync; retain observation dates and flag old readings. Opening
Growth never starts Google requests or a crawl.

## Collect public evidence

```text
python tools/growth/seo_explorer.py --private ORIGINAL_PRIVATE_DIRECTORY
```

The frontier uses published resources and verified public listing URLs from
distribution-latest.json. Pending submissions and private correspondence are
never backlinks. Additional candidate pages may be a private JSON URL array in
seo-explorer-sources.json, or --sources FILE, from reviewed Search Console Links
exports or dated public search. A search snippet/imported URL is not verification.
Private/Gmail/credential URLs, query strings and fragments are not imported.

Anonymous HTTPS HTML only: public DNS/IP and redirect checks, robots.txt, bounded
responses, timeouts and limited concurrency. Three workers inspect our site;
external sources are sequential. A matching successful daily frontier is reused.
--force is an explicit diagnostic rerun, never a way around portal limits.
The collector does not use account sessions, scrape search engines, send outreach,
change website content or schedule itself.

403/404, robots exclusion, network errors and absent HTML anchors are separate
observations, not proof of a lost link. JavaScript rendering/access limits may
explain missing data. Old source verification dates and snapshot history remain.
No usable own-site response means failure, preserving the last successful index.

A lock, exact input/snapshot comparisons, private atomic writes and hashed history
preserve concurrency. Google baselines and the source registry are read only.
Reconcile failures/concurrent changes; do not blindly remove a writer's lock.

measurement.attach_measurement adds validated seoExplorer data to the existing
Growth export, including same-day reuse. Finish backed-up/idempotent Supabase
ingestion with actor null and check decisions/baselines are unchanged. The admin
displays imported observations; opening it does not start a crawl. The existing
daily local runner may collect these data; it still needs the computer/Codex.

Validate: Python unittest test_seo_explorer.py and tools/test-growth-seo-explorer.mjs
with the existing JSDOM dependency.

## Incoming link destinations

The Link destinations view groups currently verified HTML links by their exact
target URL. It distinguishes observed 404/410 responses, different final URLs,
noindex and canonical observations, incomplete inspections and responding routes.
Only links with a matching successful source observation and timestamp enter this
view. Duplicate target/source/rel combinations do not inflate its counts.

Producer v4 inspects newly found own-site targets after inspecting source pages,
including index.html aliases. These requests share the existing 250-page total
budget, robots rules, HTTPS checks and three-worker limit. Published resource URLs
have priority; uncovered targets remain unknown. Failed historical source links
do not expand the crawl. Alias checks are never copied from a canonical sibling.
The changed coverage can change the historical technical average; it is not a
change in reputation or ranking. Daily cache identity includes the producer version.

Filters, dated source evidence, complete CSV export and Review evidence buttons
support a concrete check before an edit. An intentional canonical or redirect is
not automatically an error. HTTP 403, network/robots failures and missing checks
are unknown, not broken links. Responding does not establish Google indexing,
ranking value, content quality or inclusion in AI answers. No automated site edits,
publisher contact or backlink-level visit/player attribution occur.

Validate this workflow with test_seo_explorer.py and
tools/test-growth-seo-destinations.mjs, in addition to the existing Explorer tests.

## Review a page

### Learn article and course schema

`Learn schema` lists saved exact-URL Article and Course comparisons, with page
detail, search and the complete CSV. It extends the existing Article comparator
instead of introducing a separate definition of matching fields. Identity,
headline/name, byline, preview, visible cover and date instants are compared;
courses also compare ordered lesson names and URLs in the visible lesson list.
Dates retain fractional precision and offset equivalence. A missing visible
updated date remains unknown. Registered cover/preview identities are labelled
as equivalent, never as equal URLs; images are not loaded or fact-checked.

The ordinary crawl passes its successful Learn responses through
`learn_schema.mjs` once in bounded local batches. No additional HTTP or subresource
request is made. The adapter needs the existing Node/JSDOM runtime (set
`JSDOM_MODULE` to its local module); if unavailable, other Growth sources continue
and prior Learn evidence retains its dates. The explicit current-page button uses
the same inert comparator and reuses its one response for the workspace session.
Template/noscript payloads, malformed graphs and ambiguous entities do not supply
a usable main entity. No page, lesson, quiz version, XP or score is changed.

Existing dated HTML captures can be fed to the adapter as a JSON stdin array of
`{url, checkedAt, html}`. Keep the original read dates and validate capture hashes;
do not fetch them again just to populate this view. Wrap its output as
`{schemaVersion:1, domain:"brainilabgames.com", pages:[...]}` and record it:

```text
python tools/growth/learn_schema.py --private PRIVATE --input OBSERVATIONS.json --expected-sha256 HASH
```

Use `missing` only for an absent file. Each URL merges independently by its read
timestamp with CAS, a writer lock, private hashed history and idempotence. Older
restored files cannot replace newer observations. The normal export attaches this
source independently of crawl age. Matched field values are not repeated in every
report; only field states and bounded difference/unknown context are exported.
Response-bound page evidence stays in the private crawl; the report keeps one
copy in `learnSchema`, avoiding duplication against the existing ingest bound.
The exact full public response stays in private evidence. Stable review keys use
comparison content, not read timestamps. No Growth decision is opened or modified.
Captures before the recorded Academy renderer correction remain historical, not
new unresolved work. Comparisons older than 48 hours are labelled dated.

Differences require context review, not automatic rewriting. These comparisons
do not assert required Article properties, rich-result eligibility, Google
indexing, AI citations, visits, games, expertise or factual accuracy. Validate
`test_learn_schema.py` and `tools/test-growth-learn-schema.mjs` together with the
existing page/schema/quiz suites. No new dependency, OAuth, migration, endpoint,
permission, external validator, tracking or automation is introduced.

### Dynamic quiz question declarations

`Quiz schema` reuses the six quizzes' saved JSON-LD declarations and dated,
prompt-only inventories from the published anytime bank, latest fixed cloud
packs and local fallback. It does not invoke quiz/answer/result RPCs, inspect
player history, expose answer keys or change XP, scores, questions or decisions.
It is separate from the eight technical checks and introduces no score.

The ordinary crawl extracts `quizQuestions` from its existing HTML response.
There is no extra GET and no producer-version bump to force a repeated crawl.
An explicit page check reuses the same bounded anonymous response for this
comparison. Templates, malformed/ambiguous graphs, redirects and unresolved
references remain unknown. An absent `hasPart` is not a failure.

Before reading banks, reuse `quiz-schema-latest.json` when all three providers
already have a valid observation for today. The native authorised Growth cycle
can obtain the next complete prompt inventory through the existing management
connector using `quiz_schema.py --sql` (the read-only `quiz_schema.sql`). Review
the actual selectors if their implementation changes. This script does not hold
database credentials or execute SQL itself. Save the returned
`quiz_schema_snapshot` object privately, then:

```text
python tools/growth/quiz_schema.py --private PRIVATE --input OBSERVATION.json --include-local --expected-sha256 HASH
```

Use `missing` only for an absent file. `--include-local` reads only prompt fields
from the current checkout's fallback; no answer fields enter the snapshot.
Record source capture dates honestly, including when reusing old HTML. The
existing refresh/export attaches this source independently from crawl age.
Source/provider and page observations merge by their own timestamps; exact
hash/CAS, a writer lock, idempotence and private hashed history protect prior
evidence. Failed or older inputs cannot retimestamp a successful observation.
Opening Growth never refreshes the database. No new OAuth, service key, endpoint,
migration, permission or schedule is required.

Ten dated wording equivalences from PR410 are retained in
`lib/quiz-schema-scope.json`. An equivalence is used only while its exact bank
counterpart remains. New unmatched wording requests review, not an automatic
invalid-schema verdict or edit. Incomplete or over-48-hour evidence stays
unknown. Stable review keys depend on topic bank content and declaration, not
read timestamps, so identical reads do not create new work. These checks do not
reopen the 28 Growth decisions or change their baselines.

The page detail and full CSV show declarations, observed counterparts, providers
and independent dates. The list describes eligible bank content, not the exact
random 20 questions in a session. It does not fact-check answers or establish
indexing, rich results, clicks or games. Validate with `test_quiz_schema.py` and
`tools/test-growth-quiz-schema.mjs`, plus the existing Explorer/current-page tests.

The admin Review a page view joins saved evidence for one exact public URL:
its eight technical checks, validated final Web query/page discovery rows and
incoming links from successfully inspected sources. Review evidence buttons in
Page Trust, backlink targets and Web query/page tables open the same view and
move keyboard focus to its heading. The page selector also includes destinations
found only in search or link evidence; an absent inspection is unknown, not failed.

Aliases, redirects and index.html variants are not merged. Search period,
aggregation, timezone and collection dates remain visible. Property-only and
Images queries are not assigned to a page, and host-level referral sessions are
not attributed to individual destinations or links. Each table displays up to
25 matching rows; Download current view includes all matching observations,
next checks and limitations in CSV. Existing CSV formula escaping applies.

This is a review aid, not an automatic opportunity/authority score or an editor.
It makes no requests, writes no data, and must not justify changes without
checking the live page, intent and recent work. Preserve correct/recent pages;
compare complete equal, non-overlapping periods before asserting an effect.
Validate with tools/test-growth-seo-page.mjs and the existing Explorer tests.

## Choose the next check with current decisions and player evidence

Next checks joins the final 90-day Web query/page sample with decisions from the
currently loaded Growth workspace. It never promotes the status in an older
imported proposal. Needs review includes only pending/approved exact-URL decisions
with an observed query and no published, monitoring or dismissed decision for the
same URL. All matched decisions exposes protected work separately. Reload Growth
before acting: later website changes can be absent from the recorded proposal.

Rows are ordered by the strongest single query/page row's observed impressions.
No query/page or overlapping-window totals, opportunity scores or forecasts are
computed. Open recorded decision focuses the existing card without changing it,
and Review evidence opens the same exact-URL review. Missing decisions or source
data produce an explicit empty state instead of suggesting work.

Page reviews also show the existing GA4 google / organic landing-path sample:
sessions and game/practice event counts, with its own dates, timezone, collection
date and quality flags. GA4 paths normalise query and trailing-slash variants;
index.html aliases and duplicate imported landing rows are not assigned totals.
Events occurred in sessions that began on that path, possibly on later pages;
they are not unique players or keyword/backlink conversions. Null is unmeasured;
an explicitly returned zero remains zero. No conversion rate is calculated.

The review download includes recorded decision and Analytics evidence without
private notes, user identities or attribution claims. All-row Next checks CSV
keeps the separate periods and guards. This feature adds no data collection,
tracking, scoring, database writes, permissions or automatic content changes.
Validate with tools/test-growth-seo-actions.mjs plus the existing Explorer/page
tests and production build; check live decision navigation and responsive UI.

### Search pages without a recorded decision

Next checks also offers a separate Observed pages without a decision scope.
Previously, observed pages could only appear here after a decision already
existed. This scope groups the validated final Web query/page rows by exact URL,
selects one strongest matching row without summing, and requires one unambiguous,
dated HTTP 200 inspection returning that same public URL. Every recorded decision
state excludes that URL from this scope. Redirects, missing/failed inspections,
private paths and duplicated inspection records cannot become suggestions.

An empty Needs review view points to these other observed pages when available.
Review evidence opens the existing exact-page review with search, technical,
link and independently dated organic landing-session evidence. The table and
complete CSV preserve actual clicks, missing activity, dates and the absence of
a decision; no artificial decision ID or status is generated. Search filters
select the strongest matching query, not combined totals.

This is a discovery list for investigation, not an automatic recommendation to
rewrite. No recorded decision does not prove a page has never changed. Recent
work, low/irrelevant observations and working pages must be reviewed before
selecting an edit. It adds no data collection, database mutation, metric, score,
permission or publication action. Validate the omission regression, protected
states, ambiguous sources, export and navigation with
tools/test-growth-seo-unassigned.mjs and the existing action/page/Explorer tests.

### Explain missing play evidence before selecting work

Next checks now distinguishes an absent exact landing row, an unreturned session
denominator or start numerator, explicitly returned zero starts, incompatible
counts, unknown collection dates and reported quality limitations. A comparable
positive union-session count still qualifies for its own source focus; no event
count, all-source total or other page can replace missing Google organic data.

The recorded-start focuses include a collapsible explanation of why pages in
the current decision scope and search filter qualify or are excluded. These are
distinct-page counts, each in one primary availability state, not session totals,
new opportunities or player counts. Decision protections apply before this
summary; it cannot reopen completed work. A keyboard-accessible button removes
only the start focus, retaining the decision scope and search text.

Each existing result has the same explanation available beside the returned
counts. The complete filtered Next checks CSV keeps its original37columns and
appends four status/explanation fields for the two separate source scopes. A
missing start numerator stays empty; an explicit zero stays numeric zero.
Missing evidence does not prove broken tracking, no play or a need to rewrite.

This uses only already imported evidence: no additional Google query, refresh,
tracking, indexing request, database write or game change. Validate with
tools/test-growth-play-coverage.mjs and the existing Growth suites. The26October
saved observation reproduces the empty Google-organic focus:22of23matched pages
have no exact organic landing row and one lacks the start numerator. The21pages
without a decision all lack a matching organic landing row; the missing-numerator
case remains in its protected recorded-decision scope. Do not treat dated local
decision metadata used for offline QA as the live workspace state.

### Measured starts outside the returned query sample

Next checks previously required a matching Search Console query/page row. This
omitted independently measured landing sessions with recorded play. The new
decision scope Measured starts outside query sample exposes these other public
paths, with a separate All measured sources / Google organic selector. A shortcut
appears when such rows are available in the current search filter.

A row requires a validated final Web query/page sample, a comparable positive
union-session observation for that exact public landing path, one complete dated
HTTP200 inspection returning the same URL, no returned query/page row and no
current Growth decision in ANY state. Duplicate/missing/failed inspections,
aliases, private/API paths, unknown counts/dates or quality limitations cannot
qualify. Property-only and Images queries are not assigned to these pages.

Rows sort by observed start sessions, then landing sessions; no score or traffic
forecast is generated. Missing query rows remain unknown demand. All-source play
is explicitly labelled and never presented as Google-organic acquisition or
keyword conversion. A start can occur after the landing page; these are GA4
estimates, not unique players or completed games. Existing review and current-page
checks let the user inspect recent work before proposing a change. No decision
is created, approved, reopened or written by this view.

The separate21-column CSV includes every filtered row, both source periods and
collection dates, quality, exact inspection and review guard. Existing41-column
search-focus exports remain unchanged. Filters/navigation/download use imported
evidence only; no collection, tracking, database, CMS, XP or score change occurs.

With the saved26October report and the latest local27October sources, five paths
qualify across all measured sources: Brain Mix, BrainiWord, General Knowledge
Quiz, History Quiz and Word Detective. None qualifies for Google organic in this
sample; this is not zero play or demand. The Rankings landing is not promoted
because no exact page inspection was returned. These are review candidates,
not five approved edits, newly published resources or proven traffic gains.
Validate with tools/test-growth-play-discovery.mjs and the existing Growth suites.


## Current outgoing HTML links

The explicit current-page check also observes a bounded, inert main-content anchor sample from the same response, with exact destinations, text, location and rel. It makes no additional request to any destination and does not alter the imported report. Its download keeps these outgoing rows separate from saved incoming backlinks and their verification dates. The article editor reuses this check on demand to compare published links with a draft; see docs/article-writing-workflow.md. Query-bearing/private URLs are omitted; absent or ambiguous main content is unknown. No indexing, citation, reputation or conversion outcome is inferred.

The same inert response supplies a folded Article/page comparison and separate download rows: response/canonical identity, declared Article page identity, headline/main heading, author/byline and Article/social-preview images. Missing, malformed, conflicting or ambiguous evidence remains unknown. A difference prompts contextual review, not an automatic technical failure, rewrite or publication blocker; alternate image crops can be valid. This is not a complete schema validator, Google-selected canonical or rich-result/AI-visibility check. Nothing is added to the eight saved technical checks, report, decisions or baselines. See `tools/test-page-schema-evidence.mjs` and the editor writing workflow for the shared behaviour and scoped keyboard-focus regression.
