# Academy avatar extras

The avatar studio has an Academy collection with eight original accessories, one
per currently published course. The existing XP extras, saved avatars, titles,
backgrounds and badge selections keep their IDs and requirements.

An account earns an extra by finishing every lesson quiz in that published course.
This follows Academy's existing completion rule: finish the round, with no new
passing-score threshold. Opening an article or browser-only progress does not
count. The account's saved quiz version and question total must match the current
published lesson. Existing canonical completions are recognised at deployment.

`learn_avatar_unlocks` is a permanent cosmetic collection. `unlocked_at` records
when completion was recognised, including backfill; it is not a fabricated
historical course-completion date. Later course extensions cannot revoke an item.
Nothing is equipped automatically and no XP or ranking points are granted or spent.

The existing lesson RPC and XP award code are unchanged. An invoker trigger on
canonical `learn_progress` inserts collection rows using a private invoker helper.
Only the database owner can execute that helper or write the collection. RLS
allows a signed-in, non-anonymous account to read only its own collection. The UI
reads reward IDs, not other accounts' study history. Metadata stores selections,
never entitlement claims. The existing private social avatar helper independently
checks each course item against the collection before returning its artwork.
Public social RPCs, ordering, opt-in rules, friendship/group guards and scoring
remain unchanged; no course history is added to public payloads.

The studio uses preview, explicit Save and Cancel, with a fresh entitlement check
before saving a new course item. Unknown IDs fail closed. Failed reads prevent
unconfirmed saves; retry keeps the previous confirmed selection. Owner changes
invalidate pending requests, and a restored browser-history page refreshes the
collection. Existing choices remain expanded; the five tabs use two rows on small
screens. Course links are independent of disabled locked-item buttons.

Verification: `tools/test-academy-avatar-rewards.mjs` covers the client/server
catalog contract, all eight drawings, forged metadata, zero-XP completion,
retroactive unlocks, explicit save/cancel, fresh eligibility, offline retry,
owner isolation, social parsing and exact non-cosmetic player-state preservation.
`supabase/tests/academy_avatar_rewards.sql` uses the exact helper bodies with
isolated temporary relations and rolls back; it exercises all eight courses,
incomplete/current-version checks, permanent/idempotent grants and social gates.
Run the existing avatar, achievement, social and rendering stability suites too.
