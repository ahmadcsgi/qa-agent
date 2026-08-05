#!/usr/bin/env node
/**
 * AgentShield-style scan for QA Agent harness (inspired by ECC AgentShield).
 * Checks MCP config, hooks, git hygiene, and accidental secret patterns.
 * No secrets printed. Used by doctor.js and standalone CLI.
 *
 * Usage: node scripts/agent-shield-scan.js [--repo <path>] [--json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { scanSecrets } = require('./mcp-lib');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const DEFAULT_REPO = path.resolve(__dirname, '..');

const GITIGNORE_REQUIRED = [
  '.cursor/qa-memory/',
  'onboard.md',
  '.cursor/plugins/',
];

const SECRET_PATTERNS = [
  { id: 'aws-key', re: /AKIA[0-9A-Z]{16}/ },
  { id: 'github-pat', re: /ghp_[A-Za-z0-9]{20,}/ },
  { id: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
  { id: 'private-key', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'testrail-key-ish', re: /TESTRAIL_API_KEY\s*=\s*['"]?[A-Za-z0-9+/=_-]{20,}/ },
];

function gitLsFiles(cwd) {
  const r = spawnSync('git', ['ls-files'], { encoding: 'utf8', cwd, windowsHide: true });
  if (r.status !== 0) return [];
  return (r.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readTextSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function scanTrackedSecrets(repo, files) {
  const hits = [];
  const skip = /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|pdf|zip|lock)$/i;
  const skipTest = /\.(test|spec)\.[cm]?[jt]sx?$/i;
  for (const rel of files) {
    if (skip.test(rel) || skipTest.test(rel)) continue;
    if (rel.includes('node_modules/')) continue;
    const abs = path.join(repo, rel);
    const text = readTextSafe(abs);
    if (!text || text.length > 500_000) continue;
    for (const { id, re } of SECRET_PATTERNS) {
      if (re.test(text)) hits.push({ file: rel, pattern: id });
    }
  }
  return hits;
}

/**
 * @param {{ repo?: string, home?: string, log?: { ok: Function, fail: Function, soft: Function } }} opts
 * @returns {{ errors: number, warnings: number, findings: Array<{ level: string, msg: string }> }}
 */
function runAgentShieldScan(opts = {}) {
  const repo = opts.repo || DEFAULT_REPO;
  const home = opts.home || HOME;
  const findings = [];
  let errors = 0;
  let warnings = 0;

  const ok = (msg) => {
    findings.push({ level: 'ok', msg });
    opts.log?.ok?.(msg);
  };
  const fail = (msg) => {
    findings.push({ level: 'fail', msg });
    errors++;
    opts.log?.fail?.(msg);
  };
  const soft = (msg) => {
    findings.push({ level: 'soft', msg });
    warnings++;
    opts.log?.soft?.(msg);
  };

  // Sensitive files must not live in repo
  const sensitiveInRepo = [
    ['mcp.json', path.join(repo, 'mcp.json')],
    ['catalog.json', path.join(repo, '.qa-agent', 'mcp', 'catalog.json')],
    ['~/.cursor/mcp.json copy in repo', path.join(repo, '.cursor', 'mcp.json')],
  ];
  for (const [label, p] of sensitiveInRepo) {
    if (fs.existsSync(p)) fail(`${label} found in repo — move to home dir, never commit`);
    else ok(`no ${label} in repo`);
  }

  // .gitignore hygiene
  const giPath = path.join(repo, '.gitignore');
  const gi = readTextSafe(giPath) || '';
  for (const need of GITIGNORE_REQUIRED) {
    if (gi.includes(need) || gi.includes(need.replace(/\/$/, ''))) ok(`.gitignore covers ${need}`);
    else fail(`.gitignore missing ${need}`);
  }

  // Tracked private paths
  const tracked = gitLsFiles(repo);
  if (tracked.length) {
    const badTracked = tracked.filter(
      (f) =>
        f === 'onboard.md' ||
        f.startsWith('.cursor/qa-memory/') ||
        f === 'mcp.json' ||
        f.endsWith('/mcp.json')
    );
    if (badTracked.length) fail(`git tracks private files: ${badTracked.slice(0, 5).join(', ')}`);
    else ok('no private qa-memory / onboard.md / mcp.json tracked');

    const secretHits = scanTrackedSecrets(repo, tracked);
    if (secretHits.length) {
      const sample = secretHits
        .slice(0, 3)
        .map((h) => `${h.file} (${h.pattern})`)
        .join(', ');
      fail(`possible secret pattern in tracked files: ${sample}`);
    } else ok('no obvious secret patterns in tracked files');
  } else {
    soft('git ls-files unavailable (not a git repo?)');
  }

  // Active MCP + catalog (home)
  const mcpPath = path.join(home, '.cursor', 'mcp.json');
  const catalogPath = path.join(home, '.qa-agent', 'mcp', 'catalog.json');
  for (const [label, p] of [
    ['active mcp.json', mcpPath],
    ['MCP catalog', catalogPath],
  ]) {
    if (!fs.existsSync(p)) {
      soft(`${label} missing`);
      continue;
    }
    try {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      const hits = scanSecrets(cfg);
      if (hits.length) soft(`${label} may contain live secrets (${hits.length} field(s)). Run mcp-catalog-scrub.js`);
      else ok(`${label} has no obvious inline secrets in env/headers`);
    } catch {
      fail(`${label} is not valid JSON`);
    }
  }

  // Session hook
  const hookPath = path.join(home, '.cursor', 'hooks', 'qa-mcp-auto.js');
  if (fs.existsSync(hookPath)) {
    const hookSrc = readTextSafe(hookPath) || '';
    if (/\beval\s*\(/.test(hookSrc)) soft('MCP hook contains eval() — review manually');
    else ok('MCP sessionStart hook present (no eval)');
  } else {
    soft('MCP sessionStart hook missing. Run: node scripts/install-mcp-hook.js');
  }

  // Commit signing (soft)
  const gpgSign = spawnSync('git', ['config', '--global', '--get', 'commit.gpgsign'], {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });
  const signingKey = spawnSync('git', ['config', '--global', '--get', 'user.signingkey'], {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });
  if ((gpgSign.stdout || '').trim() === 'true' && (signingKey.stdout || '').trim()) {
    ok('commit signing configured (gpgsign + signingkey)');
  } else {
    soft('commit signing not fully configured. See docs/SETUP.md or private onboard Part A8');
  }

  return { errors, warnings, findings };
}

if (require.main === module) {
  const jsonOut = process.argv.includes('--json');
  const repoIdx = process.argv.indexOf('--repo');
  const repo = repoIdx >= 0 ? path.resolve(process.argv[repoIdx + 1]) : DEFAULT_REPO;

  const result = runAgentShieldScan({
    repo,
    log: jsonOut
      ? null
      : {
          ok: (m) => console.log(`  ✓ ${m}`),
          fail: (m) => console.log(`  ✗ ${m}`),
          soft: (m) => console.log(`  ! ${m}`),
        },
  });

  if (jsonOut) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`\nAgentShield: ${result.errors} error(s), ${result.warnings} warning(s)`);
  }
  process.exit(result.errors > 0 ? 1 : 0);
}

module.exports = { runAgentShieldScan, SECRET_PATTERNS, GITIGNORE_REQUIRED };
