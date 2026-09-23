# Question review health v2

The question-bank Health cell uses `question-health.js`, computed from the existing
admin-only `admin_question_quality_overview` verified-answer counts. It does not
change SQL, RLS, admin membership, question content or player scores. Other game
and pool health metrics retain their existing formula.

## Why the question formula changes

The production `admin_content_health_overview` was inspected read-only on
2026-09-23. It combines 45% inverse exit rate, 35% distance from 65% accuracy, and
20% average attempts. It can show an optimistic numeric score for tiny samples,
does not account for question difficulty, and returns skip rate without using it.
Sparse checkpoints can attribute an exit to a previous question; outcomes are
submitted on completion, so the outcome sample also excludes unfinished runs.

The new cell instead shows no number until 30 non-skipped verified answers exist.
Null/missing counts are unavailable, never zero. Accuracy excludes skipped answers.
It uses provisional easy 54–96%, medium 34–86%, and hard 14–76% screening bands,
adapted from the existing question-quality thresholds. A 1.96-z Wilson screening
range must lie wholly outside the band before an accuracy warning appears.
This is a heuristic stability guard, not a validated confidence guarantee: repeated
answers are not independent, and this RPC does not expose unique players.

The score starts at 100. A low-accuracy signal costs 30–55 points depending on
distance below the band; high accuracy costs 20. A skip-rate screening lower bound
above 20% costs 30. Two rarely chosen distractors cost 15 only with at least 50
answered attempts and 20 incorrect answers. The result is clamped to 0–100.
Penalties of 45+ show “Review first”; smaller penalties show “Review suggested”.
100 means “No strong signal”, not “verified correct”. All signals include review
actions; none automatically disables a question or changes its difficulty.

The cell explicitly separates all-time verified answers from 30-day estimated
exits. Exits remain context and do not affect the score. Unscored rows sort last.
The previous Quality badge is removed from the question table to avoid conflicting
verdicts; the separate legacy quality dashboard is unchanged.

## Verification and limits

`node tools/test-question-health.mjs` covers missing data, small samples, easy/hard
questions, extreme errors, skips, distractors, exit isolation and accessible output.
Live aggregate reads found only 3 players across 16 question-content sessions in
the preceding 30 days. These data cannot validate or calibrate the new thresholds.
The signed-in BrainiLab browser account is not an active admin, so the real admin
table cannot be exercised in that session. A local fixture demonstrates the same
renderer using clearly labelled synthetic counts.

Next: build a versioned admin RPC with one first answer per player/question/version,
a consistent time window, verified option distributions, difficulty/topic baselines,
and better checkpoint coverage. Compare candidate warnings with editorial review
before changing production SQL. No privilege grants are needed for this patch.
