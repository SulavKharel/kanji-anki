# Progress & decision memory

Agents: read this at session start; update it at session end.
Decision log is append-only — reversals get a new entry, never an edit.

## Current state (2026-09-07)

- Implemented 2026-09-07: **JLPT level support N5→N1.** `data/bank.json` grew
  from 112 (all N1) to 313 items, each now carrying a `level` field; N5/N4/N3/N2
  each seeded with ~50 curated questions (N5 51, N4/N3/N2 50, N1 112). A level
  selector in the header (`n1kq_level_v1`, default N5) scopes the whole quiz:
  `pickQuizKanji()`, mastery panel, pool footer, Anki deck name, custom cards
  and AI top-up all filter to the active level via a `kanjiLevel` map. AI
  top-up prompt is now parameterised by level (frontend + server). Validator
  enforces per-level uniqueness and a valid `level`. `npm test` green (313
  bank items valid; offline smoke test 391 questions). Verified in-browser:
  level switch reloads on-level questions, answer/feedback flow intact.
- Watch: legacy items without a `level` (old ai-cache.json entries, the 2
  data/custom.json cards, any pre-existing localStorage stats/cards) are
  treated as N1 — expected, but means old AI cache only ever surfaces under N1.

## Previous state (2026-08-05)

- Implemented 2026-08-05: optional AI top-up now works on the public static
  build — a Gemini key pasted into the settings panel is stored per-browser and
  drives `browserTopup()`; local dev can use a gitignored `.env` instead of
  PowerShell exports.

## Previous state (2026-08-02)

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

- 2026-08-05: The owner's Gemini key will NOT be embedded in the app. The
  deployment is static (GitHub Pages), so any bundled key is readable by every
  visitor and its quota is spendable by them. Rejected alternative: a
  serverless proxy holding the key — deferred, since it reintroduces a server,
  a bill, and an abuse surface for an optional enhancer. Revisit only if
  shared AI questions become a core feature.
- 2026-08-05: AI top-up now also runs client-side (`browserTopup()` in
  index.html), keyed by a per-browser key in `n1kq_gemini_key_v1`, caching to
  `n1kq_aicache_v1` (cap 500, 10-min throttle, same prompt/validation as the
  server). (Why: on the static build there is no server, so the server-side
  top-up only ever benefited local dev. R1 still holds — the call is
  fire-and-forget and the quiz never awaits it.)
- 2026-08-05: server.js reads a gitignored `.env` via a ~10-line inline parser
  rather than adding `dotenv`. Real env vars take precedence and
  `KANJI_NO_ENV_FILE=1` bypasses it, which validate.js now sets so the R1
  smoke test stays genuinely keyless. (Why: removes the PowerShell step
  without a new dependency — R5.)

- 2026-09-07: Added a `level` field to the question schema rather than splitting
  into per-level files (`bank-n5.json` …). (Why: keeps R5's "two files + data"
  and R3's single hand-editable curated bank; uniqueness moved to per-level so
  the merged file stays valid. Cost: one large bank.json.)
- 2026-09-07: Quiz is single-level at a time, selected in-header and persisted
  in `n1kq_stats`-style key `n1kq_level_v1` (default N5). Stats stay keyed by
  kanji globally (words don't collide across the curated levels), but every
  *display/selection* path filters by the active level. (Why: matches the
  request — pick N5–N1, difficulty follows the level; N1 hardest.)
- 2026-09-07: "Questions keep increasing as you get things wrong" is delivered
  by the existing adaptive machinery, now level-scoped: wrong answers reset the
  SRS streak + mark due-now, missed kanji repeat in-session, and the optional
  AI top-up generates more on-level questions prioritising weak kanji. No new
  storage mechanism was added. (Why: reuse R1-safe fire-and-forget top-up
  instead of a bespoke generator.)

## Known issues / watch list

- 2026-08-05: model names are DISCOVERED at runtime (`discoverModels()` calls
  ListModels, filters to generateContent + flash tiers, caches for a week in
  `n1kq_models_v1` and drops the cache whenever every model fails). The static
  list is fallback only and leads with `gemini-flash-latest`. (Why: the
  hard-coded 1.5/2.0/2.5 list was entirely shut down by Google within weeks;
  a fixed list is a slow-motion outage. Also: only the *last* model's error
  was surfaced, which made a 5-model failure look like a 1.5 problem — the
  loop now reports all of them.)
- 2026-08-05: generation now uses `responseMimeType: application/json` +
  `responseSchema` (QUESTION_SCHEMA, mirrored in server.js and index.html)
  instead of trusting the prompt's "return only JSON" instruction, which
  produced unparseable batches. A 400 falls back to plain text once, since not
  every model accepts a schema. `parseQuestions()` additionally salvages
  individual balanced `{...}` blocks when the whole reply won't parse, so one
  malformed item costs one question rather than the batch. The old
  `endsWith("]")` truncation guard is gone — salvage supersedes it.
- 2026-08-05: dropped `temperature` from generationConfig (deprecated by
  Google) and raised maxOutputTokens 4000 → 8192; response text is now joined
  from all non-thought parts. (Why: reasoning models spend budget before
  answering and can return a thought part first, yielding empty output.)
- 2026-08-05: the in-app key field must NOT prefix-match on `AIza` — Google
  also issues keys starting `AQ.`, and the first version of the panel rejected
  a valid one. Validation is now length/whitespace only; the API decides.
- 2026-08-05: `npm test` was NOT run in the session that added the in-app key
  panel (no shell available) — run it before pushing. Also unverified live:
  the browser → Gemini call (CORS/quota behaviour from a Pages origin).
- README "Free tier limits" claims may be stale — verify against current
  Google pricing page before quoting numbers.
- data/ai-cache.json quality depends on validQuestion(); D3 content quality
  is NOT machine-checked (L1 only).

## Next session candidates

- Run the escalation-ladder exercise from HARNESS.md practice plan.
- Anki .txt import → custom cards skill.
