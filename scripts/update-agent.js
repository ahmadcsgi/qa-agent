#!/usr/bin/env node
/**
 * QA Agent update: git pull → install → sync TestRail tools → doctor
 *
 * Usage:
 *   node scripts/update-agent.js
 *   node scripts/update-agent.js --dry-run
 *   node scripts/update-agent.js --skip-pull
 *   node scripts/update-agent.js --skip-install
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');
const TOOLS_SRC = path.join(REPO, 'scripts', 'testrail-tools');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipPull = args.has('--skip-pull');
const skipInstall = args.has('--skip-install');

function log(msg) {
  console.log(msg);
}

function run(cmd, cmdArgs, opts = {}) {
  const cwd = opts.cwd || REPO;
  const label = [cmd, ...(cmdArgs || [])].join(' ');
  if (dryRun) {
    log(`  [dry-run] ${label}`);
    return { status: 0, stdout: '', stderr: '' };
  }
  const r = spawnSync(cmd, cmdArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    env: { ...process.env, CI: '1', ...(opts.env || {}) },
  });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`Command failed (${r.status}): ${label}`);
  }
  return r;
}

function readPref(key) {
  if (!fs.existsSync(STORE)) return '';
  const r = spawnSync(process.execPath, [STORE, 'pref', 'get', key, '--project', 'auto'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return (r.stdout || '').trim().replace(/^"|"$/g, '');
}

function resolveTestrailMcpRoot() {
  const pref = readPref('paths.testrail_mcp');
  if (pref && fs.existsSync(pref)) return pref;
  if (process.env.TESTRAIL_MCP_ROOT && fs.existsSync(process.env.TESTRAIL_MCP_ROOT)) {
    return process.env.TESTRAIL_MCP_ROOT;
  }
  const candidates = [
    path.join(HOME, 'OneDrive - CSG Systems Inc', 'Documents', 'AI', 'MCP', 'testrail-mcp'),
    path.join(HOME, 'Documents', 'AI', 'MCP', 'testrail-mcp'),
    path.join(HOME, 'AI', 'MCP', 'testrail-mcp'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'scripts', 'lib', 'common.ps1'))) return c;
  }
  return '';
}

function gitPull() {
  log('\n1. Git pull');
  const status = run('git', ['status', '--porcelain'], { allowFail: true });
  if (status.stdout.trim()) {
    log('  ! Working tree has local changes. Pull may fail or merge.');
  }
  run('git', ['pull', '--ff-only']);
}

function installAgent() {
  log('\n2. Install / sync QA Agent');
  if (process.platform === 'win32') {
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(REPO, 'install.ps1'), '-Force']);
  } else {
    run('bash', [path.join(REPO, 'install.sh'), '--force']);
  }
}

function removeVisualSkill() {
  log('\n3. Remove retired visual skill (if present)');
  const targets = [
    path.join(HOME, '.cursor', 'skills', 'qa-visual-test'),
    path.join(REPO, '.cursor', 'skills', 'qa-visual-test'),
  ];
  for (const t of targets) {
    if (!fs.existsSync(t)) continue;
    if (dryRun) {
      log(`  [dry-run] remove ${t}`);
      continue;
    }
    fs.rmSync(t, { recursive: true, force: true });
    log(`  removed ${t}`);
  }
}

function syncTestrailTools() {
  log('\n4. Sync TestRail CLI tools');
  if (!fs.existsSync(TOOLS_SRC)) {
    log('  skip: scripts/testrail-tools missing');
    return;
  }

  const mcpRoot = resolveTestrailMcpRoot();
  const destRoots = [path.join(REPO, 'scripts', 'testrail-tools')];
  if (mcpRoot) {
    destRoots.push(path.join(mcpRoot, 'scripts', 'tools'));
  } else {
    log('  ! testrail-mcp root not found. Tools stay in repo only.');
    log('    Set pref paths.testrail_mcp or env TESTRAIL_MCP_ROOT');
  }

  const files = fs.readdirSync(TOOLS_SRC).filter((f) => f.endsWith('.ps1'));
  for (const destRoot of destRoots) {
    if (destRoot === TOOLS_SRC) continue;
    if (dryRun) {
      log(`  [dry-run] copy ${files.length} tool(s) -> ${destRoot}`);
      continue;
    }
    fs.mkdirSync(destRoot, { recursive: true });
    for (const f of files) {
      fs.copyFileSync(path.join(TOOLS_SRC, f), path.join(destRoot, f));
    }
    log(`  synced ${files.length} tool(s) -> ${destRoot}`);
  }
}

function runDoctor() {
  log('\n5. Doctor');
  run(process.execPath, [path.join(REPO, 'scripts', 'doctor.js')]);
}

function runMcpAuto() {
  if (readPref('mcp.path_aware') !== 'true') return;
  log('\n6. MCP profile auto');
  run(process.execPath, [path.join(REPO, 'scripts', 'mcp-mode.js'), 'auto', '--if-changed'], { allowFail: true });
}

function readVersion() {
  const vFile = path.join(REPO, 'VERSION');
  return fs.existsSync(vFile) ? fs.readFileSync(vFile, 'utf8').trim() : 'unknown';
}

function main() {
  log(`QA Agent update (v${readVersion()})${dryRun ? ' [dry-run]' : ''}`);
  if (!skipPull) gitPull();
  else log('\n1. Git pull (skipped)');

  if (!skipInstall) installAgent();
  else log('\n2. Install (skipped)');

  removeVisualSkill();
  syncTestrailTools();
  runDoctor();
  runMcpAuto();

  log('\nUpdate complete.');
  log('Reload Cursor window once if skills or MCP profile changed.');
  log('TestRail tools: scripts/testrail-tools/ (see .cursor/references/testrail-tools.md)');
}

try {
  main();
} catch (err) {
  console.error(`\nUpdate failed: ${err.message}`);
  process.exit(1);
}
