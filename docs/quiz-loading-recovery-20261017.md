# Recoverable category quiz loading

Four category quiz pages awaited their question pack without an error handler: Science, History, Sports and World Capitals. When both the cloud selectors and the local fallback script failed, their answer areas stayed empty. General Knowledge and World Flags already displayed a failure message, but their retry links reloaded the page and discarded difficulty/practice query parameters.

All six entry points now share a small pre-game loading/error state. A failed load shows a plain explanation and a guarded Try again button. Retrying preserves the selected category, difficulty, set and practice URL, and mounts the original quiz once after its pack is available. Keyboard users return to the ready question after activating retry. This code runs before mounting; it does not restart an active round or change its answers, completion handlers or scoring.

Two fallback transport defects were also reproduced with the actual modules. Content kept a rejected fallback Promise forever, and Daily retained a failed script tag whose completed error event could never notify later subscribers. Failed requests are now released for retry, failed script tags are removed, and both loaders use the existing content-hashed `loadFeature` transport when available. Standalone source modules retain their direct local fallback. The build already includes `quiz-packs.js` in its feature manifest; no new cache or SDK is introduced.

## Evidence

- Fresh audited main: `885a107f4b084df01dcad475b69a72fcd57a8dd7`, including the completed avatar/cache fixes and concurrent editorial work.
- Public reads on 17 October returned 200 for eight page routes and all 31 local CSS/JS references. Those static references were versioned. This does not establish browser paint timings or reproduce a current outage.
- The dynamically loaded, unversioned `/assets/js/quiz-packs.js` separately returned 200 with `public,max-age=31536000,immutable`; the content hash was `99954c20c136230a5e9493925d33f47aefc32e3f77d44597cebec1b387d2fec9`.
- On the original actual-module fixture, Content's second load immediately rejected the cached failure with one script request total. Daily's second load remained pending without issuing another request. These are same-document loader retries: Brain Mix's existing visible retry button already performs a full page reload and is unchanged.

## Checks

`tools/test-quiz-fallback-retry.mjs` drives the real script transport and real local packs through failure, recovery and concurrent Content/Daily reads. It checks the content hash, one request per attempt, 20-question category and 10-question Daily contracts, repeat selection/seed stability and standalone loading.

`tools/test-quiz-pack-loading.mjs` runs all six actual inline entry scripts with controlled failed cloud reads and a failed first fallback request. Each shows a recoverable error, accepts only one retry while loading, mounts four original answer choices, retains the selected difficulty and moves keyboard focus to the question. No answers are played and no result/player mutations are permitted.

Run with the existing JSDOM dependency in `JSDOM_MODULE`; use `QUIZ_SOURCE_ROOT=dist` to verify the minified transport test after building. Existing scoring-copy and lazy feature-cache regressions remain applicable. The normal build also checks syntax, asset versions and the Daily scoring contract.

No question bank, shuffle/seed, scoring formula, XP, ranking, account, consent, DNS or backend data changes. This fixes specific loading/retry failures; it does not claim that every page flash or slow network has been resolved.
