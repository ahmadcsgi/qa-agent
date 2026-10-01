#!/usr/bin/env node
/**
 * Save external-system snapshot before Shortcut/TestRail writes (backup gate).
 * Does not call MCP. Agent fetches JSON first, then runs this script.
 *
 * Usage:
 *   node scripts/backup-external-edit.js shortcut <storyId> --file story.json
 *   node scripts/backup-external-edit.js testrail --scope bulk-squad --file cases.json
 *   type story.json | node scripts/backup-external-edit.js shortcut 283367
 *
 * Writes:
 *   temp/backup-<system>-<id-or-scope>-<YYYYMMDD>.json  (full payload)
 *   temp/backup-<system>-<id-or-scope>-<YYYYMMDD>.md    (human summary)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const TEMP = path.join(REPO, 'temp');

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }
    const chunks = [];
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

function loadPayload(filePath, stdinText) {
  if (filePath) {
    const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (!fs.existsSync(abs)) {
      console.error(`File not found: ${abs}`);
      process.exit(2);
    }
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  }
  const raw = (stdinText || '').trim();
  if (!raw) {
    console.error('No payload: use --file or pipe JSON on stdin.');
    process.exit(2);
  }
  return JSON.parse(raw);
}

function mdEscape(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function shortcutSummary(story) {
  const lines = [
    '# Shortcut story backup',
    '',
    `| Field | Value |`,
    `| --- | --- |`,
    `| id | ${mdEscape(story.id)} |`,
    `| name | ${mdEscape(story.name)} |`,
    `| story_type | ${mdEscape(story.story_type)} |`,
    `| workflow_state_id | ${mdEscape(story.workflow_state_id)} |`,
    `| estimate | ${mdEscape(story.estimate)} |`,
    `| labels | ${mdEscape((story.labels || []).map((l) => l.name || l).join(', '))} |`,
    '',
    '## custom_fields (full list in JSON)',
    '',
  ];
  const cfs = story.custom_fields || [];
  if (!cfs.length) {
    lines.push('_(none)_', '');
  } else {
    lines.push('| field_id | value_id | value |');
    lines.push('| --- | --- | --- |');
    for (const cf of cfs) {
      lines.push(
        `| ${mdEscape(cf.field_id)} | ${mdEscape(cf.value_id)} | ${mdEscape(cf.value)} |`
      );
    }
    lines.push('');
  }
  lines.push('Restore: merge edits into full `custom_fields` from the `.json` sibling file.');
  return lines.join('\n');
}

function testrailSummary(payload, scope) {
  const cases = Array.isArray(payload) ? payload : payload.cases || [payload];
  const lines = [
    '# TestRail case backup',
    '',
    `Scope: ${mdEscape(scope)}`,
    `Cases: ${cases.length}`,
    '',
    '| case id | title | section_id |',
    '| --- | --- | --- |',
  ];
  for (const c of cases) {
    lines.push(`| ${mdEscape(c.id)} | ${mdEscape(c.title)} | ${mdEscape(c.section_id)} |`);
  }
  lines.push('', 'Full fields (steps, expected, custom_*) are in the `.json` file.');
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h') || !argv.length) {
    console.log(`Usage:
  node scripts/backup-external-edit.js shortcut <storyId> [--file path]
  node scripts/backup-external-edit.js testrail --scope <label> [--file path]

Pipe JSON on stdin when --file omitted.`);
    process.exit(0);
  }

  const system = argv[0].toLowerCase();
  if (system !== 'shortcut' && system !== 'testrail') {
    console.error('system must be shortcut or testrail');
    process.exit(1);
  }

  let scope = '';
  let filePath = '';
  if (system === 'shortcut') {
    scope = argv[1];
    if (!scope || !/^\d+$/.test(scope)) {
      console.error('shortcut requires numeric story id');
      process.exit(1);
    }
  } else {
    const si = argv.indexOf('--scope');
    scope = si >= 0 && argv[si + 1] ? argv[si + 1] : 'cases';
  }
  const fi = argv.indexOf('--file');
  if (fi >= 0 && argv[fi + 1]) filePath = argv[fi + 1];

  const stdinText = await readStdin();
  const payload = loadPayload(filePath, stdinText);

  fs.mkdirSync(TEMP, { recursive: true });
  const stamp = dateStamp();
  const base = `backup-${system}-${scope}-${stamp}`;
  const jsonPath = path.join(TEMP, `${base}.json`);
  const mdPath = path.join(TEMP, `${base}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const md =
    system === 'shortcut'
      ? shortcutSummary(payload)
      : testrailSummary(payload, scope);
  fs.writeFileSync(mdPath, md + '\n', 'utf8');

  const out = { json: jsonPath, md: mdPath, system, scope, stamp };
  process.stdout.write(JSON.stringify(out) + '\n');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
