# Architecture rules

## R1. The quiz must work fully offline (L1 + L3)
Gemini (or any external API) is an optional background enhancer, never a
dependency. No request path that serves the quiz may await an external API.
- Enforced by: `npm test` boots the server with no GEMINI_API_KEY and asserts
  `/api/bank` returns questions.
- Why: 2026-07-03 incident — the original design blocked question loading on
  Gemini and free-tier rate limits made the app unusable.

## R2. External API failures are logged and swallowed, never surfaced as errors (L1)
`backgroundTopup()` failures must not change any HTTP response. Log with a
`[ai top-up]` prefix and continue.

## R3. All persistent state lives in `data/` as human-readable JSON (L1)
`bank.json` (curated, hand-edited), `custom.json` (user cards, server-managed),
`ai-cache.json` (machine-managed, safe to delete). Never introduce a database
or binary format without a decision-log entry in `memory/progress.md`.

## R4. The frontend owns question selection; the server owns question storage (L1)
Adaptive logic (SRS, weak-kanji priority) runs in the browser against the full
merged pool from `/api/bank`. Don't move selection server-side — learning
stats live in localStorage and must stay usable offline.

## R5. Keep it two files + data (L1)
`server.js` and `public/index.html` (self-contained SPA). Resist adding build
steps, frameworks, or file splits until the SPA passes ~1500 lines.

## Session protocol
- At session start: read `memory/progress.md`.
- Before finishing any task: run `npm test`; do not report a task complete
  with a failing validator.
- At session end: update `memory/progress.md` (state + any new decisions).
