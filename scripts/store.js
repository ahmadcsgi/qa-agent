#!/usr/bin/env node
/**
 * QA Agent Storage Engine — 3-layer memory
 *
 * Layers:
 *   1) Global  ~/.qa-agent/{prefs,corrections,knowledge,search-cache}.json
 *   2) Project ~/.qa-agent/projects/<id>/{prefs,corrections,knowledge,context.md}
 *   3) Workspace .cursor/qa-memory/ (gitignored; sync → project context.md)
 *
 * Scope tags (layer B): each cor/know entry may store proj: "*" | "<id>"
 *
 * Usage: node ~/.qa-agent/lib/store.js <cmd> [args]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const STORE_DIR = path.resolve(process.env.HOME || process.env.USERPROFILE || '~', '.qa-agent');
const PROJECTS_DIR = path.join(STORE_DIR, 'projects');
const INDEX_FILE = path.join(PROJECTS_DIR, 'index.json');
const CACHE_FILE = path.join(STORE_DIR, 'search-cache.json');
const COR_FILE = path.join(STORE_DIR, 'corrections.json');
const KNOW_FILE = path.join(STORE_DIR, 'knowledge.json');
const PREF_FILE = path.join(STORE_DIR, 'prefs.json');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VERSION = 3;
const BOOT_DEFAULT_N = 3;
const BOOT_CONTEXT_CHARS = 400;
const CONTEXT_MAX_CHARS = 6000;
/** Prefs always included in boot (token thrift). */
const BOOT_PREF_ALWAYS = ['output.', 'tools.', 'search.', 'mcp.', 'mode.', 'paths.', 'squad.'];
/** Extra pref key prefixes per boot domain. */
const BOOT_PREF_BY_DOMAIN = {
  testcases: ['testcases.', 'testrail.'],
  triage: ['triage.'],
  search: ['search.'],
  automation: ['automation.', 'ui.', 'cypress.'],
  api: ['api.', 'karate.'],
  perf: ['perf.', 'k6.'],
  visual: ['visual.'],
  mapping: ['mapping.', 'project.'],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function hash(str) {
  return crypto.createHash('md5').update(String(str)).digest('hex').slice(0, 8);
}

function now() {
  return new Date().toISOString();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON(filePath, schema = 'array') {
  try {
    if (!fs.existsSync(filePath)) {
      return initFile(filePath, schema);
    }
    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) {
      return initFile(filePath, schema);
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const migrated = { v: VERSION, c: now(), d: schema === 'map' ? arrToMap(parsed) : parsed };
      writeJSON(filePath, migrated);
      return migrated;
    }
    return parsed;
  } catch {
    return initFile(filePath, schema);
  }
}

function initFile(filePath, schema) {
  ensureDir(path.dirname(filePath));
  const init = { v: VERSION, c: now(), d: schema === 'map' ? {} : [] };
  writeJSON(filePath, init);
  return init;
}

function arrToMap(arr) {
  const map = {};
  for (const item of arr) {
    if (item && item.q) {
      map[hash(item.q)] = item;
    }
  }
  return map;
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, filePath);
}

function printJSON(data) {
  process.stdout.write(JSON.stringify(data) + '\n');
}

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function isSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ');
  const wb = nb.split(' ');
  const overlap = wa.filter((w) => wb.includes(w)).length;
  return overlap >= Math.min(wa.length, wb.length) * 0.5;
}

function nextId(entries) {
  if (!entries.length) return 1;
  let max = 0;
  for (const e of entries) {
    if (typeof e.id === 'number' && e.id > max) max = e.id;
  }
  return max + 1;
}

function cwdRoot() {
  return process.env.QA_AGENT_CWD || process.cwd();
}

