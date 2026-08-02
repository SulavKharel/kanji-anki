# Progress & decision memory

Agents: read this at session start; update it at session end.
Decision log is append-only — reversals get a new entry, never an edit.

## Current state (2026-08-02)

- Implemented: offline question bank (112 items), adaptive SRS engine
  (localStorage), in-session repeat of misses, Anki export, custom card
  manager (add/list/delete), Gemini background top-up with model fallback +
  10-minute timer, pool-status footer, harness (rules/skills/memory/validator).
- Implemented 2026-08-02: static deployment to GitHub Pages (PWA, installable
  on phone, offline via service worker). SPA now reads data/*.json directly
  instead of /api/bank; custom cards moved to localStorage.
- Working on: nothing in flight.
- Not started: import Anki deck as custom cards; per-kanji stats view;
  hooks (deliberately deferred — see HARNESS.md).
- Watch: PNG app icons not yet generated (only icon.svg) — iOS home-screen
  icon falls back to a page screenshot until a PNG apple-touch-icon exists.

## Decision log

- 2026-07-03: Local bank is the primary question source; Gemini is an optional
  background enhancer. (Why: free-tier rate limits made API-dependent question
  loading unusable — the original design broke.)
- 2026-07-03: Adaptive engine lives client-side in localStorage
  (`n1kq_stats_v1`), schema `{seen, wrong, streak, due, last}` per kanji.
  (Why: works offline, no accounts, no server state per user.)
- 2026-07-03: SRS intervals `[0,1,3,7,14,30,60]` days indexed by streak;
  wrong answer → streak 0 + due immediately. (Why: simple, tunable later.)
- 2026-07-03: Quiz composition: due/weak (≤60%) → unseen → least-recently-seen;
  QUIZ_SIZE 8. (Why: mistakes drive selection — core product goal.)
- 2026-07-03: Gemini top-up tries GEMINI_MODELS in order; each model has a
  separate free quota. Throttle 10 min, cache cap 500, disk-persisted in
  data/ai-cache.json. (Why: quota exhaustion on one model shouldn't stop
  generation.)
- 2026-07-03: Custom cards stored server-side in data/custom.json
  (kanji+reading required, hiragana-validated; sentence/meaning optional;
  distractors auto-generated client-side from similar-length readings).
  (Why: survive browser cache clears; minimal input burden.)
- 2026-07-03: Harness lives in harness/ (not .claude/) because this session
  could not write dot-prefixed protected paths. Rename to .claude/ is fine if
  desired; update CLAUDE.md references when doing so.
- 2026-07-03 (later): Renamed harness/ → .claude/ per user request (done via
  shell; file tools can't write dot-prefixed paths). All references in
  CLAUDE.md, HARNESS.md, skills, and validate.js updated.
- 2026-08-02: Deploy target is a static build on GitHub Pages, not a hosted
  Node server. (Why: R4 already put all selection and stats in the browser, so
  the server was only a file server. Static means free hosting, no cold start
  on mobile, and R1's offline guarantee becomes literal.)
- 2026-08-02: SPA loads `data/bank.json` + optional `data/ai-cache.json` via
  *relative* paths instead of `/api/bank`. server.js now also serves `/data`
  statically so local dev exercises the identical code path. `/api/bank`
  is retained for the R1 smoke test but is no longer used by the frontend.
  (Why: one code path for dev and prod; relative paths survive the
  `/kanji-anki/` Pages subpath with no build-time config.)
- 2026-08-02: REVERSES the 2026-07-03 custom-cards decision. Custom cards now
  live in localStorage under `n1kq_custom_v1`, seeded once from
  data/custom.json for migration. The POST/GET/DELETE `/api/custom` endpoints
  and data/custom.json remain but are no longer the source of truth.
  (Why: a static site has no writable server. Accepted cost: cards no longer
  survive a browser-storage clear — mitigated by the fact that stats never
  did either, and both are now clearable/exportable together.)
- 2026-08-02: PWA (manifest + service worker, stale-while-revalidate) added as
  two new files in public/, accepting a stretch of R5's "two files + data".
  (Why: browsers require manifest and service worker to be separate
  top-level files; they cannot be inlined into index.html.)
- 2026-08-02: The Pages workflow runs `npm test` before publishing.
  (Why: makes the harness validator a deploy gate, not just a local habit.)

## Known issues / watch list

- README "Free tier limits" claims may be stale — verify against current
  Google pricing page before quoting numbers.
- data/ai-cache.json quality depends on validQuestion(); D3 content quality
  is NOT machine-checked (L1 only).

## Next session candidates

- Run the escalation-ladder exercise from HARNESS.md practice plan.
- Anki .txt import → custom cards skill.
