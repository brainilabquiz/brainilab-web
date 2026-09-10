# Content quality release 41.11.0

- Added static worked guides to 17 game/quiz routes, plus topic hubs, games, Daily and the flag guide. No live Daily answers are exposed by the new guide sections.
- Replaced development copy in About, Privacy and Cookies, and added contact/corrections navigation. Controller identity and public email await the owner; the existing Suggestions service is the contact route in this release.
- AdSense ownership uses the correct meta tag and ads.txt. Removed unconditional advertising scripts from all HTML. Manual ads remain gated and unconfigured; functional pages are excluded in code.
- Recovered 72 Connections puzzles from shifted CSV fields. Retained 19 three-clue entries inactive, without deleting them. There are 94 active puzzles. Original rows and choices are in connections_repair_backup_v4111, with RLS and no anon/authenticated grants. Puzzle/choice IDs and player history are preserved. Historical incorrect scoring is not recalculated.
- CSV parsing now rejects column-count mismatches, duplicate headers and unclosed quotes. Connections imports require an explanation and distinct choices; server validation also rejects a clue equal to the correct answer.

## Validation
43 HTML pages, 74 JavaScript files, eight CSV/content assertions, seven ad route assertions and 18 existing Meta consent/event checks passed locally. Local-browser preview was blocked by the environment; production visual checks follow deployment.

## Database
step29_connections_import_repair.sql and step30_connections_import_validation.sql applied through Supabase SQL editor on 2026-09-10.

## References
- https://support.google.com/adsense/answer/7584263?hl=en
- https://support.google.com/adsense/answer/10015918?hl=en
- https://science.nasa.gov/sun/facts/
- https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en

Do not claim AdSense approval or complete legal compliance. Finish owner/contact information and review before requesting AdSense review.
