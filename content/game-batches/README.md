# Reviewed game content batches

These files record original, reviewed puzzle content for the existing game pools. They are not article drafts or schema migrations. Each batch keeps its date, sources, answer explanations and calculation evidence. Sources support the mathematical methods; do not claim that they supplied the exact original puzzles.

The 14 October 2026 batch contains eighteen Sequence puzzles and twelve Number Route puzzles. The matching CSV files in `admin/content-batches` follow the existing Admin templates. Never import a CSV merely because its columns parse: check duplicate content, every answer, the public wording and current game rules first.

Number Route deliberately evaluates operations from left to right, equivalent to nested parentheses. Integer division must be exact and intermediate results must stay within the server's limit. Every published Number Route record must have exactly one valid operator route. Sequence puzzles describe their intended pattern in the answer explanation; a finite list does not mathematically prove that only one possible continuation exists.

Publication must preserve old IDs, saved results and scheduled Daily content. Use unique external keys, an atomic data transaction, checks against concurrent changes and an exact readback. Record the publication outcome outside the public game interface. Repeat imports should verify matching existing rows and add nothing.
