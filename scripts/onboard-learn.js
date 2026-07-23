#!/usr/bin/env node
/**
 * Parse onboard.md / onboard.example.md links → prefs + learn rows.
 *
 * Usage:
 *   node scripts/onboard-learn.js
 *   node scripts/onboard-learn.js --print
 *   node scripts/onboard-learn.js --save
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const HOME = process.env.HOME || process.env.USERPROFILE || os.homedir();
const REPO = path.resolve(__dirname, '..');
const STORE = path.join(HOME, '.qa-agent', 'lib', 'store.js');

function store(...args) {
  if (!fs.existsSync(STORE)) return '';
  const r = spawnSync(process.execPath, [STORE, ...args], {
    encoding: 'utf8',
    cwd: process.cwd(),
    windowsHide: true,
  });
  return (r.stdout || '').trim();
}

function classifyUrl(url) {
  const u = String(url).toLowerCase();
  if (/shortcut\.com|app\.shortcut/.test(u)) return 'shortcut';
  if (/testrail|testrails/.test(u)) return 'testrail';
  if (/glean\.|ask\.glean|glean\.com/.test(u)) return 'glean';
  if (/cypress\.io|docs\.cypress/.test(u)) return 'cypress';
  if (/playwright\.dev/.test(u)) return 'playwright';
  if (/k6\.io|grafana\.com\/docs\/k6/.test(u)) return 'k6';
  if (/karate|maven\.apache/.test(u)) return 'api';
  if (/github\.com/.test(u)) return 'github';
  if (/atlassian\.net|confluence/.test(u)) return 'docs';
  return 'other';
}

function extractLinks(md) {
  const found = [];
  const mdLink = /\[([^\]]*)\]\((https?:[^)\s]+)\)/gi;
  let m;
  while ((m = mdLink.exec(md))) {
    found.push({ label: m[1].trim() || m[2], url: m[2].trim() });
  }
  const bare = /https?:\/\/[^\s)>\]"'<>]+/gi;
  while ((m = bare.exec(md))) {
    const url = m[0].replace(/[.,;:]+$/, '');
    if (/[<>]/.test(url) || url.includes('…')) continue;
    if (!found.some((f) => f.url === url)) {
      found.push({ label: url, url });
    }
  }
  return found;
}

function pickOnboardFile(repoRoot) {
  const priv = path.join(repoRoot, 'onboard.md');
  const pub = path.join(repoRoot, 'onboard.example.md');
  if (fs.existsSync(priv)) return { file: priv, kind: 'private' };
  if (fs.existsSync(pub)) return { file: pub, kind: 'public' };
  return null;
}

/**
 * @returns {{ source, kind, links, byKind, learnRows, prefMap }}
 */
function learnFromOnboard(repoRoot = REPO) {
  const picked = pickOnboardFile(repoRoot);
  if (!picked) {
    return {
      source: null,
      kind: null,
      links: [],
      byKind: {},
      learnRows: [],
      prefMap: {},
    };
  }
  const text = fs.readFileSync(picked.file, 'utf8');
  const links = extractLinks(text);
  const byKind = {};
  const prefMap = {};
  for (const link of links) {
    const kind = classifyUrl(link.url);
    if (!byKind[kind]) byKind[kind] = [];
    byKind[kind].push(link);
  }
  const first = (k) => (byKind[k] && byKind[k][0] ? byKind[k][0].url : '');
  if (first('shortcut')) prefMap['links.shortcut'] = first('shortcut');
  if (first('testrail')) prefMap['links.testrail'] = first('testrail');
  if (first('glean')) prefMap['links.glean'] = first('glean');
  if (first('github')) prefMap['links.github'] = first('github');
  if (first('docs')) prefMap['links.docs'] = first('docs');

  const learnRows = [];
  for (const [kind, list] of Object.entries(byKind)) {
    const sample = list[0];
    const prefKey = `links.${kind}`;
    const storeWhere = prefMap[prefKey]
      ? `prefs ${prefKey} (from ${path.basename(picked.file)})`
      : `know/onboard (${path.basename(picked.file)})`;
    const activeHint =
      kind === 'shortcut' || kind === 'testrail' || kind === 'glean'
        ? 'MCP always active (lite+)'
        : kind === 'cypress' || kind === 'playwright'
          ? 'MCP active under paths.ui_tests'
          : kind === 'k6'
            ? 'CLI/skills under paths.perf_tests'
            : kind === 'api'
              ? 'CLI/skills under paths.api_tests'
              : 'Reference only';
    learnRows.push([
      `link:${kind} (${list.length})`,
      storeWhere,
      `${activeHint}. e.g. ${sample.url.slice(0, 60)}${sample.url.length > 60 ? '...' : ''}`,
    ]);
  }

  return {
    source: picked.file,
    kind: picked.kind,
    links,
    byKind,
    learnRows,
    prefMap,
  };
}

