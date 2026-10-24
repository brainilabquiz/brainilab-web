# BrainiLab visual system

Playful learning and quiz product for curious people, including first-time readers.
Pally headings, Montserrat controls and body; Georgia remains for long-form learning.
Navy #2D296E, yellow #FFD813, green #40AB34, orange #E6680C, red #E52720.
Taste dials: variance 6, motion 3, density 5. Awesome DESIGN.md's bundled Miro study
informs purposeful colour blocks and spacing, not copied typography or brand assets.

## Surface rules

- Light lavender page, white navigation and functional cards. Long articles use warm white.
- Navy is the playable feature; yellow is its action. Green indicates learning, completion or community.
- Orange/coral distinguish optional discovery. Locked games keep their identity and explicit status, without a play action.
- One column rhythm: 1180px container, 24px gaps, 16–20px card corners, 12px buttons, 44px touch controls.
- Supporting text is 14–16px; micro labels can be 12–13px. Titles wrap naturally.
- Alignment comes from grids; do not fill a fourth column when only three items exist.
- Hover is optional enhancement, keyboard focus is visible, reduced motion is respected.

## Audit and changes, 1 October 2026

| Surface | Finding | Treatment |
| --- | --- | --- |
| Header/footer | Different page backgrounds and tiny footer navigation | White navigation, active underline, readable shared footer |
| Home | Article/video looked similar; warm/lavender mismatch | Green article, orange video; retained both user-requested features |
| Games | Weak starter links and varying control treatments | White starter panels with meaningful accents and 44px actions |
| Topic categories | Three cards in a four-column layout; giant heading; small copy | Auto-fit grid, smaller hero, 15px descriptions and clear play affordance |
| Daily | Two yellow panels, misaligned top edges | Already shipped in PR57: navy main, white score, green/coral extras |
| Learn | Small card titles and metadata | White cards, stronger titles and readable labels; equal article/Academy hierarchy retained |
| Articles | Weak heading hierarchy and small author row | Navy headings, comfortable warm-white reading surface, clearer links and attribution |
| Academy | Progress panel and intro started on different baselines | Top-aligned overview, white/green progress panel, readable lesson actions |
| Rankings | Filters floating on page; muted frame | White filter panel, yellow board edge, coherent active tabs |
| Groups | Guest state large and colourless | Green community panel and clearer member metadata |
| Profile | Several beige surfaces looked alike | White level/streak cards, green guest note, lavender tabs |
| Games/quiz | Oversized question and small answer labels | Responsive question scale and 16px answers; no changes to scoring or state colours |
| About/legal | Paragraphs too small and too wide | 900px reading panel, 16px body and clear heading spacing |
| Contact/reset/404 | Inconsistent forms and fallback pages | Shared borders, stronger field text and clear recovery panel |
| Admin | Already purpose-built workspace | Only shared border/contrast improvements; preserve editor layout and controls |

`tools/visual-route-inventory.json` records every HTML entry point and redirects.
`visual-system.css` is deliberately separate from game mechanics. The editorial
generator retains the layer for future articles, including server-rendered pages.
Photorealistic article covers, real biographies, URLs, authors, sources, original
publication dates, quiz questions, account data and rankings remain untouched.

## Verification

Audit representative templates in browser at desktop and narrow mobile widths,
then verify every generated HTML entry point includes the stylesheet once. Check
keyboard focus, overflow, form/empty states, locked games and core interactive
controls without submitting real games, feedback, membership changes or payments.
Run production integrity and the affected presentation tests before publishing.

Verified: 79 styled entry points and 5 untouched redirects. All 35 article templates and all public page families checked at desktop and 375–390px mobile widths without page overflow. Games filter and mobile navigation checked interactively. Guest admin login inspected; authenticated administrative workflows were not exercised. Source comparison confirms unchanged text, metadata, script references and navigation links across all 84 HTML entries. Existing library, Academy, rankings, groups, profile, home, link-policy and SEO suites pass. Production build: 622 files, 84 HTML integrity checks.

## Academy continuity, 1 October 2026

The quiz completion panel uses a pale green surface inside the navy quiz, a clear chapter count and the first unfinished lesson as the next action. Confirmed new XP is yellow; guest, previously earned and failed-sync states have distinct honest messages. Course completion can lead from arithmetic to fractions and then mental maths. Decimal grids use the existing accessible native controls; column filling connects tenths to hundredths. No new dependencies or scoring changes.

## Existing-page consistency, 18 October 2026

Keep the existing Pally/Montserrat/Georgia hierarchy and illustrations. This pass
changes presentation only:

- Games card actions sit on the same baseline within each grid row. Auto margins
  absorb wrapped descriptions; single-column cards keep their compact spacing.
- Shared buttons and account/community tabs use a consistent 700 weight. Fields
  have 12px corners, and mobile library/ranking fields use 16px text.
- Learn discovery and topic indexes share the lavender application background and
  white cards. Long articles retain their warm reading surface and Georgia body.
- Narrow Learn screens give the topic selector its own full-width row. Card titles
  use a calmer 20px size; descriptions remain hidden on narrow screens as before.
- Games status text and frame/title unlock labels are at least 12px. Frame/title
  choices retain their existing layout, locks, previews and expanded categories.
- Shared keyboard focus has a dark orange outline plus a white separation ring,
  so it remains visible on both white cards and navy game panels.

No game state, account behavior, reward thresholds, XP, leaderboard calculations,
content, navigation destinations or publication settings change. Validate with
browser renders across 320, 375, 390, 768, 1024 and 1440px, including filters,
library search, Academy, reading, forms and expanded avatar choices. Viewport
checks are not physical Android/iPhone or Safari certification.

## Shared visual details, 24 October 2026

- Public help and source disclosures use one right-aligned chevron, a readable
  label and a full-width native summary target. Navigation menus and admin editors
  keep their own controls. Existing open states and hidden content stay native.
- The mobile menu uses 15px destination labels and compact 48px rows; Community
  retains its hierarchy, descriptions and existing keyboard behaviour.
- At narrow widths, Learn places its browse link beside the heading/count and
  its native topic selector on the following row, bringing articles closer.
- Wrapped section headings use a comfortable line height without new fonts,
  artwork, scripts, tracking or changes to game/account data.
