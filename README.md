# 漢字 N1 ドリル

Adaptive N1 kanji quiz with spaced repetition and Anki export.
Works fully offline from a built-in question bank — **no API key required**.
An optional Gemini key adds fresh AI-generated sentences in the background.

## Setup

### Requirements
- Node.js (v16+)

### Steps

1. **Install dependencies**
   ```
   npm install
   ```

2. **Start the server**
   ```
   npm start
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

### Optional: AI question top-up

Get a free key at https://aistudio.google.com/apikey, then set it before starting:

PowerShell:
```powershell
$env:GEMINI_API_KEY="AIza..."
```

Mac/Linux:
```bash
export GEMINI_API_KEY=AIza...
```

The server quietly generates new sentence variants in the background (at most
one API call per 10 minutes) and saves them to `data/ai-cache.json`, so the
question pool grows over time. Rate limits never block the quiz — if Gemini is
unavailable, the local bank keeps serving.

## How the adaptive engine works

- Every answer is recorded per kanji in your browser (`localStorage`), across sessions.
- Wrong answers make a kanji "due" immediately; correct answers push it out on
  a spaced-repetition schedule (1 → 3 → 7 → 14 → 30 → 60 days per streak).
- Each quiz is built as: weak/due kanji first, then unseen kanji, then reviews.
- Kanji missed during a quiz are re-tested at the end with a different sentence.
- The results screen shows studied/mastered/weak counts and your focus list.

## Custom cards

Click **＋ カード追加 / My cards** under the title to add your own kanji.
Kanji and reading (hiragana) are required; example sentence and meaning are
optional. Custom cards join the adaptive rotation like any other question
(wrong answers bring them back sooner) and are saved in `data/custom.json`.

## Features
- 112 curated N1 questions built in (readings, hints, compounds, distractors)
- Add your own cards — they enter the same spaced-repetition rotation
- Adapts to your mistakes — weak kanji come back until you master them
- Questions appear in real sentence context (not isolated kanji)
- Missed kanji export as Anki flashcards (.txt, tab-separated)

## Anki Import
1. Download the `.txt` file from the results screen
2. Open Anki → File → Import
3. Select the file, confirm separator is Tab, deck is "N1 漢字"
