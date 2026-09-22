#!/usr/bin/env node
/**
 * Record local Bugbot review for staged changes (automation repos).
 * Usage:
 *   node scripts/bugbot-stamp.js [--repo <path>] [--findings <n>] [--note <text>]
 */
'use strict';

const path = require('path');
const {
  gitTopLevel,
  repoUnderAutomationPath,
  stagedDiffHash,
  writeStamp,
  bugbotGateEnabled,
} = require('./bugbot-gate-lib');

function parseArgs(argv) {
  const out = { repo: null, findings: null, note: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--repo' && argv[i + 1]) {
      out.repo = argv[++i];
      continue;
    }
    if (a === '--findings' && argv[i + 1]) {
      out.findings = Number(argv[++i]);
      continue;
    }
    if (a === '--note' && argv[i + 1]) {
      out.note = argv[++i];
      continue;
    }
    if (a === '--help' || a === '-h') {
      out.help = true;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/bugbot-stamp.js [--repo <git-root>] [--findings N] [--note text]

Run after local Bugbot review (/review-bugbot or bugbot subagent) on staged changes.
Writes .git/qa-agent-bugbot-stamp.json matched to git diff --cached.`);
    process.exit(0);
  }

  const repoRoot = gitTopLevel(args.repo || process.cwd());
  if (!repoRoot) {
    console.error('Not a git repository.');
    process.exit(2);
  }
  if (!bugbotGateEnabled()) {
    console.log('git.bugbot_before_commit is false. Stamp skipped.');
    process.exit(0);
  }
  if (!repoUnderAutomationPath(repoRoot)) {
    console.log('Repo not under paths.ui_tests / api / perf_tests. Stamp skipped.');
    process.exit(0);
  }
  const hash = stagedDiffHash(repoRoot);
  if (!hash) {
    console.error('No staged changes. Stage files first, then run Bugbot, then stamp.');
    process.exit(1);
  }
  const stamp = writeStamp(repoRoot, {
    stagedHash: hash,
    diffMode: 'staged',
    findingsCount: Number.isFinite(args.findings) ? args.findings : null,
    note: args.note,
  });
  console.log(`Bugbot stamp OK (${stamp.stagedHash.slice(0, 12)}…)`);
  console.log(`  repo: ${repoRoot}`);
}

main();
