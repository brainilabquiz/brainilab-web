# Profile achievements

The Badges tab recognises existing saved game milestones. It never awards or
spends XP, changes a result, changes a streak, or writes to rankings. Nothing is
featured automatically. A signed-in player can choose zero to three earned badges,
preview the choice, save it, cancel it or remove all featured badges.

| Badge | Existing account fact |
| --- | --- |
| First spark | 1 saved game |
| Double digits | 10 saved games |
| Fifty nifty | 50 saved games |
| Mix it up | Personal-best records in 3 different games |
| Daily dose | 1 completed Daily |
| Daily regular | Completed Daily on 7 distinct days |
| Three's a charm | Best Daily streak of 3 days |
| Week streak | Best Daily streak of 7 days |

Earning is derived only from the current owner's existing
`get_my_brainilab_progression` snapshot: `total_games`, `full_daily_count`,
`best_streak` and distinct canonical `personal_bests.game_id` values with valid
result IDs. The current Daily completion rules remain unchanged. Personal-best
coverage omits some outcomes, including BrainiWord losses, so Mix it up describes
recorded personal bests and does not claim to count every game tried.

Guests see a sign-in explanation. Missing, malformed or mismatched account evidence
stays unavailable; it is not fabricated as zero and never unlocks badges. Academy
course badges and personal-record-improvement badges are not inferred from reading
events, local course caches or a best score alone.

Only the preference array `brainilab_featured_achievements_v1` is written through
the existing `auth.updateUser({data: ...})` API. It contains IDs, never earned flags,
XP or scoring fields. Every read is filtered against the fixed catalogue and the
owner's authoritative earned set. Raw saves reject unknown, repeated, locked or
more-than-three IDs. The preference is cosmetic, not an authorization claim or a
certificate. It is displayed on My BrainiLab only; leaderboard/group/friend badge
exposure is outside this change.

The store checks account identity before and after reads and writes, bounds calls
at twelve seconds, preserves a same-owner confirmed selection on failed refresh,
and waits for a matching response before reporting a saved change. Errors require
a successful reread before retry. The latest same-field metadata is compared with
the read baseline before writing; unrelated metadata is preserved by a one-key
patch. Supabase Auth metadata does not offer atomic compare-and-swap, so this is
best-effort conflict detection rather than a database revision guarantee.

On the initial visit, the existing account progression may arrive after the
profile UI. A single current-owner progression event can resume a check that was
waiting only for that initial evidence. This never equips a badge or writes a
preference. Metadata errors and later failed refreshes still require explicit
retry; no timer or polling loop retries them.

The three compact saved badges appear below the diploma. The collection lives in
the fourth studio tab; its draft preview appears only while editing. Badge Save
and Cancel are separate from avatar Save and Cancel. Switching tabs keeps both
drafts; choosing a badge does not equip it until its save is confirmed. The existing
extra categories stay expanded, and the XP-based Up next reward stays separate.
The UI reuses existing SVG assets, keeps focused controls stable, exposes locked
conditions in text and supports keyboard tab navigation and narrow screens.

Local regression tests use fictional accounts and metadata responses. They check
thresholds, invalid preferences, maximum three, preview/save/clear/cancel, independent
avatar drafts, offline recovery, concurrency and account switches without player
writes. Native QA uses a loopback-only fixture with real external networking blocked;
the production account is checked by reading, selecting and cancelling only.
