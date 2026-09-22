#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { stagedDiffHash, writeStamp, validateStampForCommit } = require('./bugbot-gate-lib');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else console.log('OK  :', msg);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-bugbot-'));
const gitDir = path.join(tmp, '.git');
fs.mkdirSync(gitDir, { recursive: true });
fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');

const { spawnSync } = require('child_process');
spawnSync('git', ['init'], { cwd: tmp, encoding: 'utf8' });
fs.writeFileSync(path.join(tmp, 'sample.txt'), 'hello\n');
spawnSync('git', ['add', 'sample.txt'], { cwd: tmp, encoding: 'utf8' });

const hash = stagedDiffHash(tmp);
assert(hash && hash.length === 64, 'stagedDiffHash returns sha256');

writeStamp(tmp, { stagedHash: hash, findingsCount: 0 });
const stampPath = path.join(tmp, '.git', 'qa-agent-bugbot-stamp.json');
assert(fs.existsSync(stampPath), 'stamp file written');

process.env.QA_AGENT_SKIP_BUGBOT = '1';
const skip = validateStampForCommit(tmp);
assert(skip.ok && skip.skipped, 'QA_AGENT_SKIP_BUGBOT skips gate');
delete process.env.QA_AGENT_SKIP_BUGBOT;

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nAll bugbot-gate tests passed.');
