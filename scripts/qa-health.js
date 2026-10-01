#!/usr/bin/env node
/**
 * QA Agent runtime health (speed/weight/smarts). No secrets printed.
 * Usage: node scripts/qa-health.js [--json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const jsonOut = process.argv.includes('--json');

const checks = [];

function add(level, id, msg) {
  checks.push({ level, id, msg });
}

function exists(p) {
  return fs.existsSync(p);
}

function readJson(p, fb) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

const { canonicalWorkspaceCheck, canonicalQaAgentPath } = require('./lib/canonical-workspace');
const canon = canonicalWorkspaceCheck(REPO);
if (canon.warn) add('warn', canon.id, canon.message);
if (repoNorm.includes('onedrive')) {
  add('info', 'onedrive', 'Repo is under OneDrive. Sync/I/O may add sporadic latency.');
}

const repoHooks = path.join(REPO, '.cursor', 'hooks.json');
if (exists(repoHooks)) {
  const h = readJson(repoHooks, { hooks: {} });
  const ss = (h.hooks && h.hooks.sessionStart) || [];
  if (ss.length) {
    add('fail', 'duplicate-hook', 'Repo .cursor/hooks.json has sessionStart. Remove it (user hook only).');
  } else {
    add('ok', 'repo-hook', 'Repo sessionStart hook empty (good).');
  }
}

const userHook = path.join(HOME, '.cursor', 'hooks', 'qa-mcp-auto.js');
if (exists(userHook)) add('ok', 'user-hook', 'User qa-mcp-auto.js installed.');
else add('warn', 'user-hook', 'Missing user hook. Run: node scripts/install-mcp-hook.js');

const hookLog = path.join(HOME, '.qa-agent', 'mcp', 'hook-auto.log');
if (exists(hookLog)) {
  const tail = fs.readFileSync(hookLog, 'utf8').split('\n').slice(-30).join('\n');
  if (/Unexpected token.*\\uFEFF|''/.test(tail)) {
    add('info', 'hook-bom', 'Recent hook stdin BOM parse noise (fixed in latest hook script). Re-run install-mcp-hook.js.');
  }
}

const active = path.join(HOME, '.qa-agent', 'mcp', 'active-profile.txt');
if (exists(active)) {
  add('ok', 'mcp-profile', `MCP profile: ${fs.readFileSync(active, 'utf8').trim() || '(empty)'}`);
}

const indexPath = path.join(REPO, '.cursor', 'hooks', 'state', 'continual-learning-index.json');
if (exists(indexPath)) {
  const idx = readJson(indexPath, { transcripts: {} });
  const n = Object.keys(idx.transcripts || {}).length;
  add('info', 'transcript-index', `${n} transcript(s) in continual-learning index.`);
}

if (!exists(path.join(REPO, '.cursorignore'))) {
  add('warn', 'cursorignore', 'Missing .cursorignore (tmp scratch may slow indexing).');
} else {
  add('ok', 'cursorignore', '.cursorignore present.');
}

try {
  const { plan } = require('./boot-session.js');
  const p = plan({ cwd: REPO, minimal: false, domain: '' });
  add(
    p.fresh ? 'ok' : 'info',
    'boot-session',
    p.fresh ? 'Boot session cache fresh (skip proj/boot ok).' : 'Boot session stale (proj ensure + boot expected).'
  );
} catch (e) {
  add('warn', 'boot-session', `boot-session.js: ${e.message}`);
}

const store = path.join(HOME, '.qa-agent', 'lib', 'store.js');
if (exists(store)) {
  const r = spawnSync(process.execPath, [store, 'pref', 'get', 'agent.boot_minimal', '--project', 'auto'], {
    encoding: 'utf8',
    cwd: REPO,
    windowsHide: true,
  });
  const v = (r.stdout || '').trim();
  if (v === 'true' || v === true) {
    add('ok', 'boot-minimal', 'agent.boot_minimal=true (lite /qa boot).');
  } else {
    add('info', 'boot-minimal', 'agent.boot_minimal not set (full boot when cache stale). pref set agent.boot_minimal true for speed.');
  }
}

const aiClone = path.join(HOME, 'OneDrive - CSG Systems Inc', 'Documents', 'AI', 'qa-agent');
const canonPath = canonicalQaAgentPath();
if (exists(aiClone) && normPath(aiClone) !== normPath(REPO) && normPath(REPO) === normPath(canonPath)) {
  add('warn', 'ai-clone', 'Documents\\AI\\qa-agent still exists. Do not open both workspaces in Cursor.');
}

function normPath(p) {
  return path.resolve(p).toLowerCase();
}

const fails = checks.filter((c) => c.level === 'fail').length;
const warns = checks.filter((c) => c.level === 'warn').length;

function printReport() {
  console.log('QA Agent health\n');
  for (const c of checks) {
    const icon = c.level === 'fail' ? '✗' : c.level === 'warn' ? '!' : c.level === 'ok' ? '✓' : '·';
    console.log(`  ${icon} [${c.id}] ${c.msg}`);
  }
  console.log(`\n---\n${fails ? 'FAIL' : 'PASS'} (${warns} warning${warns === 1 ? '' : 's'})`);
}

if (jsonOut) {
  console.log(JSON.stringify({ checks, fails, warns }, null, 2));
  process.exit(fails ? 1 : 0);
}

printReport();
process.exit(fails ? 1 : 0);
