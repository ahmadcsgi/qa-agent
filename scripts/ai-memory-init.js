#!/usr/bin/env node
/**
 * One-time hub init + global prefs.
 * Usage:
 *   node scripts/ai-memory-init.js
 *   node scripts/ai-memory-init.js --engine cursor-brain
 *   node scripts/ai-memory-init.js --hub "C:\\Users\\me\\Documents\\ai-memory"
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { ensureHubDirs } = require('./ai-memory-boot');
const { DEFAULT_HUB, ENGINES } = require('./lib/ai-memory-paths');

const HOME = process.env.USERPROFILE || process.env.HOME;
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');

function parseArg(argv, flag) {
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  return '';
}

function prefSet(key, value) {
  spawnSync(process.execPath, [STORE, 'pref', 'set', key, value, '--project', '*'], {
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
  });
}

function nextSteps(engine) {
  if (engine === 'cursor-memory') {
    console.log('Next (Node, recommended):');
    console.log('  npm install -g cursor-memory');
    console.log('  cursor-memory setup');
    console.log('  Reload Cursor');
    console.log('  MCP: npx -y cursor-memory (or global binary)');
  } else if (engine === 'cursor-brain') {
    console.log('Next (Node, lighter):');
    console.log('  npm install -g @samhithgardas/cursor-brain');
    console.log('  Set ~/.cursor-brain/config.json storagePath from ai-memory/cursor-brain/config.json');
    console.log('  Add MCP server cursor-brain in Cursor settings');
  } else {
    console.log('Next (Python, optional): pip install pmb-ai && pmb connect cursor --workspace csg');
  }
  console.log('  Docs: docs/AI_MEMORY.md');
}

function main() {
  const argv = process.argv.slice(2);
  const hub = parseArg(argv, '--hub') ? path.resolve(parseArg(argv, '--hub')) : DEFAULT_HUB;
  let engine = (parseArg(argv, '--engine') || 'cursor-memory').toLowerCase();
  if (!ENGINES.includes(engine)) engine = 'cursor-memory';

  ensureHubDirs(hub);
  prefSet('tools.ai_memory_hub', hub);
  prefSet('tools.ai_memory_engine', engine);
  if (engine === 'pmb') prefSet('tools.ai_memory_pmb_workspace', 'csg');
  prefSet('agent.boot_ai_memory', 'true');

  console.log('\nAI memory pilot prefs set (global *).');
  console.log(`  hub: ${hub}`);
  console.log(`  engine: ${engine}`);
  nextSteps(engine);
}

main();
