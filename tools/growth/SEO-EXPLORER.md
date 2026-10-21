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

## Review a page

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
