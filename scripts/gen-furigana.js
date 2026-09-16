#!/usr/bin/env node
// Authoring tool (NOT shipped — the static build is public/ + data/ only).
// Adds/refreshes the `furigana` field on every bank.json item using kuromoji
// (a devDependency) for the surrounding words. The target word's reading is
// forced to the item's known-correct `reading`, so only context words rely on
// the analyzer. Output uses aozora-style ruby: ｜base《reading》.
//
// Invariant guaranteed here (and re-checked by scripts/validate.js):
//   stripRuby(furigana) === sentence   (remove ｜ and 《…》 → original)
//
// Run: npm run furigana        (or: node scripts/gen-furigana.js data/bank.json)
// Requires the devDependency: npm install
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BANK = process.argv[2] || path.join(ROOT, "data", "bank.json");

let kuromoji;
try {
  kuromoji = require("kuromoji");
} catch {
  console.error("kuromoji is not installed. Run `npm install` (it is a devDependency).");
  process.exit(1);
}

const isKana = ch => /[ぁ-ゟァ-・ー]/.test(ch);
const kataToHira = s =>
  s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

// A few common words kuromoji reads in a technically-correct but less-common
// way; prefer the everyday reading for a learning tool.
const OVERRIDES = { "日本": "にほん" };

// Wrap one token (surface + hiragana reading) in ｜base《reading》, trimming
// kana already present on the edges (okurigana / prefixes) so ruby sits only
// over the kanji core. Returns the surface unchanged when there is no kanji or
// no usable reading.
function rubyToken(surface, reading) {
  if (!reading || !/[一-鿿々〆ヶ]/.test(surface)) return surface;
  let i = 0;
  while (i < surface.length && isKana(surface[i]) && surface[i] === reading[i]) i++;
  let j = 0;
  while (j < surface.length - i &&
         isKana(surface[surface.length - 1 - j]) &&
         surface[surface.length - 1 - j] === reading[reading.length - 1 - j]) j++;
  const lead = surface.slice(0, i);
  const trail = j ? surface.slice(surface.length - j) : "";
  const core = surface.slice(i, surface.length - j);
  const coreRead = reading.slice(i, reading.length - j);
  if (!core || !/[一-鿿々〆ヶ]/.test(core) || !coreRead) return surface;
  return `${lead}｜${core}《${coreRead}》${trail}`;
}

const stripRuby = s => s.replace(/｜/g, "").replace(/《[^》]*》/g, "");

function makeAnnotator(tokenizer) {
  // Annotate a plain segment; if the result fails to reduce back to the input,
  // fall back to the plain segment (preserves the invariant).
  return function annotate(text) {
    if (!text) return "";
    let out = "";
    try {
      for (const t of tokenizer.tokenize(text)) {
        const surf = t.surface_form;
        const read = OVERRIDES[surf] ||
          (t.reading && t.reading !== "*" ? kataToHira(t.reading) : null);
        out += rubyToken(surf, read);
      }
    } catch { return text; }
    return stripRuby(out) === text ? out : text;
  };
}

kuromoji.builder({ dicPath: path.join(ROOT, "node_modules/kuromoji/dict") })
  .build((err, tokenizer) => {
    if (err) { console.error(err); process.exit(1); }
    const annotate = makeAnnotator(tokenizer);
    const bank = JSON.parse(fs.readFileSync(BANK, "utf8"));

    let mismatches = 0;
    for (const q of bank) {
      const m = q.sentence.match(/\[\[(.+?)\]\]/);
      if (!m) { console.error("no target markup:", q.kanji); continue; }
      const before = q.sentence.slice(0, m.index);
      const after = q.sentence.slice(m.index + m[0].length);
      // Target: force the known reading, still trimming okurigana so ruby sits
      // on the kanji core (e.g. 覆す → ｜覆《くつがえ》す).
      const targetRuby = rubyToken(m[1], q.reading);
      const furigana = annotate(before) + `[[${targetRuby}]]` + annotate(after);

      if (stripRuby(furigana) !== q.sentence) {
        mismatches++;
        console.error("REDUCTION MISMATCH:", q.kanji, "→", furigana);
        continue; // leave this item's furigana untouched rather than ship a bad one
      }
      q.furigana = furigana;
    }

    fs.writeFileSync(BANK, JSON.stringify(bank, null, 1), "utf8");
    console.log(`furigana written to ${bank.filter(q => q.furigana).length}/${bank.length} items` +
      (mismatches ? ` (${mismatches} skipped — reduction mismatch)` : ""));
  });
