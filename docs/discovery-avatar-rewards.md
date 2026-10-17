# Discovery avatar challenges

Five optional cosmetic challenges encourage trying existing games. The profile's
Challenges tab shows requirements, saved progress and a link to a missing game.
The existing XP extras stay expanded. Academy, badges, titles and backgrounds
retain their IDs and requirements. Nothing is equipped automatically.

| Extra | Saved completed games required |
| --- | --- |
| Trail mix | Any three different supported games |
| Game face | Any eight different supported games |
| Word on the street | BrainiWord and Connections |
| Number cruncher | Number Route, Math Rush and Sequence |
| Globe trotter | World Flags and World Capitals |

The canonical allowlist contains 17 current games. Repeats count once; winning
is not required. Session and result must belong to the same signed-in account,
with a completed session and completion timestamp. Results must have verified
answers or precede the existing immutable legacy verification cutoff. Practice,
try-first rounds, unfinished sessions, unknown games and other owners are excluded.
Existing qualifying rounds count retroactively. No XP or ranking points are
awarded or spent; no result, progression or course data is written.

`get_my_brainilab_discoveries()` is a stable invoker RPC with an empty search
path and no owner argument. Existing owner RLS applies. Only authenticated users
can execute it; anonymous identities receive no games. Its response contains the
current owner and allowlisted game IDs, not scores or other players' history.
The private social avatar helper checks selected discovery items independently
against canonical results. Its public payload shape, privacy checks, ranking
order and score/XP formulas are unchanged. Metadata stores cosmetic selections,
never proof that a challenge is complete.

Save rechecks a newly selected discovery item and the current account. Unknown
IDs, failed reads and owner changes fail closed. Preview and Cancel do not save.
The existing account isolation and separate achievement choices are preserved.

Individual and friend ranking rows place the name on the left and the existing
title, badge strip and country/level together on the right. Small screens stack
those details without hiding them. Team rankings are unchanged.

`tools/test-discovery-avatar-rewards.mjs` checks catalog/rule parity, all five
drawings and boundaries, duplicates, retroactivity, next-game links, forged
metadata, explicit save/cancel, fresh evidence, account isolation and unchanged
non-cosmetic player state. The SQL fixture uses the actual proposed predicates
with isolated temporary relations, checks RLS/owner and legacy boundaries, and
rolls back. Social tests cover the ranking DOM structure and unchanged values.
