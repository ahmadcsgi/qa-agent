#!/usr/bin/env node
/**
 * Interactive onboard wizard.
 *
 * 1) Shows learn/activation table (where stored / when active)
 * 2) Installs MCP catalog as full (setup-mcp)
 * 3) Asks squad + UI/API/perf paths
 * 4) Tooling picker: missing git/k6/java/mvn → enter 1,2 or 5=all
 * 5) Enables mcp.path_aware + runs mcp-mode auto
 *
 * Usage:
 *   node scripts/onboard-wizard.js
 *   node scripts/onboard-wizard.js --skip-mcp   # paths/tooling only
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');
const { learnActivationRows, readPref } = require('./mcp-lib');

function ask(rl, q, def) {
  const hint = def ? ` [${def}]` : '';
  return new Promise((resolve) => {
    rl.question(`${q}${hint}: `, (ans) => {
      const t = (ans || '').trim();
      resolve(t || def || '');
    });
  });
}

function store(...args) {
  if (!fs.existsSync(STORE)) {
    console.error('Missing', STORE);
    console.error('Run install.ps1 / install.sh first. See docs/FIRST_RUN.md');
    process.exit(1);
  }
  const r = spawnSync(process.execPath, [STORE, ...args], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  if (r.status !== 0) {
    console.error((r.stderr || r.stdout || '').trim() || args.join(' '));
  }
  return (r.stdout || '').trim();
}

function prefGet(key) {
  const out = store('pref', 'get', key, '--project', 'auto');
  if (!out || out === 'null') return '';
  try {
    const j = JSON.parse(out);
    return typeof j === 'string' ? j : String(j);
  } catch {
    return out.replace(/^"|"$/g, '');
  }
}

function prefSet(key, val) {
  store('pref', 'set', key, val, '--project', 'auto');
}

function printTable(title, rows) {
  console.log('');
  console.log(title);
  console.log('-'.repeat(Math.min(72, title.length + 8)));
  const w0 = Math.max(...rows.map((r) => r[0].length), 4);
  const w1 = Math.max(...rows.map((r) => r[1].length), 4);
  for (const [a, b, c] of rows) {
    console.log(`  ${a.padEnd(w0)}  |  ${b.padEnd(w1)}  |  ${c}`);
  }
  console.log('');
}

function hasCmd(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: true, windowsHide: true });
  return r.status === 0;
}

function detectTools() {
  return [
    {
      id: 1,
      key: 'git',
      label: 'Git',
      ok: hasCmd('git', ['--version']),
      install: () =>
        spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-git.js'), '--install'], {
          stdio: 'inherit',
        }),
    },
    {
      id: 2,
      key: 'k6',
      label: 'k6 (perf)',
      ok: hasCmd('k6', ['version']) || hasCmd('k6', ['--version']),
      install: () =>
        spawnSync(
          process.execPath,
          [path.join(REPO, 'scripts', 'setup-tooling.js'), '--install'],
          { stdio: 'inherit', input: 'y\nn\nn\n' }
        ),
    },
    {
      id: 3,
      key: 'java',
      label: 'Java (API / Karate)',
      ok: hasCmd('java', ['-version']) || hasCmd('java', ['--version']),
      install: () =>
        spawnSync(
          process.execPath,
          [path.join(REPO, 'scripts', 'setup-tooling.js'), '--install'],
          { stdio: 'inherit' }
        ),
    },
    {
      id: 4,
      key: 'mvn',
      label: 'Maven (API)',
      ok: hasCmd('mvn', ['-v']) || hasCmd('mvn', ['--version']),
      install: () =>
        spawnSync(
          process.execPath,
          [path.join(REPO, 'scripts', 'setup-tooling.js'), '--install'],
          { stdio: 'inherit' }
        ),
    },
  ];
}

async function toolingPicker(rl) {
  const tools = detectTools();
  const missing = tools.filter((t) => !t.ok);
  console.log('--- Tooling ---');
  for (const t of tools) {
    console.log(`  ${t.ok ? 'OK ' : 'MISS'}  ${t.id}. ${t.label}`);
  }
  if (!missing.length) {
    console.log('All listed tools present.');
    return;
  }
  console.log('');
  console.log('Install missing? Enter numbers separated by comma.');
  console.log('  1=Git  2=k6  3=Java  4=Maven  5=ALL missing');
  console.log('  Example: 1,2   or   5');
  console.log('  Enter = skip');
  const ans = await ask(rl, 'Choice', '');
  if (!ans) {
    console.log('Skipped tooling install.');
    return;
  }
  let ids = ans
    .split(/[,\s]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
  if (ids.includes(5)) ids = missing.map((t) => t.id);
  const want = new Set(ids);
  for (const t of missing) {
    if (!want.has(t.id)) continue;
    console.log(`\nInstalling ${t.label}...`);
    if (t.key === 'git') {
      spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-git.js')], {
        stdio: 'inherit',
      });
    } else {
      // setup-tooling interactive for java/mvn/k6 — run once for remaining
      spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-tooling.js')], {
        stdio: 'inherit',
      });
      break;
    }
  }
}

function updateProjectContext({ squad, ui, api, perf }) {
  const ctx = path.join(process.cwd(), '.cursor', 'qa-memory', 'project-context', 'current.md');
  const tpl = path.join(REPO, '.cursor', 'templates', 'project-context.current.md');
  if (!fs.existsSync(ctx) && fs.existsSync(tpl)) {
    fs.mkdirSync(path.dirname(ctx), { recursive: true });
    fs.copyFileSync(tpl, ctx);
  }
  if (!fs.existsSync(ctx)) return;
  let text = fs.readFileSync(ctx, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  text = text.replace(/\*\*Last updated:\*\*.*/, `**Last updated:** ${today}`);
  const block = [
    '',
    '<!-- onboard-wizard -->',
    squad ? `- squad.name: ${squad}` : '',
    ui ? `- paths.ui_tests: ${ui}` : '',
    api ? `- paths.api_tests: ${api}` : '',
    perf ? `- paths.perf_tests: ${perf}` : '',
    '- mcp.path_aware: true (lite outside paths; ui/api/perf profiles inside)',
    '',
  ]
    .filter(Boolean)
    .join('\n');
  if (!text.includes('<!-- onboard-wizard -->')) {
    text = text.trimEnd() + '\n' + block + '\n';
  }
  fs.writeFileSync(ctx, text, 'utf8');
  store('proj', 'sync');
}

