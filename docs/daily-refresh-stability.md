# Daily refresh stability

Account/progression notifications previously rebuilt the Daily dashboard and its
guide even when the visible data was identical. The regression replaces a card
node and closes open explanations after an unchanged response.

The overview now builds the journey markup before changing the live view. An
identical presentation keeps the dashboard, card illustrations, open explanations,
focus and existing invitation control. The guide is rebuilt only when its rules
version changes or its contents are missing. Actual saved results still update.

A failed same-account/day refresh retains the last confirmed result with an
explicit notice and retry. An initial failure keeps the existing full error and
retry screen. Switching account or UTC day removes previous results immediately;
request and owner checks reject obsolete responses, including delayed markup.

No game rules, point conversion, XP, result storage, database, authentication,
consent, public security headers or domain routing changes. Force-cloud reads
continue; retaining a view does not claim a fresh successful synchronization.

Validation:

- `test-daily-refresh.mjs` reproduces the original node replacement, then checks
  retained DOM, focus and details, retries, genuine updates, account/day boundaries
  and slow status/markup responses. It also runs against the minified output.
- Daily discovery, choice UI, the 730-date scoring contract and scoring-copy tests.
- The older friend-challenge fixture lacked the per-game completed result now
  required by the existing post-game guard. The fixture is corrected; product
  sharing rules are unchanged. It failed identically on the pre-change main.
- Isolated native browser fixture uses fictional data, no SDK and no network
  writes; responsive checks at 320, 375, 768 and 1440 pixels. This is not physical
  device certification or a sitewide Core Web Vitals measurement.

Keep the existing navy/yellow Daily, white cards, Pally/Montserrat typography,
open optional explanations and 44-pixel touch targets. The new error notice reuses
the existing pale-yellow palette and visible keyboard focus.
