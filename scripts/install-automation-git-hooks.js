#!/usr/bin/env node
/**
 * Install pre-commit Bugbot gate into paths.ui/api/perf repos.
 * Usage: node scripts/install-automation-git-hooks.js [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { parsePathList, readPref } = require('./mcp-lib');

const REPO = path.resolve(__dirname, '..');
const HOOK_SCRIPT = path.join(REPO, 'scripts', 'git-pre-commit-bugbot.js');
const dryRun = process.argv.includes('--dry-run');

function hookBody() {
  const node = process.execPath.replace(/\\/g, '/');
  const script = HOOK_SCRIPT.replace(/\\/g, '/');
  return `#!/bin/sh
# QA Agent: Bugbot gate for automation paths (generated)
"${node}" "${script}"
`;
}

function installHook(repoRoot) {
  const hooksDir = path.join(repoRoot, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');
  if (!fs.existsSync(path.join(repoRoot, '.git'))) {
    console.log('  skip (not a git repo):', repoRoot);
    return false;
  }
  const marker = 'QA Agent: Bugbot gate';
  if (fs.existsSync(hookPath)) {
    const cur = fs.readFileSync(hookPath, 'utf8');
    if (cur.includes(marker)) {
      console.log('  hook already installed:', hookPath);
      return true;
    }
    console.log('  skip (pre-commit exists, not ours):', hookPath);
    return false;
  }
  if (dryRun) {
    console.log('  would install:', hookPath);
    return true;
  }
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.writeFileSync(hookPath, hookBody(), 'utf8');
  try {
    fs.chmodSync(hookPath, 0o755);
  } catch {
    /* windows */
  }
  console.log('  installed:', hookPath);
  return true;
}

function main() {
  const roots = new Set();
  for (const key of ['paths.ui_tests', 'paths.api_tests', 'paths.perf_tests']) {
    for (const p of parsePathList(readPref(key))) roots.add(p);
  }
  if (!roots.size) {
    console.error('No paths.* prefs. Run onboard / setup-prefs first.');
    process.exit(2);
  }
  console.log(`Install Bugbot pre-commit hook${dryRun ? ' (dry-run)' : ''}:`);
  let n = 0;
  for (const root of roots) {
    if (!fs.existsSync(root)) {
      console.log('  skip (missing):', root);
      continue;
    }
    console.log(root);
    if (installHook(root)) n++;
  }
  console.log(`Done. ${n} hook(s).`);
}

main();
