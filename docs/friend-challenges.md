# Exact friend challenges

Regular games use a v2 `#friend=` descriptor with an opaque pack UUID. Scores are informal self-reported targets, never verified rankings or rewards. `?try=1` remains mandatory and the existing data boundary disables result, XP and streak writes.

`BrainiReplay.run` captures the actual loaded set. On explicit sharing, the server resolves canonical references, validates answer/item order and freezes the payload and private answer key. It accepts canonical local fallbacks from the migration catalog and published cloud content; it does not accept arbitrary question text. The browser compares the returned question contract with what was played before enabling Copy/Share. Incoming games bypass every random selector and normal Daily cache. A failed fetch stays pending behind a Retry control. Never add a random fallback to this path.

Receiver checks use the frozen answer key through a narrow RPC adapter. Private cloud answers are absent from public pack reads. Local answers were already shipped in the public fallback modules. Both players use the original ordered questions, options, difficulty, dated/Anytime rules and timer. Pack settings and `friend-replay-v1` must match; bump the rules version when changing scoring. Replies retain the pack UUID. Packs expire after 90 days. Old v1 links cannot prove an exact random set and ask for a new invitation.

The private schema has RLS with no direct client table policies/grants. Only three bounded RPCs are exposed to authenticated sessions, including existing automatic guest sessions. Creation is limited to 50 new packs per player per rolling day; matching packs are reused. No IP, contact list or player identity is in the link or public pack. The anonymous browser identity remains the owner during its initial guest-session bootstrap; switching accounts or guests still invalidates sharing.

Run `tools/test-friend-replay.mjs`, `tools/test-friend-replay-db.mjs`, `tools/test-game-challenges.mjs`, `tools/test-game-challenge-engines.mjs` and Daily/Halloween/result regressions with the existing JSDOM/PGlite fixture dependencies. The new database suite uses isolated schemas and synthetic question fixtures only, never fabricated production players or scores. Apply the additive migration before deploying the frontend.

Halloween's two existing exact seasonal challenges remain on their separate event contract.
