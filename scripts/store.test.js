#!/usr/bin/env node
/**
 * Minimal self-check for scripts/store.js (no test framework).
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
const APP_A = path.join(TMP_HOME, "app-alpha");
const APP_B = path.join(TMP_HOME, "app-beta");
fs.mkdirSync(path.join(TMP_HOME, ".qa-agent", "lib"), { recursive: true });
fs.mkdirSync(APP_A, { recursive: true });
fs.mkdirSync(APP_B, { recursive: true });
fs.mkdirSync(path.join(APP_A, ".cursor", "qa-memory", "project-context"), { recursive: true });
fs.writeFileSync(
  path.join(APP_A, ".cursor", "qa-memory", "project-context", "current.md"),
  "# Alpha context\ndefault_env: staging\n"
);

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK  :", msg);
  }
}

function run(cwd, ...args) {
  const r = spawnSync(process.execPath, [STORE, ...args], {
    encoding: "utf-8",
    cwd: cwd || TMP_HOME,
    env: { ...process.env, USERPROFILE: TMP_HOME, HOME: TMP_HOME, QA_AGENT_CWD: cwd || TMP_HOME },
  });
  if (r.status !== 0 && r.status !== null) {
    return { status: r.status, out: ((r.stdout || "") + (r.stderr || "")).trim() };
  }
  return { status: r.status ?? 0, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

// hash
const h = run(TMP_HOME, "cache", "hash", "bug quote generation");
assert(/^[a-f0-9]{8}$/.test(h.out), `cache hash returns 8-hex (got ${JSON.stringify(h.out)})`);
const expected = crypto.createHash("md5").update("bug quote generation").digest("hex").slice(0, 8);
assert(h.out === expected, `cache hash matches md5 slice (${expected})`);

assert(run(TMP_HOME, "cache", "get", h.out).out === "null", "cache get miss → null");
assert(run(TMP_HOME, "cache", "set", h.out, "bug quote generation", '{"items":[1,2]}').status === 0, "cache set");
assert(run(TMP_HOME, "cache", "get", h.out).out === '{"items":[1,2]}', "cache get hit");
assert(run(TMP_HOME, "cache", "set", "deadbeef", "q", "not-json").status !== 0, "reject bad JSON");

// global corrections
run(TMP_HOME, "cor", "add", "triage", "ctx", "dup ticket", "use existing", "lesson", "1", "*");
run(TMP_HOME, "cor", "add", "triage", "ctx", "bad draft", "too verbose", "lesson", "-1", "*");
run(TMP_HOME, "cor", "add", "triage", "ctx", "dup ticket", "use existing", "reinforce", "1", "*");
const good = JSON.parse(run(TMP_HOME, "cor", "list", "triage", "1", "", "--project", "*").out);
assert(good.length === 1 && good[0].sc === 2, `global cor score 2 (got ${JSON.stringify(good)})`);

assert(run(TMP_HOME, "know", "add", "api", "auth", "use bearer", '["karate"]').status === 0, "know add");
assert(JSON.parse(run(TMP_HOME, "know", "search", "bearer").out).length === 1, "know search");

assert(run(TMP_HOME, "pref", "set", "tools.skip_glean", "true").status === 0, "pref set global");
assert(JSON.parse(run(TMP_HOME, "pref", "get", "tools.skip_glean").out) === true, "pref get");

// multi-project
const ensA = JSON.parse(run(APP_A, "proj", "ensure").out);
assert(ensA.id && ensA.name === "app-alpha", `proj ensure A (got ${JSON.stringify(ensA)})`);
const ensB = JSON.parse(run(APP_B, "proj", "ensure").out);
assert(ensB.id && ensB.id !== ensA.id, "project ids differ for A vs B");

run(APP_A, "pref", "set", "default_env", "staging", "--project", "auto");
run(APP_B, "pref", "set", "default_env", "prod", "--project", "auto");
run(APP_A, "cor", "add", "ui", "a", "login selector", "use testid", "stable", "1", "auto");
run(APP_B, "cor", "add", "ui", "b", "login selector", "use xpath", "legacy", "-1", "auto");

const bootA = JSON.parse(run(APP_A, "boot", "ui", "5", "--project", "auto").out);
assert(bootA.project === ensA.id, "boot A project id");
assert(bootA.prefs.default_env === "staging", "boot A merges project pref staging");
assert(bootA.prefs["tools.skip_glean"] === true, "boot A keeps global pref");
assert(bootA.good.some((g) => g.proj === ensA.id && g.sc > 0), "boot A includes project good");

const bootB = JSON.parse(run(APP_B, "boot", "--project", "auto").out);
assert(bootB.prefs.default_env === "prod", "boot B project pref prod");
assert(!bootB.good.some((g) => g.proj === ensA.id && g.iss === "login selector" && g.sc > 0), "A good not in B as conflicting");

const sync = JSON.parse(run(APP_A, "proj", "sync").out);
assert(sync.synced === true, "proj sync from workspace context");
assert(bootA.n && typeof bootA.n.cor_p === "number", "boot reports cor_p");

const listed = JSON.parse(run(TMP_HOME, "proj", "list").out);
assert(listed.length >= 2, `proj list >= 2 (got ${listed.length})`);

const bootG = JSON.parse(run(TMP_HOME, "boot", "triage", "3", "--project", "*").out);
assert(bootG.project === null, "boot --project * is global-only");
assert(bootG.good.some((g) => g.sc === 2), "global boot still has triage lesson");

fs.rmSync(TMP_HOME, { recursive: true, force: true });

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll store.js checks passed (incl. multi-project)");
