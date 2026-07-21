#!/usr/bin/env node
/**
 * Onboard Ready table (dry-run). No secrets printed.
 * Usage: node scripts/onboard-status.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');

function ok(b) {
  return b ? '✓' : '✗';
}
function soft(b) {
  return b ? '✓' : '!';
}

function exists(p) {
  return fs.existsSync(p);
}

function cmdOk(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: true, windowsHide: true }).status === 0;
}

function pref(key) {
  const store = path.join(HOME, '.qa-agent', 'lib', 'store.js');
  if (!exists(store)) return '';
  const r = spawnSync(process.execPath, [store, 'pref', 'get', key, '--project', 'auto'], {
    encoding: 'utf8',
    cwd: process.cwd(),
    windowsHide: true,
  });
  const out = (r.stdout || '').trim();
  if (!out || out === 'null') return '';
  try {
    const j = JSON.parse(out);
    return typeof j === 'string' ? j : String(j);
  } catch {
    return out.replace(/^"|"$/g, '');
  }
}

const rows = [];

const nodeOk = (() => {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  return major >= 18;
})();
rows.push(['Node.js >= 18', ok(nodeOk), process.versions.node]);

rows.push(['Repo AGENTS.md', ok(exists(path.join(REPO, 'AGENTS.md'))), '']);
rows.push([
  'Project /qa command',
  ok(exists(path.join(REPO, '.cursor', 'commands', 'qa.md'))),
  '.cursor/commands/qa.md',
]);
rows.push([
  'Global agent',
  soft(exists(path.join(HOME, '.cursor', 'agents', 'qa.md'))),
  '~/.cursor/agents/qa.md (after install + Reload)',
]);
rows.push([
  'store.js',
  ok(exists(path.join(HOME, '.qa-agent', 'lib', 'store.js'))),
  'run install.ps1 / install.sh',
]);
rows.push([
  'mcp-mode.js',
  soft(exists(path.join(HOME, '.qa-agent', 'lib', 'mcp-mode.js'))),
  're-run installer if missing',
]);

const mcpPath = path.join(HOME, '.cursor', 'mcp.json');
let mcpServers = [];
if (exists(mcpPath)) {
  try {
    mcpServers = Object.keys(JSON.parse(fs.readFileSync(mcpPath, 'utf8')).mcpServers || {});
  } catch {
    mcpServers = [];
  }
}
rows.push(['mcp.json present', ok(exists(mcpPath)), mcpServers.join(', ') || 'run setup-mcp.js']);
const fullNeed = ['shortcut', 'testrail', 'glean', 'context7', 'cypress', 'playwright'];
const fullOk = fullNeed.every((k) => mcpServers.includes(k));
rows.push(['MCP full (6)', soft(fullOk), fullOk ? 'full' : 'node scripts/mcp-mode.js full']);

rows.push(['git on PATH', ok(cmdOk('git', ['--version'])), 'setup-git.js']);
rows.push([
  'git user.name',
  soft(
    spawnSync('git', ['config', '--global', '--get', 'user.name'], { encoding: 'utf8', shell: true })
      .status === 0
  ),
  '',
]);

const squad = pref('squad.name');
const ui = pref('paths.ui_tests');
const api = pref('paths.api_tests');
const perf = pref('paths.perf_tests');
rows.push(['pref squad.name', soft(!!squad), squad || 'setup-prefs.js']);
rows.push(['pref paths.ui_tests', soft(!!ui), ui || 'setup-prefs.js']);
rows.push(['pref paths.api_tests', soft(!!api), api || 'setup-prefs.js']);
rows.push(['pref paths.perf_tests', soft(!!perf), perf || 'setup-prefs.js']);

rows.push(['k6 (optional)', soft(cmdOk('k6', ['version']) || cmdOk('k6', ['--version'])), 'setup-tooling.js']);
rows.push(['java (optional)', soft(cmdOk('java', ['-version'])), 'setup-tooling.js']);
rows.push(['mvn (optional)', soft(cmdOk('mvn', ['-v'])), 'setup-tooling.js']);

const priv = exists(path.join(REPO, 'onboard.md'));
const pub = exists(path.join(REPO, 'onboard.example.md'));
rows.push(['onboard.md (private)', soft(priv), priv ? 'local overlay' : 'optional offline share']);
rows.push(['onboard.example.md', ok(pub), 'public stub']);

let ver = 'unknown';
try {
  ver = fs.readFileSync(path.join(REPO, 'VERSION'), 'utf8').trim();
} catch {
  /* ignore */
}
rows.push(['VERSION', ok(!!ver), ver]);

console.log('QA Agent onboard status (dry-run)');
console.log(`  Repo: ${REPO}`);
console.log('');
const w = Math.max(...rows.map((r) => r[0].length));
for (const [label, mark, note] of rows) {
  const pad = ' '.repeat(w - label.length);
  console.log(`  ${mark}  ${label}${pad}  ${note}`);
}
console.log('');
console.log('Legend: ✓ ok · ! missing/optional · ✗ blocking');
console.log('First-time: docs/FIRST_RUN.md  (install → Reload → /qa onboard)');
console.log('Next: node scripts/doctor.js');