function gitRemote(cwd) {
  try {
    return execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function detectProjectMeta(cwd) {
  const root = path.resolve(cwd || cwdRoot());
  const remote = gitRemote(root);
  const key = remote || root;
  const id = hash(key);
  const name = path.basename(root);
  return { id, name, path: root, remote: remote || null };
}

// ─── Project layer ──────────────────────────────────────────────────────────

function readIndex() {
  return readJSON(INDEX_FILE, 'map');
}

function projectDir(id) {
  return path.join(PROJECTS_DIR, id);
}

function projectFiles(id) {
  const dir = projectDir(id);
  return {
    dir,
    prefs: path.join(dir, 'prefs.json'),
    cor: path.join(dir, 'corrections.json'),
    know: path.join(dir, 'knowledge.json'),
    meta: path.join(dir, 'meta.json'),
    context: path.join(dir, 'context.md'),
  };
}

function ensureProjectSlice(meta) {
  const files = projectFiles(meta.id);
  ensureDir(files.dir);
  readJSON(files.prefs, 'map');
  readJSON(files.cor, 'array');
  readJSON(files.know, 'array');
  const index = readIndex();
  index.d[meta.id] = {
    id: meta.id,
    name: meta.name,
    path: meta.path,
    remote: meta.remote,
    lastSeen: now(),
  };
  index.c = now();
  writeJSON(INDEX_FILE, index);
  writeJSON(files.meta, {
    v: VERSION,
    c: now(),
    d: { id: meta.id, name: meta.name, path: meta.path, remote: meta.remote, lastSeen: now() },
  });
  return meta;
}

function projEnsure(cwdArg) {
  const meta = detectProjectMeta(cwdArg || cwdRoot());
  ensureProjectSlice(meta);
  printJSON(meta);
  return meta;
}

function projList() {
  const index = readIndex();
  const list = Object.values(index.d || {}).sort((a, b) =>
    String(b.lastSeen || '').localeCompare(String(a.lastSeen || ''))
  );
  printJSON(list);
}

function projGet(idArg) {
  const id = idArg === 'auto' || !idArg ? detectProjectMeta().id : idArg;
  const index = readIndex();
  const entry = index.d[id];
  if (!entry) {
    printJSON(null);
    return;
  }
  const files = projectFiles(id);
  const hasCtx = fs.existsSync(files.context);
  printJSON({
    ...entry,
    counts: {
      prefs: Object.keys(readJSON(files.prefs, 'map').d).length,
      cor: readJSON(files.cor).d.length,
      know: readJSON(files.know).d.length,
      context: hasCtx,
    },
  });
}

function projSync(cwdArg) {
  const meta = ensureProjectSlice(detectProjectMeta(cwdArg || cwdRoot()));
  const files = projectFiles(meta.id);
  const src = path.join(meta.path, '.cursor', 'qa-memory', 'project-context', 'current.md');
  if (!fs.existsSync(src)) {
    printJSON({ id: meta.id, synced: false, reason: 'no workspace project-context/current.md' });
    return;
  }
  let text = fs.readFileSync(src, 'utf-8');
  if (text.length > CONTEXT_MAX_CHARS) {
    text = text.slice(0, CONTEXT_MAX_CHARS) + '\n\n<!-- truncated for multi-project snapshot -->\n';
  }
  fs.writeFileSync(files.context, text, 'utf-8');
  printJSON({ id: meta.id, synced: true, bytes: Buffer.byteLength(text), from: src });
}

/** Resolve write/read scope: * | auto | <id> */
function resolveScope(scopeArg) {
  if (!scopeArg || scopeArg === '*') return { type: 'global', id: '*', projTag: '*' };
  if (scopeArg === 'auto') {
    const meta = ensureProjectSlice(detectProjectMeta());
    return { type: 'project', id: meta.id, projTag: meta.id };
  }
  ensureDir(projectDir(scopeArg));
  const files = projectFiles(scopeArg);
  readJSON(files.prefs, 'map');
  readJSON(files.cor, 'array');
  readJSON(files.know, 'array');
  return { type: 'project', id: scopeArg, projTag: scopeArg };
}

function corPath(scope) {
  return scope.type === 'global' ? COR_FILE : projectFiles(scope.id).cor;
}

function knowPath(scope) {
  return scope.type === 'global' ? KNOW_FILE : projectFiles(scope.id).know;
}

function prefPath(scope) {
  return scope.type === 'global' ? PREF_FILE : projectFiles(scope.id).prefs;
}

function parseTrailingProject(args) {
  // returns { rest, scopeArg } where scopeArg default null (caller decides)
  const idx = args.findIndex((a) => a === '--project' || a === '-p');
  if (idx >= 0) {
    return { rest: args.filter((_, i) => i !== idx && i !== idx + 1), scopeArg: args[idx + 1] || 'auto' };
  }
  return { rest: args, scopeArg: null };
}

// ─── Cache Operations ───────────────────────────────────────────────────────

function cacheHash(query) {
  process.stdout.write(hash(query) + '\n');
}

function cacheGet(hashKey) {
  const store = readJSON(CACHE_FILE, 'map');
  const entry = store.d[hashKey];
  if (!entry) {
    process.stdout.write('null\n');
    return;
  }
  const age = Date.now() - new Date(entry.t).getTime();
  if (age > CACHE_TTL_MS) {
    delete store.d[hashKey];
    writeJSON(CACHE_FILE, store);
    process.stdout.write('null\n');
    return;
  }
  entry.a = now();
  writeJSON(CACHE_FILE, store);
  printJSON(entry.r);
}

function cacheSet(hashKey, query, resultsJson) {
  const store = readJSON(CACHE_FILE, 'map');
  let parsed;
  try {
    parsed = JSON.parse(resultsJson);
  } catch (err) {
    throw new Error(`Invalid JSON for cache set: ${err.message}`);
  }
  store.d[hashKey] = { q: query, r: parsed, t: now(), a: now() };
  writeJSON(CACHE_FILE, store);
}

function cachePrune() {
  const store = readJSON(CACHE_FILE, 'map');
  const cutoff = Date.now() - CACHE_TTL_MS;
  let removed = 0;
  for (const key of Object.keys(store.d)) {
    if (new Date(store.d[key].t).getTime() < cutoff) {
      delete store.d[key];
      removed++;
    }
  }
  store.c = now();
  writeJSON(CACHE_FILE, store);
  console.log(`Pruned ${removed} expired cache entries`);
}

// ─── Corrections ────────────────────────────────────────────────────────────

function corAdd(domain, context, issue, correction, lesson, score, scopeArg) {
  const scope = resolveScope(scopeArg || '*');
  const file = corPath(scope);
  const store = readJSON(file);
  const sc = parseInt(score, 10) || 0;

  const matchIdx = store.d.findIndex(
    (e) => e.dom === domain && isSimilar(e.iss, issue) && (e.proj || '*') === scope.projTag
  );

  if (matchIdx >= 0) {
    const existing = store.d[matchIdx];
    existing.sc = (existing.sc || 0) + sc;
    existing.ctx = context;
    existing.cor = correction;
    existing.les = lesson;
    existing.proj = scope.projTag;
    existing.t = now();
    store.c = now();
    writeJSON(file, store);
    printJSON(existing);
    return;
  }

  const entry = {
    id: nextId(store.d),
    dom: domain,
    ctx: context,
    iss: issue,
    cor: correction,
    les: lesson,
    sc,
    proj: scope.projTag,
    t: now(),
  };
  store.d.push(entry);
  store.c = now();
  writeJSON(file, store);
  printJSON(entry);
}

function loadCors(scopeArg, domain) {
  const scopes = [];
  if (!scopeArg || scopeArg === 'all') {
    scopes.push(resolveScope('*'));
    try {
      scopes.push(resolveScope('auto'));
    } catch {
      /* no project */
    }
  } else {
    scopes.push(resolveScope(scopeArg));
  }
  let entries = [];
  for (const s of scopes) {
    const file = corPath(s);
    const rows = readJSON(file).d || [];
    entries = entries.concat(rows.map((e) => ({ ...e, proj: e.proj || s.projTag })));
  }
  if (domain) entries = entries.filter((e) => e.dom === domain);
  return entries;
}

function corList(domain, minScore, maxScore, scopeArg) {
  let entries = loadCors(scopeArg || 'all', domain);
  if (minScore !== undefined && minScore !== null && minScore !== '') {
    const min = parseInt(minScore, 10);
    if (!isNaN(min)) entries = entries.filter((e) => (e.sc || 0) >= min);
  }
  if (maxScore !== undefined && maxScore !== null && maxScore !== '') {
    const max = parseInt(maxScore, 10);
    if (!isNaN(max)) entries = entries.filter((e) => (e.sc || 0) <= max);
  }
  printJSON(entries);
}

function corSearch(text, scopeArg) {
  const lower = text.toLowerCase();
  const results = loadCors(scopeArg || 'all').filter(
    (e) =>
      (e.ctx && e.ctx.toLowerCase().includes(lower)) ||
      (e.iss && e.iss.toLowerCase().includes(lower)) ||
      (e.cor && e.cor.toLowerCase().includes(lower)) ||
      (e.les && e.les.toLowerCase().includes(lower)) ||
      (e.dom && e.dom.toLowerCase().includes(lower)) ||
      (e.proj && String(e.proj).toLowerCase().includes(lower))
  );
  printJSON(results);
}

// ─── Knowledge ──────────────────────────────────────────────────────────────

function knowAdd(domain, topic, content, tagsJson, source, scopeArg) {
  const scope = resolveScope(scopeArg || '*');
  const file = knowPath(scope);
  const store = readJSON(file);
  let tags = [];
  try {
    tags = JSON.parse(tagsJson || '[]');
  } catch (err) {
    throw new Error(`Invalid tags JSON: ${err.message}`);
  }
  const entry = {
    id: nextId(store.d),
    dom: domain,
    top: topic,
    con: content,
    tag: tags,
    src: source || 'manual',
    proj: scope.projTag,
    conf: 1.0,
    t: now(),
  };
  store.d.push(entry);
  store.c = now();
  writeJSON(file, store);
  printJSON(entry);
}

function loadKnow(scopeArg, domain) {
  const scopes = [];
  if (!scopeArg || scopeArg === 'all') {
    scopes.push(resolveScope('*'));
    try {
      scopes.push(resolveScope('auto'));
    } catch {
      /* */
    }
  } else {
    scopes.push(resolveScope(scopeArg));
  }
  let entries = [];
  for (const s of scopes) {
    entries = entries.concat(
      (readJSON(knowPath(s)).d || []).map((e) => ({ ...e, proj: e.proj || s.projTag }))
    );
  }
  if (domain) entries = entries.filter((e) => e.dom === domain);
  return entries;
}

function knowSearch(text, scopeArg) {
  const lower = text.toLowerCase();
  const results = loadKnow(scopeArg || 'all').filter(
    (e) =>
      (e.top && e.top.toLowerCase().includes(lower)) ||
      (e.con && e.con.toLowerCase().includes(lower)) ||
      (e.dom && e.dom.toLowerCase().includes(lower)) ||
      (e.tag && e.tag.some((t) => t.toLowerCase().includes(lower)))
  );
  printJSON(results);
}

function knowList(domain, scopeArg) {
  printJSON(loadKnow(scopeArg || 'all', domain));
}

// ─── Preferences ────────────────────────────────────────────────────────────

function prefGet(key, scopeArg) {
  const scope = resolveScope(scopeArg || '*');
  const store = readJSON(prefPath(scope), 'map');
  if (!key) {
    printJSON(store.d);
    return;
  }
  printJSON(store.d[key] !== undefined ? store.d[key] : null);
}

function prefSet(key, value, scopeArg) {
  if (!key) throw new Error('pref set requires <key> <value>');
  const scope = resolveScope(scopeArg || '*');
  const store = readJSON(prefPath(scope), 'map');
  let parsed = value;
  try {
    parsed = JSON.parse(value);
  } catch {
    /* string */
  }
  store.d[key] = parsed;
  store.c = now();
  writeJSON(prefPath(scope), store);
  printJSON({ scope: scope.projTag, [key]: parsed });
}

function prefDel(key, scopeArg) {
  const scope = resolveScope(scopeArg || '*');
  const store = readJSON(prefPath(scope), 'map');
  delete store.d[key];
  store.c = now();
  writeJSON(prefPath(scope), store);
  printJSON({ scope: scope.projTag, deleted: key });
}

function mergedPrefs(projectId) {
  const global = readJSON(PREF_FILE, 'map').d || {};
  if (!projectId) return { ...global };
  const local = readJSON(projectFiles(projectId).prefs, 'map').d || {};
  return { ...global, ...local };
}

function topLessons(entries, domain, n, sign) {
  let list = entries;
  if (domain) list = list.filter((e) => e.dom === domain);
  if (sign > 0) list = list.filter((e) => (e.sc || 0) > 0).sort((a, b) => (b.sc || 0) - (a.sc || 0));
  else list = list.filter((e) => (e.sc || 0) < 0).sort((a, b) => (a.sc || 0) - (b.sc || 0));
  return list.slice(0, n).map((e) => ({
    dom: e.dom,
    iss: e.iss,
    les: e.les,
    sc: e.sc || 0,
    proj: e.proj || '*',
  }));
}

/**
 * Keep boot prefs small: always-include prefixes + domain prefixes.
 * No domain → only BOOT_PREF_ALWAYS (plus undotted keys).
 */
function filterPrefsForBoot(prefs, domain) {
  const prefixes = [...BOOT_PREF_ALWAYS];
  if (domain) {
    prefixes.push(`${domain}.`);
    const extra = BOOT_PREF_BY_DOMAIN[String(domain).toLowerCase()];
    if (extra) prefixes.push(...extra);
  }
  const out = {};
  for (const [k, v] of Object.entries(prefs || {})) {
    if (!domain && !k.includes('.')) {
      out[k] = v;
      continue;
    }
    if (prefixes.some((p) => k.startsWith(p))) out[k] = v;
  }
  return out;
}

/**
 * boot [domain] [n] [--project auto|id|*]
 * Merges global + project prefs/lessons (tiny payload).
 */
function boot(rawArgs) {
  const { rest, scopeArg } = parseTrailingProject(rawArgs);
  let domain = rest[0];
  let nArg = rest[1];
  // allow: boot --project auto
  if (domain === undefined || domain === '') domain = undefined;
  if (domain && !nArg && /^\d+$/.test(domain)) {
    nArg = domain;
    domain = undefined;
  }
  const n = Math.min(Math.max(parseInt(nArg, 10) || BOOT_DEFAULT_N, 1), 12);

  let projectId = null;
  const want = scopeArg || 'auto';
  if (want !== '*') {
    try {
      projectId = resolveScope(want).id;
    } catch {
      projectId = null;
    }
  }

  const prefsAll = mergedPrefs(projectId === '*' ? null : projectId);
  const prefs = filterPrefsForBoot(prefsAll, domain);
  const globalCors = (readJSON(COR_FILE).d || []).map((e) => ({ ...e, proj: e.proj || '*' }));
  let projectCors = [];
  if (projectId && projectId !== '*') {
    projectCors = (readJSON(projectFiles(projectId).cor).d || []).map((e) => ({
      ...e,
      proj: e.proj || projectId,
    }));
  }

  const good = [
    ...topLessons(projectCors, domain, n, 1),
    ...topLessons(globalCors, domain, n, 1),
  ];
  const bad = [
    ...topLessons(projectCors, domain, n, -1),
    ...topLessons(globalCors, domain, n, -1),
  ];

  let contextExcerpt = null;
  if (projectId && projectId !== '*') {
    const ctxPath = projectFiles(projectId).context;
    if (fs.existsSync(ctxPath)) {
      const raw = fs.readFileSync(ctxPath, 'utf-8');
      contextExcerpt =
        raw.length > BOOT_CONTEXT_CHARS ? raw.slice(0, BOOT_CONTEXT_CHARS) + '…' : raw;
    }
  }

  const knowG = readJSON(KNOW_FILE).d || [];
  const knowP =
    projectId && projectId !== '*' ? readJSON(projectFiles(projectId).know).d || [] : [];
  const cache = readJSON(CACHE_FILE, 'map').d || {};

  printJSON({
    project: projectId && projectId !== '*' ? projectId : null,
    prefs,
    good,
    bad,
    context: contextExcerpt,
    n: {
      cor_g: globalCors.length,
      cor_p: projectCors.length,
      know_g: knowG.length,
      know_p: knowP.length,
      cache: Object.keys(cache).length,
      prefs: Object.keys(prefs).length,
      prefs_all: Object.keys(prefsAll).length,
    },
  });
}

// ─── Maintenance ────────────────────────────────────────────────────────────

function compact() {
  for (const [file, schema] of [
    [CACHE_FILE, 'map'],
    [COR_FILE, 'array'],
    [KNOW_FILE, 'array'],
    [PREF_FILE, 'map'],
  ]) {
    if (file === CACHE_FILE) {
      const cache = readJSON(CACHE_FILE, 'map');
      const cutoff = Date.now() - CACHE_TTL_MS;
      for (const key of Object.keys(cache.d)) {
        if (new Date(cache.d[key].t).getTime() < cutoff) delete cache.d[key];
      }
      cache.c = now();
      writeJSON(CACHE_FILE, cache);
      continue;
    }
    const store = readJSON(file, schema);
    store.c = now();
    writeJSON(file, store);
  }
  console.log('Compact complete');
}

function stats() {
  const result = {};
  for (const [name, file, schema] of [
    ['cache', CACHE_FILE, 'map'],
    ['corrections', COR_FILE, 'array'],
    ['knowledge', KNOW_FILE, 'array'],
    ['prefs', PREF_FILE, 'map'],
  ]) {
    const store = readJSON(file, schema);
    const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    const count = schema === 'map' ? Object.keys(store.d).length : store.d.length;
    result[name] = { entries: count, bytes: size };
  }
  const index = readIndex();
  result.projects = { entries: Object.keys(index.d || {}).length };
  printJSON(result);
}

// ─── CLI Router ─────────────────────────────────────────────────────────────

function usage() {
  console.log(`QA Agent Store v${VERSION} (3-layer memory)
Usage: node store.js <cmd> [args]

Layers: global (*) | project (~/.qa-agent/projects/<id>) | workspace (.cursor/qa-memory)

  proj ensure [cwd]              register/detect project for cwd
  proj list                      list known projects
  proj get [auto|id]             project meta + counts
  proj sync [cwd]                snapshot workspace project-context → project slice

  cache hash|get|set|prune
  cor add <dom> <ctx> <iss> <cor> <les> <sc> [scope]
  cor list [dom] [min] [max] [--project auto|id|*|all]
  cor search <text> [--project ...]
  know add <dom> <top> <con> <tags> [src] [scope]
  know search|list ... [--project ...]
  pref get|set|del ... [--project auto|id|*]
  boot [domain] [n] [--project auto|id|*]
  compact | stats

scope: * = global (default for writes), auto = detect cwd project, or explicit id
boot merges global + project prefs/lessons (tiny).`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    usage();
    process.exit(0);
  }

  const cmd = args[0];

  try {
    switch (cmd) {
      case 'proj':
      case 'project':
        switch (args[1]) {
          case 'ensure':
          case 'id':
          case 'detect':
            return projEnsure(args[2]);
          case 'list':
            return projList();
          case 'get':
            return projGet(args[2]);
          case 'sync':
            return projSync(args[2]);
          default:
            console.error('Unknown proj subcommand:', args[1]);
            process.exit(1);
        }

      case 'cache':
        switch (args[1]) {
          case 'hash':
            return cacheHash(args.slice(2).join(' '));
          case 'get':
            return cacheGet(args[2]);
          case 'set':
            return cacheSet(args[2], args[3], args.slice(4).join(' '));
          case 'prune':
            return cachePrune();
          default:
            console.error('Unknown cache subcommand:', args[1]);
            process.exit(1);
        }

      case 'cor': {
        const { rest, scopeArg } = parseTrailingProject(args.slice(1));
        switch (rest[0]) {
          case 'add':
            return corAdd(rest[1], rest[2], rest[3], rest[4], rest[5], rest[6], rest[7] || scopeArg || '*');
          case 'list':
            return corList(rest[1], rest[2], rest[3], scopeArg || 'all');
          case 'search':
            return corSearch(rest.slice(1).join(' '), scopeArg || 'all');
          default:
            console.error('Unknown cor subcommand:', rest[0]);
            process.exit(1);
        }
      }

      case 'know': {
        const { rest, scopeArg } = parseTrailingProject(args.slice(1));
        switch (rest[0]) {
          case 'add':
            // know add <dom> <top> <con> <tags> [src]  + optional --project
            return knowAdd(rest[1], rest[2], rest[3], rest[4], rest[5] || 'manual', scopeArg || '*');
          case 'search':
            return knowSearch(rest.slice(1).join(' '), scopeArg || 'all');
          case 'list':
            return knowList(rest[1], scopeArg || 'all');
          default:
            console.error('Unknown know subcommand:', rest[0]);
            process.exit(1);
        }
      }

      case 'pref': {
        const { rest, scopeArg } = parseTrailingProject(args.slice(1));
        switch (rest[0]) {
          case 'get':
            return prefGet(rest[1], scopeArg || '*');
          case 'set':
            return prefSet(rest[1], rest.slice(2).join(' '), scopeArg || '*');
          case 'del':
            return prefDel(rest[1], scopeArg || '*');
          default:
            console.error('Unknown pref subcommand:', rest[0]);
            process.exit(1);
        }
      }

      case 'boot':
        return boot(args.slice(1));
      case 'compact':
        return compact();
      case 'stats':
        return stats();

      default:
        console.error('Unknown command:', cmd);
        process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
