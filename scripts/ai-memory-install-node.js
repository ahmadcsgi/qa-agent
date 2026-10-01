#!/usr/bin/env node
/**
 * Install Node-based cross-project memory CLI (no Python).
 * Usage: node scripts/ai-memory-install-node.js [cursor-memory|cursor-brain]
 */
'use strict';

const { spawnSync } = require('child_process');
const { engineId } = require('./lib/ai-memory-paths');

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  return r.status === 0;
}

function nodeMajor() {
  const v = process.version.match(/^v(\d+)/);
  return v ? Number(v[1]) : 0;
}

function main() {
  const engine = (process.argv[2] || engineId() || 'cursor-memory').toLowerCase();
  const major = nodeMajor();
  if (major !== 20 && major !== 22 && major !== 24) {
    console.warn(`Warn: Node ${process.version}. cursor-memory recommends 20/22/24 LTS for better-sqlite3.`);
  }

  if (engine === 'cursor-brain') {
    if (!run('npm', ['install', '-g', '@samhithgardas/cursor-brain'])) process.exit(1);
    console.log('\nDone. Configure MCP + storagePath (see docs/AI_MEMORY.md).');
    return;
  }

  if (!run('npm', ['install', '-g', 'cursor-memory'])) process.exit(1);
  console.log('\nRunning cursor-memory setup (may download local embedding model once)...');
  if (!run('cursor-memory', ['setup'])) {
    console.log('Setup exited non-zero. Try manually: cursor-memory setup');
    process.exit(1);
  }
  console.log('\nDone. Reload Cursor. Run: cursor-memory status');
}

main();
