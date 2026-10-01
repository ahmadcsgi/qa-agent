'use strict';

const assert = require('assert');
const path = require('path');
const {
  canonicalWorkspaceCheck,
  isAiClonePath,
} = require('./lib/canonical-workspace');

const ai = path.join('C:', 'Users', 'me', 'Documents', 'AI', 'qa-agent');
assert(isAiClonePath(ai), 'AI clone detected');
const c = canonicalWorkspaceCheck(ai);
assert(c.warn === true, 'warn on AI clone');
assert(c.message.includes('Documents\\Test\\qa-agent'), 'message mentions Test folder');

const other = path.join('C:', 'dev', 'qa-agent');
assert(canonicalWorkspaceCheck(other).warn === false, 'neutral path no warn');

console.log('canonical-workspace.test.js OK');
