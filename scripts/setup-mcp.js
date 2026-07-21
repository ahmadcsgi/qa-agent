#!/usr/bin/env node
/**
 * QA Agent — setup Cursor MCP (~/.cursor/mcp.json)
 *
 * Does NOT invent tokens. Creates / merges config; prompts for secrets.
 * Usage:
 *   node scripts/setup-mcp.js              # interactive, default = full
 *   node scripts/setup-mcp.js --full       # 6 servers
 *   node scripts/setup-mcp.js --lite
 *   node scripts/setup-mcp.js --normal     # alias of --full
 *   node scripts/setup-mcp.js --with-optional
 *   node scripts/setup-mcp.js --non-interactive --lite
 *
 * Also syncs ~/.qa-agent/mcp/catalog.json (for mcp-mode.js).
 * Auto-fills paths from prefs paths.ui_tests / paths.api_tests / paths.perf_tests.
 * Git: scripts/setup-git.js · CLI tools: scripts/setup-tooling.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const {
  MCP_PATH,
  FULL,
  LITE,
  isPlaceholder,
  mergeServers,
  syncCatalog,
  seedCatalogFromExamples,
  applyPathPrefs,
  readPref,
} = require('./mcp-lib');

const REPO = path.resolve(__dirname, '..');

const DEFAULTS = {
  TESTRAIL_URL: 'https://testrails.live.shared-services.telflow.com',
  GLEAN_URL: 'https://csg-prod-be.glean.com/mcp/default',
  SHORTCUT_URL: 'https://mcp.shortcut.com/mcp',
  CONTEXT7_URL: 'https://mcp.context7.com/mcp',
};

function parseArgs(argv) {
  const a = {
    lite: false,
    full: false,
    withOptional: false,
    nonInteractive: false,
    force: false,
    help: false,
  };
  for (const x of argv) {
    if (x === '--lite') a.lite = true;
    if (x === '--full' || x === '--normal') a.full = true;
    if (x === '--with-optional') a.withOptional = true;
    if (x === '--non-interactive') a.nonInteractive = true;
    if (x === '--force') a.force = true;
    if (x === '--help' || x === '-h') a.help = true;
  }
  if (!a.lite && !a.full) a.full = true;
  if (a.lite) a.full = false;
  if (!process.stdin.isTTY) a.nonInteractive = true;
  return a;
}

function readExisting() {
  try {
    if (!fs.existsSync(MCP_PATH)) return { mcpServers: {} };
    return JSON.parse(fs.readFileSync(MCP_PATH, 'utf8'));
  } catch {
    return { mcpServers: {} };
  }
}

function backupExisting() {
  if (!fs.existsSync(MCP_PATH)) return null;
  const bak = `${MCP_PATH}.bak.${Date.now()}`;
  fs.copyFileSync(MCP_PATH, bak);
  return bak;
}

function buildServerDefs(opts) {
  const names = opts.full ? [...FULL] : [...LITE];
  const servers = {};

  if (names.includes('shortcut')) {
    servers.shortcut = { url: DEFAULTS.SHORTCUT_URL };
  }
  if (names.includes('testrail')) {
    servers.testrail = {
      command: 'npx',
      args: ['-y', '@uarlouski/testrail-mcp-server'],
      env: {
        TESTRAIL_URL: DEFAULTS.TESTRAIL_URL,
        TESTRAIL_USERNAME: '',
        TESTRAIL_API_KEY: '',
      },
    };
  }
  if (names.includes('glean')) {
    servers.glean = { url: DEFAULTS.GLEAN_URL };
  }
  if (names.includes('context7')) {
    servers.context7 = {
      url: DEFAULTS.CONTEXT7_URL,
      headers: { CONTEXT7_API_KEY: '' },
    };
  }
  if (names.includes('cypress')) {
    servers.cypress = {
      command: 'npx',
      args: ['-y', 'cypress-mcp'],
      env: { CYPRESS_PROJECT_PATH: '' },
    };
  }
  if (names.includes('playwright')) {
    servers.playwright = {
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
      env: {},
    };
  }
  if (opts.withOptional) {
    servers.k6 = {
      command: 'k6',
      args: ['x', 'mcp'],
      env: { K6_PROJECT_PATH: '' },
    };
    // Official karate CLI MCP. CSG Maven-only repos can skip this and use paths.api_tests.
    servers.karate = {
      command: 'karate',
      args: ['mcp', '--stdio'],
      env: { KARATE_PROJECT_PATH: '' },
    };
  }
  return servers;
}

function ask(rl, q, def) {
  const hint = def ? ` [${def}]` : '';
  return new Promise((resolve) => {
    rl.question(`${q}${hint}: `, (ans) => {
      const t = (ans || '').trim();
      resolve(t || def || '');
    });
  });
}

async function promptSecrets(config, opts) {
  if (opts.nonInteractive) return config;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const s = config.mcpServers;

  console.log('\nFill secrets (Enter = keep current / default). Never commit mcp.json.\n');

  if (s.testrail) {
    console.log('--- TestRail (required for cases / plans) ---');
    s.testrail.env.TESTRAIL_URL = await ask(
      rl,
      'TESTRAIL_URL',
      s.testrail.env.TESTRAIL_URL || DEFAULTS.TESTRAIL_URL
    );
    s.testrail.env.TESTRAIL_USERNAME = await ask(
      rl,
      'TESTRAIL_USERNAME (email)',
      isPlaceholder(s.testrail.env.TESTRAIL_USERNAME) ? '' : s.testrail.env.TESTRAIL_USERNAME
    );
    s.testrail.env.TESTRAIL_API_KEY = await ask(
      rl,
      'TESTRAIL_API_KEY',
      isPlaceholder(s.testrail.env.TESTRAIL_API_KEY) ? '' : '(unchanged)'
    );
    if (s.testrail.env.TESTRAIL_API_KEY === '(unchanged)') {
      const prev = readExisting().mcpServers?.testrail?.env?.TESTRAIL_API_KEY;
      s.testrail.env.TESTRAIL_API_KEY = prev || '';
    }
  }

  if (s.glean) {
    console.log('\n--- Glean (CSG knowledge) ---');
    s.glean.url = await ask(rl, 'Glean MCP URL', s.glean.url || DEFAULTS.GLEAN_URL);
    console.log('  (Auth often via Cursor MCP login / SSO after reload)');
  }

  if (s.shortcut) {
    console.log('\n--- Shortcut ---');
    s.shortcut.url = await ask(rl, 'Shortcut MCP URL', s.shortcut.url || DEFAULTS.SHORTCUT_URL);
    console.log('  (Auth often via Cursor MCP login / OAuth after reload)');
  }

  if (s.context7) {
    console.log('\n--- Context7 (optional docs) ---');
    const cur = s.context7.headers?.CONTEXT7_API_KEY || '';
    const key = await ask(rl, 'CONTEXT7_API_KEY', isPlaceholder(cur) ? '' : '(unchanged)');
    s.context7.headers = s.context7.headers || {};
    if (key === '(unchanged)') {
      s.context7.headers.CONTEXT7_API_KEY =
        readExisting().mcpServers?.context7?.headers?.CONTEXT7_API_KEY || '';
    } else {
      s.context7.headers.CONTEXT7_API_KEY = key;
    }
  }

  if (s.cypress) {
    console.log('\n--- Cypress ---');
    const prefUi = readPref('paths.ui_tests');
    s.cypress.env = s.cypress.env || {};
    s.cypress.env.CYPRESS_PROJECT_PATH = await ask(
      rl,
      'CYPRESS_PROJECT_PATH (UI test repo root)',
      (!isPlaceholder(s.cypress.env.CYPRESS_PROJECT_PATH) && s.cypress.env.CYPRESS_PROJECT_PATH) ||
        prefUi ||
        ''
    );
  }

  if (s.k6) {
    console.log('\n--- k6 MCP (OPTIONAL. CLI + paths.perf_tests is enough) ---');
    console.log('  Requires k6 on PATH (`k6 x mcp`). Run: node scripts/setup-tooling.js');
    const prefPerf = readPref('paths.perf_tests');
    s.k6.env = s.k6.env || {};
    s.k6.env.K6_PROJECT_PATH = await ask(
      rl,
      'K6_PROJECT_PATH (perf test repo root)',
      (!isPlaceholder(s.k6.env.K6_PROJECT_PATH) && s.k6.env.K6_PROJECT_PATH) || prefPerf || ''
    );
  }

  if (s.karate) {
    console.log('\n--- Karate MCP (OPTIONAL) ---');
    console.log('  Needs standalone `karate` CLI. Most CSG API repos use Maven only.');
    console.log('  Prefer: paths.api_tests + mvn test. Skip this MCP if no karate CLI.');
    const prefApi = readPref('paths.api_tests');
    s.karate.env = s.karate.env || {};
    s.karate.env.KARATE_PROJECT_PATH = await ask(
      rl,
      'KARATE_PROJECT_PATH (API test repo root)',
      (!isPlaceholder(s.karate.env.KARATE_PROJECT_PATH) && s.karate.env.KARATE_PROJECT_PATH) ||
        prefApi ||
        ''
    );
  }

  rl.close();
  return config;
}

function missingRequired(config) {
  const miss = [];
  const t = config.mcpServers?.testrail?.env;
  if (t) {
    if (isPlaceholder(t.TESTRAIL_USERNAME) || !t.TESTRAIL_USERNAME) miss.push('TESTRAIL_USERNAME');
    if (isPlaceholder(t.TESTRAIL_API_KEY) || !t.TESTRAIL_API_KEY) miss.push('TESTRAIL_API_KEY');
  }
  if (!config.mcpServers?.shortcut) miss.push('shortcut server');
  if (!config.mcpServers?.glean) miss.push('glean server');
  if (!config.mcpServers?.testrail) miss.push('testrail server');
  return miss;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/setup-mcp.js [--full|--lite] [--with-optional] [--non-interactive] [--force]

  --full             MCP: Shortcut, TestRail, Glean, Context7, Cypress, Playwright (default)
  --lite             Shortcut + TestRail + Glean only
  --normal           Alias of --full
  --with-optional    Also add k6 + karate MCP (see mcp.json.optional.example)
  --non-interactive  Write/merge without prompts
  --force            Overwrite server blocks from defaults

Related:
  node scripts/mcp-mode.js [lite|full|optional|all|status]
  node scripts/setup-git.js
  node scripts/setup-tooling.js

Target: ~/.cursor/mcp.json (never commit)`);
    return;
  }

  seedCatalogFromExamples(REPO);

  const mode = opts.full ? 'full' : 'lite';
  console.log('QA Agent MCP setup');
  console.log(`  Mode: ${mode}`);
  console.log(`  Target: ${MCP_PATH}`);
  console.log('');

  if (!opts.nonInteractive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (
      !process.argv.includes('--lite') &&
      !process.argv.includes('--full') &&
      !process.argv.includes('--normal')
    ) {
      const choice = await ask(rl, 'Mode: full / lite', 'full');
      if (String(choice).toLowerCase().startsWith('l')) {
        opts.lite = true;
        opts.full = false;
      } else {
        opts.full = true;
        opts.lite = false;
      }
    }
    if (!process.argv.includes('--with-optional')) {
      const addOpt = await ask(rl, 'Add optional k6 + karate MCP? (y/n)', 'n');
      if (/^y/i.test(addOpt)) opts.withOptional = true;
    }
    rl.close();
  }

  const existing = readExisting();
  const built = buildServerDefs(opts);
  let config = mergeServers(existing, built, opts.force);
  config = applyPathPrefs(config);
  config = await promptSecrets(config, opts);

  const dir = path.dirname(MCP_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const bak = backupExisting();
  if (bak) console.log(`\nBackup: ${bak}`);

  fs.writeFileSync(MCP_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${MCP_PATH}`);

  const catPath = syncCatalog(config.mcpServers);
  console.log(`Synced catalog: ${catPath}`);

  const miss = missingRequired(config);
  if (miss.length) {
    console.log('\nStill empty (fill later or re-run setup-mcp):');
    miss.forEach((m) => console.log(`  - ${m}`));
  } else {
    console.log('\nRequired TestRail fields look set.');
  }

  console.log('\nNext:');
  console.log('  1. Reload Cursor window (MCP reload)');
  console.log('  2. Complete Shortcut / Glean MCP auth in Cursor if prompted');
  console.log('  3. node scripts/setup-git.js');
  console.log('  4. node scripts/setup-tooling.js   (k6 / Java / Maven)');
  console.log('  5. node scripts/doctor.js');
  console.log('  6. Switch profile later: node scripts/mcp-mode.js full|lite|status');
  console.log('');
  console.log('Do NOT commit ~/.cursor/mcp.json');
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  buildServerDefs,
  mergeServers,
  isPlaceholder,
  missingRequired,
  DEFAULTS,
};
