#!/usr/bin/env node
/**
 * Minimal self-check for scripts/store.js (no test framework).
 * Runs against an isolated temp store dir via env override simulation:
 * we copy store into a temp dir and patch STORE_DIR for the child... 
 * Simpler approach: invoke CLI against a temp HOME.
 *
 * Usage: node scripts/store.test.js
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname);
const STORE = path.join(ROOT, "store.js");
const TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "qa-agent-store-test-"));
const QA_DIR = path.join(TMP_HOME, ".qa-agent");
fs.mkdirSync(path.join(QA_DIR, "lib"), { recursive: true });

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK  :", msg);
  }
}

function run(...args) {
  const r = spawnSync(process.execPath, [STORE, ...args], {
    encoding: "utf-8",
    env: { ...process.env, USERPROFILE: TMP_HOME, HOME: TMP_HOME },
  });
  if (r.status !== 0 && r.status !== null) {
    return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
  }
  return { status: r.status ?? 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

// hash
const h = run("cache", "hash", "bug quote generation");
assert(/^[a-f0-9]{8}$/.test(h.out), `cache hash returns 8-hex (got ${JSON.stringify(h.out)})`);
const expected = crypto.createHash("md5").update("bug quote generation").digest("hex").slice(0, 8);
assert(h.out === expected, `cache hash matches md5 slice (${expected})`);

// miss
const miss = run("cache", "get", h.out);
assert(miss.out === "null", "cache get miss → null");

// set + get
const set = run("cache", "set", h.out, "bug quote generation", '{"items":[1,2]}');
assert(set.status === 0, "cache set succeeds");
const hit = run("cache", "get", h.out);
assert(hit.out === '{"items":[1,2]}', `cache get hit → ${hit.out}`);

// invalid json
const bad = run("cache", "set", "deadbeef", "q", "not-json");
assert(bad.status !== 0, "cache set rejects invalid JSON");

// corrections scoring + maxScore filter
run("cor", "add", "triage", "ctx", "dup ticket", "use existing", "lesson", "1");
run("cor", "add", "triage", "ctx", "bad draft", "too verbose", "lesson", "-1");
run("cor", "add", "triage", "ctx", "dup ticket", "use existing", "reinforce", "1"); // accum +1 → 2

const good = JSON.parse(run("cor", "list", "triage", "1").out);
assert(good.length === 1 && good[0].sc === 2, `cor list min=1 returns score 2 (got ${JSON.stringify(good)})`);

const badList = JSON.parse(run("cor", "list", "triage", "-999", "-1").out);
assert(badList.length === 1 && badList[0].sc === -1, `cor list max=-1 returns only negatives`);

// knowledge
const know = run("know", "add", "api", "auth", "use bearer", '["karate"]');
assert(know.status === 0, "know add succeeds");
const found = JSON.parse(run("know", "search", "bearer").out);
assert(found.length === 1 && found[0].top === "auth", "know search finds entry");

// cleanup
fs.rmSync(TMP_HOME, { recursive: true, force: true });

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll store.js checks passed");
