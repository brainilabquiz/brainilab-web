# Games catalogue: links available before JavaScript

Reviewed 21 October 2026 against main 6034074eff03e450617f7cee64f3d315af236ba4 and the live pages.

## Evidence and intent

Reuse of today's Search Console final Web query/page sample: 21 July–18 October 2026, collected 21 October at 07:28:43 UTC, America/Los_Angeles reporting timezone, all markets, no language filter. The observed English query `quiz 50 games` has 3 impressions for `/games/`; `how big is the difference` has 1 for `/games/higher-lower/`. These tiny, ambiguous samples do not justify new keyword targets, a claim of demand for fifty games, title stuffing, forecasts or a rewrite. Query/property, image and overlapping periods are not added.

The actual Games page has eighteen distinct game cards. Four `Play` anchors—Brain Mix, BrainiWord, Order Up and Topic Rush—had no href in saved HTML; the existing library script adds a random, preferably unseen archive-practice route after loading. Its JSON-LD ItemList contained fourteen games and omitted those same four. The issue was confirmed in current source and the native live browser; it is a directly observed discovery gap, not an inference from CTR or proof that a search engine failed to index a game.

## Narrow change

Give the four anchors ordinary links before hydration. Their fallback uses the existing 29 August 2026 archive-practice route, the launch date already used by the library. Keeping `archive` is deliberate: a fallback must not become today's ranked Daily or select a Daily extra. The existing script and its unseen-practice selection remain unchanged. The game pages retain their own canonical URLs.

Complete the ItemList with all eighteen distinct visible games, contiguous positions and one canonical route each. No difficulty, date or archive variant is counted as another game. No claims about ratings, visits or players are added. Public titles, descriptions, layout, scoring, XP, tracking, authentication and result persistence are unchanged.

## Existing work preserved

The live General Knowledge topic page already has the relevant free twenty-question description and Easy/Medium/Hard destinations from PR108. The existing Bubble Wrap, 1752 calendar and hook-and-loop articles already answer the question near the start, cite sources and offer direct relevant game links. Their current CMS revisions and source dates were read; no editorial rewrite or image regeneration is justified. The saved Growth proposals for those pages need reconciliation with already-published work rather than a second copy of the edit.

The only organic landing-path row in the reused 21 September–18 October GA4 sample is the 2100 leap-year article: 2 sessions and 1 engaged session, with game events unmeasured. It cannot be attributed to the catalogue, these four links, a keyword or a backlink. Existing published decisions and baseline 4–17 October are retained; the intended 21 October–3 November comparison is not complete. No traffic or player gain is claimed.

## Verification

The catalogue test compares every visible card with the structured list, checks the four static routes, and executes the unchanged library script with and without fallback hrefs. Both must choose the same unseen archive practice and perform no result or XP writes. Production build, live HTML/structured data, native mobile/desktop links and the unchanged runtime destinations are checked before recording completion. No scored round is played as a test.

Reviewed public pages: https://brainilabgames.com/games/ ; https://brainilabgames.com/games/higher-lower/ ; https://brainilabgames.com/general-knowledge/ ; https://brainilabgames.com/learn/was-bubble-wrap-invented-as-wallpaper/ ; https://brainilabgames.com/learn/why-britain-skipped-eleven-days-in-1752/ ; https://brainilabgames.com/learn/how-hook-and-loop-fasteners-work/ .
