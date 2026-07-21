#!/usr/bin/env node
/**
 * Shared MCP helpers (setup-mcp, mcp-mode, tests).
 * No secrets. Catalog sync never strips existing user servers.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const MCP_PATH = path.join(HOME, '.cursor', 'mcp.json');
const QA_MCP_DIR = path.join(HOME, '.qa-agent', 'mcp');
const CATALOG_PATH = path.join(QA_MCP_DIR, 'catalog.json');

const LITE = ['shortcut', 'testrail', 'glean'];
const FULL = ['shortcut', 'testrail', 'glean', 'context7', 'cypress', 'playwright'];
const OPTIONAL = ['k6', 'karate'];
/** Path-scoped profiles (catalog keeps full; active mcp.json switches). */
const UI = ['shortcut', 'testrail', 'glean', 'context7', 'cypress', 'playwright'];
const API = ['shortcut', 'testrail', 'glean', 'context7'];
const PERF = ['shortcut', 'testrail', 'glean', 'context7'];

function isPlaceholder(v) {
  if (v == null || v === '') return true;
  const s = String(v);
  return /YOUR_|your\.email|PLACEHOLDER|changeme|xxx|PATH_TO_/i.test(s);
}

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

/** Merge built server defs into existing mcpServers. Keep non-placeholder secrets. */
function mergeServers(existing, built, force) {
  const out = { ...(existing.mcpServers || {}) };
  for (const [name, def] of Object.entries(built)) {
    if (!out[name] || force) {
      out[name] = deepClone(def);
      continue;
    }
    const cur = out[name];
    if (def.env) {
      cur.env = cur.env || {};
      for (const [k, v] of Object.entries(def.env)) {
        if (force || isPlaceholder(cur.env[k])) cur.env[k] = v;
      }
    }
    if (def.headers) {
      cur.headers = cur.headers || {};
      for (const [k, v] of Object.entries(def.headers)) {
        if (force || isPlaceholder(cur.headers[k])) cur.headers[k] = v;
      }
    }
    if (def.url && (force || isPlaceholder(cur.url))) cur.url = def.url;
    if (def.command) cur.command = def.command;
    if (def.args) cur.args = def.args;
    out[name] = cur;
  }
  return { mcpServers: out };
}

