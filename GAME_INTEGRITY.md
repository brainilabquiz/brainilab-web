# Game behaviour audit — 2 October 2026

Connections now accepts one answer per round. A wrong answer reveals the connection and earns zero. Correct/total, accuracy, question health and server verification use actual answers, not completed rounds. Existing verified results are retained. Older open tabs can finish, but only their first choice per round counts in verification.

## Coverage and fixes

| Engine / games | Checked behaviour |
| --- | --- |
| Connections | 3 Daily/archive rounds and 20 Anytime rounds; wrong answer ends round; explanation; repeated click; checker failure doesn't consume answer; accurate zero/mixed/full scores; one save. |
| Quiz: Brain Mix, World Flags, Capitals, General Knowledge, Science, History, Sports, Europe Flags practice | One answer or skip; failed checker retries; wrong/skip earns zero; double next/answer blocked; one completion. |
| Sequence, Odd One Out, Higher or Lower | Closed-answer and navigation guards strengthened; error recovery; combo semantics retained; save failure displays completed result. |
| Survival | Three lost lives or 30 answered questions end a run. Server rejects premature completion and answers after the third lost life. Client refuses a partial bank. |
| Number Route | Constructive retries intentionally retained; resets don't reset round timer; skipped route earns zero; checker failure restores last operation; server rejects null/empty/wrong operator arrays. “Targets reached” replaces misleading accuracy wording. |
| Math Rush | 60-second deadline; blank input isn't zero; numeric zero accepted; skip resets combo; double submit blocked; no answers after time; idle run is practice and earns no Daily/XP; server rejects empty/reordered positions. |
| Order Up | Locked ordering and pairwise scores retained. Completed round survives refresh. Failed checker exposes Retry without changing order. Duplicate next/finish blocked; failed saves show result. |
| Topic Rush | Canonical answers deduplicated, checks started before deadline settle, excess answers don't break correct<=total validation, full-score target remains separate and capped. Failed saves show result. |
| BrainiWord | English dictionary, repeated-letter evaluation, five attempts, win/loss and accepted-guess locking retained; invalid/malformed checker response cannot consume an attempt. |
| Reasoning challenge / Academy | Existing mixed, zero/full scores, single submit, reload/resume, versioned lesson progress and reward tests rerun. No IQ or ranking rule changes. |
| Retired Flag Dash / Map Hunt | Redirects retained; not reintroduced as scored games. |

## Reproducible checks

Set `JSDOM_MODULE` and `PGLITE_MODULE` to installed module paths. Run:

```
node tools/test-game-integrity.mjs
node tools/test-game-integrity-db.mjs
node tools/test-puzzle-results.mjs
node tools/test-result-integrations.mjs
node tools/test-brainiword-discovery.mjs
node tools/test-daily-choice-db.mjs
node tools/test-rewards.mjs
node tools/test-reasoning.mjs
```

The new regression suites run real browser DOM game engines and isolated PostgreSQL. No production games are submitted. The SQL migration replaces six existing functions, with existing ownership checks/grants preserved; it doesn't recalculate historical results or modify player rows.

Read-only production bank audit: 118 Connections, 54 Sequence, 112 Higher/Lower, 120 Odd One Out, 114 Number Route, 134 Order Up and 361 published quiz question versions passed structural checks. This validates shapes and answer counts, not every editorial fact.

## Limits

This is a gameplay and result-integrity audit, not a claim of comprehensive anti-cheat. Existing stateless answer checkers and client-reported timing are not server-issued, single-use play sessions. Deliberate API manipulation / refresh before an unfinished run would need a separate persisted-attempt design; browser locks alone cannot prevent that. Completed Daily locking, extra selection, XP caps and historical results remain covered by their existing database tests.
