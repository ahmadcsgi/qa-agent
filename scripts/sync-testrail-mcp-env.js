#!/usr/bin/env node
/**
 * Copy TESTRAIL_* from testrail-mcp config/env.local into ~/.cursor/mcp.json + catalog.
 * Does not print secret values.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { MCP_PATH, CATALOG_PATH, isPlaceholder, readJsonSafe } = require('./mcp-lib');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const KEYS = ['TESTRAIL_URL', 'TESTRAIL_USERNAME', 'TESTRAIL_API_KEY'];

function resolveEnvLocal() {
  const roots = [];
  if (process.env.TESTRAIL_MCP_ROOT) roots.push(process.env.TESTRAIL_MCP_ROOT);
  roots.push(
    path.join(HOME, 'OneDrive - CSG Systems Inc', 'Documents', 'AI', 'MCP', 'testrail-mcp'),
    path.join(HOME, 'Documents', 'AI', 'MCP', 'testrail-mcp'),
    path.join(HOME, 'AI', 'MCP', 'testrail-mcp')
  );
  for (const root of roots) {
    const f = path.join(root, 'config', 'env.local');
    if (fs.existsSync(f)) return f;
  }
  return null;
}

function parseEnvFile(filePath) {
  const out = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (KEYS.includes(key)) out[key] = val;
  }
  return out;
}

function patchTestrailEnv(cfg, fromLocal) {
  if (!cfg.mcpServers) cfg.mcpServers = {};
  if (!cfg.mcpServers.testrail) {
    cfg.mcpServers.testrail = {
      command: 'npx',
      args: ['-y', '@bun913/mcp-testrail@latest'],
      env: {},
    };
  }
  const env = cfg.mcpServers.testrail.env || {};
  let changed = false;
  for (const k of KEYS) {
    const v = fromLocal[k];
    if (!v) continue;
    const cur = env[k];
    if (!cur || isPlaceholder(cur) || cur !== v) {
      env[k] = v;
      changed = true;
    }
  }
  cfg.mcpServers.testrail.env = env;
  return changed;
}

/**
 * @returns {{ ok: boolean, updated: string[], envFile: string|null, error?: string }}
 */
function syncTestrailEnvFromLocal({ targets } = {}) {
  const envFile = resolveEnvLocal();
  if (!envFile) {
    return { ok: false, updated: [], envFile: null, error: 'no env.local' };
  }
  const fromLocal = parseEnvFile(envFile);
  const missing = KEYS.filter((k) => !fromLocal[k]);
  if (missing.length) {
    return {
      ok: false,
      updated: [],
      envFile,
      error: `env.local missing: ${missing.join(', ')}`,
    };
  }

  const list = targets && targets.length ? targets : [];
  if (!list.length) {
    if (fs.existsSync(MCP_PATH)) list.push(MCP_PATH);
    if (fs.existsSync(CATALOG_PATH)) list.push(CATALOG_PATH);
  }
  if (!list.length) {
    return { ok: false, updated: [], envFile, error: 'no mcp.json or catalog' };
  }

  const updated = [];
  for (const p of list) {
    const cfg = readJsonSafe(p, { mcpServers: {} });
    if (patchTestrailEnv(cfg, fromLocal)) {
      fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
      updated.push(p);
    }
  }
  return { ok: true, updated, envFile };
}

function main() {
  const result = syncTestrailEnvFromLocal();
  if (!result.ok) {
    console.error(result.error || 'sync failed');
    process.exit(result.error === 'no env.local' ? 2 : 2);
  }
  if (!result.updated.length) {
    console.log('TestRail MCP env already populated.');
    return;
  }
  for (const p of result.updated) console.log(`Updated TestRail env in ${p}`);
  console.log('Reload Cursor MCP. Secrets were not printed.');
}

if (require.main === module) {
  main();
}

module.exports = {
  resolveEnvLocal,
  syncTestrailEnvFromLocal,
  KEYS,
};
