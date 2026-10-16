# Profile rewards

Profile-only cosmetic choices use existing accumulated XP. They never award or
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

The collection stays collapsed under the next reward. Previewing does not apply
the style; Save applies it to the profile avatar, profile header avatar and title.
The original level frame and no-title option can always be restored. Custom
photos and existing portrait selection remain intact. Public ranking scores,
positions, names, avatars and payloads are unchanged.

Validation: `tools/test-profile-rewards.mjs` (set `JSDOM_MODULE`), existing profile,
progression, player identity, rankings and game-integrity suites; official build
and `tools/check-build.py`. Inspect the actual profile and a local sample fixture
at 320/768/1024/1440px, keyboard activation and visible focus. Local fixtures and
screenshots are outside the tracked public source and must not be deployed.

Official API reference checked 16 October 2026:
https://supabase.com/docs/reference/javascript/auth-updateuser