function saveLearned(result) {
  if (!result || !result.prefMap) return 0;
  let n = 0;
  for (const [k, v] of Object.entries(result.prefMap)) {
    if (!v) continue;
    store('pref', 'set', k, v, '--project', 'auto');
    n++;
  }
  if (result.links.length) {
    const summary = result.links
      .slice(0, 12)
      .map((l) => `${classifyUrl(l.url)}:${l.url}`)
      .join(' | ');
    store(
      'know',
      'add',
      'onboard',
      'links',
      summary.slice(0, 400),
      '["onboard","links"]'
    );
  }
  return n;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/onboard-learn.js [--print] [--save]

Parse onboard.md (private) or onboard.example.md for hub links.
--save writes prefs links.* + know entry.`);
    return;
  }
  const result = learnFromOnboard(REPO);
  if (!result.source) {
    console.log('No onboard.md or onboard.example.md found.');
    process.exit(0);
  }
  console.log(`Source: ${result.source} (${result.kind})`);
  console.log(`Links: ${result.links.length}`);
  if (argv.includes('--print') || !argv.includes('--save')) {
    for (const [kind, list] of Object.entries(result.byKind)) {
      console.log(`  ${kind}: ${list.length}`);
      for (const l of list.slice(0, 3)) console.log(`    - ${l.url}`);
    }
  }
  if (argv.includes('--save')) {
    const n = saveLearned(result);
    console.log(`Saved ${n} link pref(s) + know entry.`);
  }
}

/** Suggest MCP default URLs from onboard markdown (no secrets). */
function suggestMcpDefaults(repoRoot = REPO) {
  const result = learnFromOnboard(repoRoot);
  const out = {
    TESTRAIL_URL: '',
    GLEAN_URL: '',
    source: result.source,
  };
  const tr = (result.byKind && result.byKind.testrail) || [];
  for (const link of tr) {
    const u = link.url || '';
    const m = u.match(/^(https?:\/\/[^/\s]+)/i);
    if (m && /testrail/i.test(m[1])) {
      out.TESTRAIL_URL = m[1].replace(/\/$/, '');
      break;
    }
  }
  if (result.source && fs.existsSync(result.source)) {
    const text = fs.readFileSync(result.source, 'utf8');
    const glean = text.match(/https?:\/\/[^\s)"']+glean[^\s)"']*/i);
    if (glean) out.GLEAN_URL = glean[0].replace(/[.,]+$/, '');
    if (!out.TESTRAIL_URL) {
      const trHost = text.match(/https?:\/\/testrails?[^\s)"']*/i);
      if (trHost) {
        const m = trHost[0].match(/^(https?:\/\/[^/\s]+)/i);
        if (m) out.TESTRAIL_URL = m[1].replace(/\/$/, '');
      }
    }
  }
  return out;
}

/**
 * Keep private onboard.md "Aligned with: vX.Y.Z" in sync with repo VERSION.
 */
function syncOnboardVersion(repoRoot = REPO) {
  const onboard = path.join(repoRoot, 'onboard.md');
  const verFile = path.join(repoRoot, 'VERSION');
  if (!fs.existsSync(onboard) || !fs.existsSync(verFile)) {
    return { updated: false, reason: 'missing onboard.md or VERSION' };
  }
  const ver = fs.readFileSync(verFile, 'utf8').trim();
  let text = fs.readFileSync(onboard, 'utf8');
  const re = /(\*\*Aligned with:\*\* QA Agent \*\*)v[\d.]+(\*\*)/;
  if (!re.test(text)) {
    return { updated: false, version: ver, reason: 'pattern not found' };
  }
  const next = text.replace(re, `$1v${ver}$2`);
  if (next === text) return { updated: false, version: ver, reason: 'already set' };
  fs.writeFileSync(onboard, next, 'utf8');
  return { updated: true, version: ver };
}

module.exports = {
  learnFromOnboard,
  saveLearned,
  classifyUrl,
  extractLinks,
  pickOnboardFile,
  suggestMcpDefaults,
  syncOnboardVersion,
};

if (require.main === module) main();
