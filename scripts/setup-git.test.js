#!/usr/bin/env node
/**
 * Smoke checks for setup-git.js (help + non-interactive when git present).
 * Usage: node scripts/setup-git.test.js
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, 'setup-git.js');
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK  :', msg);
  }
}

const help = spawnSync(process.execPath, [SCRIPT, '--help'], { encoding: 'utf8' });
assert(help.status === 0, 'setup-git --help exits 0');
assert(/user\.name/.test(help.stdout || ''), 'help mentions user.name');

const ni = spawnSync(process.execPath, [SCRIPT, '--non-interactive'], { encoding: 'utf8' });
assert(ni.status === 0 || ni.status === 1, 'non-interactive exits 0 or 1');
assert(/Git/.test(ni.stdout || '') || /Git/.test(ni.stderr || ''), 'non-interactive prints Git status');

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nAll setup-git tests passed.');
