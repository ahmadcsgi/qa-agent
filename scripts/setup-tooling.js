#!/usr/bin/env node
/**
 * QA Agent — detect / install CLI tooling for perf + API (not MCP).
 *
 * Usage:
 *   node scripts/setup-tooling.js
 *   node scripts/setup-tooling.js --non-interactive
 *   node scripts/setup-tooling.js --install
 *
 * Checks: k6, java, mvn (Maven). Optional winget/brew install.
 * Karate MCP needs a `karate` CLI binary. Most CSG API repos use Maven
 * (`mvn test`) instead — that path does NOT need karate MCP.
 */
'use strict';

const { spawnSync, execSync } = require('child_process');
const readline = require('readline');
const os = require('os');

function parseArgs(argv) {
  const onlyIdx = argv.findIndex((a) => a === '--only');
  let only = null;
  if (onlyIdx >= 0 && argv[onlyIdx + 1]) {
    only = argv[onlyIdx + 1]
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return {
    nonInteractive: argv.includes('--non-interactive') || !process.stdin.isTTY,
    install: argv.includes('--install'),
    only,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function hasCmd(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: true, windowsHide: true });
  return r.status === 0;
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

function askYes(rl, q, defNo = true) {
  const d = defNo ? 'n' : 'y';
  return ask(rl, `${q} (y/n)`, d).then((a) => /^y/i.test(a));
}

function wingetInstall(id) {
  console.log(`winget install ${id} ...`);
  const r = spawnSync(
    'winget',
    ['install', '--id', id, '-e', '--source', 'winget', '--accept-package-agreements', '--accept-source-agreements'],
    { stdio: 'inherit', shell: true }
  );
  return r.status === 0;
}

function brewInstall(pkg) {
  console.log(`brew install ${pkg} ...`);
  const r = spawnSync('brew', ['install', pkg], { stdio: 'inherit' });
  return r.status === 0;
}

async function ensure(name, check, installFn, opts, rl) {
  if (check()) {
    console.log(`OK  ${name}`);
    return true;
  }
  console.log(`MISS ${name}`);
  if (opts.nonInteractive && !opts.install) {
    console.log(`  Re-run with --install or interactively.`);
    return false;
  }
  let doIt = opts.install;
  if (!opts.nonInteractive && rl) {
    doIt = await askYes(rl, `Install ${name} now?`, true);
  }
  if (!doIt) return false;
  const ok = installFn();
  if (ok && check()) {
    console.log(`OK  ${name} (after install)`);
    return true;
  }
  console.log(`  Still missing. Open a new terminal if PATH changed, or install manually.`);
  return false;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/setup-tooling.js [--install] [--non-interactive] [--only k6,java,mvn]

  Detects k6, Java, Maven. Optionally installs via winget (Windows) or brew (macOS).
  --only limits which tools to check/install (comma list).

Notes:
  - Perf skills use k6 CLI + paths.perf_tests (MCP optional: k6 x mcp).
  - API skills usually use Maven in paths.api_tests (not karate MCP).
  - Optional karate MCP needs a standalone karate CLI. Skip if you only use mvn.`);
    return;
  }

  function want(name) {
    if (!opts.only || !opts.only.length) return true;
    const aliases = { maven: 'mvn', 'mvn (maven)': 'mvn', jdk: 'java' };
    const key = aliases[name.toLowerCase()] || name.toLowerCase();
    return opts.only.some((o) => o === key || o === name.toLowerCase());
  }

  console.log('QA Agent tooling setup');
  console.log(`  Platform: ${process.platform} ${os.arch()}`);
  console.log('');

  const rl = opts.nonInteractive && !opts.install
    ? null
    : readline.createInterface({ input: process.stdin, output: process.stdout });

  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const hasWinget = !!run('winget --version');
  const hasBrew = !!run('brew --version');

  if (want('k6')) {
    await ensure(
      'k6',
      () => hasCmd('k6', ['version']) || hasCmd('k6', ['--version']),
      () => {
        if (isWin && hasWinget) return wingetInstall('Grafana.k6');
        if (isMac && hasBrew) return brewInstall('k6');
        console.log('  Manual: https://grafana.com/docs/k6/latest/set-up/install-k6/');
        return false;
      },
      opts,
      rl
    );
  }

  if (want('java')) {
    await ensure(
      'java',
      () => hasCmd('java', ['-version']) || hasCmd('java', ['--version']),
      () => {
        if (isWin && hasWinget) return wingetInstall('EclipseAdoptium.Temurin.17.JDK');
        if (isMac && hasBrew) return brewInstall('openjdk@17');
        console.log('  Manual: install JDK 17+');
        return false;
      },
      opts,
      rl
    );
  }

  if (want('mvn') || want('maven')) {
    await ensure(
      'mvn (Maven)',
      () => hasCmd('mvn', ['-v']) || hasCmd('mvn', ['--version']),
      () => {
        if (isWin && hasWinget) return wingetInstall('Apache.Maven');
        if (isMac && hasBrew) return brewInstall('maven');
        console.log('  Manual: https://maven.apache.org/install.html');
        return false;
      },
      opts,
      rl
    );
  }

  const karateOk = hasCmd('karate', ['--version']) || hasCmd('karate', ['-h']);
  if (!opts.only || !opts.only.length) {
    if (karateOk) console.log('OK  karate CLI (optional MCP possible)');
    else {
      console.log('SKIP karate CLI (optional)');
      console.log('  Most CSG API work uses: mvn test in paths.api_tests');
      console.log('  Only install karate CLI if you want mcp.json optional "karate" entry');
    }
  }

  if (rl) rl.close();
  console.log('\nNext: node scripts/doctor.js');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
