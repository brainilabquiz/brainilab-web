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
and backgrounds are free choices. Three glasses, three hats and three playful
extras unlock with existing XP; they can be combined. The next reward includes
all cosmetic groups. Progress, streaks, recent games and learning stay available
in the closed-by-default `Progress & recent activity` panel. Recent cloud game
history is requested only when that panel opens; no history is deleted.

| Glasses | XP | Hats | XP | Little extras | XP |
| --- | ---: | --- | ---: | --- | ---: |
| Fresh eyes | 150 | Warm thoughts | 500 | Brain freeze | 800 |
| Bright mind | 1,000 | Thinking cap | 1,500 | Bright idea | 2,500 |
| Star pupil | 3,500 | Quiz wizard | 6,000 | Sharp thinker | 4,500 |

`avatar-design.js` renders original local SVG illustrations from fixed allowlists.
No avatar service, tracking call, third-party artwork or generated bitmap is used.
The flat `brainilab_avatar_*_v1` metadata keys hold mode, skin, hair, hair color,
shirt, background, glasses, hat and prop. Only changed keys are merged. Existing
frame/title keys stay backward compatible. No schema, RPC, grant or score change.

Previewing never equips an item. Save confirms the change before applying the
illustrated avatar to the current player's profile, shared header and other
existing own-avatar surfaces. A compact mobile preview and Save button stay in
view while choosing. Cancel discards the draft. Switching to Your picture restores
the retained photo or preset without deleting the illustration choices. Choosing
a look or accessory switches the preview to illustrated mode; frames/titles do not.
The original level frame and no-title option can always be restored. Public
ranking scores, positions, names, avatars and payloads are unchanged. These
preferences are not published to other players through public ranking payloads.

Validation: `tools/test-profile-rewards.mjs` and `tools/test-avatar-studio.mjs`
(set `JSDOM_MODULE`), existing profile,
progression, player identity, rankings and game-integrity suites; official build
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
