#!/usr/bin/env node
/**
 * Switch Cursor MCP profile:
 *   lite | ui | api | perf | full | optional | all | auto | status
 *
 * auto: pick ui/api/perf/lite from cwd vs prefs paths.*
 * Catalog keeps full install; active ~/.cursor/mcp.json is rewritten per profile.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO_LIB = path.join(__dirname, 'mcp-lib.js');
const HOME_LIB = path.join(HOME, '.qa-agent', 'lib', 'mcp-lib.js');
const lib = require(fs.existsSync(REPO_LIB) ? REPO_LIB : HOME_LIB);

const {
  MCP_PATH,
  QA_MCP_DIR,
  CATALOG_PATH,
  FULL,
  resolveProfileKeys,
  resolveAutoProfile,
  readJsonSafe,
  seedCatalogFromExamples,
  ensureProfileServersInCatalog,
  scanSecrets,
  readPref,
} = lib;

const backupDir = path.join(QA_MCP_DIR, 'backups');
const statePath = path.join(QA_MCP_DIR, 'active-profile.txt');

function repoRoot() {
  if (fs.existsSync(path.join(__dirname, '..', 'mcp.json.example'))) {
    return path.resolve(__dirname, '..');
  }
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'mcp.json.example'))) return cwd;
  return path.resolve(__dirname, '..');
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureCatalog() {
  fs.mkdirSync(QA_MCP_DIR, { recursive: true });
  fs.mkdirSync(backupDir, { recursive: true });
  if (fs.existsSync(CATALOG_PATH)) return;
  const seeded = seedCatalogFromExamples(repoRoot());
  if (seeded.seeded) {
    console.log('Catalog seeded from mcp.json.example (+ optional):', CATALOG_PATH);
    return;
  }
  if (fs.existsSync(MCP_PATH)) {
    fs.copyFileSync(MCP_PATH, path.join(backupDir, `mcp.${stamp()}.json`));
    fs.copyFileSync(MCP_PATH, CATALOG_PATH);
    console.log('Catalog created from current mcp.json:', CATALOG_PATH);
    return;
  }
  console.error('Missing catalog and mcp.json. Run: node scripts/setup-mcp.js');
  process.exit(1);
}

function warnSecrets(label, cfg) {
  const hits = scanSecrets(cfg);
  if (!hits.length) return;
  console.log(`Warning: ${label} may contain live secrets (${hits.length} field(s)).`);
  console.log('  Do not commit or share this file. Redacted copy:');
  console.log('  node scripts/mcp-catalog-scrub.js');
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function normalizeMode(raw) {
  let mode = (raw || 'status').toLowerCase();
  if (mode === 'normal' || mode === 'pro' || mode === 'ultra') {
    console.log(`Note: '${mode}' → full. Prefer: auto | ui | api | perf | lite`);
    mode = 'full';
  }
  return mode;
}

function pathsFromPrefs() {
  return {
    ui: readPref('paths.ui_tests'),
    api: readPref('paths.api_tests'),
    perf: readPref('paths.perf_tests'),
  };
}

function applyProfile(profile) {
  if (profile === 'full' || profile === 'optional' || profile === 'ui') {
    const ens = ensureProfileServersInCatalog(repoRoot(), {
      optional: profile === 'optional',
    });
    if (ens.added.length) {
      console.log('Catalog filled missing servers:', ens.added.join(', '));
    }
  }

  const catalog = readJsonSafe(CATALOG_PATH, { mcpServers: {} });
  warnSecrets('catalog', catalog);

  let keys = resolveProfileKeys(profile, catalog);
  if (profile === 'full' && keys.length < FULL.length) {
    console.error(
      `full profile incomplete (${keys.length}/${FULL.length}). Missing:`,
      FULL.filter((k) => !keys.includes(k)).join(', ')
    );
    process.exit(1);
  }
  if (!keys.length) {
    console.error('Profile resolved to zero servers:', profile);
    console.error('Catalog keys:', Object.keys(catalog.mcpServers || {}).join(', ') || '(none)');
    process.exit(1);
  }
  if (fs.existsSync(MCP_PATH)) {
    fs.copyFileSync(MCP_PATH, path.join(backupDir, `mcp.before-${profile}.${stamp()}.json`));
  }
  const mcpServers = {};
  for (const k of keys) mcpServers[k] = catalog.mcpServers[k];
  fs.mkdirSync(path.dirname(MCP_PATH), { recursive: true });
  writeJson(MCP_PATH, { mcpServers });
  fs.writeFileSync(statePath, profile, 'utf8');
  console.log('MCP profile:', profile);
  console.log('Active servers:', keys.join(', '));
  console.log('Reload Cursor window for this to take effect.');
  return { profile, keys };
}

function runAuto() {
  ensureCatalog();
  ensureProfileServersInCatalog(repoRoot(), { optional: false });
  const paths = pathsFromPrefs();
  const { profile, reason } = resolveAutoProfile(process.cwd(), paths);
  console.log('mcp-mode auto');
  console.log(`  cwd: ${process.cwd()}`);
  console.log(`  → ${profile} (${reason})`);
  if (!paths.ui && !paths.api && !paths.perf) {
    console.log('  Tip: set paths via onboard wizard or setup-prefs.js');
  }
  return applyProfile(profile);
}

function status() {
  ensureCatalog();
  ensureProfileServersInCatalog(repoRoot(), { optional: false });
  const catalog = readJsonSafe(CATALOG_PATH, { mcpServers: {} });
  warnSecrets('catalog', catalog);
  const active = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf8').trim() : '(unknown)';
  let current = [];
  if (fs.existsSync(MCP_PATH)) {
    current = Object.keys(readJsonSafe(MCP_PATH, {}).mcpServers || {});
  }
  const paths = pathsFromPrefs();
  const auto = resolveAutoProfile(process.cwd(), paths);
  console.log('Active profile file:', active);
  console.log(`mcp.json servers (${current.length}):`, current.join(', ') || '(none)');
  console.log('Catalog:', Object.keys(catalog.mcpServers || {}).join(', ') || '(none)');
  console.log(`Full set ready: ${FULL.every((k) => (catalog.mcpServers || {})[k]) ? 'yes' : 'no'}`);
  console.log(`Auto would pick: ${auto.profile} (${auto.reason})`);
  console.log('Profiles: lite | ui | api | perf | full | optional | all | auto | status');
}

const mode = normalizeMode(process.argv[2]);
const PROFILES = {
  lite: 1,
  ui: 1,
  api: 1,
  perf: 1,
  full: 1,
  optional: 1,
  all: 1,
  auto: 1,
  status: 1,
};

if (mode === 'status' || mode === 'help' || mode === '-h' || mode === '--help') {
  if (mode !== 'status') {
    console.log(`Usage: node scripts/mcp-mode.js [lite|ui|api|perf|full|optional|all|auto|status]

  lite       Shortcut, TestRail, Glean (default outside test repos)
  ui         lite + Context7 + Cypress + Playwright (paths.ui_tests)
  api        lite + Context7 (+ karate MCP if catalogued)
  perf       lite + Context7 (+ k6 MCP if catalogued)
  full       all 6 recommended servers
  optional   full + k6 + karate
  all        every key in catalog
  auto       pick ui/api/perf/lite from cwd vs paths.*
  status     show active / catalog / auto preview`);
    process.exit(0);
  }
  status();
  process.exit(0);
}

ensureCatalog();
if (mode === 'auto') {
  runAuto();
  process.exit(0);
}
if (!PROFILES[mode]) {
  console.error('Usage: node scripts/mcp-mode.js [lite|ui|api|perf|full|optional|all|auto|status]');
  process.exit(1);
}
applyProfile(mode);
