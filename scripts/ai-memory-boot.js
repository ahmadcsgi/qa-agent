#!/usr/bin/env node
/**
 * Cross-project local memory hub boot (Node engines: cursor-memory, cursor-brain).
 * Hub default: ~/Documents/ai-memory (pref tools.ai_memory_hub).
 *
 * Usage:
 *   node scripts/ai-memory-boot.js status [--json]
 *   node scripts/ai-memory-boot.js ensure-hub
 *   node scripts/ai-memory-boot.js plan
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  hubRoot,
  pmbWorkspaceName,
  bootAiMemoryEnabled,
  engineId,
  DEFAULT_HUB,
  cursorBrainStorageDir,
} = require('./lib/ai-memory-paths');

function hasCmd(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return r.status === 0 && (r.stdout || '').trim().length > 0;
}

function runJson(cmd, args, timeoutMs = 45000) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: timeoutMs,
  });
  if (!r.stdout || !r.stdout.trim()) return { ok: r.status === 0, raw: (r.stderr || '').trim() };
  try {
    return { ok: r.status === 0, data: JSON.parse(r.stdout) };
  } catch {
    return { ok: r.status === 0, raw: r.stdout.trim().slice(0, 800) };
  }
}

function ensureHubDirs(root) {
  const dirs = ['indexes', 'boot', 'notes', 'cursor-brain', 'cursor-memory'];
  fs.mkdirSync(root, { recursive: true });
  for (const d of dirs) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
  }
  const readme = path.join(root, 'README.md');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# ai-memory hub\n\nLocal cross-project memory. Engine: pref \`tools.ai_memory_engine\` (default \`cursor-memory\`).\n\nSee qa-agent \`docs/AI_MEMORY.md\`.\n`,
      'utf8'
    );
  }
  writeCursorBrainConfig(root);
}

function writeCursorBrainConfig(hub) {
  const storage = cursorBrainStorageDir(hub);
  fs.mkdirSync(storage, { recursive: true });
  const cfgPath = path.join(hub, 'cursor-brain', 'config.json');
  const cfg = {
    storagePath: storage,
    note: 'Copy or merge into ~/.cursor-brain/config.json if using cursor-brain engine',
  };
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

function cursorMemoryStatus() {
  if (!hasCmd('cursor-memory')) {
    return { installed: false };
  }
  const st = runJson('cursor-memory', ['status', '--json']);
  return { installed: true, status: st.data || st.raw || null };
}

function cursorBrainStatus(hub) {
  const installed = hasCmd('cursor-brain');
  const storage = cursorBrainStorageDir(hub);
  return {
    installed,
    hubStorage: storage,
    dbExists: fs.existsSync(path.join(storage, 'memory.db')),
  };
}

function pmbStatus() {
  if (!hasCmd('pmb')) {
    return { installed: false, doctor: null };
  }
  const r = spawnSync('pmb', ['doctor', '--json'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 60000,
  });
  let doctor = null;
  if (r.stdout && r.stdout.trim()) {
    try {
      doctor = JSON.parse(r.stdout);
    } catch {
      doctor = { raw: (r.stdout || '').trim().slice(0, 500) };
    }
  }
  return { installed: true, doctor, exitCode: r.status };
}

function engineStatus(engine, hub) {
  if (engine === 'cursor-memory') return { id: engine, cursorMemory: cursorMemoryStatus() };
  if (engine === 'cursor-brain') return { id: engine, cursorBrain: cursorBrainStatus(hub) };
  if (engine === 'pmb') return { id: engine, pmb: pmbStatus() };
  return { id: engine };
}

function status() {
  const root = hubRoot();
  const engine = engineId();
  return {
    engine,
    hub: root,
    hubDefault: DEFAULT_HUB,
    hubExists: fs.existsSync(root),
    bootAiMemory: bootAiMemoryEnabled(),
    pmbWorkspace: pmbWorkspaceName(),
    engineDetail: engineStatus(engine, root),
    runBeforeQaBoot: bootAiMemoryEnabled(),
  };
}

function planMessage(s) {
  const eng = s.engine;
  if (!s.bootAiMemory) return 'agent.boot_ai_memory not set';
  if (eng === 'cursor-memory') {
    const ok = s.engineDetail.cursorMemory && s.engineDetail.cursorMemory.installed;
    return ok
      ? 'Use MCP cursor-memory (/memo, /recall) for cross-project context; keep QA facts in ~/.qa-agent'
      : 'Run: npm install -g cursor-memory && cursor-memory setup (Node 20/22/24 LTS). See docs/AI_MEMORY.md';
  }
  if (eng === 'cursor-brain') {
    const ok = s.engineDetail.cursorBrain && s.engineDetail.cursorBrain.installed;
    return ok
      ? 'Use MCP cursor-brain (memory_search/memory_add); storage under ai-memory/cursor-brain/storage'
      : 'Run: npm install -g @samhithgardas/cursor-brain. See docs/AI_MEMORY.md';
  }
  if (eng === 'pmb') {
    const ok = s.engineDetail.pmb && s.engineDetail.pmb.installed;
    return ok
      ? 'PMB MCP prepare/recall for cross-project context'
      : 'PMB needs Python: pip install pmb-ai (optional engine)';
  }
  return 'Unknown engine';
}

function planPayload() {
  const s = status();
  const eng = s.engine;
  let engineReady = false;
  if (eng === 'cursor-memory') engineReady = !!(s.engineDetail.cursorMemory && s.engineDetail.cursorMemory.installed);
  else if (eng === 'cursor-brain') engineReady = !!(s.engineDetail.cursorBrain && s.engineDetail.cursorBrain.installed);
  else if (eng === 'pmb') engineReady = !!(s.engineDetail.pmb && s.engineDetail.pmb.installed);

  const run = s.bootAiMemory && (engineReady || s.hubExists);
  return {
    aiMemoryRun: run,
    aiMemoryHub: s.hub,
    aiMemoryEngine: eng,
    engineReady,
    message: planMessage(s),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || 'status';
  const jsonOut = argv.includes('--json');

  if (cmd === 'ensure-hub') {
    const root = hubRoot();
    ensureHubDirs(root);
    process.stdout.write(JSON.stringify({ ok: true, hub: root }) + '\n');
    return;
  }

  if (cmd === 'plan') {
    process.stdout.write(JSON.stringify(planPayload()) + '\n');
    return;
  }

  if (cmd === 'status') {
    const s = status();
    if (jsonOut) {
      process.stdout.write(JSON.stringify(s, null, 2) + '\n');
      return;
    }
    console.log('AI memory hub status\n');
    console.log(`  hub: ${s.hub}`);
    console.log(`  engine: ${s.engine}`);
    console.log(`  boot_ai_memory: ${s.bootAiMemory}`);
    console.log(JSON.stringify(s.engineDetail, null, 2));
    return;
  }

  console.error('Usage: node scripts/ai-memory-boot.js status|plan|ensure-hub [--json]');
  process.exit(1);
}

if (require.main === module) main();

module.exports = {
  status,
  planPayload,
  ensureHubDirs,
  pmbStatus,
  cursorMemoryStatus,
  cursorBrainStatus,
};
