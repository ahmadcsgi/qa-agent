#!/usr/bin/env node
/**
 * QA Agent — ensure Git is installed and basic identity is configured.
 *
 * Git is NOT an MCP server. Cursor uses shell / built-in git.
 *
 * Usage:
 *   node scripts/setup-git.js
 *   node scripts/setup-git.js --non-interactive   # check only (no install / no config write)
 *   node scripts/setup-git.js --install            # allow package install if git missing
 *
 * Never invents user.name / user.email. Asks interactively.
 * Never commits secrets. Does not force GPG on (shows status only unless you opt in).
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

function parseArgs(argv) {
  return {
    nonInteractive: argv.includes('--non-interactive') || !process.stdin.isTTY,
    install: argv.includes('--install'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    }).trim();
  } catch (e) {
    return null;
  }
}

function whichGit() {
  const v = run('git --version');
  if (v) return { ok: true, version: v, path: run(process.platform === 'win32' ? 'where git' : 'which git') };
  return { ok: false };
}

function gitConfig(key) {
  return run(`git config --global --get ${key}`);
}

function setGitConfig(key, value) {
  execSync(`git config --global ${key} ${JSON.stringify(value)}`, { stdio: 'inherit' });
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

function installGitWindows() {
  const winget = run('winget --version');
  if (winget) {
    console.log('Installing Git via winget (Git.Git)...');
    const r = spawnSync(
      'winget',
      ['install', '--id', 'Git.Git', '-e', '--source', 'winget', '--accept-package-agreements', '--accept-source-agreements'],
      { stdio: 'inherit', shell: true }
    );
    return r.status === 0;
  }
  const choco = run('choco --version');
  if (choco) {
    console.log('Installing Git via chocolatey...');
    const r = spawnSync('choco', ['install', 'git', '-y'], { stdio: 'inherit', shell: true });
    return r.status === 0;
  }
  console.log('No winget/choco found. Install manually:');
  console.log('  https://git-scm.com/download/win');
  return false;
}

function installGitMac() {
  const brew = run('brew --version');
  if (!brew) {
    console.log('Homebrew not found. Install Git from https://git-scm.com or install brew first.');
    return false;
  }
  console.log('Installing Git via Homebrew...');
  const r = spawnSync('brew', ['install', 'git'], { stdio: 'inherit' });
  return r.status === 0;
}

function installGitLinux() {
  console.log('On Linux, install with your package manager, for example:');
  console.log('  sudo apt-get update && sudo apt-get install -y git');
  console.log('  sudo dnf install -y git');
  return false;
}

async function ensureInstalled(opts, rl) {
  let g = whichGit();
  if (g.ok) {
    console.log(`Git OK: ${g.version}`);
    return true;
  }
  console.log('Git not found on PATH.');
  if (opts.nonInteractive && !opts.install) {
    console.log('Re-run: node scripts/setup-git.js --install');
    return false;
  }
  let doInstall = opts.install;
  if (!opts.nonInteractive && rl) {
    doInstall = await askYes(rl, 'Download and install Git now?', false);
  }
  if (!doInstall) {
    console.log('Skipped install. Download: https://git-scm.com/downloads');
    return false;
  }
  let ok = false;
  if (process.platform === 'win32') ok = installGitWindows();
  else if (process.platform === 'darwin') ok = installGitMac();
  else ok = installGitLinux();

  if (process.platform === 'win32' && ok) {
    console.log('If `git` is still missing in this shell, open a new terminal (PATH refresh).');
  }
  g = whichGit();
  if (g.ok) {
    console.log(`Git OK after install: ${g.version}`);
    return true;
  }
  console.log('Git still not on PATH. Restart terminal / Cursor, then re-run setup-git.');
  return false;
}

async function configureIdentity(opts, rl) {
  if (!whichGit().ok) return;

  let name = gitConfig('user.name');
  let email = gitConfig('user.email');
  console.log('\n--- Git identity (global) ---');
  console.log(`  user.name:  ${name || '(unset)'}`);
  console.log(`  user.email: ${email || '(unset)'}`);

  if (opts.nonInteractive) {
    if (!name || !email) {
      console.log('Missing name/email. Run interactively: node scripts/setup-git.js');
    }
    return;
  }

  if (!name || !email || (await askYes(rl, 'Update user.name / user.email?', true))) {
    name = await ask(rl, 'user.name', name || '');
    email = await ask(rl, 'user.email', email || '');
    if (name) setGitConfig('user.name', name);
    if (email) setGitConfig('user.email', email);
    console.log('Saved global user.name / user.email');
  }

  const gpgsign = gitConfig('commit.gpgsign');
  const signingkey = gitConfig('user.signingkey');
  const gpgProg = gitConfig('gpg.program');
  console.log('\n--- GPG signing (optional, CSG often requires) ---');
  console.log(`  commit.gpgsign: ${gpgsign || '(unset)'}`);
  console.log(`  user.signingkey: ${signingkey || '(unset)'}`);
  console.log(`  gpg.program: ${gpgProg || '(unset)'}`);

  if (process.platform === 'win32') {
    const bundled = 'C:/Program Files/Git/usr/bin/gpg.exe';
    if (fs.existsSync(bundled) && (!gpgProg || gpgProg.includes('gpg'))) {
      if (await askYes(rl, `Set gpg.program to Git-bundled gpg?\n  ${bundled}`, true)) {
        setGitConfig('gpg.program', bundled);
        console.log('Set gpg.program');
      }
    }
  }

  if (await askYes(rl, 'Enable commit.gpgsign=true now? (only if key already set up)', true)) {
    setGitConfig('commit.gpgsign', 'true');
    console.log('Enabled commit.gpgsign');
  }

  console.log('\nSigning commits wiki (if your org uses it): check Confluence / team docs.');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`Usage: node scripts/setup-git.js [--install] [--non-interactive]

  Checks git on PATH. Optionally installs (winget/brew).
  Asks for user.name / user.email. Optional GPG helpers on Windows.

Git is not MCP. Use shell in Cursor after this.`);
    return;
  }

  console.log('QA Agent Git setup');
  console.log(`  Platform: ${process.platform} ${os.arch()}`);
  console.log('');

  const rl =
    opts.nonInteractive && !opts.install
      ? null
      : readline.createInterface({ input: process.stdin, output: process.stdout });

  const ok = await ensureInstalled(opts, rl);
  if (ok) await configureIdentity(opts, rl);

  if (rl) rl.close();

  console.log('\nNext: Reload Cursor terminal if PATH changed. Then node scripts/doctor.js');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
