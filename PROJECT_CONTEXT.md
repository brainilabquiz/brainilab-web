# BrainiLab: current working context

Read this first; load the specialist notes below only when the task needs them.

- Live: https://brainilabgames.com. Repository: brainilabquiz/brainilab-web. Cloudflare deploys main; branches create previews.
- Product: a light homepage, clear primary action, useful article → related game → result → return → optional Plus. Avoid repeated panels and extra clicks.
- Stack: static HTML/CSS and JavaScript, Supabase for accounts/content/results. Existing admin RPCs enforce permissions. Do not infer admin rights from a successful login.
- Build: `npm run build` generates editorial pages, rebuilds bundles, then creates a clean `dist/` containing public files with minified JS/CSS. Wrangler serves `dist/`. Add new source files to Git before building. Keep draft article JSON, SQL, tools, notes and source maps out of the deployed directory.
- Sources: edit JS modules then rebuild their bundles; do not hand-edit concatenated bundles. Generated Learn HTML comes from `content/articles/`.
- Home: a neutral loading card while Daily/progress resolve; returning visitors get a compact completed-state card in the same layout. Full result view appears only after explicit play. Do not auto-start the timer.
- Plus: €2.99/month or €24.99/year; supporter value while ads are disabled. Preserve current billing and entitlement logic.
- Health: question review heuristic, at least 30 non-skipped answers, difficulty-aware bands. Counts are attempts, not unique players; estimated exits do not lower the score. Game/pool legacy health is separate.
- Pending: real privileged admin save needs an active admin browser session. Read-only database checks and local fixture tests are not an end-to-end authenticated save. Supabase advisor findings need their own reviewed changes.

## Load only when relevant

| Need | Reference |
|---|---|
| Publish/edit articles | EDITORIAL_WORKFLOW.md |
| Health scoring and limitations | QUESTION_HEALTH_V2.md |
| Admin operations | ADMIN_OPERATIONS.md, CONTENT_IMPORT_SCHEMA.md |
| Backend contracts | DATA_ARCHITECTURE.md and the specific SUPABASE setup note |
| Current validation | tools/test-home-entry.mjs, tools/test-question-health.mjs, tools/test-admin-question-form.mjs, tools/check-editorial.py, tools/check-build.py |
| Historical migrations and QA | BRAINILAB_STEP*, SUPABASE_STEP*, UX_QA*; read only for the relevant feature, not as a current release checklist |

Historical SQL is retained because it explains the live database. Obsolete generated QA result snapshots and the unreferenced retired Daily runner were removed; recover them through Git history if needed.
