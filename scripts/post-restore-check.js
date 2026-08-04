#!/usr/bin/env node
/**
 * Post-restore smoke check (no secrets, no org-specific prefs written).
 * Usage: node scripts/post-restore-check.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { validate } = require('./validate-paths');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.log(`  ✗ ${msg}`);
}
function soft(msg) {
  console.log(`  ! ${msg}`);
}

console.log('QA Agent post-restore check\n');

const checks = [
  ['~/.qa-agent/lib/store.js', path.join(HOME, '.qa-agent', 'lib', 'store.js')],
  ['~/.cursor/agents/qa.md', path.join(HOME, '.cursor', 'agents', 'qa.md')],
  ['~/.cursor/commands/qa.md', path.join(HOME, '.cursor', 'commands', 'qa.md')],
  ['~/.cursor/mcp.json', path.join(HOME, '.cursor', 'mcp.json')],
];

let failed = 0;
for (const [label, p] of checks) {
  if (fs.existsSync(p)) ok(label);
  else {
    fail(`${label} missing`);
    failed++;
  }
}

const store = path.join(HOME, '.qa-agent', 'lib', 'store.js');
if (fs.existsSync(store)) {
  const boot = spawnSync(process.execPath, [store, 'boot', '--project', 'auto'], {
    encoding: 'utf8',
    cwd: REPO,
    windowsHide: true,
  });
  if (boot.status === 0 && (boot.stdout || '').includes('"project"')) ok('store boot --project auto');
  else soft('store boot failed (run from qa-agent repo folder)');
}

const v = validate();
v.errors.forEach((e) => {
  fail(e);
  failed++;
});
v.warnings.forEach((w) => soft(w));

console.log('\nOptional: node scripts/doctor.js');
console.log('After backup restore: Reload Window, then /qa onboard to set your paths.');
process.exit(failed ? 1 : 0);
