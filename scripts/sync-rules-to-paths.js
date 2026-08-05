#!/usr/bin/env node
/**
 * Copy QA Agent .cursor/rules/*.mdc to paths.ui_tests / api / perf repos.
 * Usage: node scripts/sync-rules-to-paths.js [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const RULES_SRC = path.join(REPO, '.cursor', 'rules');
const { readPref, parsePathList } = require('./mcp-lib');

const dryRun = process.argv.includes('--dry-run');

function copyRulesTo(targetRoot) {
  if (!targetRoot || !fs.existsSync(targetRoot)) {
    console.log('  skip (missing):', targetRoot || '(empty)');
    return 0;
  }
  const dest = path.join(targetRoot, '.cursor', 'rules');
  if (!fs.existsSync(RULES_SRC)) {
    console.error('Rules source missing:', RULES_SRC);
    process.exit(1);
  }
  if (!dryRun) fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const name of fs.readdirSync(RULES_SRC)) {
    if (!name.endsWith('.mdc')) continue;
    const src = path.join(RULES_SRC, name);
    const out = path.join(dest, name);
    if (dryRun) {
      console.log('  would copy', name, '->', out);
    } else {
      fs.copyFileSync(src, out);
      console.log('  copied', name);
    }
    n++;
  }
  return n;
}

function main() {
  const roots = new Set();
  for (const key of ['paths.ui_tests', 'paths.api_tests', 'paths.perf_tests']) {
    for (const p of parsePathList(readPref(key))) roots.add(p);
  }
  if (!roots.size) {
    console.error('No paths.* prefs found. Run onboard wizard first.');
    process.exit(2);
  }
  console.log(`Sync QA Agent rules${dryRun ? ' (dry-run)' : ''}:`);
  let total = 0;
  for (const root of roots) {
    console.log(root);
    total += copyRulesTo(root);
  }
  console.log(`Done. ${total} rule file(s) per repo. Reload Cursor when opening a test repo.`);
}

main();
