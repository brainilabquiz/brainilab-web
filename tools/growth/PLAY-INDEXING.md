# Sessions with a recorded start and Google index evidence

These optional report sections are independent saved observations. They add no
tracking, player lookup, scoring, publishing or indexing-request behavior.
Opening Growth only reads its existing report. No database migration is needed.

## Visits that reach a recorded start

`play_sessions.refresh(PRIVATE)` uses the existing `analytics.readonly` token
and GA4 property 555562532. Its 28-day window ends two UTC dates before collection,
like acquisition. The response's actual property timezone is retained.

For each of two overlapping scopes, all measured sources and Google / organic,
the collector separately queries totals and public session landing pages. It
uses one `inListFilter` for the existing `game_start` and `practice_start` events.
The `sessions` metric from this union is distinct from `eventCount`; the two
event-specific session counts must never be added. A start can happen after the
session's landing page. GA4 reports session estimates, not exact unique people.
Compatible same-period acquisition totals are reused for the all-source baseline.
Each denominator, numerator and landing query retains its own collection date.

The displayed share divides sessions with a recorded start by sessions from the
same scope, period and hostname. It is hidden for an absent count, inconsistent
counts, zero denominator, thresholding, sampling or grouped other rows. Empty API
rows are unknown; an explicitly returned numeric zero remains zero. The two
source scopes overlap and cannot be added. Landing rows cannot reconstruct the
separately queried total. Neither figure measures completed games, account
creation, keyword conversions, new customers or the effect of a particular edit.

Consent, missing events, historical owner/QA traffic and changing event coverage
limit interpretation. Preserve the 20 October article-click and 21 October start
coverage changes, original 4–17 October baseline and incomplete 21 October–3
November follow-up. A consent-limited sample cannot establish all actual play.

`play-sessions-latest.json` schema 1 / collector 2 stores only allowlisted counts,
dates and public paths. Account, authentication, admin and profile paths, sensitive
path formats and query strings are withheld. Per-query cache identities include
the exact request and UTC collection day. Query pagination rejects duplicate or
inconsistent dimensions. No user IDs, IPs, emails or credentials enter the report.

## What Google has indexed

`google_indexing.refresh(PRIVATE)` reads the current public sitemap's page `loc`
entries, ignoring image locations. It calls the URL Inspection API with the
existing `webmasters.readonly` token for `sc-domain:brainilabgames.com`.
It inspects Google's **indexed version**, not a live URL test. HTTP 200,
indexability checks, sitemap inclusion and submitting a sitemap do not prove
indexing, ranking or traffic.

`google-indexing-latest.json` schema 1 contains the exact inventory fingerprint,
each public URL's capture date, verdict, coverage, Google crawl date and public
declared/Google canonical. It omits inspection links, referring URLs and private
paths. Missing verdicts are unspecified, not indexed or failed. Failed requests
retain the earlier successful observation and show the failed attempt separately.

The collector reuses each successful URL inspection from the same UTC date, checks
missing then oldest URLs first, limits a pass to 250 requests with three in flight,
and checkpoints after each batch. Quota/authentication errors or three failed
requests stop the pass. A recorded same-day quota/authentication/repeated-error
stop is not retried. There is no attempt to evade Google's limits, force indexing
or repeatedly request recrawling. An isolated transient failure may be retried in
a later controlled pass; successful same-day observations are reused.

Review discovered/unknown pages against current content, internal links and
recent changes before editing. Preserve correct indexed pages. Google determines
whether and when to crawl, index or rank a URL.

## Persistence and integration

Both collectors use exclusive collection/write locks, compare-and-swap, exact
byte history and refusal to replace newer observations with older evidence.
Report attachment independently retains the newest source even if an older
source file was restored. `measurement.attach_measurement` attaches `playSessions`
and `googleIndexing` without changing other report fields. Collector failures
retain dated successful evidence; they must not be described as current success.

Refresh acquisition, then play sessions and indexing before the ordinary daily
report export. Preserve existing source refreshes and private data locations.
Back up/verify the current report, decisions and history before the ordinary
`brainilab_growth.ingest(report, null)` import; enforce expected revisions,
idempotence and unchanged baselines. Do not export private reports to OpenSEO.
Both panels offer source/status filters, pagination and a CSV of the full filtered
selection. Exact page reviews join the dated Google verdict to that URL, keeping
it separate from the live technical checklist. Player XP and rankings are outside
this entire flow.

## Primary references

- [GA4 dimensions and metrics](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)
- [GA4 session estimates](https://support.google.com/analytics/answer/9191807)
- [runReport response and empty rows](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport)
- [Filter expressions](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/FilterExpression)
- [URL Inspection API and readonly scope](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- [Inspection results and verdicts](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult)
- [Search Console API limits](https://developers.google.com/webmaster-tools/limits)
- [Requesting recrawling does not guarantee indexing](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
