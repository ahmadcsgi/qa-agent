'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'backup-external-edit.js');
const tmpJson = path.join(os.tmpdir(), `qa-backup-test-${Date.now()}.json`);

const story = {
  id: 999001,
  name: 'Synthetic backup test',
  story_type: 'feature',
  estimate: 2,
  labels: [{ name: 'TC-ready' }],
  custom_fields: [{ field_id: 'x', value_id: '1', value: null }],
};
fs.writeFileSync(tmpJson, JSON.stringify(story), 'utf8');

const r = spawnSync(
  process.execPath,
  [script, 'shortcut', '999001', '--file', tmpJson],
  { cwd: REPO, encoding: 'utf8' }
);
assert.strictEqual(r.status, 0, r.stderr || r.stdout);
const out = JSON.parse(r.stdout.trim());
assert(fs.existsSync(out.json), 'json backup exists');
assert(fs.existsSync(out.md), 'md backup exists');
fs.unlinkSync(tmpJson);
fs.unlinkSync(out.json);
fs.unlinkSync(out.md);

console.log('backup-external-edit.test.js OK');
