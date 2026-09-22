#!/usr/bin/env node
/**
 * Git pre-commit hook: require fresh Bugbot stamp on automation path repos.
 */
'use strict';

const path = require('path');
const { gitTopLevel, validateStampForCommit } = require('./bugbot-gate-lib');

const REPO = path.resolve(__dirname, '..');

function main() {
  const repoRoot = gitTopLevel(process.cwd());
  if (!repoRoot) process.exit(0);

  const result = validateStampForCommit(repoRoot);
  if (result.ok) process.exit(0);

  console.error('');
  console.error('QA Agent: commit blocked (automation path Bugbot gate).');
  console.error(result.reason);
  console.error('');
  console.error('Required flow:');
  console.error('  1. Stage changes (git add …)');
  console.error('  2. Local Bugbot review: /review-bugbot or ask agent for bugbot on uncommitted/staged changes');
  console.error('  3. Stamp: node "' + path.join(REPO, 'scripts', 'bugbot-stamp.js') + '" --repo "' + repoRoot + '"');
  console.error('  4. git commit …');
  console.error('');
  console.error('Override (discouraged): QA_AGENT_SKIP_BUGBOT=1 git commit …');
  console.error('Disable gate: pref set git.bugbot_before_commit false');
  process.exit(1);
}

main();
