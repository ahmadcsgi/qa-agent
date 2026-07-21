#!/usr/bin/env node
/**
 * Install user-level Cursor sessionStart hook for path-aware MCP.
 *
 * Copies scripts/hooks/mcp-auto-session.js → ~/.cursor/hooks/qa-mcp-auto.js
 * Merges sessionStart into ~/.cursor/hooks.json (preserves other hooks).
 *
 * Usage:
 *   node scripts/install-mcp-hook.js
 *   node scripts/install-mcp-hook.js --uninstall
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const SRC = path.join(REPO, 'scripts', 'hooks', 'mcp-auto-session.js');
const HOOKS_DIR = path.join(HOME, '.cursor', 'hooks');
const HOOK_JS = path.join(HOOKS_DIR, 'qa-mcp-auto.js');
const HOOKS_JSON = path.join(HOME, '.cursor', 'hooks.json');
const MARKER = 'qa-mcp-auto';

function readJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function hookCommand() {
  // Absolute node + script so it works from any workspace
  const node = process.execPath;
  return `${JSON.stringify(node)} ${JSON.stringify(HOOK_JS)}`;
}

function uninstall() {
  const cfg = readJson(HOOKS_JSON, { version: 1, hooks: {} });
  const list = (cfg.hooks && cfg.hooks.sessionStart) || [];
  cfg.hooks = cfg.hooks || {};
  cfg.hooks.sessionStart = list.filter((h) => {
    const cmd = String((h && h.command) || '');
    return !cmd.includes(MARKER);
  });
  if (!cfg.hooks.sessionStart.length) delete cfg.hooks.sessionStart;
  writeJson(HOOKS_JSON, cfg);
  if (fs.existsSync(HOOK_JS)) fs.unlinkSync(HOOK_JS);
  console.log('Removed QA MCP auto sessionStart hook.');
}

function install() {
  if (!fs.existsSync(SRC)) {
    console.error('Missing', SRC);
    process.exit(1);
  }
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
  fs.copyFileSync(SRC, HOOK_JS);
  const cfg = readJson(HOOKS_JSON, { version: 1, hooks: {} });
  cfg.version = cfg.version || 1;
  cfg.hooks = cfg.hooks || {};
  const list = Array.isArray(cfg.hooks.sessionStart) ? cfg.hooks.sessionStart.slice() : [];
  const filtered = list.filter((h) => !String((h && h.command) || '').includes(MARKER));
  filtered.push({
    command: hookCommand(),
    timeout: 20,
  });
  cfg.hooks.sessionStart = filtered;
  writeJson(HOOKS_JSON, cfg);
  console.log('Installed sessionStart hook:', HOOK_JS);
  console.log('hooks.json:', HOOKS_JSON);
  console.log('Requires pref mcp.path_aware=true (set by onboard wizard).');
}

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log('Usage: node scripts/install-mcp-hook.js [--uninstall]');
  process.exit(0);
}
if (argv.includes('--uninstall')) uninstall();
else install();
