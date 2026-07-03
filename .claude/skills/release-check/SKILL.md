# Skill: release-check

Run before declaring any change finished (agent or human).

## Procedure

1. `npm test` — all harness checks must pass (data invariants, syntax,
   offline smoke test).
2. Manual smoke (30 seconds): `npm start` (no API key needed), open
   http://localhost:3000, answer one question, confirm feedback renders.
3. If server.js changed: confirm the console shows the offline-friendly
   startup message and no unhandled rejections.
4. If index.html changed: hard-refresh (Ctrl+F5) before judging behavior —
   the SPA caches aggressively.
5. If any rule in .claude/rules/ was violated during the work: record it in
   memory/progress.md under "Known issues", and if it's the 3rd occurrence,
   escalate the rule one level (see HARNESS.md ladder).
6. Update memory/progress.md: current state + any decisions made.

## Done means

npm test green + manual smoke passed + memory updated. All three, or it
isn't done.
