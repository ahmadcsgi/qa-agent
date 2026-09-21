#!/usr/bin/env node
/**
 * Session boot cache: skip redundant proj ensure / boot within TTL for same cwd.
 * Usage:
 *   node scripts/boot-session.js plan [--cwd <path>] [--minimal] [--domain testcases]
 *   node scripts/boot-session.js mark [--cwd <path>] [--project <id>]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const STORE_DIR = path.join(HOME, '.qa-agent');
const SESSION_FILE = path.join(STORE_DIR, 'boot-session.json');
const PREF_FILE = path.join(STORE_DIR, 'prefs.json');
const SESSION_TTL_MS = 5 * 60 * 1000;
const BOOT_HEAVY_DOMAINS = new Set([
  'testcases',
  'testrail',
  'execution',
  'automation',
  'ui',
  'api',
  'perf',
  'onboard',
]);

function norm(p) {
  return path.resolve(String(p || process.cwd())).toLowerCase();
}

function readJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function readSession() {
  return readJson(SESSION_FILE, null);
}

function isFresh(cwd) {
  const s = readSession();
  if (!s || !s.at || !s.cwd) return false;
  const age = Date.now() - new Date(s.at).getTime();
  if (Number.isNaN(age) || age > SESSION_TTL_MS) return false;
  return norm(s.cwd) === norm(cwd);
}

function readBootMinimal() {
  const g = readJson(PREF_FILE, { d: {} }).d || {};
  const v = g['agent.boot_minimal'];
  return v === true || v === 'true' || v === 1 || v === '1';
}

function parseArgs(argv) {
  const out = { cmd: argv[0], cwd: process.cwd(), minimal: false, domain: '', projectId: '' };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--cwd' && argv[i + 1]) {
      out.cwd = argv[++i];
    } else if (a === '--minimal') out.minimal = true;
    else if (a === '--domain' && argv[i + 1]) out.domain = argv[++i];
    else if (a === '--project' && argv[i + 1]) out.projectId = argv[++i];
  }
  if (process.env.QA_AGENT_CWD) out.cwd = process.env.QA_AGENT_CWD;
  return out;
}

function plan(opts) {
  const fresh = isFresh(opts.cwd);
  const minimal = opts.minimal || readBootMinimal();
  const heavy = opts.domain && BOOT_HEAVY_DOMAINS.has(opts.domain.toLowerCase());

  let projEnsure = !fresh;
  let boot = !fresh;

  if (minimal && !heavy) {
    boot = false;
    if (fresh) projEnsure = false;
  }
  if (heavy && minimal) boot = true;

  return {
    projEnsure,
    boot,
    fresh,
    minimal,
    domain: opts.domain || null,
    ttlSec: Math.round(SESSION_TTL_MS / 1000),
    cwd: norm(opts.cwd),
  };
}

function mark(opts) {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const prev = readSession() || {};
  const data = {
    at: new Date().toISOString(),
    cwd: path.resolve(opts.cwd),
    projectId: opts.projectId || prev.projectId || null,
  };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return data;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args.cmd || 'plan';
  if (cmd === 'plan') {
    process.stdout.write(JSON.stringify(plan(args)) + '\n');
    return;
  }
  if (cmd === 'mark') {
    process.stdout.write(JSON.stringify(mark(args)) + '\n');
    return;
  }
  if (cmd === 'check') {
    process.stdout.write(JSON.stringify({ fresh: isFresh(args.cwd) }) + '\n');
    return;
  }
  console.error('Usage: node scripts/boot-session.js plan|mark|check [--cwd path] [--minimal] [--domain name]');
  process.exit(1);
}

if (require.main === module) main();

module.exports = { plan, mark, isFresh, SESSION_TTL_MS, BOOT_HEAVY_DOMAINS };
