# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```powershell
# Install dependencies
npm install

# Run the dev server (GEMINI_API_KEY is OPTIONAL; read from .env if present)
npm start
# → http://localhost:3000

# Harness feedback loop — run before finishing ANY task
npm test
```

## Harness (read this first)

This project uses harness engineering (see `HARNESS.md` for the full map):

- **Session start**: read `memory/progress.md` (state + decision log).
- **Rules**: `.claude/rules/architecture.md` and `.claude/rules/data.md`
  are binding constraints, not suggestions.
- **Procedures**: adding bank questions → `.claude/skills/add-bank-question/SKILL.md`;
  finishing any change → `.claude/skills/release-check/SKILL.md`.
- **Before reporting done**: `npm test` must pass (validates data invariants,
  syntax, and the offline smoke test).
- **Session end**: update `memory/progress.md`.

## Architecture

The app works fully offline from a local question bank. Gemini is an optional
background enhancer, never a dependency — rate limits must never block the quiz.

**`data/bank.json`** — 313 curated questions spanning JLPT levels N5→N1 (N5
easiest, N1 hardest). Schema per item: `kanji`, `level` (`"N5"`…`"N1"`),
`sentence` (with `[[target]]` markup), `reading` (hiragana), `meaning`, `type`
(`"on"`/`"kun"`), `hint`, `compounds` (2-3 strings), `distractors` (exactly 3
wrong readings). Each level ships with ~50 seed questions (N1 has more, ~112);
`kanji` is unique *within a level*, so the same word may legitimately appear at
two levels.

**Levels.** The learner picks a level in the header (`n1kq_level_v1` in
localStorage, default `N5`). The quiz is scoped to that level: `pickQuizKanji()`,
the mastery panel, the pool footer, the Anki deck name, custom cards, and the
AI top-up all filter to it. `kanjiLevel` (a `Map<kanji, level>`) records each
word's level; items with no `level` (legacy bank entries, old AI cache, cards
made before levels existed) are treated as `N1`.

**`data/ai-cache.json`** — Gemini-generated question variants, persisted so the
pool grows over time. Created automatically; safe to delete.

**`data/custom.json`** — user-added cards (`kanji` + `reading` required,
`sentence`/`meaning` optional, optional `level` defaulting to `N1`, flagged
`custom: true`). New cards added in-app are stamped with the active level.
Managed via
`POST /api/custom`, `GET /api/custom`, `DELETE /api/custom/:kanji`. Custom
cards get auto-generated distractors client-side (`autoDistractors()` borrows
similar-length readings from the pool).

**`server.js`** — Express server (local dev only; production is static):
- Loads `.env` at startup with a dependency-free parser. Real env vars win;
  `KANJI_NO_ENV_FILE=1` disables it (the R1 smoke test sets this).
- `GET /api/bank` returns the merged bank + AI cache. The frontend does all
  question selection locally.
- `backgroundTopup()` — fire-and-forget Gemini call (throttled to one per
  10 min, capped at 500 cached items) that generates new sentence variants and
  appends valid ones (`validQuestion()`) to the cache. Tries each model in
  `GEMINI_MODELS` in order (separate free quotas per model). Failures are
  logged and ignored.

**`public/index.html`** — Self-contained SPA. Key logic:
- Adaptive engine: per-kanji stats in `localStorage` (`n1kq_stats_v1`):
  `{ seen, wrong, streak, due, last }`. `recordAnswer()` updates them;
  correct answers schedule the kanji out by `SRS_DAYS[streak]` days, wrong
  answers reset the streak and mark it due now.
- `pickQuizKanji()` builds each quiz *from the selected level only*: due/weak
  kanji (worst accuracy first), then unseen kanji, then least-recently-seen
  reviews. `QUIZ_SIZE = 8`. As the learner gets kanji wrong, they resurface
  (in-session repeats + immediate due-again scheduling) and the optional AI
  top-up generates more on-level questions prioritising the weak kanji, so the
  effective pool grows with mistakes.
- `questionFor(kanji, exclude)` picks a sentence variant not yet used this
  session (bank + AI cache may hold several per kanji).
- In-session repeat: missed kanji are re-asked at the end with a different
  variant (`handleNext()`), no network needed.
- Optional AI top-up, browser-side: a Gemini key pasted in the settings panel
  is stored in `localStorage` (`n1kq_gemini_key_v1`) and used by
  `browserTopup()` — a mirror of the server's `backgroundTopup()` (same
  prompt, model fallback, `validQuestion()` filter, 10-min throttle, 500-item
  cap) writing to `n1kq_aicache_v1`. Never awaited by the quiz path. No key is
  ever shipped in the build: the deployment is static, so a bundled key would
  be publicly readable.
- `showResults()` renders session score, all-time mastery panel
  (studied/mastered/weak), and Anki `.txt` export (tab-separated, Basic
  notetype, deck "N1 漢字").

The sentence format uses `[[double brackets]]` around the target word; the
frontend replaces these with a styled `<span class="hl">`.
