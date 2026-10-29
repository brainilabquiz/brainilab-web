# Cryptic

One standalone English cryptic clue each UTC day. The server chooses the clue;
device time, location, account and browser do not choose a different answer.
Four independent hints identify the indicator, fodder and definition, or reveal
one random unrevealed position. Wrong guesses leave the clue open. Explicitly
revealing the answer finishes as **revealed**, not **solved**. Both show the parse.

## Editorial contract

- Common dictionary words, with BrainiLab clue wording. No copied commercial clue
  bank, images or video explanations. The new illustration is an original SVG.
- Initial bank: 28 words; anagrams, hidden words and reversals. Each has an actual
  indicator, fodder and definition. Double definitions and pure charades are not
  forced into this format because their anatomy can differ.
- Definition at the start or end in this bank. Whole-clue exceptions are outside
  this beginner format. Reversals use “back” or “returning”, avoiding across/down
  directional conventions without a grid.
- All fodder letters must agree mechanically with the answer; hidden answers are
  consecutive letters, allowing word boundaries. No overlapping hint spans.
- The first season starts 29 October 2026 and cycles in its fixed 28-clue order.
  Add a **new dated season** before recycling becomes repetitive. Never insert
  or reorder an existing season: that would change answers for existing dates.
  Future seasons must have unique ascending start dates and reviewed clues.

Rules checked against [Minute Cryptic’s guide](https://www.minutecryptic.com/guide)
and [The Guardian’s beginner guide](https://www.theguardian.com/lifeandstyle/2010/may/03/how-to-solve-cryptic-crossword).
The definitions are ordinary dictionary senses, not copied dictionary text.
Semantic spot checks: [note](https://dictionary.cambridge.org/us/dictionary/english/note),
[alert](https://www.collinsdictionary.com/us/dictionary/english/alert), and
[stale](https://www.dictionary.com/browse/stale). Checked 29 October 2026.

## Boundaries and reliability

`lib/cryptic-bank.js` is private Worker source. GET `/api/cryptic` exposes only
today’s clue, enumeration, opaque daily ID, UTC date and expiry/server time.
POST checks the current ID/date, caps JSON at 2 KiB, rejects foreign origins and
returns a solution only after a correct answer or explicit reveal. Future-date
queries are rejected. This is a leisure puzzle, not an anti-cheating competition.
The server needs no upstream provider, secret, D1/KV/DO or Supabase query.

Browser storage holds one current clue, answers, revealed letters and hint use.
It is not account synchronisation. The interface states “saved in this browser”;
storage failure does not block playing. No personal data is collected by this
feature. Sharing contains no answer and falls back to selectable text.
The existing main Daily, XP, ranking and streak contracts are unchanged; the help
panel makes that distinction explicit. Do not submit this game to an unsupported
existing scoring RPC.

The server rejects submissions across UTC midnight with 409/new-day; the client
loads the new clue instead of counting the old answer as wrong. A server-time
expiry timer and a return-to-tab check handle sleeping devices and clock skew.
Network failure preserves saved state and offers a retry.

## Checks

`node tools/test-cryptic.mjs` is part of `node tools/build.mjs`. It checks all 28
letter transformations, clue annotations, unique answers, UTC boundaries, private
GET output, input limits, independent hints, random-letter exclusions, concurrent
taps, persistence, wrong/correct/revealed states, sharing, blocked storage and
midnight recovery. Follow with the production build and browser checks at 320,
390, 768 and 1440 CSS pixels, including keyboard/paste, retry and terminal states.
