#!/usr/bin/env node
/**
 * Cursor sessionStart hook: path-aware MCP auto-switch.
 * Must write ONLY JSON to stdout. Logs go to stderr / log file.
 *
 * Installed to: ~/.cursor/hooks/qa-mcp-auto.js
 * Wired via: ~/.cursor/hooks.json sessionStart
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const LOG = path.join(HOME, '.qa-agent', 'mcp', 'hook-auto.log');

function log(msg) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`, 'utf8');
  } catch {
    /* ignore */
  }
  try {
    process.stderr.write(`${msg}\n`);
  } catch {
    /* ignore */
  }
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function findMcpMode() {
  const candidates = [
    path.join(HOME, '.qa-agent', 'lib', 'mcp-mode.js'),
    path.join(__dirname, '..', 'mcp-mode.js'),
    path.join(__dirname, 'mcp-mode.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function pathAwareEnabled() {
  const store = path.join(HOME, '.qa-agent', 'lib', 'store.js');
  if (!fs.existsSync(store)) return false;
  const r = spawnSync(process.execPath, [store, 'pref', 'get', 'mcp.path_aware', '--project', 'auto'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const out = (r.stdout || '').trim().replace(/^"|"$/g, '');
  return /^(true|1|yes)$/i.test(out) || out === 'true';
}

function main() {
  let input = {};
  try {
    const raw = readStdin();
    if (raw.trim()) input = JSON.parse(raw);
  } catch (e) {
    log(`stdin parse: ${e.message}`);
  }

  const roots = Array.isArray(input.workspace_roots) ? input.workspace_roots : [];
  const cwd = roots[0] || process.cwd();

  if (!pathAwareEnabled()) {
    process.stdout.write(
      JSON.stringify({
        additional_context:
          'QA Agent: mcp.path_aware not set. Run onboard wizard or pref set mcp.path_aware true.',
      })
    );
    return;
  }

  const mcpMode = findMcpMode();
  if (!mcpMode) {
    process.stdout.write(
      JSON.stringify({
        additional_context: 'QA Agent: mcp-mode.js missing. Re-run installer.',
      })
    );
    return;
  }

  const r = spawnSync(process.execPath, [mcpMode, 'auto', '--quiet', '--if-changed'], {
    encoding: 'utf8',
    cwd,
    windowsHide: true,
    env: { ...process.env, QA_MCP_HOOK_CWD: cwd },
  });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  log(`auto cwd=${cwd} status=${r.status} ${out.slice(0, 200)}`);

  let ctx = `QA Agent MCP auto: cwd=${cwd}.`;
  if (/changed|MCP profile:|switched/i.test(out)) {
    ctx +=
      ' Profile updated. Reload Cursor window once so MCP panel matches (lite vs ui/api/perf).';
  } else if (/unchanged|same profile/i.test(out)) {
    ctx += ' Profile already correct for this path.';
  } else if (out) {
    ctx += ` ${out.slice(0, 180)}`;
  }

  process.stdout.write(JSON.stringify({ additional_context: ctx }));
}

main();
