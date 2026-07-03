# Data rules

## D1. Bank question schema (L3 — enforced by `npm test`)
Every item in `data/bank.json` and `data/ai-cache.json` must have:
- `kanji`: non-empty string, unique within bank.json
- `sentence`: contains `[[target]]` markup exactly once
- `reading`: hiragana only (ー allowed)
- `meaning`: non-empty string
- `type`: `"on"` or `"kun"`
- `hint`: non-empty string
- `compounds`: array of 2-3 strings
- `distractors`: exactly 3 strings, none equal to `reading`, no duplicates

## D2. Custom card schema (L3 — enforced by `npm test`)
Items in `data/custom.json`: `kanji` + `reading` (hiragana) required,
`sentence` must contain `[[...]]`, `custom: true` flag required.
`meaning` may be empty. No `distractors` — they are auto-generated client-side.

## D3. Content quality (L1 — human/AI review only)
- Sentences: natural Japanese, N1 level, ideally under 25 characters.
- Distractors: plausible misreadings (wrong vowel length, voicing, on/kun
  confusion) — never random syllables.
- Hints: explain the reading pattern, not the meaning.

## D4. Never edit `ai-cache.json` by hand (L1)
It is machine-managed and safe to delete entirely. Fix generation problems in
`validQuestion()` in server.js instead.

## D5. localStorage keys are versioned (L1)
Stats live in `n1kq_stats_v1`. If the stats schema changes incompatibly,
bump to `_v2` and migrate — never silently reinterpret old data.
