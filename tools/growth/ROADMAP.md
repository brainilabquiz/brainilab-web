# Growth product decisions

## Review, 25 October 2026

This review supersedes the capability statuses in the historical 1 October
table below. It uses the current code and the saved 25 October observations;
it does not start a new crawl, publish content or claim a traffic increase.

| Priority | Observed gap | Status and next acceptance criterion |
| --- | --- | --- |
| 1 | Next checks only joined pages that already had a recorded decision. A valid empty pending list could hide other observed searches. | Corrected with the separate Observed pages without a decision scope. One exact, dated HTTP 200 inspection and one final query/page observation are required; all recorded decision states are protected. Review current content and recent work before proposing an edit. |
| 2 | Organic landing sessions and game event counts do not measure how many distinct sessions actually reached a game. Multiple game starts can belong to one session; missing events are unknown. | Implemented in the separate Play sessions panel and collector: one union of existing start events, compatible same-period session denominator, independent source scopes and quality flags. Missing rows remain unknown, not zero; no new tracking or player attribution. See PLAY-INDEXING.md. |
| 3 | The technical checklist observes HTTP, canonical and noindex behavior; it cannot establish which URLs Google currently indexes. | Implemented as separate dated Google URL Inspection indexed-version evidence, with per-URL capture/crawl dates, unavailable attempts and independent history. Public sitemap inventory, same-day reuse and bounded provider requests; no indexing requests. See PLAY-INDEXING.md. |
| 4 | Recent edits cannot yet be assessed using the planned full 21 October–3 November follow-up window. | Preserve the original 4–17 October baseline, decision history and measurement-coverage changes. Only compare complete, equal, non-overlapping periods after the follow-up window is available; do not credit the tool or directories with unobserved growth. |

Current capabilities already include dated GSC queries and query/page evidence,
GA4 acquisition and content observations, independent search-source windows,
an inspected HTML backlink sample, exact destination checks and page reviews.
Backlink coverage remains limited to the inspected public sources, rather than a
global index. Failed requests are not evidence of lost links. Page Trust reports
eight technical checks and external evidence, without an invented authority score.
AI citations, global reputation and keyword-to-player attribution remain
unmeasured unless a specific, dated observation establishes them.

The new scope is a read-only review aid. It changes no decisions, baselines,
accounts, player data, XP, scores, publication states, permissions or tracking.

## Historical decisions — 1 October 2026

The objective is recurring qualified organic discovery followed by useful games, learning and voluntary account/Plus adoption. More published pages alone are not success.

## Reference and scope

[Babylovegrowth](https://www.babylovegrowth.ai/en) markets business analysis, keyword discovery, content planning/publication, technical checks, a link network, AI visibility and social visibility. These are vendor descriptions, not independently verified performance. We have not tested its paid product and cannot claim to outperform it.

| Capability | BrainiLab status | Next acceptance criterion |
| --- | --- | --- |
| Search evidence | Read-only Google connection; query/page pairs; daily local export | First scheduled run verifies ingestion and unchanged decisions |
| Editorial briefs | Searchable live leads; evidence-linked Markdown export; review workflow | Save researched sources, inventory duplicates and a selected HUB slot before drafting |
| Brand voice | Brief rules use beginner-friendly English, Biel authorship, photorealistic covers and planned HUBs | Article QA checks claims, readability, sources, internal links and original value |
| Technical health | Dated snapshot of 90 pages; HTTP/title/H1/description/canonical/schema syntax | Refresh audit, check internal-link destinations, separate intentional exclusions and performance measurements |
| Conversion measurement | GSC clicks; consented interaction signals; deduplicated server-confirmed accounts with optional arrival attribution | Observe real new confirmations and processed GA4 events; automatic GA4 ingestion and Plus attribution remain pending |
| AI visibility | Not implemented | A fixed prompt panel, dated provider/model responses and verifiable citations; never extrapolate coverage of all users |
| Earned links | Not implemented | Discover relevant educational publishers and resources worth citing; prepare reviewable suggestions, no automatic outreach |
| Social discovery | Not implemented | Dated relevant discussions and helpful drafts; no third-party posting without explicit authorization |

Prioritize attribution and evidence-based editorial planning next. Games, beginner Academy interactives and topic HUBs are BrainiLab's existing useful assets; connect them rather than generate near-duplicate keyword pages.

We do not implement an automatic reciprocal-link scheme. [Google's link-spam policy](https://developers.google.com/search/docs/essentials/spam-policies#link-spam) identifies excessive exchanges and automated link creation intended to manipulate rankings. This is a design constraint for our product, not a finding that a competitor violates that policy.

Operational efficiency must be measured: research/review time, rejected briefs, duplicate publications, qualified organic visits, completed games and voluntary conversions. Search metrics, a manual GA4 snapshot and confirmed-account aggregates are available with separate coverage windows; these do not yet prove conversion uplift. No traffic, ranking, AI-citation or revenue guarantee is made.
