#!/usr/bin/env node
/**
 * Backup local QA Agent experience (prefs/know/cor + workspace qa-memory).
 * Does NOT commit. Keep zip offline / encrypted if it may contain secrets.
 *
 * Usage:
 *   node scripts/backup-memory.js
 *   node scripts/backup-memory.js --out "D:\\Backups"
 *   node scripts/backup-memory.js --include-mcp   # also copy mcp catalog (may contain secrets)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const QA = path.join(HOME, '.qa-agent');
const MEM = path.join(REPO, '.cursor', 'qa-memory');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir =
  (outIdx >= 0 && args[outIdx + 1]) ||
  path.join(HOME, 'Documents', 'qa-agent-backups');
const includeMcp = args.includes('--include-mcp');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

function copyDir(src, dest, filter) {
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    if (filter && !filter(name)) continue;
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const st = fs.statSync(s);
    if (st.isDirectory()) n += copyDir(s, d, null);
    else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function main() {
  if (!fs.existsSync(QA)) {
    console.error('Missing ~/.qa-agent. Run install first.');
    process.exit(1);
  }

  const id = `qa-agent-memory-${stamp()}`;
  const staging = path.join(os.tmpdir(), id);
  ensureDir(staging);
  ensureDir(outDir);

  const manifest = {
    created: new Date().toISOString(),
    host: os.hostname(),
    repo: REPO,
    includeMcp,
    note: 'Restore: extract over ~/.qa-agent and repo .cursor/qa-memory. See docs/MIGRATION.md. Do not commit this zip.',
  };

  // Global store (no mcp by default)
  const g = path.join(staging, 'dot-qa-agent');
  ensureDir(g);
  for (const f of ['prefs.json', 'corrections.json', 'knowledge.json', 'search-cache.json']) {
    copyFile(path.join(QA, f), path.join(g, f));
  }
  if (fs.existsSync(path.join(QA, 'projects'))) {
    copyDir(path.join(QA, 'projects'), path.join(g, 'projects'));
  }
  if (fs.existsSync(path.join(QA, 'lib'))) {
    copyDir(path.join(QA, 'lib'), path.join(g, 'lib'));
  }
  if (includeMcp && fs.existsSync(path.join(QA, 'mcp'))) {
    copyDir(path.join(QA, 'mcp'), path.join(g, 'mcp'));
    manifest.warning = 'Contains MCP catalog. May include live secrets.';
  }

  // Workspace memory
  let memFiles = 0;
  if (fs.existsSync(MEM)) {
    memFiles = copyDir(MEM, path.join(staging, 'qa-memory'));
  }

  // Experience map pointer
  fs.writeFileSync(path.join(staging, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(
    path.join(staging, 'RESTORE.txt'),
    [
      'QA Agent memory backup',
      '',
      '1. Close Cursor or finish active agents.',
      '2. Copy dot-qa-agent/* into %USERPROFILE%\\.qa-agent\\ (merge).',
      '3. Copy qa-memory/* into <repo>\\.cursor\\qa-memory\\ (merge).',
      '4. node scripts/post-restore-check.js',
      '5. Reload Window.',
      '',
      'Never commit this zip. Prefer encrypt at rest.',
      '',
    ].join('\n')
  );

  const zipPath = path.join(outDir, `${id}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  // Prefer PowerShell Compress-Archive on Windows; zip CLI elsewhere
  let ok = false;
  if (process.platform === 'win32') {
    const ps = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path '${staging}\\*' -DestinationPath '${zipPath}' -Force`,
      ],
      { encoding: 'utf8' }
    );
    ok = ps.status === 0 && fs.existsSync(zipPath);
    if (!ok) console.error(ps.stderr || ps.stdout);
  } else {
    const z = spawnSync('zip', ['-r', zipPath, '.'], { cwd: staging, encoding: 'utf8' });
    ok = z.status === 0 && fs.existsSync(zipPath);
    if (!ok) console.error(z.stderr || z.stdout);
  }

  // cleanup staging
  try {
    fs.rmSync(staging, { recursive: true, force: true });
  } catch (_) {
    /* ignore */
  }

  if (!ok) {
    console.error('Zip failed. Staging was at', staging);
    process.exit(1);
  }

  const size = fs.statSync(zipPath).size;
  console.log('Backup OK');
  console.log('  zip:', zipPath);
  console.log('  bytes:', size);
  console.log('  qa-memory files:', memFiles);
  console.log('  includeMcp:', includeMcp);
  console.log('Next: keep offline. Restore via docs/MIGRATION.md + RESTORE.txt inside zip.');
}

main();
