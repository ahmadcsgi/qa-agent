#!/usr/bin/env node
/**
 * Onboard wizard (interactive or chat/--apply).
 *
 * 1) Learn/activation table (catalog vs active + links from onboard.md)
 * 2) Install MCP catalog full
 * 3) Squad + UI/API/perf paths (multi: pathA|pathB)
 * 4) Tooling picker: 1=git 2=k6 3=java 4=mvn 5=all missing
 * 5) path_aware + sessionStart hook + mcp-mode auto
 *
 * Usage:
 *   node scripts/onboard-wizard.js
 *   node scripts/onboard-wizard.js --print-learn
 *   node scripts/onboard-wizard.js --apply --squad Dragon --ui "C:\\ui" --api "C:\\api" --perf "C:\\perf" --tools 1,2
 *   node scripts/onboard-wizard.js --skip-mcp
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
const {
  learnActivationRows,
  readPref,
  parsePathList,
  formatPathList,
  validatePathList,
  syncProjectEnvPaths,
} = require('./mcp-lib');
const { learnFromOnboard, saveLearned } = require('./onboard-learn');

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
    windowsHide: true,
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
  console.log('-'.repeat(Math.min(88, Math.max(title.length + 4, 40))));
  const w0 = Math.max(...rows.map((r) => String(r[0]).length), 4);
  const w1 = Math.max(...rows.map((r) => String(r[1]).length), 4);
  for (const [a, b, c] of rows) {
    console.log(`  ${String(a).padEnd(w0)}  |  ${String(b).padEnd(w1)}  |  ${c}`);
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
    },
    {
      id: 2,
      key: 'k6',
      label: 'k6 (perf)',
      ok: hasCmd('k6', ['version']) || hasCmd('k6', ['--version']),
    },
    {
      id: 3,
      key: 'java',
      label: 'Java (API / Karate)',
      ok: hasCmd('java', ['-version']) || hasCmd('java', ['--version']),
    },
    {
      id: 4,
      key: 'mvn',
      label: 'Maven (API)',
      ok: hasCmd('mvn', ['-v']) || hasCmd('mvn', ['--version']),
    },
  ];
}

function installSelectedTools(ids) {
  const tools = detectTools();
  const missing = tools.filter((t) => !t.ok);
  let wantIds = ids.slice();
  if (wantIds.includes(5)) wantIds = missing.map((t) => t.id);
  const want = new Set(wantIds);
  const onlyKeys = [];
  for (const t of missing) {
    if (!want.has(t.id)) continue;
    if (t.key === 'git') {
      console.log(`\nInstalling ${t.label}...`);
      spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-git.js'), '--install'], {
        stdio: 'inherit',
      });
    } else {
      onlyKeys.push(t.key);
    }
  }
  if (onlyKeys.length) {
    console.log(`\nInstalling ${onlyKeys.join(', ')}...`);
    spawnSync(
      process.execPath,
      [
        path.join(REPO, 'scripts', 'setup-tooling.js'),
        '--install',
        '--non-interactive',
        '--only',
        onlyKeys.join(','),
      ],
      { stdio: 'inherit' }
    );
  }
}

function parseToolsArg(ans) {
  if (!ans) return [];
  return String(ans)
    .split(/[,\s]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n));
}

async function toolingPicker(rl, toolsArg) {
  const tools = detectTools();
  const missing = tools.filter((t) => !t.ok);
  console.log('--- Tooling ---');
  for (const t of tools) {
    console.log(`  ${t.ok ? 'OK  ' : 'MISS'}  ${t.id}. ${t.label}`);
  }
  if (!missing.length) {
    console.log('All listed tools present.');
    return;
  }
  let ans = toolsArg || '';
  if (ans === 'skip') {
    console.log('Tooling already handled.');
    return;
  }
  if (!ans && rl) {
    console.log('');
    console.log('Install missing? Enter numbers separated by comma.');
    console.log('  1=Git  2=k6  3=Java  4=Maven  5=ALL missing');
    console.log('  Example: 1,2   or   5');
    console.log('  Enter = skip');
    ans = await ask(rl, 'Choice', '');
  }
  if (!ans) {
    console.log('Skipped tooling install.');
    return;
  }
  installSelectedTools(parseToolsArg(ans));
}

function reportPathValidation(label, raw) {
  if (!raw) return;
  const v = validatePathList(raw);
  for (const w of v.warnings) console.log(`  WARN ${label}: ${w}`);
  for (const m of v.missing) console.log(`  WARN ${label}: path not found: ${m}`);
  if (v.list.length > 1) console.log(`  OK ${label}: ${v.list.length} paths (multi)`);
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
    '- mcp.path_aware: true (lite outside paths; ui/api/perf inside)',
    '- sessionStart hook: ~/.cursor/hooks/qa-mcp-auto.js',
    '',
  ]
    .filter(Boolean)
    .join('\n');
  if (text.includes('<!-- onboard-wizard -->')) {
    text = text.replace(/<!-- onboard-wizard -->[\s\S]*?(?=\n## |\n<!-- |\n*$)/, block.trim() + '\n');
  } else {
    text = text.trimEnd() + '\n' + block + '\n';
  }
  fs.writeFileSync(ctx, text, 'utf8');
  store('proj', 'sync');
}

function printChatSummary({ squad, ui, api, perf, tools, profileHint }) {
  console.log('');
  console.log('=== Copy for chat (summary) ===');
  console.log(`squad: ${squad || '(none)'}`);
  console.log(`paths.ui_tests: ${ui || '(none)'}`);
  console.log(`paths.api_tests: ${api || '(none)'}`);
  console.log(`paths.perf_tests: ${perf || '(none)'}`);
  console.log(`tools choice: ${tools || '(skipped)'}`);
  console.log(`mcp.path_aware: true`);
  console.log(`catalog: ~/.qa-agent/mcp/catalog.json (full install kept)`);
  console.log(`active: ~/.cursor/mcp.json (profile switch)`);
  console.log(`hook: ~/.cursor/hooks/qa-mcp-auto.js (sessionStart)`);
  if (profileHint) console.log(`auto profile now: ${profileHint}`);
  console.log('Next: Reload Cursor window once.');
  console.log('=== end summary ===');
  console.log('');
}

function parseCli(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0 || !argv[i + 1]) return '';
    return argv[i + 1];
  };
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    skipMcp: argv.includes('--skip-mcp'),
    printLearn: argv.includes('--print-learn'),
    apply: argv.includes('--apply'),
    squad: get('--squad'),
    ui: get('--ui'),
    api: get('--api'),
    perf: get('--perf'),
    tools: get('--tools'),
  };
}

function showLearnTable(paths) {
  const learned = learnFromOnboard(REPO);
  const rows = learnActivationRows(paths, learned.learnRows);
  printTable(
    'What QA Agent uses | Stored where | Active when',
    [['Tool / pref / link', 'Stored at', 'Active when'], ...rows]
  );
  if (learned.source) {
    console.log(`Onboard links source: ${learned.source} (${learned.kind})`);
  } else {
    console.log('No onboard.md / onboard.example.md links parsed.');
  }
  console.log('Catalog = installed once (full). Active = ~/.cursor/mcp.json after profile switch.');
  console.log('Day-to-day: outside test paths > lite. Under UI/API/perf paths > matching profile.');
  console.log('Auto switch: sessionStart hook + /qa boot runs mcp-mode auto.');
}

async function applyAnswers({ squad, ui, api, perf, tools, skipMcp, interactive }) {
  if (!skipMcp) {
    console.log('--- MCP full install (catalog) ---');
    const mcp = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-mcp.js'), '--full'], {
      stdio: 'inherit',
    });
    if (mcp.status !== 0) {
      console.log('setup-mcp exited with', mcp.status, '- continue if mcp.json already set.');
    }
  } else {
    console.log('Skipped MCP setup (--skip-mcp).');
  }

  const learned = learnFromOnboard(REPO);
  if (learned.source) {
    const n = saveLearned(learned);
    console.log(`Learned ${learned.links.length} onboard link(s). Saved ${n} pref(s).`);
  }

  if (squad) prefSet('squad.name', squad);
  if (ui) prefSet('paths.ui_tests', formatPathList(ui) || ui);
  if (api) prefSet('paths.api_tests', formatPathList(api) || api);
  if (perf) prefSet('paths.perf_tests', formatPathList(perf) || perf);
  prefSet('mcp.path_aware', 'true');

  reportPathValidation('UI', ui);
  reportPathValidation('API', api);
  reportPathValidation('perf', perf);

  updateProjectContext({ squad, ui, api, perf });
  const synced = syncProjectEnvPaths({ ui, api, perf });
  if (synced.length) {
    console.log('Synced project path env on:', synced.map((p) => path.basename(path.dirname(p)) + '/' + path.basename(p)).join(', '));
  }

  let rl = null;
  if (interactive) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }
  await toolingPicker(rl, tools);
  if (rl) rl.close();

  console.log('\n--- Install sessionStart MCP auto hook ---');
  spawnSync(process.execPath, [path.join(REPO, 'scripts', 'install-mcp-hook.js')], {
    stdio: 'inherit',
  });

  console.log('\n--- Apply path-aware MCP ---');
  const auto = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'mcp-mode.js'), 'auto'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const autoOut = ((auto.stdout || '') + (auto.stderr || '')).trim();
  if (autoOut) console.log(autoOut);

  const paths = { ui, api, perf };
  showLearnTable(paths);

  spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-status.js')], {
    stdio: 'inherit',
  });

  const profileHint = (autoOut.match(/MCP profile:\s*(\w+)/) || autoOut.match(/pick:\s*(\w+)/) || [])[1];
  printChatSummary({ squad, ui, api, perf, tools, profileHint });

  console.log('Next:');
  console.log('  1. Reload Cursor window (MCP + hooks)');
  console.log('  2. Open UI/API/perf repo. New chat runs sessionStart auto-switch.');
  console.log('  3. /qa for daily work');
  console.log('');
}

async function main() {
  const opts = parseCli(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage:
  node scripts/onboard-wizard.js
  node scripts/onboard-wizard.js --print-learn
  node scripts/onboard-wizard.js --apply --squad NAME --ui PATH [--api PATH] [--perf PATH] [--tools 1,2] [--skip-mcp]

Multi-path: separate with |  e.g. --ui "C:\\\\ui-a|C:\\\\ui-b"
Chat flow: print-learn > ask in chat > --apply with answers.`);
    return;
  }

  store('proj', 'ensure');

  const curPaths = {
    ui: prefGet('paths.ui_tests') || readPref('paths.ui_tests'),
    api: prefGet('paths.api_tests') || readPref('paths.api_tests'),
    perf: prefGet('paths.perf_tests') || readPref('paths.perf_tests'),
  };

  if (opts.printLearn) {
    showLearnTable(curPaths);
    return;
  }

  console.log('QA Agent onboard wizard');
  console.log(`  Platform: ${process.platform}`);
  console.log(`  CWD: ${process.cwd()}`);
  showLearnTable(curPaths);

  if (opts.apply) {
    await applyAnswers({
      squad: opts.squad || prefGet('squad.name'),
      ui: opts.ui || curPaths.ui,
      api: opts.api || curPaths.api,
      perf: opts.perf || curPaths.perf,
      tools: opts.tools,
      skipMcp: opts.skipMcp,
      interactive: false,
    });
    return;
  }

  if (!opts.skipMcp) {
    console.log('--- MCP full install (catalog) ---');
    console.log('Running setup-mcp.js --full ...');
    const mcp = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-mcp.js'), '--full'], {
      stdio: 'inherit',
    });
    if (mcp.status !== 0) {
      console.log('setup-mcp exited with', mcp.status, '- continue if mcp.json already set.');
    }
  } else {
    console.log('Skipped MCP setup (--skip-mcp).');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n--- Identity & paths ---');
  console.log('Tip: multiple repos per type: pathA|pathB');
  const squad = await ask(rl, '1. Team / squad name', prefGet('squad.name'));
  console.log('2. Local absolute paths:');
  const ui = await ask(rl, '   A. UI testing (Cypress/Playwright)', curPaths.ui);
  const api = await ask(rl, '   B. API testing (Karate/Maven)', curPaths.api);
  const perf = await ask(rl, '   C. Performance testing (k6)', curPaths.perf);

  await toolingPicker(rl, '');
  rl.close();

  await applyAnswers({
    squad,
    ui,
    api,
    perf,
    tools: 'skip',
    skipMcp: true,
    interactive: false,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
