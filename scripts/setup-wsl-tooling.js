#!/usr/bin/env node
/**
 * Install / detect perf tooling inside WSL (for k6 runs).
 * QA Agent itself stays on Windows/macOS host. WSL is for executing k6.
 *
 * Usage:
 *   node scripts/setup-wsl-tooling.js
 *   node scripts/setup-wsl-tooling.js --status
 *   node scripts/setup-wsl-tooling.js --install
 *   node scripts/setup-wsl-tooling.js --install --only k6
 *   node scripts/setup-wsl-tooling.js --install --non-interactive
 */
'use strict';

const { spawnSync } = require('child_process');
const readline = require('readline');

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
    status: argv.includes('--status') || (!argv.includes('--install') && argv.includes('--status')),
    install: argv.includes('--install'),
    nonInteractive: argv.includes('--non-interactive') || !process.stdin.isTTY,
    only,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function isWin() {
  return process.platform === 'win32';
}

function wslAvailable() {
  if (!isWin()) return false;
  const r = spawnSync('wsl', ['-l', '-q'], { encoding: 'utf8', windowsHide: true });
  return r.status === 0;
}

/** Run bash -lc in default WSL distro. root=true uses -u root (apt without sudo prompt). */
function wslBash(script, { root = false, inherit = false } = {}) {
  const args = root
    ? ['-u', 'root', '--', 'bash', '-lc', script]
    : ['--', 'bash', '-lc', script];
  return spawnSync('wsl', args, {
    encoding: 'utf8',
    windowsHide: true,
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
}

function wslCmdOk(checkScript) {
  const r = wslBash(checkScript);
  return r.status === 0;
}

function detectWslTools() {
  return [
    {
      key: 'k6',
      label: 'k6 (WSL)',
      ok: wslCmdOk('command -v k6 >/dev/null 2>&1 && (k6 version || k6 --version)'),
      install: installK6Wsl,
    },
    {
      key: 'git',
      label: 'git (WSL)',
      ok: wslCmdOk('command -v git >/dev/null 2>&1 && git --version'),
      install: () =>
        wslBash('export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y git', {
          root: true,
          inherit: true,
        }).status === 0,
    },
    {
      key: 'curl',
      label: 'curl (WSL)',
      ok: wslCmdOk('command -v curl >/dev/null 2>&1 && curl --version'),
      install: () =>
        wslBash('export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y curl ca-certificates gnupg', {
          root: true,
          inherit: true,
        }).status === 0,
    },
    {
      key: 'docker',
      label: 'docker (WSL)',
      ok: wslCmdOk('command -v docker >/dev/null 2>&1 && docker --version'),
      install: null, // Docker Desktop / manual — do not auto-install
    },
  ];
}

function installK6Wsl() {
  // Official Grafana Debian/Ubuntu repo (docs.k6.io)
  const script = `
set -e
export DEBIAN_FRONTEND=noninteractive
if command -v k6 >/dev/null 2>&1; then
  k6 version || k6 --version
  exit 0
fi
apt-get update -qq
apt-get install -y curl ca-certificates gnupg
curl -fsSL https://dl.k6.io/key.gpg | gpg --dearmor -o /usr/share/keyrings/k6-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" > /etc/apt/sources.list.d/k6.list
apt-get update -qq
apt-get install -y k6
k6 version || k6 --version
`;
  console.log('Installing k6 into WSL (apt, Grafana repo)...');
  const r = wslBash(script, { root: true, inherit: true });
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

function printStatus(tools) {
  console.log('WSL tooling (for k6 runs — not for QA Agent install)');
  if (!wslAvailable()) {
    console.log('  WSL not available. Install WSL2 + Ubuntu first.');
    return;
  }
  for (const t of tools) {
    console.log(`  ${t.ok ? 'OK  ' : 'MISS'}  ${t.label}`);
  }
  const docker = tools.find((t) => t.key === 'docker');
  if (docker && !docker.ok) {
    console.log('  Tip: enable Docker Desktop → WSL integration, or install docker in distro manually.');
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/setup-wsl-tooling.js [--status] [--install] [--only k6,git,curl] [--non-interactive]

Installs k6 (and optional git/curl) into default WSL distro for performance test runs.
Does not install QA Agent into WSL. Docker is detected only (not auto-installed).`);
    return;
  }

  if (!isWin()) {
    console.log('Not Windows — use setup-tooling.js / apt / brew on this host.');
    process.exit(0);
  }
  if (!wslAvailable()) {
    console.error('WSL not found. Install: wsl --install -d Ubuntu');
    process.exit(1);
  }

  const tools = detectWslTools();
  printStatus(tools);

  const wantStatusOnly = opts.status || (!opts.install && opts.nonInteractive && !opts.only);
  if (wantStatusOnly && !opts.install) {
    return;
  }

  if (!opts.install && opts.nonInteractive) {
    console.log('Re-run with --install to install missing tools.');
    return;
  }

  let rl = null;
  if (!opts.nonInteractive && !opts.install) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  }

  const want = (key) => {
    if (!opts.only || !opts.only.length) return key === 'k6' || key === 'git' || key === 'curl';
    return opts.only.includes(key);
  };

  for (const t of tools) {
    if (!want(t.key)) continue;
    if (t.ok) continue;
    if (!t.install) {
      console.log(`SKIP ${t.label} (manual / Docker Desktop)`);
      continue;
    }
    let doIt = opts.install;
    if (rl) doIt = await askYes(rl, `Install ${t.label} into WSL now?`, false);
    if (!doIt) continue;
    const ok = t.install();
    console.log(ok ? `OK  ${t.label}` : `FAIL ${t.label}`);
  }

  if (rl) rl.close();
  console.log('');
  printStatus(detectWslTools());
  console.log('Run k6:  wsl -d Ubuntu -- bash -lc "cd /path/to/perf && k6 run script.js"');
}

module.exports = {
  wslAvailable,
  detectWslTools,
  installK6Wsl,
  wslBash,
  wslCmdOk,
};

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
