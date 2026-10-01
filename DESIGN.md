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

Verified: 79 styled entry points and 5 untouched redirects. All 35 article templates and all public page families checked at desktop and 375�390px mobile widths without page overflow. Games filter and mobile navigation checked interactively. Guest admin login inspected; authenticated administrative workflows were not exercised. Source comparison confirms unchanged text, metadata, script references and navigation links across all 84 HTML entries. Existing library, Academy, rankings, groups, profile, home, link-policy and SEO suites pass. Production build: 622 files, 84 HTML integrity checks.
