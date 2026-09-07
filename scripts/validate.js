#!/usr/bin/env node
// Feedback loop for the harness (see HARNESS.md).
// Encodes the L3 invariants from .claude/rules/data.md and architecture.md R1.
// Run with: npm test        (must finish in a few seconds — keep it fast)

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
let failures = 0;

function fail(msg) { failures++; console.error("  ✗ " + msg); }
function pass(msg) { console.log("  ✓ " + msg); }

const HIRAGANA = /^[ぁ-んー]+$/;
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

// ── D1: bank.json + ai-cache.json schema ─────────────────────────────
// `seen` is a Map<level, Set<kanji>> so uniqueness is enforced PER LEVEL —
// the same word may legitimately appear in the merged bank tagged for
// different JLPT levels, but never twice within one level.
function checkQuestion(q, i, src, seen) {
  const id = `${src}[${i}] ${q && q.kanji ? q.kanji : "?"}`;
  if (!q || typeof q !== "object") return fail(`${id}: not an object`);
  if (!q.kanji || typeof q.kanji !== "string") fail(`${id}: bad kanji`);
  // level is optional on machine-generated ai-cache.json (defaults to N1 in
  // the frontend), but when present it must name a real level.
  if (q.level !== undefined && !LEVELS.includes(q.level))
    fail(`${id}: level must be one of ${LEVELS.join("/")} (got ${q.level})`);
  if (seen) {
    const lvl = q.level || "N1";
    const set = seen.get(lvl) || (seen.set(lvl, new Set()), seen.get(lvl));
    if (set.has(q.kanji)) fail(`${id}: duplicate kanji in ${src} (level ${lvl})`);
    set.add(q.kanji);
  }
  const marks = (q.sentence || "").match(/\[\[.+?\]\]/g) || [];
  if (marks.length !== 1) fail(`${id}: sentence must contain [[target]] exactly once (found ${marks.length})`);
  if (!HIRAGANA.test(q.reading || "")) fail(`${id}: reading must be hiragana`);
  if (!q.meaning) fail(`${id}: missing meaning`);
  if (q.type !== "on" && q.type !== "kun") fail(`${id}: type must be "on"|"kun"`);
  if (!q.hint) fail(`${id}: missing hint`);
  if (!Array.isArray(q.compounds) || q.compounds.length < 2 || q.compounds.length > 3)
    fail(`${id}: compounds must have 2-3 entries`);
  if (!Array.isArray(q.distractors) || q.distractors.length !== 3)
    fail(`${id}: distractors must be exactly 3`);
  else {
    if (q.distractors.includes(q.reading)) fail(`${id}: distractor equals correct reading`);
    if (new Set(q.distractors).size !== 3) fail(`${id}: duplicate distractors`);
  }
}

function checkBankFile(file, requireUnique) {
  const p = path.join(ROOT, "data", file);
  if (!fs.existsSync(p)) {
    if (file === "bank.json") fail("data/bank.json missing");
    else pass(`data/${file} absent (ok — machine-managed)`);
    return;
  }
  let items;
  try { items = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { return fail(`data/${file}: invalid JSON (${e.message})`); }
  if (!Array.isArray(items)) return fail(`data/${file}: not an array`);
  const seen = requireUnique ? new Map() : null;
  const before = failures;
  items.forEach((q, i) => checkQuestion(q, i, file, seen));
  if (failures === before) pass(`data/${file}: ${items.length} items valid`);
}

// ── D2: custom.json schema ────────────────────────────────────────────
function checkCustom() {
  const p = path.join(ROOT, "data", "custom.json");
  if (!fs.existsSync(p)) return pass("data/custom.json absent (ok — no custom cards yet)");
  let items;
  try { items = JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { return fail(`data/custom.json: invalid JSON (${e.message})`); }
  if (!Array.isArray(items)) return fail("data/custom.json: not an array");
  const before = failures;
  const seen = new Set();
  items.forEach((c, i) => {
    const id = `custom[${i}] ${c && c.kanji ? c.kanji : "?"}`;
    if (!c.kanji) fail(`${id}: missing kanji`);
    if (seen.has(c.kanji)) fail(`${id}: duplicate kanji`);
    seen.add(c.kanji);
    if (!HIRAGANA.test(c.reading || "")) fail(`${id}: reading must be hiragana`);
    if (!/\[\[.+?\]\]/.test(c.sentence || "")) fail(`${id}: sentence missing [[target]]`);
    if (c.custom !== true) fail(`${id}: missing custom:true flag`);
  });
  if (failures === before) pass(`data/custom.json: ${items.length} cards valid`);
}

// ── Syntax check ──────────────────────────────────────────────────────
function checkSyntax() {
  return new Promise(resolve => {
    const p = spawn(process.execPath, ["--check", path.join(ROOT, "server.js")]);
    let err = "";
    p.stderr.on("data", d => err += d);
    p.on("close", code => {
      if (code === 0) pass("server.js: syntax OK");
      else fail("server.js: syntax error\n" + err);
      resolve();
    });
  });
}

// ── R1: offline smoke test — server must serve questions with NO key ─
function smokeTest() {
  return new Promise(resolve => {
    // KANJI_NO_ENV_FILE stops server.js reading a local .env, so the test
    // really runs keyless even on a machine that has one.
    const env = { ...process.env, PORT: "3999", KANJI_NO_ENV_FILE: "1" };
    delete env.GEMINI_API_KEY;
    const srv = spawn(process.execPath, [path.join(ROOT, "server.js")], { env });
    let done = false;
    const finish = (ok, msg) => {
      if (done) return;
      done = true;
      srv.kill();
      ok ? pass(msg) : fail(msg);
      resolve();
    };
    setTimeout(async () => {
      try {
        const res = await fetch("http://localhost:3999/api/bank");
        const j = await res.json();
        if (res.ok && Array.isArray(j.questions) && j.questions.length >= 100)
          finish(true, `offline smoke test: /api/bank serves ${j.questions.length} questions without GEMINI_API_KEY`);
        else finish(false, `offline smoke test: unexpected response (${res.status}, ${j.questions?.length} questions)`);
      } catch (e) {
        finish(false, "offline smoke test: server unreachable — " + e.message);
      }
    }, 1200);
    setTimeout(() => finish(false, "offline smoke test: timed out"), 8000);
  });
}

// ── Run ───────────────────────────────────────────────────────────────
(async () => {
  console.log("Harness feedback loop (HARNESS.md → scripts/validate.js)\n");
  console.log("Data invariants (rules/data.md):");
  checkBankFile("bank.json", true);
  checkBankFile("ai-cache.json", false);
  checkCustom();
  console.log("\nCode + architecture (rules/architecture.md):");
  await checkSyntax();
  await smokeTest();
  console.log(failures === 0
    ? "\n✅ ALL CHECKS PASSED"
    : `\n❌ ${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
