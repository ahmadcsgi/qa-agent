'use strict';

const path = require('path');
const os = require('os');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();

/** Preferred daily clone (see USE-TEST-FOLDER.md, workspace know). */
function canonicalQaAgentPath() {
  return path.join(HOME, 'OneDrive - CSG Systems Inc', 'Documents', 'Test', 'qa-agent');
}

function norm(p) {
  return path.resolve(String(p || process.cwd())).toLowerCase();
}

function isAiClonePath(cwd) {
  const n = norm(cwd);
  return n.includes('documents\\ai\\qa-agent') || n.includes('documents/ai/qa-agent');
}

function isCanonicalPath(cwd) {
  const n = norm(cwd);
  const c = norm(canonicalQaAgentPath());
  return n === c;
}

/**
 * @param {string} [cwd]
 * @returns {{ warn: boolean, id: string, message: string, canonical: string, preferred: boolean }}
 */
function canonicalWorkspaceCheck(cwd = process.cwd()) {
  if (isCanonicalPath(cwd)) {
    return {
      warn: false,
      id: 'canonical-path',
      message: '',
      canonical: canonicalQaAgentPath(),
      preferred: true,
    };
  }
  if (isAiClonePath(cwd)) {
    return {
      warn: true,
      id: 'canonical-path',
      message:
        'Cwd is Documents\\AI\\qa-agent. Prefer Documents\\Test\\qa-agent only (one proj ensure id).',
      canonical: canonicalQaAgentPath(),
      preferred: false,
    };
  }
  return {
    warn: false,
    id: 'canonical-path',
    message: '',
    canonical: canonicalQaAgentPath(),
    preferred: false,
  };
}

module.exports = {
  canonicalQaAgentPath,
  canonicalWorkspaceCheck,
  isAiClonePath,
  isCanonicalPath,
  norm,
};