function readJsonSafe(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Merge servers into ~/.qa-agent/mcp/catalog.json (create if missing).
 * Preserves extra catalog keys (e.g. github). Does not delete secrets.
 */
function syncCatalog(servers) {
  fs.mkdirSync(QA_MCP_DIR, { recursive: true });
  const existing = readJsonSafe(CATALOG_PATH, { mcpServers: {} });
  const merged = mergeServers(existing, servers || {}, false);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return CATALOG_PATH;
}

/** Seed catalog from example files if catalog missing. */
function seedCatalogFromExamples(repoRoot) {
  fs.mkdirSync(QA_MCP_DIR, { recursive: true });
  if (fs.existsSync(CATALOG_PATH)) return { seeded: false, path: CATALOG_PATH };
  const mainEx = path.join(repoRoot, 'mcp.json.example');
  const optEx = path.join(repoRoot, 'mcp.json.optional.example');
  let servers = {};
  if (fs.existsSync(mainEx)) {
    servers = { ...(readJsonSafe(mainEx, {}).mcpServers || {}) };
  }
  if (fs.existsSync(optEx)) {
    Object.assign(servers, readJsonSafe(optEx, {}).mcpServers || {});
  }
  fs.writeFileSync(CATALOG_PATH, JSON.stringify({ mcpServers: servers }, null, 2) + '\n', 'utf8');
  return { seeded: true, path: CATALOG_PATH };
}

/**
 * Ensure FULL (and optionally OPTIONAL) server keys exist in catalog.
 * Merges missing keys from mcp.json.example / optional.example.
 * Never overwrites non-placeholder secrets on existing keys.
 */
function ensureProfileServersInCatalog(repoRoot, { optional = false } = {}) {
  fs.mkdirSync(QA_MCP_DIR, { recursive: true });
  const mainEx = path.join(repoRoot, 'mcp.json.example');
  const optEx = path.join(repoRoot, 'mcp.json.optional.example');
  const fromMain = readJsonSafe(mainEx, { mcpServers: {} }).mcpServers || {};
  const fromOpt = readJsonSafe(optEx, { mcpServers: {} }).mcpServers || {};
  const needed = {};
  for (const k of FULL) {
    if (fromMain[k]) needed[k] = fromMain[k];
  }
  if (optional) {
    for (const k of OPTIONAL) {
      if (fromOpt[k]) needed[k] = fromOpt[k];
    }
  }
  const existing = readJsonSafe(CATALOG_PATH, { mcpServers: {} });
  const before = Object.keys(existing.mcpServers || {});
  const merged = mergeServers(existing, needed, false);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  const after = Object.keys(merged.mcpServers || {});
  const added = after.filter((k) => !before.includes(k));
  return { path: CATALOG_PATH, added, catalog: merged };
}

/** Heuristic: value looks like a live secret (not a placeholder). */
function looksLikeSecret(v) {
  if (v == null || typeof v !== 'string') return false;
  if (isPlaceholder(v)) return false;
  if (v.length < 12) return false;
  if (/^https?:\/\//i.test(v)) return false;
  if (/^[A-Za-z]:[\\/]/.test(v) || v.includes('/') || v.includes('\\')) {
    // paths - not secrets unless token-like
    if (!/^(ghp_|gho_|github_pat_|sct_|sk-|AIza)/i.test(v)) return false;
  }
  return (
    /^(ghp_|gho_|github_pat_|sct_|sk-|AIza|xox)/i.test(v) ||
    (/[A-Za-z0-9_\-+/=]{20,}/.test(v) && !/\s/.test(v))
  );
}

function scanSecrets(config) {
  const hits = [];
  const servers = (config && config.mcpServers) || {};
  for (const [name, def] of Object.entries(servers)) {
    const bags = [def.env, def.headers].filter(Boolean);
    for (const bag of bags) {
      for (const [k, v] of Object.entries(bag)) {
        if (looksLikeSecret(String(v))) hits.push(`${name}.${k}`);
      }
    }
  }
  return hits;
}

/** Replace secret-looking values with placeholders (deep clone). */
function redactSecrets(config) {
  const out = deepClone(config || { mcpServers: {} });
  for (const def of Object.values(out.mcpServers || {})) {
    for (const bag of [def.env, def.headers].filter(Boolean)) {
      for (const k of Object.keys(bag)) {
        if (looksLikeSecret(String(bag[k]))) {
          bag[k] = `REDACTED_${k}`;
        }
      }
    }
  }
  return out;
}

/** Safe string for logs — never echo raw secrets. */
function redactForLog(s) {
  if (s == null) return '';
  const t = String(s);
  if (looksLikeSecret(t) || /API_KEY|TOKEN|SECRET|PASSWORD/i.test(t)) {
    if (t.length <= 4) return '****';
    return `${t.slice(0, 2)}…${t.slice(-2)} (${t.length} chars)`;
  }
  return t;
}

function resolveProfileKeys(profile, catalog) {
  const all = Object.keys(catalog.mcpServers || {});
  if (profile === 'all') return all;
  if (profile === 'lite') return LITE.filter((k) => all.includes(k));
  if (profile === 'full') return FULL.filter((k) => all.includes(k));
  if (profile === 'ui') return UI.filter((k) => all.includes(k));
  if (profile === 'api') {
    const keys = [...API];
    if (all.includes('karate')) keys.push('karate');
    return keys.filter((k) => all.includes(k));
  }
  if (profile === 'perf') {
    const keys = [...PERF];
    if (all.includes('k6')) keys.push('k6');
    return keys.filter((k) => all.includes(k));
  }
  if (profile === 'optional') {
    const keys = [...FULL, ...OPTIONAL];
    return keys.filter((k) => all.includes(k));
  }
  return [];
}

/** Normalize path for prefix compare (Windows-safe). */
function normPath(p) {
  if (!p) return '';
  try {
    return path.resolve(String(p)).replace(/\\/g, '/').toLowerCase();
  } catch {
    return String(p).replace(/\\/g, '/').toLowerCase();
  }
}

/**
 * Multi-path prefs: separate with | or newlines.
 * Example: C:\\ui-a|C:\\ui-b
 */
function parsePathList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }
  return String(raw)
    .split(/[\|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatPathList(list) {
  return parsePathList(list).join('|');
}

function pathIsUnder(cwd, root) {
  const c = normPath(cwd);
  const r = normPath(root);
  if (!c || !r) return false;
  return c === r || c.startsWith(r.endsWith('/') ? r : r + '/');
}

function anyPathUnder(cwd, roots) {
  return parsePathList(roots).some((r) => pathIsUnder(cwd, r));
}

/**
 * Validate absolute paths. Returns { ok, warnings, missing }.
 */
function validatePathList(raw) {
  const list = parsePathList(raw);
  const warnings = [];
  const missing = [];
  for (const p of list) {
    if (!path.isAbsolute(p) && !/^[A-Za-z]:[\\/]/.test(p)) {
      warnings.push(`relative (prefer absolute): ${p}`);
    }
    try {
      if (!fs.existsSync(p)) missing.push(p);
    } catch {
      missing.push(p);
    }
  }
  return { ok: list.length === 0 || missing.length === 0, list, warnings, missing };
}

/**
 * Pick profile from cwd vs paths.* prefs (each may be multi-path).
 * Prefer ui > api > perf. Else lite.
 */
function resolveAutoProfile(cwd, paths) {
  const ui = paths && paths.ui;
  const api = paths && paths.api;
  const perf = paths && paths.perf;
  if (anyPathUnder(cwd, ui)) {
    return { profile: 'ui', reason: 'cwd under paths.ui_tests' };
  }
  if (anyPathUnder(cwd, api)) {
    return { profile: 'api', reason: 'cwd under paths.api_tests' };
  }
  if (anyPathUnder(cwd, perf)) {
    return { profile: 'perf', reason: 'cwd under paths.perf_tests' };
  }
  return { profile: 'lite', reason: 'cwd outside UI/API/perf paths' };
}

/**
 * Learn / activation matrix.
 * Catalog = always installed. Active = ~/.cursor/mcp.json after profile switch.
 */
function learnActivationRows(paths, learnedRows) {
  const ui = formatPathList((paths && paths.ui) || '') || '(set paths.ui_tests)';
  const api = formatPathList((paths && paths.api) || '') || '(set paths.api_tests)';
  const perf = formatPathList((paths && paths.perf) || '') || '(set paths.perf_tests)';
  const storeCat = 'catalog (~/.qa-agent/mcp/catalog.json)';
  const storeAct = 'active (~/.cursor/mcp.json)';
  const rows = [
    ['Shortcut', `${storeCat} + ${storeAct}`, 'Active always (every profile)'],
    ['TestRail', `${storeCat} + ${storeAct}`, 'Active always'],
    ['Glean', `${storeCat} + ${storeAct}`, 'Active always'],
    ['Context7', storeCat, `Active on ui/api/perf/full (not lite). Paths: UI/API/perf`],
    ['Cypress', storeCat, `Active only ui/full. When cwd under: ${ui}`],
    ['Playwright', storeCat, `Active only ui/full. When cwd under: ${ui}`],
    ['k6 MCP (opt)', storeCat, `Active only perf/optional if catalogued. CLI under: ${perf}`],
    ['karate MCP (opt)', storeCat, `Active only api/optional if catalogued. Maven under: ${api}`],
    ['k6 / Java / Maven CLI', 'PATH (setup-tooling)', 'Skills use CLI + paths.* (MCP optional)'],
    ['squad.name', '~/.qa-agent/projects/<id>/prefs', 'Agent boot (always)'],
    ['paths.* (multi: a|b)', 'prefs + project-context', 'Drives mcp-mode auto + sessionStart hook'],
  ];
  if (Array.isArray(learnedRows) && learnedRows.length) {
    return rows.concat(learnedRows);
  }
  return rows;
}

/**
 * Sync project path env into catalog and/or active mcp.json.
 * Multi UI/API/perf: uses first path as primary env value.
 */
function syncProjectEnvPaths({ ui, api, perf, targets } = {}) {
  const files = targets && targets.length ? targets : [CATALOG_PATH, MCP_PATH];
  const uiPrimary = parsePathList(ui)[0] || '';
  const apiPrimary = parsePathList(api)[0] || '';
  const perfPrimary = parsePathList(perf)[0] || '';
  const updated = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const s = cfg.mcpServers || {};
    let changed = false;
    if (uiPrimary && s.cypress) {
      s.cypress.env = s.cypress.env || {};
      if (s.cypress.env.CYPRESS_PROJECT_PATH !== uiPrimary) {
        s.cypress.env.CYPRESS_PROJECT_PATH = uiPrimary;
        changed = true;
      }
    }
    if (perfPrimary && s.k6) {
      s.k6.env = s.k6.env || {};
      if (s.k6.env.K6_PROJECT_PATH !== perfPrimary) {
        s.k6.env.K6_PROJECT_PATH = perfPrimary;
        changed = true;
      }
    }
    if (apiPrimary && s.karate) {
      s.karate.env = s.karate.env || {};
      if (s.karate.env.KARATE_PROJECT_PATH !== apiPrimary) {
        s.karate.env.KARATE_PROJECT_PATH = apiPrimary;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
      updated.push(file);
    }
  }
  return updated;
}

/** Read pref via store.js if present. Returns string or ''. */
function readPref(key) {
  const store = path.join(HOME, '.qa-agent', 'lib', 'store.js');
  if (!fs.existsSync(store)) return '';
  const r = spawnSync(process.execPath, [store, 'pref', 'get', key, '--project', 'auto'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (r.status !== 0) return '';
  const out = (r.stdout || '').trim();
  if (!out || out === 'null' || out === 'undefined') return '';
  try {
    const j = JSON.parse(out);
    if (typeof j === 'string') return j;
    if (j && typeof j === 'object' && j.v != null) return String(j.v);
    return String(j);
  } catch {
    return out.replace(/^"|"$/g, '');
  }
}

function applyPathPrefs(config) {
  const s = config.mcpServers || {};
  const ui = parsePathList(readPref('paths.ui_tests'))[0] || '';
  const api = parsePathList(readPref('paths.api_tests'))[0] || '';
  const perf = parsePathList(readPref('paths.perf_tests'))[0] || '';
  if (s.cypress && s.cypress.env && isPlaceholder(s.cypress.env.CYPRESS_PROJECT_PATH) && ui) {
    s.cypress.env.CYPRESS_PROJECT_PATH = ui;
  }
  if (s.k6 && s.k6.env && isPlaceholder(s.k6.env.K6_PROJECT_PATH) && perf) {
    s.k6.env.K6_PROJECT_PATH = perf;
  }
  if (s.karate && s.karate.env && isPlaceholder(s.karate.env.KARATE_PROJECT_PATH) && api) {
    s.karate.env.KARATE_PROJECT_PATH = api;
  }
  return config;
}

function commandOnPath(cmd) {
  const r = spawnSync(cmd, ['--version'], {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });
  if (r.status === 0) return true;
  const r2 = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });
  return r2.status === 0 && !!(r2.stdout || '').trim();
}

module.exports = {
  HOME,
  MCP_PATH,
  QA_MCP_DIR,
  CATALOG_PATH,
  LITE,
  FULL,
  OPTIONAL,
  UI,
  API,
  PERF,
  isPlaceholder,
  mergeServers,
  readJsonSafe,
  syncCatalog,
  seedCatalogFromExamples,
  ensureProfileServersInCatalog,
  resolveProfileKeys,
  resolveAutoProfile,
  pathIsUnder,
  anyPathUnder,
  parsePathList,
  formatPathList,
  validatePathList,
  normPath,
  learnActivationRows,
  syncProjectEnvPaths,
  readPref,
  applyPathPrefs,
  commandOnPath,
  looksLikeSecret,
  scanSecrets,
  redactSecrets,
  redactForLog,
};
