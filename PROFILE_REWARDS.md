# Profile rewards

Cosmetic choices use existing accumulated XP. They never award or
spend XP, change scores, levels, streaks, ranking identity/visibility, game results
or permissions. Existing players immediately see rewards for their current XP;
nothing new is automatically equipped.

| Frame | XP | Title | XP |
| --- | ---: | --- | ---: |
| Your level (existing frame) | 0 | No title | 0 |
| Blue sky | 100 | Explorer | 250 |
| Fresh green | 500 | Curious Mind | 750 |
| Copper glow | 1,500 | Puzzle Detective | 2,000 |
| Golden hour | 3,000 | Deep Thinker | 4,500 |
| Orbit | 6,000 | BrainiLab Sage | 10,000 |

`profile-rewards-model.js` contains the allowlist, thresholds and next-reward
calculation. Every rendered choice is checked against the current player XP,
including previously stored or manually edited choices. These cosmetic values
are never authorization claims or server-verified achievement credentials.

`profile-rewards-store.js` keeps browser choices isolated by guest/account ID.
Signed-in players save only changed cosmetic keys using the existing Supabase
client's `auth.updateUser({data: ...})`: `brainilab_avatar_frame_v1` and
`brainilab_profile_title_v1`. Other metadata is left to Supabase's merge behavior;
independent frame/title edits do not overwrite each other. The account is checked
before writing and before applying the response. No database migration, grants,
new API endpoint, authentication settings or public leaderboard fields are needed.
Metadata remains a cosmetic preference; users cannot use it to change earned XP.

Reads/writes have a 12-second UI timeout. Failed or unconfirmed writes preserve
the previously confirmed appearance and require a successful reread before a
retry. Browser storage failures do not report a successful guest save. Signed-in
users have account persistence; guests have browser-only persistence. Choices
from a previous account never become a new account's defaults.

The avatar studio now leads My Progress. Skin tones, hair, hair colors, shirts
and backgrounds are free choices. Eight hair styles include ponytail, long waves
and braids. Five glasses, six hats and seven playful
extras unlock with existing XP; they can be combined. The next reward includes
all cosmetic groups. Progress, streaks, recent games and learning stay available
in the closed-by-default `Progress & recent activity` panel. Recent cloud game
history is requested only when that panel opens; no history is deleted.

| Glasses | XP | Hats | XP | Little extras | XP |
| --- | ---: | --- | ---: | --- | ---: |
| Fresh eyes | 150 | Warm thoughts | 500 | Brain freeze | 800 |
| Bright mind | 1,000 | Thinking cap | 1,500 | Bright idea | 2,500 |
| Star pupil | 3,500 | Quiz wizard | 6,000 | Sharp thinker | 4,500 |

Additional collection (16 October 2026; original IDs and thresholds above stay unchanged):

| Item | Category | XP |
| --- | --- | ---: |
| Smart cookie | Little extra: cookie with glasses | 300 |
| Square roots | Glasses: square frames | 600 |
| Egghead | Hat: sunny-side-up egg | 1,200 |
| Peas of mind | Little extra: smiling peas | 1,800 |
| Brainstorm | Hat: cloud and lightning | 4,000 |
| Eye-Q | Glasses: teal visor | 5,000 |
| Rocket science | Little extra: rocket | 7,000 |
| Top of the class | Hat: graduation cap | 8,000 |
| Bookworm | Little extra: worm and book | 9,000 |

The selected accessory's short description is visible below its group, including
on touchscreens; it is not restricted to a hover tooltip. Existing labels and the
single save-status live region remain available to screen readers. Eye whites
and lighter mouth/nose strokes keep facial features readable on dark skin tones.
All artwork stays local, static and original; there are no animated flashes.

`avatar-design.js` renders original local SVG illustrations from fixed allowlists.
No avatar service, tracking call, third-party artwork or generated bitmap is used.
The flat `brainilab_avatar_*_v1` metadata keys hold mode, skin, hair, hair color,
shirt, background, glasses, hat and prop. Only changed keys are merged. Existing
frame/title keys stay backward compatible. Saving a look does not change scores or XP.

