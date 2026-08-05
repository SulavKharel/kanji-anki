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

Get a free key at https://aistudio.google.com/apikey. There are two ways to use
it — no PowerShell required either way.

**In the app (works on the deployed site and on your phone).**
Open **＋ カード追加・設定 / Cards & settings** and paste the key into the
*AI question top-up* box. It is saved in that browser's `localStorage`
(`n1kq_gemini_key_v1`) and used to generate new sentences in the background —
at most one call per 10 minutes, capped at 500 stored questions
(`n1kq_aicache_v1`). **Remove key & AI questions** clears both.

**Locally via `.env`.** Copy `.env.example` to `.env` and put the key there:

```
GEMINI_API_KEY=AIza...
```

`server.js` reads it at startup (`.env` is gitignored, and a real environment
variable still wins). Generated questions land in `data/ai-cache.json`.

Either way, rate limits never block the quiz — if Gemini is unavailable, the
local bank keeps serving.

#### Why the key isn't shipped with the app

The deployed drill is a static site: anything it can read, a visitor can read
too. A key baked into the build would be scraped from the page source and spend
the owner's quota, so each person supplies their own — or nobody does, and the
built-in bank runs exactly as before. (Sharing one key would need a server-side
proxy holding the secret, which the static deployment deliberately doesn't have.)

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
(wrong answers bring them back sooner) and are saved in your browser
(`localStorage`, key `n1kq_custom_v1`) alongside your learning stats. On first
run the browser seeds itself from `data/custom.json`, so cards committed to the
repo become your starting set.

## Deploying (use it on your phone)

The quiz needs no server at runtime — selection, stats and custom cards all run
in the browser — so it deploys as a static site.

Pushing to `master` triggers `.github/workflows/deploy.yml`, which runs
`npm test` and then publishes `public/` plus `data/bank.json` to GitHub Pages.
Enable it once at **Settings → Pages → Source: GitHub Actions**.

The deployed site is a PWA: open it on your phone and use *Add to Home Screen*
to install it. After the first visit it works with no signal — a service worker
caches the app shell and the question bank.

Note that your learning history is per-device, since it lives in `localStorage`.
Studying on your phone and your laptop keeps two independent schedules.

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
