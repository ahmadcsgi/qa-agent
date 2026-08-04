#!/usr/bin/env node
/**
 * Validate paths.* prefs and related install health (no secrets).
 * Usage: node scripts/validate-paths.js [--json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');
const STALE_DAYS = 7;

function norm(p) {
  if (!p) return '';
  return path.resolve(String(p).trim()).replace(/\\/g, '/').toLowerCase();
}

function pref(key) {
  if (!fs.existsSync(STORE)) return '';
  const r = spawnSync(process.execPath, [STORE, 'pref', 'get', key, '--project', 'auto'], {
    encoding: 'utf8',
    cwd: process.cwd(),
    windowsHide: true,
  });
  const out = (r.stdout || '').trim();
  if (!out || out === 'null') return '';
  try {
    const j = JSON.parse(out);
    return typeof j === 'string' ? j : String(j);
  } catch {
    return out.replace(/^"|"$/g, '');
  }
}

function parsePathList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function projectContextAgeDays() {
  const candidates = [
    path.join(REPO, '.cursor', 'qa-memory', 'project-context', 'current.md'),
    path.join(process.cwd(), '.cursor', 'qa-memory', 'project-context', 'current.md'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const stat = fs.statSync(p);
    return (Date.now() - stat.mtimeMs) / (86400 * 1000);
  }
  return null;
}

function validate() {
  const errors = [];
  const warnings = [];

  const ui = pref('paths.ui_tests');
  const api = pref('paths.api_tests');
  const perf = pref('paths.perf_tests');

  const uiList = parsePathList(ui);
  const apiList = parsePathList(api);
  const perfList = parsePathList(perf);

  if (ui && api && norm(uiList[0]) && norm(uiList[0]) === norm(apiList[0])) {
    errors.push('paths.ui_tests equals paths.api_tests (UI MCP profile will not activate in UI repo)');
  }

  for (const [label, list] of [
    ['paths.ui_tests', uiList],
    ['paths.api_tests', apiList],
    ['paths.perf_tests', perfList],
  ]) {
    for (const p of list) {
      if (!fs.existsSync(p)) {
        errors.push(`${label} path not found: ${p}`);
      }
    }
  }

  const age = projectContextAgeDays();
  if (age === null) {
    warnings.push('project-context/current.md missing (run @qa-project-mapping)');
  } else if (age > STALE_DAYS) {
    warnings.push(`project-context/current.md older than ${STALE_DAYS}d (${Math.floor(age)}d)`);
  }

  const hooksPath = path.join(HOME, '.cursor', 'hooks');
  if (fs.existsSync(hooksPath) && !fs.statSync(hooksPath).isDirectory()) {
    errors.push('~/.cursor/hooks is a file, not a directory (run: node scripts/install-mcp-hook.js)');
  }

  const globalRefs = path.join(HOME, '.cursor', 'references', 'cypress-testing.md');
  if (!fs.existsSync(globalRefs)) {
    warnings.push('~/.cursor/references/cypress-testing.md missing (re-run install.ps1 / install.sh)');
  }

  const hookJs = path.join(hooksPath, 'qa-mcp-auto.js');
  if (!fs.existsSync(hookJs)) {
    warnings.push('MCP sessionStart hook missing (run: node scripts/install-mcp-hook.js)');
  }

  return { errors, warnings, prefs: { ui, api, perf } };
}

function main() {
  const json = process.argv.includes('--json');
  const result = validate();
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors.length ? 1 : 0);
  }
  console.log('Path & install validation');
  if (result.errors.length) {
    console.log('\nErrors:');
    result.errors.forEach((e) => console.log(`  ✗ ${e}`));
  }
  if (result.warnings.length) {
    console.log('\nWarnings:');
    result.warnings.forEach((w) => console.log(`  ! ${w}`));
  }
  if (!result.errors.length && !result.warnings.length) {
    console.log('  ✓ no issues');
  }
  console.log('\nFix paths: node scripts/setup-prefs.js or /qa onboard');
  process.exit(result.errors.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = { validate, norm, parsePathList };
