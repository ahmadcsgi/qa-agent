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

function resolveProfileKeys(profile, catalog) {
  const all = Object.keys(catalog.mcpServers || {});
  if (profile === 'all') return all;
  if (profile === 'lite') return LITE.filter((k) => all.includes(k));
  if (profile === 'full') return FULL.filter((k) => all.includes(k));
  if (profile === 'optional') {
    const keys = [...FULL, ...OPTIONAL];
    return keys.filter((k) => all.includes(k));
  }
  return [];
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
  // store may print JSON string with quotes
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
  const ui = readPref('paths.ui_tests');
  const api = readPref('paths.api_tests');
  const perf = readPref('paths.perf_tests');
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
  // some tools use -v
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
  isPlaceholder,
  mergeServers,
  readJsonSafe,
  syncCatalog,
  seedCatalogFromExamples,
  resolveProfileKeys,
  readPref,
  applyPathPrefs,
  commandOnPath,
};
