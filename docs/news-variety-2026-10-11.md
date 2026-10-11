# Publisher variety — 11 October 2026

User requested reliable sources beyond BBC. The previous successful automated edition was generated at2026-10-11T10:20:42.047Z. This change expands discovery and publishes a reviewed diverse selection while awaiting the next existing scheduled run. No paid test request is added, and no slot, recovery marker, failure state, ledger, credential or diagnostic is reset.

## Verified discovery

- BBC News: https://www.bbc.com/news/world . Approved article routes and NewsArticle JSON-LD with original datePublished.
- The Guardian: https://www.theguardian.com/world/all . Chronological listing, dated reporting sections, NewsArticle mainEntityOfPage and meta description. Exclude dated `/all` indexes, live blogs, comment sections and explicit paid-only metadata.
- Al Jazeera: https://www.aljazeera.com/news/ . Dated news routes, NewsArticle mainEntityOfPage, original datePublished, description and two short paragraphs.
- WHO South-East Asia: https://www.who.int/southeastasia/news . Dated announcement routes, matching NewsArticle identity and original datePublished. Trim its JSON-LD trailing semicolon, parse JSON and never execute publisher JS. WHO is the primary source of its own announcements, not independent corroboration.
- NASA: https://www.nasa.gov/news/recently-published/ . Permanent listing, news-release links in chronological content headings, matching canonical link, h1 and publication day in the article header. Date-only publications use00:00UTC conservatively. Ignore old featured navigation, body update notes and other content routes. Two short body paragraphs provide context where the description is clipped.

All five indexes and chosen articles returned HTTP200 in free probes at10:36 and10:40UTC. The final catalogue represented five publishers with original dates10–11October. A Council of the EU index returned403, so it was not connected or bypassed. Reuters/AP are not claimed as working automatic sources. No feeds, images, paywalls or access challenges are bypassed.

Five indexes, at most four distinct articles per publisher, four concurrent article reads. Total public fetches including redirects stop at46, leaving headroom for one existing model request. Each HTML response is capped at1MB, redirects remain inside the same configured publisher and approved routes, and no Authorization or visitor data is sent to publishers.

Matching source identity and an original nonfuture publication date less than48hours old are required. Names come from server configuration. Excerpts and descriptions are bounded untrusted evidence, never published verbatim. dateModified cannot make stale content eligible. Individual source failures are isolated; no surviving fresh source pauses the workflow before any paid request.

Selection sorts each publisher's reports by date and URL, then takes one from each before a second round. Five available publishers means one each; three means at most two of five candidates per publisher; two means a3/2split when enough reports exist. One publisher or fewer reports is a truthful fallback. The writer is instructed to vary regions/topics and omit duplicate coverage of one event. URL/name/date are attached by sourceId on the server. Future availability and editorial rejection cannot guarantee all five sources in every edition.

## Reviewed initial selection

Fixed preparation timestamp2026-10-11T10:40:00Z. Original short summaries checked against directly fetched metadata and excerpts; original dates retained:

1. BBC: https://www.bbc.com/news/articles/c680zlny0gk4o . Published2026-10-10T22:13:08.611Z. Attributes fears of forced recruitment to BBC's report; no invented new incident or numbers.
2. Guardian: https://www.theguardian.com/world/2026/oct/11/george-gibney-former-irish-olympic-swimming-coach-to-be-sentenced . Published2026-10-11T09:38:01Z. Reports expected Monday sentencing, not a sentence already imposed; no graphic details or invented outcome.
3. Al Jazeera: https://www.aljazeera.com/news/2026/10/11/russias-yandex-says-data-centre-in-vladimir-shut-down-after-drone-attack . Published2026-10-11T09:33:03Z. Attributes the data-centre shutdown and absence of reported injuries to Yandex without inferring responsibility for the attack.
4. WHO: https://www.who.int/southeastasia/news/detail/10-10-2026-world-mental-health-day-2026 . Published2026-10-10T04:30:00Z. Describes its call for lived experience to shape care and policy; no medical advice or alarming statistics.
5. NASA: https://www.nasa.gov/news-release/nasa-to-conduct-flyover-engage-nfl-fans-at-metlife-stadium/ . Published10October, conservatively2026-10-10T00:00:00Z. An announced flyover and fan outreach, not a scientific discovery or completed event.

The API identifies this selection as manual-edition with the real automationStatus. A newer automatic edition replaces it at the existing cron; no refresh is forced to duplicate the current paid slot. Cadence00:00/12:00UTC, fixed model, output limit,14-cent reservations,896-cent monthly allowance and pause-on-failure instruction are unchanged. Cloudflare retrieval and generation of the first diverse automatic edition must be established by its next scheduled run; local free probes do not prove a future provider response.

Validation:52focused news tests and the normal site build/integrity checks pass. Tests cover publisher selection, immutable provenance, original dates, unsafe redirects, partial publisher failure, and existing budget/concurrency/pause guards. Verify production checks and the public diverse selection after merge; record the result in the workspace handoff.
