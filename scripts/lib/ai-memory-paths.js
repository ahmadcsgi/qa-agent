'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const DEFAULT_HUB = path.join(HOME, 'Documents', 'ai-memory');
const PREF_FILE = path.join(HOME, '.qa-agent', 'prefs.json');

/** @type {readonly string[]} */
const ENGINES = ['cursor-memory', 'cursor-brain', 'pmb'];

function readGlobalPrefs() {
  try {
    const j = JSON.parse(fs.readFileSync(PREF_FILE, 'utf8'));
    return (j && j.d) || {};
  } catch {
    return {};
  }
}

function hubRoot() {
  const g = readGlobalPrefs();
  const fromPref = g['tools.ai_memory_hub'] || g['paths.ai_memory'];
  const fromEnv = process.env.QA_AI_MEMORY_HUB || process.env.AI_MEMORY_HUB;
  return path.resolve(fromEnv || fromPref || DEFAULT_HUB);
}

function pmbWorkspaceName() {
  const g = readGlobalPrefs();
  return g['tools.ai_memory_pmb_workspace'] || 'csg';
}

function bootAiMemoryEnabled() {
  const g = readGlobalPrefs();
  const v = g['agent.boot_ai_memory'];
  return v === true || v === 'true' || v === 1 || v === '1';
}

function engineId() {
  const g = readGlobalPrefs();
  const e = (g['tools.ai_memory_engine'] || 'cursor-memory').toLowerCase();
  return ENGINES.includes(e) ? e : 'cursor-memory';
}

function cursorBrainStorageDir(hub) {
  return path.join(hub, 'cursor-brain', 'storage');
}

module.exports = {
  DEFAULT_HUB,
  ENGINES,
  hubRoot,
  pmbWorkspaceName,
  bootAiMemoryEnabled,
  engineId,
  cursorBrainStorageDir,
};
