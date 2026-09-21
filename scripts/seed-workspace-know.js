#!/usr/bin/env node
/**
 * Seed durable workspace TestRail map into store know (project scope). Idempotent skip if topic exists.
 * Usage: node scripts/seed-workspace-know.js [--dry-run]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');
const dry = process.argv.includes('--dry-run');

const SEEDS = [
  {
    dom: 'testrail',
    top: 'Q3 plan 849 default runs',
    con:
      'Plan 849: run 852 Lifecycle (section 33518), 853 Docflow (33515), 860 Regression, 896/901 doc brand, 905 Process (47436), 907 Decompose/Planner, 944 Camunda regression. Docflow regression run 925 deleted.',
    tag: '["plan849","runs","default"]',
  },
  {
    dom: 'testrail',
    top: 'Manage-order JW missing cases',
    con:
      'Suite 282 section 32148 Service Task Manage-x. Q3 plan 857 Progression run 858. Use Confluence Missing Test Case metadata for flagging/source/milestone.',
    tag: '["manage-x","857","858"]',
  },
  {
    dom: 'testrail',
    top: 'Plan entry merge safety',
    con:
      'Load case IDs from get_tests on the run not get_plan. update_plan_entry omits tests not in payload and wipes their results. Verify get_tests count after merge.',
    tag: '["plan","merge"]',
  },
  {
    dom: 'workspace',
    top: 'Canonical qa-agent folder',
    con: 'Daily workspace: Documents\\Test\\qa-agent. Avoid opening Documents\\AI\\qa-agent together (same remote and proj ensure id).',
    tag: '["canonical","path"]',
  },
  {
    dom: 'workspace',
    top: 'MCP boot anti-duplicate',
    con:
      'User sessionStart hook only. Empty repo .cursor/hooks.json sessionStart. /qa does not re-run mcp-mode auto. Repair: mcp-mode auto --if-changed --skip-if-hooked.',
    tag: '["mcp","hook"]',
  },
];

function storeArgs(args) {
  return spawnSync(process.execPath, [STORE, ...args], { encoding: 'utf8', cwd: REPO, windowsHide: true });
}

function knowExists(topic) {
  const r = storeArgs(['know', 'search', topic, '--project', 'auto']);
  if (r.status !== 0) return false;
  try {
    const rows = JSON.parse(r.stdout || '[]');
    return Array.isArray(rows) && rows.some((e) => e.top === topic);
  } catch {
    return false;
  }
}

function main() {
  if (!fs.existsSync(STORE)) {
    console.error('Missing store. Run installer first.');
    process.exit(1);
  }
  storeArgs(['proj', 'ensure']);
  let added = 0;
  let skipped = 0;
  for (const s of SEEDS) {
    if (knowExists(s.top)) {
      skipped++;
      continue;
    }
    if (dry) {
      console.log('would add', s.top);
      added++;
      continue;
    }
    const r = storeArgs([
      'know',
      'add',
      s.dom,
      s.top,
      s.con,
      s.tag,
      'seed-workspace-know',
      '--project',
      'auto',
    ]);
    if (r.status === 0) {
      added++;
      console.log('added', s.top);
    } else {
      console.error('fail', s.top, (r.stderr || r.stdout || '').trim());
    }
  }
  console.log(`seed complete: added=${added} skipped=${skipped} dry=${dry}`);
  if (!dry) {
    storeArgs(['pref', 'set', 'agent.boot_minimal', 'true', '--project', 'auto']);
    console.log('pref agent.boot_minimal=true (lite /qa when cache fresh)');
  }
}

main();
