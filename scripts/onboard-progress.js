#!/usr/bin/env node
/**
 * Onboard progress / Ready / resume hints.
 *
 * Usage:
 *   node scripts/onboard-progress.js
 *   node scripts/onboard-progress.js --json
 *   node scripts/onboard-progress.js --resume
 *   node scripts/onboard-progress.js --tools
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { parsePathList, validatePathList, resolveAutoProfile, readPref } = require('./mcp-lib');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');

function exists(p) {
  return fs.existsSync(p);
}

function cmdOk(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: true, windowsHide: true }).status === 0;
}

function pref(key) {
  if (!exists(STORE)) return '';
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

function mark(ok, soft) {
  if (ok) return '✓';
  return soft ? '!' : '✗';
}

function detectTools() {
  return [
    { id: 1, key: 'git', label: 'Git', ok: cmdOk('git', ['--version']) },
    {
      id: 2,
      key: 'k6',
      label: 'k6',
      ok: cmdOk('k6', ['version']) || cmdOk('k6', ['--version']),
    },
    {
      id: 3,
      key: 'java',
      label: 'Java',
      ok: cmdOk('java', ['-version']) || cmdOk('java', ['--version']),
    },
    {
      id: 4,
      key: 'mvn',
      label: 'Maven',
      ok: cmdOk('mvn', ['-v']) || cmdOk('mvn', ['--version']),
    },
  ];
}

function catalogKeys() {
  const p = path.join(HOME, '.qa-agent', 'mcp', 'catalog.json');
  if (!exists(p)) return [];
  try {
    return Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).mcpServers || {});
  } catch {
    return [];
  }
}

function activeKeys() {
  const p = path.join(HOME, '.cursor', 'mcp.json');
  if (!exists(p)) return [];
  try {
    return Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).mcpServers || {});
  } catch {
    return [];
  }
}

function activeProfile() {
  const p = path.join(HOME, '.qa-agent', 'mcp', 'active-profile.txt');
  if (!exists(p)) return '';
  return fs.readFileSync(p, 'utf8').trim();
}

function pathOk(raw) {
  if (!raw) return { set: false, valid: false, list: [], missing: [] };
  const v = validatePathList(raw);
  return { set: true, valid: v.missing.length === 0, list: v.list, missing: v.missing, warnings: v.warnings };
}

function collect() {
  const fullNeed = ['shortcut', 'testrail', 'glean', 'context7', 'cypress', 'playwright'];
  const cat = catalogKeys();
  const act = activeKeys();
  const catalogFull = fullNeed.every((k) => cat.includes(k));
  const squad = pref('squad.name');
  const ui = pref('paths.ui_tests') || readPref('paths.ui_tests');
  const api = pref('paths.api_tests') || readPref('paths.api_tests');
  const perf = pref('paths.perf_tests') || readPref('paths.perf_tests');
  const pathAware = /^(true|1|yes)$/i.test(pref('mcp.path_aware'));
  const hook = exists(path.join(HOME, '.cursor', 'hooks', 'qa-mcp-auto.js'));
  const tools = detectTools();
  const uiP = pathOk(ui);
  const apiP = pathOk(api);
  const perfP = pathOk(perf);
  const auto = resolveAutoProfile(process.cwd(), { ui, api, perf });
  const profile = activeProfile() || '(unknown)';

  const steps = [
    {
      id: 'install',
      label: 'Installer / store.js',
      done: exists(STORE),
      soft: false,
    },
    {
      id: 'learn',
      label: 'Learn table reviewed',
      done: true,
      soft: true,
      note: 'always available via --print-learn',
    },
    {
      id: 'mcp_catalog',
      label: 'MCP catalog full (6)',
      done: catalogFull,
      soft: false,
      note: catalogFull ? cat.join(', ') : 'run setup-mcp --full / wizard',
    },
    {
      id: 'squad',
      label: 'squad.name',
      done: !!squad,
      soft: true,
      note: squad || 'ask user',
    },
    {
      id: 'paths_ui',
      label: 'paths.ui_tests',
      done: uiP.set && uiP.valid,
      soft: true,
      note: !uiP.set ? 'ask user' : uiP.missing.length ? `missing: ${uiP.missing.join(' | ')}` : ui,
    },
    {
      id: 'paths_api',
      label: 'paths.api_tests',
      done: !api || (apiP.set && apiP.valid),
      soft: true,
      note: !api ? 'optional / skip ok' : apiP.missing.length ? `missing: ${apiP.missing.join(' | ')}` : api,
    },
    {
      id: 'paths_perf',
      label: 'paths.perf_tests',
      done: !perf || (perfP.set && perfP.valid),
      soft: true,
      note: !perf ? 'optional / skip ok' : perfP.missing.length ? `missing: ${perfP.missing.join(' | ')}` : perf,
    },
    {
      id: 'path_aware',
      label: 'mcp.path_aware',
      done: pathAware,
      soft: false,
      note: pathAware ? 'true' : 'wizard sets this',
    },
    {
      id: 'hook',
      label: 'sessionStart MCP hook',
      done: hook,
      soft: true,
      note: hook ? '~/.cursor/hooks/qa-mcp-auto.js' : 'install-mcp-hook.js',
    },
    {
      id: 'profile',
      label: 'Active MCP profile',
      done: !!profile && profile !== '(unknown)',
      soft: true,
      note: `${profile} (auto would: ${auto.profile})`,
    },
  ];

  const next = steps.find((s) => !s.done && !s.soft) || steps.find((s) => !s.done) || null;
  const missingTools = tools.filter((t) => !t.ok);

  return {
    version: exists(path.join(REPO, 'VERSION'))
      ? fs.readFileSync(path.join(REPO, 'VERSION'), 'utf8').trim()
      : '',
    projectHint: process.cwd(),
    steps,
    next: next ? next.id : null,
    nextLabel: next ? next.label : null,
    tools,
    missingTools,
    prefs: { squad, ui, api, perf, pathAware },
    mcp: {
      catalog: cat,
      active: act,
      catalogFull,
      profile,
      autoWould: auto.profile,
      autoReason: auto.reason,
    },
    resume: {
      needSquad: !squad,
      needUi: !uiP.set || !uiP.valid,
      needApi: api && apiP.missing.length > 0,
      needPerf: perf && perfP.missing.length > 0,
      needMcp: !catalogFull,
      needHook: !hook,
      needPathAware: !pathAware,
      askTools: missingTools.length > 0,
    },
  };
}

function printReady(data) {
  console.log('QA Agent Ready / progress');
  console.log(`  VERSION: ${data.version || '?'}`);
  console.log(`  CWD: ${data.projectHint}`);
  console.log(`  MCP active: ${data.mcp.profile} (auto would: ${data.mcp.autoWould})`);
  console.log('');
  const w = Math.max(...data.steps.map((s) => s.label.length), 8);
  for (const s of data.steps) {
    const m = mark(s.done, s.soft);
    const pad = ' '.repeat(w - s.label.length);
    console.log(`  ${m}  ${s.label}${pad}  ${s.note || ''}`);
  }
  console.log('');
  console.log('Tooling');
  for (const t of data.tools) {
    console.log(`  ${t.ok ? 'OK  ' : 'MISS'}  ${t.id}. ${t.label}`);
  }
  if (data.nextLabel) {
    console.log('');
    console.log(`Next incomplete: ${data.nextLabel} (${data.next})`);
  } else {
    console.log('');
    console.log('Core steps look complete. Optional: Part C overlay (private onboard.md).');
  }
  console.log('Legend: ✓ done · ! optional/soft · ✗ blocking');
}

function printResume(data) {
  const r = data.resume;
  console.log('Resume hints for /qa onboard');
  console.log(`  Project cwd: ${data.projectHint}`);
  console.log(`  Prefs are per Cursor project id (multi-product = open that folder).`);
  if (r.needMcp) console.log('  - Still need: MCP catalog full');
  if (r.needSquad) console.log('  - Still need: squad.name');
  if (r.needUi) console.log('  - Still need: valid paths.ui_tests');
  if (r.needApi) console.log('  - Fix: paths.api_tests (path missing on disk)');
  if (r.needPerf) console.log('  - Fix: paths.perf_tests (path missing on disk)');
  if (r.needPathAware) console.log('  - Still need: mcp.path_aware');
  if (r.needHook) console.log('  - Still need: sessionStart hook');
  if (r.askTools) {
    console.log(
      `  - Tooling missing: ${data.missingTools.map((t) => `${t.id}=${t.key}`).join(', ')}`
    );
  }
  if (
    !r.needMcp &&
    !r.needSquad &&
    !r.needUi &&
    !r.needPathAware &&
    !r.needHook &&
    !r.askTools
  ) {
    console.log('  - Core onboard complete. Offer Part C (CSG overlay) if onboard.md present.');
  }
}

function printTools(data) {
  console.log('Tooling detect');
  for (const t of data.tools) {
    console.log(`  ${t.ok ? 'OK  ' : 'MISS'}  ${t.id}. ${t.label}`);
  }
  if (!data.missingTools.length) console.log('All listed tools present.');
  else {
    console.log('');
    console.log('Ask user: 1=Git 2=k6 3=Java 4=Maven 5=all missing · or skip');
    console.log(`Suggested if they want everything missing: 5`);
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/onboard-progress.js [--json|--resume|--tools]

Ready table + resume hints for chat onboard.`);
    return;
  }
  const data = collect();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (argv.includes('--tools')) {
    printTools(data);
    return;
  }
  if (argv.includes('--resume')) {
    printReady(data);
    printResume(data);
    return;
  }
  printReady(data);
}

module.exports = { collect, detectTools, printReady, printResume, printTools };

if (require.main === module) main();
