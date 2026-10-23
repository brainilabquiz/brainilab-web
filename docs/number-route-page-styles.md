# Number Route stylesheet delivery

The public mobile PageSpeed run on 23 October 2026 reported eight render-blocking
stylesheets and an estimated 1,080 ms saving. Its largest contentful element was
the introduction text, not an image. This estimate is a lab diagnostic, not a
guarantee of an equal reduction in load time.

`pageStyles` now also handles `games/number-route/index.html`. It leaves the shared
`site.css` and `mobile.css` links cacheable across routes and combines the six
remaining sheets into one generated `number-route-page.css`, in their original
order. All rules remain present, including results, continuity and post-game
states. CSS asset URLs remain relative to `/assets/css/`. No sheets load
asynchronously and no style rules are removed for the initial viewport.

The generated file receives the same exact-byte cache version as existing page
bundles. External, media, integrity and inline-style cascade barriers continue to
disable bundling when moving a sheet could change precedence. Other game and
article routes retain their existing stylesheet delivery. The build runs
`tools/test-page-styles.mjs` to check these boundaries and unchanged body and
script bytes.

This changes CSS delivery only. It changes no consent, tracking, accounts,
gameplay, progress, XP, scores or rankings. Keep the before and after lab reports
and verify public rendering; request count alone does not prove faster loads or
additional search traffic.
