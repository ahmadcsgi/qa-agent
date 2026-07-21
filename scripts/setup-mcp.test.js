#!/usr/bin/env node
/**
 * Self-check for mcp-lib + setup-mcp helpers (no test framework).
 * Usage: node scripts/setup-mcp.test.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  isPlaceholder,
  mergeServers,
  resolveProfileKeys,
  LITE,
  FULL,
  OPTIONAL,
} = require('./mcp-lib');
const { parseArgs, buildServerDefs, missingRequired } = require('./setup-mcp');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('OK  :', msg);
  }
}

assert(isPlaceholder(''), 'empty is placeholder');
assert(isPlaceholder('YOUR_TESTRAIL_API_KEY'), 'YOUR_ is placeholder');
assert(isPlaceholder('PATH_TO_UI_TEST_REPO'), 'PATH_TO_ is placeholder');
assert(!isPlaceholder('real-key-123'), 'real value not placeholder');

const merged = mergeServers(
  { mcpServers: { testrail: { env: { TESTRAIL_API_KEY: 'keep-me', TESTRAIL_USERNAME: '' } } } },
  {
    testrail: {
      command: 'npx',
      env: { TESTRAIL_API_KEY: '', TESTRAIL_USERNAME: 'a@b.com', TESTRAIL_URL: 'https://x' },
    },
  },
  false
);
assert(merged.mcpServers.testrail.env.TESTRAIL_API_KEY === 'keep-me', 'merge keeps secret');
assert(merged.mcpServers.testrail.env.TESTRAIL_USERNAME === 'a@b.com', 'merge fills empty username');

const opts = parseArgs(['--lite']);
assert(opts.lite === true && opts.full === false, 'parseArgs --lite');
const fullOpts = parseArgs(['--normal']);
assert(fullOpts.full === true, 'parseArgs --normal = full');

const liteBuilt = buildServerDefs({ full: false, withOptional: false });
assert(Object.keys(liteBuilt).sort().join(',') === LITE.slice().sort().join(','), 'lite servers');
const fullBuilt = buildServerDefs({ full: true, withOptional: false });
assert(Object.keys(fullBuilt).sort().join(',') === FULL.slice().sort().join(','), 'full servers');
const optBuilt = buildServerDefs({ full: true, withOptional: true });
assert(!!optBuilt.k6 && !!optBuilt.karate, 'optional adds k6+karate');
assert(optBuilt.karate.args.join(' ').includes('mcp'), 'karate mcp args');

const miss = missingRequired({
  mcpServers: {
    shortcut: {},
    glean: {},
    testrail: { env: { TESTRAIL_USERNAME: '', TESTRAIL_API_KEY: 'YOUR_X' } },
  },
});
assert(miss.includes('TESTRAIL_USERNAME'), 'missing username detected');
assert(miss.includes('TESTRAIL_API_KEY'), 'placeholder key detected');

const catalog = {
  mcpServers: {
    shortcut: {},
    testrail: {},
    glean: {},
    context7: {},
    cypress: {},
    playwright: {},
    k6: {},
    karate: {},
    github: {},
  },
};
assert(resolveProfileKeys('lite', catalog).length === 3, 'profile lite = 3');
assert(resolveProfileKeys('full', catalog).length === 6, 'profile full = 6');
assert(resolveProfileKeys('optional', catalog).length === 8, 'profile optional = 8');
assert(resolveProfileKeys('all', catalog).includes('github'), 'profile all keeps github');
assert(OPTIONAL.length === 2, 'OPTIONAL has k6+karate');

// seed catalog in temp dir without touching user home secrets: unit only above
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-mcp-test-'));
assert(fs.existsSync(tmp), 'tmpdir created');
fs.rmSync(tmp, { recursive: true, force: true });

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nAll setup-mcp tests passed.');
