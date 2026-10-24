# Analytics and search

- Owner account: brainilabquiz@gmail.com.
- Analytics account BrainiLab: 409172789; property BrainiLab Games: 555562532.
- Web stream: 15833559251; measurement ID: G-97WN37VLHV.
- Peninsular Spain time zone, EUR. Four optional account data-sharing choices disabled. Enhanced measurement disabled; BrainiLab sends selected events.
- Real-time receipt verified on 23 September 2026.
- Search Console domain brainilabgames.com verified by DNS. Sitemap submitted successfully: https://brainilabgames.com/sitemap.xml.

`assets/js/site-analytics.js` loads Google only after explicit statistics consent on production. Admin, auth, profile and sensitive auth-link contexts are excluded. Page URLs omit query strings/fragments; referrers are origin-only. The old G-4503F4904H snippets were removed.

Events: page_view, article_view, article_read (30 visible seconds plus reading depth), article_game_click, game_complete (deduplicated non-practice result), social_click, feedback_open. No account IDs, answers, emails or scores. Statistics and Meta have independent consent choices. Google signals and ad personalization are not enabled.

29 September: game_complete is marked as a GA4 key event. Added game_start for the shared quiz engine (first answer or skip) and Math Rush (successfully loaded run), with per-round deduplication. No starts for Try First/archive practice, and no queue before statistics consent. Added game_guide_click and allowlisted post_game_action (next/guide/progress/browse). Start-to-completion comparisons are valid only for instrumented games, not all minigames. Use GA4 retention/cohort reports for D1/D7; no new persistent visitor identifier has been added.

The setup banner may lag real-time collection. Owner/test visits are currently included; interpret early samples carefully. No paid campaign, session replay or visitor-identification service was added.

AdSense publisher, supplied by the owner: ca-pub-5613536700850101. Kept consistent in account meta tags, ads.txt and monetization configuration. The existing async/crossorigin=anonymous loader remains gated by runtime ad flags and configured slots. Verification is available via the meta tag or ads.txt while display ads remain disabled.

Discovery release (29 September): Number Route and Connections now send game_start after a run loads. resource_download records clicks to the printable PDF (not confirmed file saves); resource_arrival records an allowed visit to Number Route with from=number-break from its QR/link. Neither event runs before statistics consent. The resource ID is a fixed string; arbitrary URL values are never forwarded. Compare game_start to game_complete by game_id and mode, with the same consented audience. Baseline Search Console: 289 impressions / 5 clicks in 28 days to 27 September; too small to infer a reliable conversion trend. Review entry-page impressions, clicks, starts and completions at 14 and 28 days; ranking and traffic growth are not guaranteed.

Same-Daily invitations: friend_challenge_open is sent only for a valid current-day invitation, with statistics consent. friend_challenge_share records successful clipboard copies or a resolved native share call, with only method=copy/share. These are actions, not proof that a recipient received/read a message. No contacts, invitation text, date, player identity, score or URL query values are sent. Expired/malformed/future invitations do not count as current invitations.

## First play and account invitations (24 October 2026)

The result screen keeps play and sharing first. Guests can choose **Save my progress** to open the existing free signup form. It never opens automatically. **Not now** suppresses result invitations for the rest of that tab visit, across games, navigation and sign-in refreshes. Session storage is used only for that UI preference; an in-memory fallback applies when storage is unavailable. Practice continues to say explicitly that the practice round stays on its page. Creating an account does not subscribe anyone to a newsletter.

With statistics permission and the existing account/privacy exclusions, `first_game_start` records the first supported `game_start` hook in a browser activity window. Its `seconds_to_play` value is bounded to 0–1,800 seconds from the consented entry context. It is not a timer from an unconsented first arrival, a unique-person count or a verified result save. Existing game hooks may represent a loaded round or a first answer; compare like games and modes. No event is queued before consent. The local first-start flag has the existing 30-minute inactivity lifetime; blocked storage limits deduplication to the current page, and simultaneous tabs may race.

Result invitations send the allowlisted `account_prompt_render`, `account_prompt_dismiss`, `account_prompt_click` and `account_prompt_open` actions only with permission. Render means insertion into the page, not a viewport impression. Open means the existing signup call resolved, not that an account was created. Regular authenticated users do not see a guest invitation. Names, emails, player IDs, answers, scores and arbitrary URL parameters are not added to these events; the registration payload keeps its existing fields.

For a useful review, compare entry pages → supported starts → completions, then voluntary account clicks → confirmed registrations from the existing account reporting. Use matching periods, consented audiences, games and modes; do not treat local completion events as verified leaderboard receipts or divide incompatible counts. Review real usage before adding another prompt. This change has been checked locally; live receipt and conversion results require a subsequent authorised deployment and live verification.

Regression coverage: `tools/test-first-value.mjs`, `tools/test-growth-registration.mjs` and the existing consent/privacy suites. `tools/qa-first-value.html` is a local-only fixture with no real signup, database write or analytics transmission; it must remain outside the public build.
