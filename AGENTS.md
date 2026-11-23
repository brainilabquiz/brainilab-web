# BrainiLab web work

For HTML, CSS or client-side JavaScript changes, use the project-local
Modern Web Guidance skill in `.agents/skills/modern-web-guidance/SKILL.md`.
The CLI is pinned in `devDependencies` and the lockfile. Run it with
`pnpm web:guidance search "focused capability"`, then retrieve the matching
guides before changing that behaviour. See `docs/modern-web-guidance.md`.

Keep browser compatibility fallbacks when required. Prefer Baseline Widely
available features; introduce newer features only with feature detection and
graceful fallback. Do not enable Origin Trials or volatile APIs by default.

Treat scan results as candidates, not demonstrated bugs. Read their rubric,
inspect the actual flow, and verify the smallest useful change. Preserve
working JSON-normalisation contracts, test fixtures and cross-file helpers.
Do not rewrite game logic or tests to make the scan counter reach zero.

Preserve saved avatars, unlocks, scores, progress, authentication, consent,
publication guards and concurrent changes. For article work, also follow
`content/AGENTS.md` and `content/PUBLIC_COPY.md`.

Use the established build, preview and protected production release process.
Keep private audit captures and reports outside public source directories.
Describe the actual scope and limits of native, automated and field checks;
none alone establishes full accessibility conformance or Google indexing.
