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

const { testrailViaApiPref } = require('./mcp-lib');
const apiMode = testrailViaApiPref();

const miss = missingRequired({
  mcpServers: {
    shortcut: {},
    atlassian: {},
    testrail: { env: { TESTRAIL_USERNAME: '', TESTRAIL_API_KEY: 'YOUR_X' } },
  },
});
if (apiMode) {
  assert(!miss.includes('TESTRAIL_USERNAME'), 'api mode skips testrail credential checks');
} else {
  assert(miss.includes('TESTRAIL_USERNAME'), 'missing username detected');
  assert(miss.includes('TESTRAIL_API_KEY'), 'placeholder key detected');
}

const catalog = {
  mcpServers: {
    shortcut: {},
    testrail: {},
    atlassian: {},
    context7: {},
    cypress: {},
    playwright: {},
    k6: {},
    karate: {},
    github: {},
  },
};
const liteN = apiMode ? 2 : 3;
const fullN = apiMode ? 5 : 6;
const optN = apiMode ? 7 : 8;
assert(resolveProfileKeys('lite', catalog).length === liteN, `profile lite = ${liteN}`);
assert(resolveProfileKeys('full', catalog).length === fullN, `profile full = ${fullN}`);
assert(resolveProfileKeys('optional', catalog).length === optN, `profile optional = ${optN}`);
assert(resolveProfileKeys('all', catalog).includes('github'), 'profile all keeps github');
assert(resolveProfileKeys('ui', catalog).includes('cypress'), 'ui profile has cypress');
assert(!resolveProfileKeys('lite', catalog).includes('cypress'), 'lite has no cypress');
const { resolveAutoProfile } = require('./mcp-lib');
const autoUi = resolveAutoProfile('/work/ui-tests/foo', {
  ui: '/work/ui-tests',
  api: '/work/api',
  perf: '/work/perf',
});
assert(autoUi.profile === 'ui', 'auto under ui path');
const autoLite = resolveAutoProfile('/work/other', {
  ui: '/work/ui-tests',
  api: '/work/api',
  perf: '/work/perf',
});
assert(autoLite.profile === 'lite', 'auto outside paths is lite');

const autoMulti = resolveAutoProfile('/work/ui-b/spec', {
  ui: '/work/ui-a|/work/ui-b',
  api: '',
  perf: '',
});
assert(autoMulti.profile === 'ui', 'auto multi-path ui');

const {
  parsePathList,
  learnActivationRows,
} = require('./mcp-lib');
const { extractLinks } = require('./onboard-learn');

assert(parsePathList('a|b').length === 2, 'parsePathList pipe');
assert(learnActivationRows({ ui: 'x' }).some((r) => /catalog/i.test(r[1])), 'learn rows mention catalog');
{
  const links = extractLinks('[SC](https://app.shortcut.com/x) https://testrails.example/cases/view/1');
  assert(links.length >= 2, 'extractLinks finds markdown + bare');
}

const { collect } = require('./onboard-progress');
const prog = collect();
assert(Array.isArray(prog.steps) && prog.steps.length > 3, 'onboard-progress has steps');
assert(prog.resume && typeof prog.resume.needSquad === 'boolean', 'resume hints present');
assert(Array.isArray(prog.tools), 'tools detect list');


const {
  scanSecrets,
  redactSecrets,
  looksLikeSecret,
} = require('./mcp-lib');

assert(looksLikeSecret('ghp_abcdefghijklmnopqrstuvwxyz0123'), 'ghp_ detected as secret');
assert(!looksLikeSecret('YOUR_TESTRAIL_API_KEY'), 'placeholder not secret');
assert(!looksLikeSecret('https://example.com'), 'url not secret');

const scrubbed = redactSecrets({
  mcpServers: {
    testrail: { env: { TESTRAIL_API_KEY: 'ghp_abcdefghijklmnopqrstuvwxyz0123', TESTRAIL_URL: 'https://x' } },
  },
});
assert(
  String(scrubbed.mcpServers.testrail.env.TESTRAIL_API_KEY).startsWith('REDACTED_'),
  'redactSecrets masks key'
);
assert(
  scrubbed.mcpServers.testrail.env.TESTRAIL_URL === 'https://x',
  'redactSecrets keeps url'
);

// seed catalog in temp dir without touching user home secrets: unit only above
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-mcp-test-'));
assert(fs.existsSync(tmp), 'tmpdir created');

const { suggestMcpDefaults, syncOnboardVersion } = require('./onboard-learn');
const onboardTmp = path.join(tmp, 'onboard.md');
const verTmp = path.join(tmp, 'VERSION');
fs.writeFileSync(
  onboardTmp,
  '# Onboard\n**Aligned with:** QA Agent **v1.0.0**\nhttps://testrails.example.com/index.php\nhttps://acme.glean.com/mcp/default\n',
  'utf8'
);
fs.writeFileSync(verTmp, '9.9.9\n', 'utf8');
const sug = suggestMcpDefaults(tmp);
assert(sug.TESTRAIL_URL === 'https://testrails.example.com', 'suggestMcpDefaults TestRail host');
assert(/glean/i.test(sug.GLEAN_URL || ''), 'suggestMcpDefaults Glean URL');
const sync = syncOnboardVersion(tmp);
assert(sync.updated === true && sync.version === '9.9.9', 'syncOnboardVersion bumps Aligned with');
const after = fs.readFileSync(onboardTmp, 'utf8');
assert(after.includes('v9.9.9'), 'onboard.md shows new version');

const { resolveK6 } = require('./resolve-k6');
const rk = resolveK6();
assert(['host', 'wsl', 'missing'].includes(rk.runner), 'resolveK6 runner enum');
assert(typeof rk.host === 'boolean' && typeof rk.wsl === 'boolean', 'resolveK6 host/wsl flags');
assert(typeof rk.insideWsl === 'boolean', 'resolveK6 insideWsl flag');
assert(rk.prefer === 'auto' || rk.prefer === 'host' || rk.prefer === 'wsl', 'resolveK6 prefer');
const { isInsideWsl } = require('./resolve-k6');
assert(typeof isInsideWsl() === 'boolean', 'isInsideWsl returns boolean');
if (rk.runner !== 'missing') {
  assert(rk.invoke === 'native' || rk.invoke === 'wsl-bridge', 'resolveK6 invoke when found');
}

const { syncTestrailEnvFromLocal } = require('./sync-testrail-mcp-env');
assert(typeof syncTestrailEnvFromLocal === 'function', 'syncTestrailEnvFromLocal exported');
assert(typeof testrailViaApiPref === 'function', 'testrailViaApiPref exported');

fs.rmSync(tmp, { recursive: true, force: true });

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log('\nAll setup-mcp tests passed.');