function syncCypress(ui) {
  if (!ui) return;
  const mcpPath = path.join(HOME, '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpPath)) return;
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
  } catch {
    return;
  }
  if (!cfg.mcpServers || !cfg.mcpServers.cypress) return;
  cfg.mcpServers.cypress.env = cfg.mcpServers.cypress.env || {};
  cfg.mcpServers.cypress.env.CYPRESS_PROJECT_PATH = ui;
  fs.writeFileSync(mcpPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
  // also sync catalog
  const cat = path.join(HOME, '.qa-agent', 'mcp', 'catalog.json');
  if (fs.existsSync(cat)) {
    try {
      const c = JSON.parse(fs.readFileSync(cat, 'utf8'));
      if (c.mcpServers && c.mcpServers.cypress) {
        c.mcpServers.cypress.env = c.mcpServers.cypress.env || {};
        c.mcpServers.cypress.env.CYPRESS_PROJECT_PATH = ui;
        fs.writeFileSync(cat, JSON.stringify(c, null, 2) + '\n', 'utf8');
      }
    } catch {
      /* ignore */
    }
  }
  console.log('Synced Cypress CYPRESS_PROJECT_PATH →', ui);
}

async function main() {
  const skipMcp = process.argv.includes('--skip-mcp');
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`Usage: node scripts/onboard-wizard.js [--skip-mcp]

Interactive onboard: learn table → full MCP → squad/paths → tooling picker → mcp auto.`);
    return;
  }

  console.log('QA Agent onboard wizard');
  console.log(`  Platform: ${process.platform}`);
  console.log(`  CWD: ${process.cwd()}`);
  console.log('');

  store('proj', 'ensure');

  const curPaths = {
    ui: prefGet('paths.ui_tests') || readPref('paths.ui_tests'),
    api: prefGet('paths.api_tests') || readPref('paths.api_tests'),
    perf: prefGet('paths.perf_tests') || readPref('paths.perf_tests'),
  };

  printTable(
    'What QA Agent uses (learned defaults) | Stored | Active when',
    [['Tool / pref', 'Stored at', 'Active when'], ...learnActivationRows(curPaths)]
  );
  console.log('Onboard installs MCP catalog in FULL (all 6). Day-to-day:');
  console.log('  outside test paths → lite (Shortcut, TestRail, Glean)');
  console.log('  under UI path → ui profile (Cypress + Playwright + Context7)');
  console.log('  under API / perf paths → api / perf profiles');
  console.log('  Switch: node scripts/mcp-mode.js auto');
  console.log('');

  if (!skipMcp) {
    console.log('--- MCP full install (tokens) ---');
    console.log('Running setup-mcp.js --full ...');
    const mcp = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-mcp.js'), '--full'], {
      stdio: 'inherit',
    });
    if (mcp.status !== 0) {
      console.log('setup-mcp exited with', mcp.status, '- continue anyway if mcp.json already set.');
    }
  } else {
    console.log('Skipped MCP setup (--skip-mcp).');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n--- Identity & paths ---');
  const squad = await ask(rl, '1. Team / squad name', prefGet('squad.name'));
  console.log('2. Local absolute paths:');
  const ui = await ask(rl, '   A. UI testing (Cypress/Playwright repo)', prefGet('paths.ui_tests'));
  const api = await ask(rl, '   B. API testing (Karate/Maven repo)', prefGet('paths.api_tests'));
  const perf = await ask(rl, '   C. Performance testing (k6 repo)', prefGet('paths.perf_tests'));

  if (squad) prefSet('squad.name', squad);
  if (ui) prefSet('paths.ui_tests', ui);
  if (api) prefSet('paths.api_tests', api);
  if (perf) prefSet('paths.perf_tests', perf);
  prefSet('mcp.path_aware', 'true');

  updateProjectContext({ squad, ui, api, perf });
  syncCypress(ui);

  console.log('');
  await toolingPicker(rl);
  rl.close();

  console.log('\n--- Apply path-aware MCP ---');
  spawnSync(process.execPath, [path.join(REPO, 'scripts', 'mcp-mode.js'), 'auto'], {
    stdio: 'inherit',
  });

  const paths = { ui, api, perf };
  printTable(
    'Activation map (after your answers)',
    [['Tool / pref', 'Stored at', 'Active when'], ...learnActivationRows(paths)]
  );

  spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-status.js')], {
    stdio: 'inherit',
  });

  console.log('Next:');
  console.log('  1. Reload Cursor window (MCP)');
  console.log('  2. Open your UI/API/perf repo → run: node scripts/mcp-mode.js auto');
  console.log('  3. /qa  for daily work');
  console.log('');
  console.log('Private CSG overlay (optional): place onboard.md offline. See docs/ONBOARDING.md');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
