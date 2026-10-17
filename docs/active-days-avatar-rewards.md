# Avatar extras for days played

The existing Challenges tab now includes four optional cosmetic milestones:

| Extra | Different days played |
| --- | ---: |
| Daydreamer cloud hat | 3 |
| Thyme after thyme plant | 10 |
| Sun-day best glasses | 30 |
| Back for s’more marshmallow sandwich | 100 |

Each UTC date counts once when the signed-in account has a qualifying completed
game. Pauses never reset the count. Earlier qualifying rounds count, including
the two supported retired game IDs; those IDs do not enter discovery challenges.
Repeats on one date, future completion timestamps, unknown games, practice,
try-first, incomplete sessions and other owners are excluded. The existing
answer-verification/legacy boundary is preserved. No win or XP threshold is added.

The existing owner-only invoker discovery RPC adds only an aggregate `activeDays`
field. Its game list and ACL are unchanged. Dates and counts are not added to
public social payloads. The private avatar helper independently checks selected
day extras. Metadata stores choices, never proof. The count is separate from
existing Daily/streak statistics; those formulas and all XP/scoring code remain
unchanged. There are no new tables, triggers, grants or gameplay writes.

The studio retains its six tabs and expanded XP extras. It shows actual account
progress, preview and explicit Save/Cancel. A newly selected day extra requires a
fresh owner-bound read before Save. Missing/malformed evidence and account changes
fail closed. Nothing is equipped automatically and XP are never spent or awarded.

## Ranking refresh

Account/progression events previously replaced an already loaded ranking with
the loading skeleton before fetching the same results again. Same-view refreshes
now retain confirmed content and set `aria-busy`. Identical resulting markup keeps
the actual DOM, focus and open details. Changed data updates normally. A failed
background read leaves an honest stale-result notice and Retry; initial errors
still show the existing full error state. Filter, privacy and owner boundaries
clear previous content, and stale responses cannot overwrite the current view.

Verification covers four day boundaries, gaps, UTC midnight/offset duplicates,
legacy/practice/future exclusions, owner RLS, forged/malformed evidence, explicit
Save/Cancel, fresh checks and unchanged non-cosmetic state. Ranking tests cover
retained DOM/focus/details, score updates, overlapping responses, errors/retry,
filter and account switches. SQL fixtures use exact bodies with temporary
relations and roll back. Existing avatar, Academy, discovery, badge/social,
rendering, result-unlock and XP regressions remain required.
