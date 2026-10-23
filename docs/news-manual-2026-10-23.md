# Manual edition — 23 October 2026

Requested by the user in Claude Code: "actualitza la pàgina de breaking news".

## Why automation is paused

`GET /api/breaking-news` returned HTTP 503 with `serviceStatus: "invalid-key"` and the last automated `generatedAt` 2026-10-19T12:00:28.579Z. The 12:00 UTC refresh on 19 October received HTTP 401 from the OpenAI API (`lib/news-refresh.js` maps 401 to `invalid-key`). `invalid-key` is a paused failure, so later slots do not retry and the ledger is unchanged. The `OPENAI_API_KEY` Cloudflare secret must be replaced by the owner before any reviewed recovery; no recovery trial was added in this change and no paid request was made.

## Sources

Collected at about 08:25 UTC with the project's own `collectPublisherSources` (same five indexes, routes, redirect, size and date rules as the Worker; free public fetches only). WHO South-East Asia had no report within 48 hours, so BBC appears twice, as the balanced selection allows. Summaries are original short English, checked against the fetched description and excerpt; claims are attributed.

1. BBC News — https://www.bbc.com/news/articles/cmwy4wlzqz3zo — published 2026-10-23T04:54:25.358Z. Africa CDC is the source of the Entebbe investigation; no new case counts added.
2. The Guardian — https://www.theguardian.com/world/2026/oct/23/spain-floods-storm-adam-uk-storm-austen — 2026-10-23T08:16:30Z. Five deaths, ~850,000 people under temporary lockdown in Valencia and Alicante, Storm Austen gusts in England and Wales, all from the article.
3. Al Jazeera — https://www.aljazeera.com/news/2026/10/23/grenade-exercise-sparked-deadly-fire-at-canada-military-base-army-says — 2026-10-23T04:41:24Z. Cause attributed to a Canadian military official; four soldiers killed, dozens injured, Wainwright base, fire on Saturday.
4. BBC News — https://www.bbc.com/news/articles/c54g1kxw4nvvo — 2026-10-22T23:16:16.492Z. Findings attributed to the BBC investigation; "may amount to war crimes" attributed to Volker Türk.
5. NASA — https://www.nasa.gov/news-release/nasa-invites-media-to-2026-von-braun-space-exploration-symposium/ — publication day 22 October, conservatively 2026-10-22T00:00:00Z. Dates, venue and themes from the release.

Fixed preparation time 2026-10-23T08:30:00Z. Stories expire individually 48 hours after publication; the NASA item first, the edition by 25 October. A newer successful automated edition replaces this one.

## Reviewed recovery after the key rotation

The owner replaced the `OPENAI_API_KEY` Cloudflare secret on 23 October 2026 (about 08:45 UTC). `key-rotation-2026-10-23` in `lib/news-refresh.js` allows exactly one recovery attempt when the stored status is `invalid-key` from before 2026-10-23T08:40Z, between that time and 2026-10-30. The first edition read after deployment schedules one alarm; the attempt reserves the usual 14 cents inside the unchanged monthly allowance and records `review-attempt:key-rotation-2026-10-23`. The ledger, previous markers and diagnostics are kept. Success returns to the 00:00/12:00 UTC cron; any new failure (including another 401) stays paused until the next review.
