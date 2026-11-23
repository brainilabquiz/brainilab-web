# BrainiLab working tools

These are owner-run development and content-production tools. They are separate
from the public website, its accounts and player data. No recurring monitor or
third-party Google access is enabled by this installation.

## Commands

Run from the website repository after the root frozen-lockfile install:

| Command | Use |
| --- | --- |
| `pnpm tools:status` | Read installed-tool and local-service status |
| `pnpm audit:install` | Install the separately locked audit dependencies |
| `pnpm audit:all` | Inventory real sitemap pages and check public first-party links |
| `pnpm audit:kit` | Run the vendored kit's HTML inventory on the public pages |
| `pnpm audit:links` | Run the bounded link audit |
| `pnpm audit:test` | Verify parsing, URL scope and disabled legacy transport |
| `pnpm studio:seo` | Start local OpenSEO at `http://127.0.0.1:3903/` |
| `pnpm studio:images` | Start OpenHiggsfield locally; activation is on standby |
| `pnpm studio:voice` | Start the CPU VoiceStudio backend at port 3900 |
| `pnpm voice -- --json status` | Use the installed VoiceStudio client |

The private application checkouts live outside this website repository. Set
`BRAINILAB_TOOLKIT_HOME` to their installation directory; by default the launcher
uses the repository's parent. `tools/web-audit/sources.json` records the inspected
upstream commits and directory names. VoiceStudio's client is installed in
`voice-env`, its CPU backend in `upstream-voice/.venv`. Point
`BRAINILAB_PYTHON` to a Python 3.11+ executable for the kit adapter.

Reports go to the private `audit-results` sibling directory with a fresh UTC
timestamp. The website build must not copy tools, source snapshots, local
application databases, voices, API settings or reports into `dist`.

## What is installed

- Modern Web Guidance remains pinned in the website's development dependencies.
- Eight namespaced Ryze skills live in `.agents/skills/ryze-*`. Each keeps its
  original MIT workflow, licence and source hash, with a project adaptation.
  They use actual available read-only tools. GA4 referrals are visits, not
  automatic proof of AI citations; regional search data is not global demand.
- The complete unmodified Kit Audit Web source is retained under
  `tools/vendor/kit-audit-web`, including EUPL-1.2, NOTICE and third-party notices.
  Its `inventaire.AnalyseurPage` runs through a Windows-compatible offline
  adapter after the bounded downloader captures public HTML. Linux shell,
  Docker, external PageSpeed and browser-audit commands are optional upstream
  capabilities, not silently installed or claimed as completed tests.
- Broken Link Checker 0.7.8 is the published version; upstream main identifies
  an unpublished 0.8.0. The separate audit lockfile pins the chosen version and
  compatible dependency fixes. Its old HTTP/robots transports are disabled;
  its actual HTML parser supplies link targets and current Node fetch performs
  bounded same-origin reads. Some deprecated transitive modules remain; do not
  expose this package as a public service or enable its legacy network paths.
- OpenSEO is installed separately, with its required pnpm 10.30.1 and a local
  database. The already connected Growth project can provide real reports
  without copying its credentials to the local app. The local app's fresh
  database is independent of the hosted workspace. Paid providers and OAuth
  connections need their own configuration; installation does not create them.
- OpenHiggsfield is installed separately and has been opened successfully.
  The user paused its activation. No image-generation key is configured by
  these scripts. Do not distribute its code with the public site: the inspected
  checkout has no licence file. Keep its upload endpoint local and protected
  before considering any public deployment.
- VoiceStudio's official client and locked CPU dependencies are installed in
  private environments. Its backend runs on loopback with separate data/cache
  folders and no model preloads. Voice weights and their terms are separate
  from the AGPL app. Do not auto-accept model notices, clone a person's voice,
  or activate the default non-commercial OmniVoice weights for BrainiLab.

## Using results

The local audit checks all eligible URLs from the actual sitemap, respects
robots.txt, skips private/action paths and query-driven pages, limits response
sizes and redirects, and checks only first-party targets. Blocked, rate-limited
or failed reads remain unverified, not invented successful checks. No account,
game, publication or player-progress writes occur.

Review findings against the visible page before editing. Title-length warnings
are suggestions, not Google requirements. These tools do not guarantee Google
indexing or full accessibility. Preserve original publication dates and the
existing request ledger, publisher checks and preview/production release gates.

Run the Ryze workflows with the available OpenSEO/GA4/GSC tools for a real task:
matched traffic periods, demonstrated demand, existing coverage, relevant
internal links and primary sources. The remote Ryze connector is not connected
by copying its skills. No scheduled tracking, paid batches or outreach is
enabled automatically.
