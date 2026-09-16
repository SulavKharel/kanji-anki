# Skill: add-bank-question

Add curated questions to `data/bank.json` the same way, every time.

## Procedure

1. Read `.claude/rules/data.md` (D1 schema, D3 content quality).
2. Check the kanji is not already in bank.json:
   `grep "\"kanji\":\"<kanji>\"" data/bank.json`
3. Verify the reading against a dictionary source — never guess. On/kun
   classification must match the reading actually used in the sentence.
4. Write the entry (one line, inline arrays, matching existing style):
   - level: `"N5"`…`"N1"`; the vocabulary/sentence must match that difficulty
   - sentence: natural, at the item's level, under ~25 chars, `[[target]]`
     exactly once. `kanji` must be unique *within its level*.
   - hint: explains the READING pattern (not the meaning)
   - compounds: 2-3, format `漢字 (romaji) — gloss`
   - distractors: 3 plausible misreadings (vowel length, voicing, on/kun
     confusion) — never random syllables, never the correct reading
   - do NOT hand-write `furigana` — the next step generates it.
5. Run `npm run furigana` to (re)generate the `furigana` field for the whole
   bank, then skim the new item's context readings (the target is forced
   correct; context words come from kuromoji — D3 human review).
6. Run `npm test`. Fix any failure before proceeding.
7. Update `memory/progress.md` if the addition reflects a new decision
   (e.g. new content category).

## Anti-patterns

- Adding a reading from memory without verification (wrong readings are
  worse than no card — the user will memorize the error).
- Distractors that are obviously wrong lengths (makes answers guessable).
- Editing data/ai-cache.json instead (D4: machine-managed).
