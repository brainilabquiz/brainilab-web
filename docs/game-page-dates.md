# Game page dates

`lib/game-page-dates.js` adds one visible `Page updated` time and the same
`dateModified` to the existing page/game entities. It is used by the static
build and the seasonal renderer. It does not change game engines or progress.

The recorded dates are source revision times on `main`: the page itself, its
shared reading recommendations, or the seasonal/cryptic content renderer,
whichever is later. Each record retains the public source commit. The initial
31 October 2026 review compared public HTML before, on preview and after release.

First publication is not recorded for these game pages. Do not infer
`datePublished` from the first available Git commit, an event start, a Daily
puzzle date, an audit, or a deployment. Existing publication values must survive
rendering unchanged. A conflicting pre-existing modification date stops the
build for review.

When changing page content, review its recorded modification date and retain
the source provenance. A build, visit, daily puzzle rotation, common navigation
decoration or date-display-only change does not advance it automatically.
Visible labels use the UTC calendar day; the HTML attribute retains the exact
recorded timestamp. Keep the active and closed seasonal-page checks and compare
the returned HTML with its structured data before publishing.
