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
 *   node scripts/setup-wsl-tooling.js --install --only k6-custom
 *   node scripts/setup-wsl-tooling.js --install --only k6-custom --repo "C:\\path\\to\\perf"
 *   node scripts/setup-wsl-tooling.js --install --non-interactive
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const readline = require('readline');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');

function parseArgs(argv) {
  const onlyIdx = argv.findIndex((a) => a === '--only');
  let only = null;
  if (onlyIdx >= 0 && argv[onlyIdx + 1]) {
    only = argv[onlyIdx + 1]
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  const repoIdx = argv.findIndex((a) => a === '--repo');
  const repo = repoIdx >= 0 && argv[repoIdx + 1] ? argv[repoIdx + 1].trim() : '';
  return {
    status: argv.includes('--status') || (!argv.includes('--install') && argv.includes('--status')),
    install: argv.includes('--install'),
    nonInteractive: argv.includes('--non-interactive') || !process.stdin.isTTY,
    only,
    repo,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function isWin() {
  return process.platform === 'win32';
}

function readPref(key) {
  if (!fs.existsSync(STORE)) return '';
  const r = spawnSync(process.execPath, [STORE, 'pref', 'get', key, '--project', 'auto'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return (r.stdout || '').trim().replace(/^"|"$/g, '');
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

/** Convert Windows path to /mnt/<drive>/... for WSL bash. */
function toWslPath(winPath) {
  if (!winPath) return '';
  const normalized = String(winPath).replace(/\\/g, '/');
  const m = normalized.match(/^([A-Za-z]):\/(.*)$/);
  if (m) return `/mnt/${m[1].toLowerCase()}/${m[2]}`;
  if (normalized.startsWith('/')) return normalized;
  return normalized;
}

function resolvePerfRepo(cliRepo) {
  if (cliRepo) return cliRepo;
  const pref = readPref('paths.perf_tests');
  if (!pref) return '';
  return pref.split('|')[0].trim();
}

function k6CustomOk() {
  return wslCmdOk(
    `export PATH="$HOME/bin:$HOME/go/bin:$PATH"
command -v k6 >/dev/null 2>&1 || exit 1
out=$(k6 version 2>&1 || true)
echo "$out" | grep -qi ansible-vault || exit 1
echo "$out" | grep -qi exec || exit 1
`
  );
}

function detectWslTools() {
  return [
    {
      key: 'k6-custom',
      label: 'k6 custom xk6 (WSL: vault+faker+exec)',
      ok: k6CustomOk(),
      install: installK6CustomWsl,
    },
    {
      key: 'k6',
      label: 'k6 stock apt (WSL)',
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
      install: null,
    },
  ];
}

function installK6Wsl() {
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
  console.log('Installing stock k6 into WSL (apt, Grafana repo)...');
  const r = wslBash(script, { root: true, inherit: true });
  return r.status === 0;
}

function installK6CustomWsl(repoWin) {
  const winRoot = resolvePerfRepo(repoWin);
  if (!winRoot) {
    console.error('k6-custom needs a perf repo root.');
    console.error('Set paths.perf_tests or pass --repo "<perf-repo-path>".');
    console.error('Manual recipe: .cursor/rules/wsl-xk6-install.mdc');
    return false;
  }
  if (!fs.existsSync(winRoot)) {
    console.error(`Perf repo not found on disk: ${winRoot}`);
    return false;
  }
  const wslRoot = toWslPath(winRoot);
  console.log(`Building custom xk6 k6 in WSL (REPO_ROOT=${wslRoot})...`);
  console.log('Requires Go in WSL. Recipe: .cursor/rules/wsl-xk6-install.mdc');

  const script = `
set -e
export PATH="$HOME/bin:$HOME/go/bin:$PATH"
REPO_ROOT="${wslRoot.replace(/"/g, '\\"')}"
cd "$REPO_ROOT"

if ! command -v go >/dev/null 2>&1; then
  echo "FAIL: go not found in WSL. Install Go, then re-run."
  echo "  See .cursor/rules/wsl-xk6-install.mdc"
  exit 1
fi

go install go.k6.io/xk6/cmd/xk6@latest
mkdir -p bin
"$HOME/go/bin/xk6" build v1.7.1 \\
  --output "$REPO_ROOT/bin/k6-custom" \\
  --with github.com/szkiba/xk6-ansible-vault@latest \\
  --with github.com/grafana/xk6-faker@latest \\
  --with github.com/grafana/xk6-exec@latest

mkdir -p "$HOME/bin"
if [ -x "$HOME/bin/k6" ] && [ ! -L "$HOME/bin/k6" ]; then
  mv "$HOME/bin/k6" "$HOME/bin/k6-old"
elif [ -L "$HOME/bin/k6" ]; then
  rm -f "$HOME/bin/k6"
fi
ln -sf "$REPO_ROOT/bin/k6-custom" "$HOME/bin/k6"
export PATH="$HOME/bin:$HOME/go/bin:$PATH"
k6 version
out=$(k6 version 2>&1 || true)
echo "$out" | grep -qi ansible-vault
echo "$out" | grep -qi exec
`;
  const r = wslBash(script, { inherit: true });
  if (r.status === 0) {
    if (fs.existsSync(STORE)) {
      spawnSync(process.execPath, [STORE, 'pref', 'set', 'tooling.k6_custom_wsl', 'true', '--project', 'auto'], {
        encoding: 'utf8',
        windowsHide: true,
      });
    }
    console.log('OK  custom k6 (symlink ~/bin/k6). Prefer tooling.k6_runner=wsl');
    return true;
  }
  console.error('FAIL k6-custom. Fix Go/PATH or run recipe in WSL: .cursor/rules/wsl-xk6-install.mdc');
  return false;
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
  console.log('WSL tooling (for k6 runs, not for QA Agent install)');
  if (!wslAvailable()) {
    console.log('  WSL not available. Install WSL2 + Ubuntu first.');
    return;
  }
  for (const t of tools) {
    console.log(`  ${t.ok ? 'OK  ' : 'MISS'}  ${t.label}`);
  }
  const docker = tools.find((t) => t.key === 'docker');
  if (docker && !docker.ok) {
    console.log('  Tip: enable Docker Desktop > WSL integration, or install docker in distro manually.');
  }
  console.log('  Custom xk6: --only k6-custom (see .cursor/rules/wsl-xk6-install.mdc)');
  console.log('  Stock apt:  --only k6');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/setup-wsl-tooling.js [--status] [--install] [--only k6-custom,k6,git,curl] [--repo <perf-path>] [--non-interactive]

Installs k6 into default WSL distro for performance test runs.
  k6-custom  xk6 v1.7.1 + ansible-vault + faker + exec (recommended when vault/faker/exec needed)
  k6         stock apt from Grafana repo

Does not install QA Agent into WSL. Docker is detected only (not auto-installed).
Recipe: .cursor/rules/wsl-xk6-install.mdc`);
    return;
  }

  if (!isWin()) {
    console.log('Not Windows. Use setup-tooling.js / apt / brew on this host.');
    console.log('Custom xk6 recipe (any Linux): .cursor/rules/wsl-xk6-install.mdc');
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
    if (!opts.only || !opts.only.length) {
      // Default install set: prefer custom when installing without --only
      return key === 'k6-custom' || key === 'git' || key === 'curl';
    }
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
    const ok =
      t.key === 'k6-custom' ? t.install(opts.repo) : t.install();
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
  installK6CustomWsl,
  k6CustomOk,
  wslBash,
  wslCmdOk,
  toWslPath,
  resolvePerfRepo,
};

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
