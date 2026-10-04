# Game data integrity checks

The 2026-10-04 migrations preserve the first verified result across retries and combine duplicate visible puzzle histories in Connections and Sequence. They do not rewrite historical scores or delete content.

## Automated regression tests
Set PGLITE_MODULE to the absolute path of @electric-sql/pglite/dist/index.js, then run:
```
node tools/test-verifier-immutability.mjs
node tools/test-puzzle-selection-dedup.mjs
```
The first test reproduces a 0-to-2500 rewrite with the pre-fix Sequence function, then proves that retries preserve the first result. It checks ten verifiers, ownership, missing authentication, malformed input, valid initial scoring and unchanged verified timestamps. Row locks are asserted; this single-connection harness does not simulate concurrent database transactions.

The selector test draws 40 complete games, checks unique visible puzzles, combines histories across duplicate IDs for registered and guest players, and preserves archived content.

## Read-only production audit
Run tools/audit-game-content.sql through an authorized database connection. It checks nine content banks, today plus seven days of selected Daily content, score bounds and duplicate result sessions. Expect eight days, 24 ready game entries, zero malformed records and zero score/session violations. Duplicate-visible counts are informational because archive records are preserved; selectors deduplicate them.

This is a structural audit, not a factual review of every explanation. Number Route solutions were additionally evaluated left to right against all 114 live targets during this release.

## Safe migration procedure
Both migrations compare exact live function fingerprints before changing definitions. If a guard fails, stop and rebase against the newer function; do not remove the guard in production. Existing execution grants and owner checks are preserved. After applying, compare Supabase security advisories against the pre-change baseline; this release introduced no additional advisories.

