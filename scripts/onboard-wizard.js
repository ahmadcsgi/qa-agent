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
  const list = [
    {
      id: 1,
      key: 'git',
      label: 'Git (host)',
      ok: hasCmd('git', ['--version']),
    },
    {
      id: 2,
      key: 'k6',
      label: 'k6 host (optional)',
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
  if (process.platform === 'win32') {
    let wslK6 = false;
    let wslOk = false;
    try {
      const { wslAvailable, wslCmdOk } = require('./setup-wsl-tooling');
      wslOk = wslAvailable();
      wslK6 = wslOk && wslCmdOk('command -v k6 >/dev/null 2>&1 && (k6 version || k6 --version)');
    } catch {
      /* ignore */
    }
    list.push({
      id: 6,
      key: 'k6-wsl',
      label: wslOk ? 'k6 in WSL (recommended for perf)' : 'k6 in WSL (install WSL first)',
      ok: wslK6,
      needsWsl: true,
    });
  }
  return list;
}

function installSelectedTools(ids) {
  const tools = detectTools();
  const missing = tools.filter((t) => !t.ok);
  let wantIds = ids.slice();
  if (wantIds.includes(5)) {
    wantIds = missing.filter((t) => t.id !== 6).map((t) => t.id);
    // on Windows, 5 also implies WSL k6 if missing
    if (process.platform === 'win32' && missing.some((t) => t.id === 6)) wantIds.push(6);
  }
  const want = new Set(wantIds);
  const onlyKeys = [];
  for (const t of missing) {
    if (!want.has(t.id)) continue;
    if (t.key === 'git') {
      console.log(`\nInstalling ${t.label}...`);
      spawnSync(process.execPath, [path.join(REPO, 'scripts', 'setup-git.js'), '--install'], {
        stdio: 'inherit',
      });
    } else if (t.key === 'k6-wsl') {
      console.log(`\nInstalling k6 into WSL...`);
      spawnSync(
        process.execPath,
        [
          path.join(REPO, 'scripts', 'setup-wsl-tooling.js'),
          '--install',
          '--non-interactive',
          '--only',
          'k6,curl',
        ],
        { stdio: 'inherit' }
      );
    } else {
      onlyKeys.push(t.key === 'k6' ? 'k6' : t.key);
    }
  }
  if (onlyKeys.length) {
    console.log(`\nInstalling host: ${onlyKeys.join(', ')}...`);
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
    console.log('  1=Git  2=k6 host  3=Java  4=Maven  5=ALL host missing');
    if (process.platform === 'win32') {
      console.log('  6=k6 in WSL (recommended for perf runs)');
    }
    console.log('  Example: 1,6   or   5');
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

function printChatSummary({ squad, ui, api, perf, tools, profileHint, prevProfile, changed }) {
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
  if (changed && prevProfile && profileHint && prevProfile !== profileHint) {
    console.log(`profile switched: ${prevProfile} > ${profileHint}`);
    console.log('ACTION: Reload Cursor window once (MCP panel).');
  } else {
    console.log('Next: Reload Cursor window once if MCP list looks stale.');
  }
  console.log('Multi-product: prefs follow the folder you open (proj ensure per cwd).');
  console.log('=== end summary ===');
  console.log('');
}

function formText(lang) {
  if (lang === 'en') {
    return `Onboard — fill in below (copy, edit, send back)

1. Team / squad name
   example: Dragon

2. Local absolute paths. Leave blank or write skip if none yet.
   Multi-repo: pathA|pathB

   A. UI testing (Cypress / Playwright)
   B. API testing (Karate / Maven)
   C. Performance testing (k6)

3. Install tooling that is missing?
   1 = Git (host)
   2 = k6 host (optional)
   3 = Java
   4 = Maven
   5 = all host missing
   6 = k6 in WSL (recommended for perf on Windows)

   Answer: 1,6   or  5   or  skip`;
  }
  return `Onboard — isi data di bawah (salin, edit, kirim balik)

1. Nama team / squad
   contoh: Dragon

2. Path lokal (absolut). Kosongkan atau tulis skip jika belum ada.
   Multi-repo: pathA|pathB

   A. UI testing (Cypress / Playwright)
   B. API testing (Karate / Maven)
   C. Performance testing (k6)

3. Install tooling yang belum terpasang?
   1 = Git (host)
   2 = k6 host (optional)
   3 = Java
   4 = Maven
   5 = semua host yang missing
   6 = k6 di WSL (disarankan untuk perf di Windows)

   Jawab: 1,6   atau  5   atau  skip`;
}

function parseCli(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0 || !argv[i + 1]) return '';
    return argv[i + 1];
  };
  const langRaw = (get('--lang') || 'id').toLowerCase();
  return {
    help: argv.includes('--help') || argv.includes('-h'),
    skipMcp: argv.includes('--skip-mcp'),
    printLearn: argv.includes('--print-learn'),
    printForm: argv.includes('--print-form'),
    printTools: argv.includes('--print-tools'),
    resume: argv.includes('--resume'),
    dryRun: argv.includes('--dry-run'),
    apply: argv.includes('--apply'),
    lang: langRaw === 'en' ? 'en' : 'id',
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

async function applyAnswers({ squad, ui, api, perf, tools, skipMcp, interactive, dryRun }) {
  const norm = (v) => {
    const t = (v || '').trim();
    if (!t || /^skip$/i.test(t)) return '';
    return t;
  };
  squad = norm(squad);
  ui = norm(ui);
  api = norm(api);
  perf = norm(perf);

  if (dryRun) {
    console.log('--- DRY RUN (no writes) ---');
    console.log({ squad, ui, api, perf, tools: tools || '(none)', skipMcp: !!skipMcp });
    reportPathValidation('UI', ui);
    reportPathValidation('API', api);
    reportPathValidation('perf', perf);
    spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-progress.js'), '--tools'], {
      stdio: 'inherit',
    });
    console.log('Re-run without --dry-run to apply.');
    return;
  }

  // Block apply if UI path set but missing on disk (re-ask signal for chat)
  if (ui) {
    const v = validatePathList(ui);
    if (v.missing.length) {
      console.error('BLOCK: UI path(s) not found on disk:');
      for (const m of v.missing) console.error('  -', m);
      console.error('Fix paths and re-run --apply (or use --dry-run to preview).');
      process.exit(2);
    }
  }
  for (const [label, raw] of [
    ['API', api],
    ['perf', perf],
  ]) {
    if (!raw) continue;
    const v = validatePathList(raw);
    if (v.missing.length) {
      console.error(`BLOCK: ${label} path(s) not found:`);
      for (const m of v.missing) console.error('  -', m);
      process.exit(2);
    }
  }

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

  try {
    const { syncOnboardVersion } = require('./onboard-learn');
    const sync = syncOnboardVersion(REPO);
    if (sync.updated) console.log(`Synced onboard.md Aligned with: v${sync.version}`);
  } catch {
    /* private onboard optional */
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
    console.log(
      'Synced project path env on:',
      synced.map((p) => path.basename(path.dirname(p)) + '/' + path.basename(p)).join(', ')
    );
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

  const statePath = path.join(HOME, '.qa-agent', 'mcp', 'active-profile.txt');
  const prevProfile = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8').trim() : '';

  console.log('\n--- Apply path-aware MCP ---');
  const auto = spawnSync(process.execPath, [path.join(REPO, 'scripts', 'mcp-mode.js'), 'auto'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const autoOut = ((auto.stdout || '') + (auto.stderr || '')).trim();
  if (autoOut) console.log(autoOut);

  const paths = { ui, api, perf };
  showLearnTable(paths);

  spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-progress.js')], {
    stdio: 'inherit',
  });

  const profileHint =
    (autoOut.match(/MCP profile:\s*(\w+)/) || autoOut.match(/pick:\s*(\w+)/) || [])[1] || '';
  const changed = /switched|MCP profile:/i.test(autoOut) && !/unchanged/i.test(autoOut);
  printChatSummary({ squad, ui, api, perf, tools, profileHint, prevProfile, changed });

  console.log('Next:');
  console.log('  1. Reload Cursor window once if profile changed or MCP list stale');
  console.log('  2. Optional Part C (private org overlay) if onboard.md present');
  console.log('  3. /qa for daily work');
  console.log('');
}

async function main() {
  const opts = parseCli(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage:
  node scripts/onboard-wizard.js
  node scripts/onboard-wizard.js --print-learn
  node scripts/onboard-wizard.js --print-form [--lang id|en]
  node scripts/onboard-wizard.js --print-tools
  node scripts/onboard-wizard.js --resume
  node scripts/onboard-wizard.js --dry-run --squad NAME --ui PATH ...
  node scripts/onboard-wizard.js --apply --squad NAME --ui PATH [--api PATH] [--perf PATH] [--tools 1,2] [--skip-mcp]

Multi-path: pathA|pathB
Chat: --resume > --print-learn > --print-tools > --print-form > --apply`);
    return;
  }

  store('proj', 'ensure');

  const curPaths = {
    ui: prefGet('paths.ui_tests') || readPref('paths.ui_tests'),
    api: prefGet('paths.api_tests') || readPref('paths.api_tests'),
    perf: prefGet('paths.perf_tests') || readPref('paths.perf_tests'),
  };

  if (opts.resume) {
    spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-progress.js'), '--resume'], {
      stdio: 'inherit',
    });
    return;
  }
  if (opts.printTools) {
    spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-progress.js'), '--tools'], {
      stdio: 'inherit',
    });
    return;
  }
  if (opts.printForm) {
    console.log(formText(opts.lang));
    return;
  }
  if (opts.printLearn) {
    showLearnTable(curPaths);
    return;
  }
  if (opts.apply || opts.dryRun) {
    if (!opts.dryRun) {
      console.log('QA Agent onboard wizard');
      console.log(`  Platform: ${process.platform}`);
      console.log(`  CWD: ${process.cwd()}`);
    }
    await applyAnswers({
      squad: opts.squad || prefGet('squad.name'),
      ui: opts.ui || curPaths.ui,
      api: opts.api || curPaths.api,
      perf: opts.perf || curPaths.perf,
      tools: opts.tools,
      skipMcp: opts.skipMcp,
      interactive: false,
      dryRun: !!opts.dryRun,
    });
    return;
  }

  console.log('QA Agent onboard wizard');
  console.log(`  Platform: ${process.platform}`);
  console.log(`  CWD: ${process.cwd()}`);
  showLearnTable(curPaths);

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
  console.log('(Enter keeps current. Type skip to clear optional.)');
  const squad = await ask(rl, '1. Team / squad name', prefGet('squad.name'));
  console.log('2. Local absolute paths:');
  let ui = await ask(rl, '   A. UI testing (Cypress/Playwright)', curPaths.ui);
  let api = await ask(rl, '   B. API testing (Karate/Maven)', curPaths.api);
  let perf = await ask(rl, '   C. Performance testing (k6)', curPaths.perf);

  // Re-ask once if path missing
  for (let i = 0; i < 1; i++) {
    const checks = [
      ['A UI', 'ui', ui],
      ['B API', 'api', api],
      ['C perf', 'perf', perf],
    ];
    let bad = false;
    for (const [label, key, raw] of checks) {
      if (!raw || /^skip$/i.test(raw)) continue;
      const v = validatePathList(raw);
      if (v.missing.length) {
        bad = true;
        console.log(`Path not found (${label}): ${v.missing.join(' | ')}`);
        const again = await ask(rl, `   Re-enter ${label} (or skip)`, raw);
        if (key === 'ui') ui = again;
        if (key === 'api') api = again;
        if (key === 'perf') perf = again;
      }
    }
    if (!bad) break;
  }

  spawnSync(process.execPath, [path.join(REPO, 'scripts', 'onboard-progress.js'), '--tools'], {
    stdio: 'inherit',
  });
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
    dryRun: false,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