Previewing never equips an item. Save confirms the change before applying the
illustrated avatar to the current player's profile, shared header and other
existing own-avatar surfaces. A compact mobile preview and Save button stay in
view while choosing. Cancel discards the draft. Switching to Your picture restores
the retained photo or preset without deleting the illustration choices. Choosing
a look or accessory switches the preview to illustrated mode; frames/titles do not.
The original level frame and no-title option can always be restored.

Saved illustrated avatars and cosmetic frames also appear in individual rankings,
friends rankings, accepted friends, friend requests, group members and the friend
picker. Existing picture/preset fallback stays available. Group crests remain
group identities. Existing public ranking visibility is preserved: automatically
assigned ranking identities do not publish a private photo or avatar design.

Migration `20261016195312_shared_player_avatars.sql` adds `avatar_style` only to
four existing RPCs. Their authentication, membership, visibility, moderation,
eligibility, score calculations, ordering, previous fields and EXECUTE ACLs are
preserved. A definition-hash guard aborts if another deployment edited an RPC.
The private `brainilab_private.player_avatar(uuid)` helper is an invoker function
with an empty search path and no direct PUBLIC/anon/authenticated access. Existing
definer RPCs call it only for people already authorized in their response.

Only allowlisted cosmetic IDs leave Auth metadata. Canonical
`public.player_progression.xp` gates each accessory and frame. A public style
includes a minimum rendering threshold, rather than exposing total XP, user IDs,
emails or other metadata on public rankings. Picture mode omits hidden
illustration choices. No player rows, scores, XP, relationships or photos are
updated by this migration. `avatar-design.js` normalizes the appearance in each
adapter; `progression-ui.js` renders it consistently, including rows without XP.

The `My avatar` option selects the illustrated avatar; `Your picture` keeps the
saved photo/preset. Migration `20261016201431_shared_player_titles.sql` extends only
the existing private helper to include the equipped `title` ID in `avatar_style`.
It checks the same title catalog and canonical XP thresholds as the profile:
Explorer 250, Curious Mind 750, Puzzle Detective 2,000, Deep Thinker 4,500 and
BrainiLab Sage 10,000. It never publishes the whole unlocked collection. None,
unknown or still-locked selections show no badge. A title can accompany a photo
without exposing unused illustration choices or increasing `render_xp`.

An allowlisted label appears below the name in individual/friend rankings,
friends/requests, group members and the group friend picker. It is distinct from
the level title and team role, wraps on narrow screens, and has a screen-reader
prefix. Existing visibility and membership rules apply through the same RPCs;
the four public RPC definitions, score/XP tables and saving flow stay untouched.
The helper definition-hash guard protects concurrent edits; its private ACL and
empty search path remain unchanged. Unequipping removes the label on refresh.

Validation: `tools/test-profile-rewards.mjs` and `tools/test-avatar-studio.mjs`
(set `JSDOM_MODULE`), existing profile,
progression, player identity, rankings and game-integrity suites;
`tools/test-social-avatars.mjs` executes all four real pre-change RPCs and the
migration in isolated PostgreSQL (set `PGLITE_MODULE` and `JSDOM_MODULE`), compares
all previous response fields and ACLs, checks privacy and every unlock threshold,
and feeds the actual database results through the adapters and social views;
official build
and `tools/check-build.py`. Inspect the actual profile and a local sample fixture
at 320/768/1024/1440px, keyboard activation and visible focus. Local fixtures and
screenshots are outside the tracked public source and must not be deployed.

Design references reviewed 16 October 2026: Duolingo's large character preview
and grouped traits, DiceBear's inspectable combinations, and Chess.com's small
profile flair. BrainiLab keeps its existing typography, colors and layout, uses
original artwork, preserves the previous picture, and uses earned-XP thresholds
instead of purchases. Reference UI/artwork was not copied:
https://blog.duolingo.com/avatar-creator/
https://www.dicebear.com/playground/
https://support.chess.com/en/articles/8701403-how-do-i-change-my-icon-or-flair

Official API reference checked 16 October 2026:
https://supabase.com/docs/reference/javascript/auth-updateuser
