# BrainiLab SEO Explorer

Our own limited, dated SEO index adds known backlinks and page checks to the
existing Search intelligence keyword, landing-page and country/device views.
No Ahrefs account/API, paid data, tracking script, Google OAuth scope or database
migration is required.

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
