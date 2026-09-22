#!/usr/bin/env node
/**
 * Shared helpers: automation path detection + Bugbot commit stamp.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { readPref, parsePathList, anyPathUnder, normPath } = require('./mcp-lib');

const STAMP_VERSION = 1;

function automationPathRoots() {
  const roots = [];
  for (const key of ['paths.ui_tests', 'paths.api_tests', 'paths.perf_tests']) {
    roots.push(...parsePathList(readPref(key)));
  }
  return roots.filter(Boolean);
}

function gitTopLevel(startDir) {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: startDir || process.cwd(),
    encoding: 'utf8',
  });
  if (r.status !== 0) return null;
  return normPath(r.stdout.trim());
}

function repoUnderAutomationPath(repoRoot) {
  const roots = automationPathRoots();
  if (!roots.length || !repoRoot) return false;
  return anyPathUnder(repoRoot, roots.join('|'));
}

function stagedDiffHash(repoRoot) {
  const r = spawnSync('git', ['diff', '--cached', '--no-ext-diff'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.status !== 0) return null;
  const body = r.stdout || '';
  if (!body.trim()) return null;
  return crypto.createHash('sha256').update(body).digest('hex');
}

function stampFilePath(repoRoot) {
  return path.join(repoRoot, '.git', 'qa-agent-bugbot-stamp.json');
}

function readStamp(repoRoot) {
  const p = stampFilePath(repoRoot);
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeStamp(repoRoot, payload) {
  const p = stampFilePath(repoRoot);
  const data = {
    version: STAMP_VERSION,
    repoRoot: normPath(repoRoot),
    stagedHash: payload.stagedHash,
    reviewedAt: payload.reviewedAt || new Date().toISOString(),
    diffMode: payload.diffMode || 'staged',
    findingsCount: payload.findingsCount ?? null,
    note: payload.note || '',
  };
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return data;
}

function bugbotGateEnabled() {
  const v = readPref('git.bugbot_before_commit');
  if (v === false || v === 'false' || v === '0') return false;
  return true;
}

function validateStampForCommit(repoRoot) {
  if (!bugbotGateEnabled()) {
    return { ok: true, skipped: true, reason: 'pref git.bugbot_before_commit=false' };
  }
  if (process.env.QA_AGENT_SKIP_BUGBOT === '1') {
    return { ok: true, skipped: true, reason: 'QA_AGENT_SKIP_BUGBOT=1' };
  }
  if (!repoUnderAutomationPath(repoRoot)) {
    return { ok: true, skipped: true, reason: 'not under paths.ui/api/perf_tests' };
  }
  const hash = stagedDiffHash(repoRoot);
  if (!hash) {
    return { ok: true, skipped: true, reason: 'no staged changes' };
  }
  const stamp = readStamp(repoRoot);
  if (!stamp || stamp.stagedHash !== hash) {
    return {
      ok: false,
      stagedHash: hash,
      reason: 'missing or stale Bugbot stamp for staged diff',
    };
  }
  return { ok: true, stamp };
}

module.exports = {
  automationPathRoots,
  gitTopLevel,
  repoUnderAutomationPath,
  stagedDiffHash,
  stampFilePath,
  readStamp,
  writeStamp,
  bugbotGateEnabled,
  validateStampForCommit,
};
