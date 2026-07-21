#!/usr/bin/env node
/**
 * QA Agent doctor — local health check (no secrets printed).
 * Usage: node scripts/doctor.js
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const os = require("os");

const REPO = path.resolve(__dirname, "..");
const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const SKILLS = [
  "qa-entry",
  "qa-search-tickets",
  "qa-defect-triage",
  "qa-ui-automation",
  "qa-perf-test",
  "qa-test-cases",
  "qa-test-execution",
  "qa-api-test",
  "qa-project-mapping",
  "qa-token-saver",
  "qa-visual-test",
];

let failed = 0;
let warn = 0;

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.log(`  ✗ ${msg}`);
  failed++;
}
function soft(msg) {
  console.log(`  ! ${msg}`);
  warn++;
}

function exists(p) {
  return fs.existsSync(p);
}

function readVersion() {
  const v = path.join(REPO, "VERSION");
  return exists(v) ? fs.readFileSync(v, "utf-8").trim() : "unknown";
}

console.log(`QA Agent doctor (v${readVersion()})`);
console.log(`Repo: ${REPO}\n`);

// Node
console.log("Runtime");
const nv = process.versions.node;
const major = parseInt(nv.split(".")[0], 10);
if (major >= 18) ok(`Node.js ${nv}`);
else fail(`Node.js ${nv} (need >= 18)`);

// Repo structure
console.log("\nRepository");
[
  ["AGENTS.md", path.join(REPO, "AGENTS.md")],
  ["scripts/store.js", path.join(REPO, "scripts", "store.js")],
  ["mcp.json.example", path.join(REPO, "mcp.json.example")],
  ["mcp.json.optional.example", path.join(REPO, "mcp.json.optional.example")],
  ["scripts/mcp-mode.js", path.join(REPO, "scripts", "mcp-mode.js")],
  ["scripts/setup-git.js", path.join(REPO, "scripts", "setup-git.js")],
  ["scripts/setup-tooling.js", path.join(REPO, "scripts", "setup-tooling.js")],
  ["agents/qa.md", path.join(REPO, ".cursor", "agents", "qa.md")],
  ["rules/qa-agent-rules.mdc", path.join(REPO, ".cursor", "rules", "qa-agent-rules.mdc")],
  ["rules/testrail-case-draft.mdc", path.join(REPO, ".cursor", "rules", "testrail-case-draft.mdc")],
  ["rules/testrail-case-generate.mdc", path.join(REPO, ".cursor", "rules", "testrail-case-generate.mdc")],
  ["rules/output-punctuation.mdc", path.join(REPO, ".cursor", "rules", "output-punctuation.mdc")],
  ["methodology", path.join(REPO, ".cursor", "references", "qa-testcase-methodology.md")],
  ["MCP_TOOLS.md", path.join(REPO, ".cursor", "MCP_TOOLS.md")],
  ["references/", path.join(REPO, ".cursor", "references")],
  ["templates/", path.join(REPO, ".cursor", "templates", "project-context.current.md")],
].forEach(([label, p]) => (exists(p) ? ok(label) : fail(`missing ${label}`)));

for (const s of SKILLS) {
  const p = path.join(REPO, ".cursor", "skills", s, "SKILL.md");
  exists(p) ? ok(`skill ${s}`) : fail(`skill ${s}`);
}

// Store CLI
console.log("\nMemory engine");
const storeSrc = path.join(REPO, "scripts", "store.js");
const hash = spawnSync(process.execPath, [storeSrc, "cache", "hash", "doctor-ping"], {
  encoding: "utf-8",
  env: { ...process.env },
});
if (hash.status === 0 && /^[a-f0-9]{8}\s*$/.test(hash.stdout)) ok("store.js cache hash");
else fail("store.js cache hash failed");

const proj = spawnSync(process.execPath, [storeSrc, "proj", "ensure"], {
  encoding: "utf-8",
  cwd: REPO,
  env: { ...process.env, QA_AGENT_CWD: REPO },
});
if (proj.status === 0) {
  try {
    const meta = JSON.parse((proj.stdout || "").trim());
    if (meta.id) ok(`proj ensure → ${meta.id}`);
    else fail("proj ensure returned no id");
  } catch {
    fail("proj ensure invalid JSON");
  }
} else soft("proj ensure failed (non-fatal)");

const globalStore = path.join(HOME, ".qa-agent", "lib", "store.js");
if (exists(globalStore)) ok(`installed ~/.qa-agent/lib/store.js`);
else soft("global store not installed. Run install.ps1 / install.sh");
const mcpModeLib = path.join(HOME, ".qa-agent", "lib", "mcp-mode.js");
if (exists(mcpModeLib)) ok("installed ~/.qa-agent/lib/mcp-mode.js");
else soft("mcp-mode.js missing. Re-run installer");
if (exists(path.join(HOME, ".qa-agent", "projects"))) ok("~/.qa-agent/projects/ present");
else soft("projects/ dir missing. Re-run installer");

// MCP config (presence + full servers + no placeholders for TestRail)
console.log("\nMCP config");
const mcpPath = path.join(HOME, ".cursor", "mcp.json");
let mcpCfg = null;
if (!exists(mcpPath)) {
  soft("~/.cursor/mcp.json missing. Run: node scripts/setup-mcp.js");
} else {
  ok("~/.cursor/mcp.json present");
  try {
    mcpCfg = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    const servers = Object.keys(mcpCfg.mcpServers || {});
    if (servers.length) ok(`servers: ${servers.join(", ")}`);
    else soft("mcp.json has no mcpServers entries");
    for (const need of ["shortcut", "testrail", "glean", "context7", "cypress", "playwright"]) {
      if (!servers.includes(need)) soft(`missing recommended server: ${need} (full MCP set)`);
    }
    const te = mcpCfg.mcpServers?.testrail?.env || {};
    const ph = (v) => !v || /YOUR_|your\.email|PLACEHOLDER|PATH_TO_/i.test(String(v));
    if (ph(te.TESTRAIL_API_KEY) || ph(te.TESTRAIL_USERNAME)) {
      soft("TestRail username/API key still placeholder. Re-run: node scripts/setup-mcp.js");
    }
    // Optional MCP: warn if configured but CLI missing
    const cmdOk = (cmd) => {
      const r = spawnSync(cmd, ["--version"], { encoding: "utf8", shell: true, windowsHide: true });
      if (r.status === 0) return true;
      const w = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
        encoding: "utf8",
        shell: true,
        windowsHide: true,
      });
      return w.status === 0 && !!(w.stdout || "").trim();
    };
    if (servers.includes("k6") && !cmdOk("k6")) {
      soft("mcp k6 configured but k6 not on PATH. Run: node scripts/setup-tooling.js");
    }
    if (servers.includes("karate") && !cmdOk("karate")) {
      soft("mcp karate configured but karate CLI not on PATH. Prefer Maven + paths.api_tests, or install karate CLI");
    }
  } catch {
    fail("~/.cursor/mcp.json is not valid JSON");
  }
}

const catalogPath = path.join(HOME, ".qa-agent", "mcp", "catalog.json");
if (exists(catalogPath)) ok("MCP catalog ~/.qa-agent/mcp/catalog.json");
else soft("MCP catalog missing. Run setup-mcp.js or re-install");

// Git (not MCP)
console.log("\nGit");
const gitVer = spawnSync("git", ["--version"], { encoding: "utf8", shell: true });
if (gitVer.status === 0) {
  ok((gitVer.stdout || "").trim());
  const name = spawnSync("git", ["config", "--global", "--get", "user.name"], {
    encoding: "utf8",
    shell: true,
  });
  const email = spawnSync("git", ["config", "--global", "--get", "user.email"], {
    encoding: "utf8",
    shell: true,
  });
  if (name.status === 0 && (name.stdout || "").trim()) ok("user.name set");
  else soft("git user.name unset. Run: node scripts/setup-git.js");
  if (email.status === 0 && (email.stdout || "").trim()) ok("user.email set");
  else soft("git user.email unset. Run: node scripts/setup-git.js");
} else {
  soft("git not on PATH. Run: node scripts/setup-git.js");
}

// CLI tooling (k6 / java / mvn)
console.log("\nCLI tooling");
const toolOk = (cmd, args) =>
  spawnSync(cmd, args, { encoding: "utf8", shell: true, windowsHide: true }).status === 0;
if (toolOk("k6", ["version"]) || toolOk("k6", ["--version"])) ok("k6 on PATH");
else soft("k6 missing (optional until @qa-perf-test). Run: node scripts/setup-tooling.js");
if (toolOk("java", ["-version"]) || toolOk("java", ["--version"])) ok("java on PATH");
else soft("java missing (optional until @qa-api-test). Run: node scripts/setup-tooling.js");
if (toolOk("mvn", ["-v"]) || toolOk("mvn", ["--version"])) ok("mvn on PATH");
else soft("mvn missing (optional until @qa-api-test). Run: node scripts/setup-tooling.js");

// Visual deps
console.log("\nVisual regression");
const vPkg = path.join(REPO, ".cursor", "skills", "qa-visual-test", "scripts", "package.json");
const vMods = path.join(REPO, ".cursor", "skills", "qa-visual-test", "scripts", "node_modules");
if (exists(vPkg)) ok("visual package.json");
else fail("visual package.json missing");
if (exists(vMods)) ok("visual node_modules installed");
else soft("visual node_modules missing. Optional until you use @qa-visual-test");

// Global skills
console.log("\nGlobal Cursor install");
const gSkills = path.join(HOME, ".cursor", "skills");
const gAgent = path.join(HOME, ".cursor", "agents", "qa.md");
if (exists(gAgent)) ok("global agent ~/.cursor/agents/qa.md");
else soft("global agent missing — run installer");
let skillCount = 0;
if (exists(gSkills)) {
  skillCount = fs.readdirSync(gSkills).filter((n) => exists(path.join(gSkills, n, "SKILL.md"))).length;
  ok(`${skillCount} global skill folder(s) with SKILL.md`);
} else {
  soft("global skills dir missing — run installer");
}

console.log("\n---");
if (failed === 0) {
  console.log(`Result: PASS (${warn} warning${warn === 1 ? "" : "s"})`);
  process.exit(0);
}
console.log(`Result: FAIL (${failed} error${failed === 1 ? "" : "s"}, ${warn} warning${warn === 1 ? "" : "s"})`);
process.exit(1);
