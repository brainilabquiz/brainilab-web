# Modern Web Guidance in BrainiLab

The official GoogleChrome development guidance is installed as the exact
development dependency `modern-web-guidance@1.0.1`. It is used during coding
and review and adds no script or network collector to the public website.
The project skill is available to coding agents on their next task.

```sh
pnpm install --frozen-lockfile
pnpm web:guidance search "accessible keyboard navigation"
pnpm web:guidance retrieve accessibility
pnpm web:scan
```

Use a short, single-capability English search, retrieve the relevant guide,
then check the implementation and its browser fallback requirements. The
CLI's search and scan operate locally; no API key or account is required.
Do not turn on experimental or volatile features for an ordinary review.

`web:scan` is a candidate finder covering a subset of the guide catalogue.
It is not a whole-site validator, a performance score or an accessibility
certification. Check each result against its keep/drop rubric, particularly
JSON wire normalisation, DOM replacement semantics, compatibility fallbacks,
test-only deferred promises and handlers that already exclude text inputs.
An accepted fallback can remain in the scan output.

For a broad review, combine it with bounded anonymous reads of real sitemap
URLs, response and resource checks, and native browser checks of shared page
types at desktop and mobile widths. Exercise relevant keyboard and form
interactions with fixtures instead of changing real accounts or game results.
Measure performance with comparable traces or lab runs before claiming an
improvement. Missing field data and untested assistive technologies remain
unknown. Keep evidence and detailed observations in the private work folder.

The existing build publishes only its allowlisted web assets and HTML. Keep
this development dependency, the skill, its licence and provenance, and audit
evidence out of public bundles. Use the normal full build and protected
preview/production release checks for any user-facing fix.

## Provenance and updates

- Source: https://github.com/GoogleChrome/modern-web-guidance
- Documentation: https://developer.chrome.com/docs/modern-web-guidance
- Licence: Apache-2.0, retained beside the project skill.
- The skill keeps the upstream review workflow, with commands adjusted to use
  this project's pinned CLI through `pnpm exec` instead of an unpinned runner.

Update the development dependency and lockfile deliberately, review upstream
changes, and refresh the project skill together. Do not silently replace a
reviewed version during a production build.
