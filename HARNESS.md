# HARNESS.md — Harness Engineering for this project

A harness is not one file. It is a *structure* around the AI agent (and around
you) that makes bad output hard to produce, instead of hoping good output
appears. CLAUDE.md alone is a polite request; a harness adds enforcement,
verification, and memory.

This document maps the five harness elements onto this project, records what
already exists, and gives you the growth path. Practice by extending it —
one element at a time, only when you feel the pain that element solves.

---

## The five elements, applied here

### 1. Rules — `.claude/rules/`

Declarative constraints the agent must follow. Ours were born from real
incidents, which is exactly how rules should be written:

| Rule file | Core invariant | Born from |
|---|---|---|
| `rules/architecture.md` | Gemini must NEVER block the quiz; the app works fully offline | The rate-limit incident that broke question loading |
| `rules/data.md` | Question/card schema invariants (3 distractors, `[[target]]` markup, hiragana readings, no duplicates) | Hand-writing 112 bank entries |

A rule that never prevented a real mistake is decoration. When you add a rule,
write *why* next to it.

### 2. Skills — `.claude/skills/<name>/SKILL.md`

Standardized procedures, so "add a question" is done the same way every time
instead of however the agent (or you) improvises that day:

- `skills/add-bank-question/SKILL.md` — how to add curated questions safely
- `skills/release-check/SKILL.md` — pre-commit checklist for any change

Add a new skill when you notice you've explained the same procedure twice.

### 3. Hooks — *deliberately not installed yet*

Hooks are event-driven enforcement (e.g. "run the validator after every file
edit"). This project is small enough that a manually-run feedback loop is
sufficient. Install hooks when you catch yourself *forgetting* to run
`npm test` — that pain is the trigger. When it comes, the shape is:

```json
// .claude/settings.json (Claude Code)
{ "hooks": { "PostToolUse": [ { "matcher": "Edit|Write",
    "hooks": [{ "type": "command", "command": "npm test" }] } ] } }
```

### 4. Memory — `memory/progress.md`

Session-persistent context: current state, decision log, next steps.
Without it, every new session re-litigates old decisions (why local-first?
why these SRS intervals?). CLAUDE.md instructs agents to read it at session
start and update it at session end.

Rule of thumb: decisions go in *append-only*; if a decision is reversed,
add a new entry rather than editing history.

### 5. Feedback loop — `scripts/validate.js` (`npm test`)

Automated verification, ordered fastest-first:

| Layer | What it catches | Command |
|---|---|---|
| Data structure test | Schema violations in bank.json / custom.json / ai-cache.json | `npm test` |
| Server smoke test | Server won't boot, /api/bank broken, custom-card endpoints broken | `npm test` (included) |
| Syntax check | JS parse errors | `node --check server.js` (included) |

This is the project's equivalent of `architecture.test.ts` in the GMO
example: it encodes the invariants machines can check, so humans stop
reviewing for them.

---

## The escalation ladder (when to strengthen a rule)

Use the 3-strikes rule from the article:

1. **L1 — Documented**: the rule exists in `.claude/rules/`. *(first violation)*
2. **L2 — AI-verified**: CLAUDE.md tells the agent to self-check against the rule before finishing. *(same violation 3×)*
3. **L3 — Tool-verified**: add a check to `scripts/validate.js` so `npm test` fails on violation. *(violations slip past L2)*
4. **L4 — Hook-enforced**: the check runs automatically on every edit. *(business-critical invariant)*

Example already at L3: "distractors must be exactly 3 and never contain the
correct reading" — documented in `rules/data.md` AND enforced by `npm test`.

## Current layout

```
kanji_anki/
├── CLAUDE.md                    # entry point; points agents at everything below
├── HARNESS.md                   # this file — the map
├── .claude/
│   ├── rules/
│   │   ├── architecture.md      # [Rules] behavioral constraints
│   │   └── data.md              # [Rules] data invariants
│   └── skills/
│       ├── add-bank-question/SKILL.md    # [Skills]
│       └── release-check/SKILL.md        # [Skills]
├── memory/
│   └── progress.md              # [Memory] state + decision log
└── scripts/
    └── validate.js              # [Feedback] npm test
```

## Practice plan (your dojo curriculum)

1. **Week 1 — feel the loop.** Before and after every change, run `npm test`.
   Try breaking an invariant on purpose (delete a distractor in bank.json)
   and watch the harness catch it.
2. **Week 1-2 — use memory.** Start each AI session with "read memory/progress.md
   first". End each session by asking the agent to update it. Notice how much
   less re-explaining you do.
3. **Week 2-3 — write one skill yourself.** Candidate: `import-anki-deck`
   (procedure for turning an exported Anki .txt back into custom cards).
4. **Week 3-4 — escalate one rule.** Find a rule violation that happened twice,
   then move that rule from L1 to L3 by adding a check to `scripts/validate.js`.
5. **Later — hooks.** When you forget to run `npm test` for the third time,
   you've earned the hook. Install it, feel the difference.

## Maintenance duties (harnesses rot)

- When behavior and rules disagree, fix one of them the same day.
- Every ~90 days, reread `.claude/rules/` and delete rules that no longer
  correspond to reality (stale rules teach agents to ignore all rules).
- Keep `npm test` under ~10 seconds; a slow feedback loop stops being used.
