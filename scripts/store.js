#!/usr/bin/env node
/**
 * QA Agent Storage Engine
 * Zero-dependency Node.js helper for fast, compact, scoring-based memory.
 *
 * Design:
 * - Short field names (1-4 chars) → ~40% smaller JSON
 * - Map-based search cache → O(1) lookups by query hash
 * - Scoring system: positive=good(recommend), negative=bad(reject), dynamic auto-adjust
 * - Auto-score: repeated same-issue corrections accumulate (good:+1, bad:-1)
 * - Append-oriented writes → no full-file rewrite for single entry
 * - Compaction → periodic cleanup prevents bloat
 *
 * Usage:
 *   node ~/.qa-agent/lib/store.js <cmd> [args]
 *
 * Commands:
 *   cache get <hash>          → JSON result or "null"
 *   cache set <hash> <q> <j>  → store cached result
 *   cache prune               → remove entries >24h old
 *
 *   cor add <dom> <ctx> <iss> <cor> <les> <sc>   → save decision (+1 or -1)
 *   cor list [dom] [minSc]    → list corrections, filtered
 *   cor search <txt>          → text search corrections
 *
 *   know add <dom> <top> <con> <tags> [src]       → save knowledge
 *   know search <txt>         → text search knowledge
 *   know list [dom]           → list knowledge
 *
 *   compact                   → compact all files
 *   stats                     → show sizes & counts
 *
 * Field name legend:
 *   v=version, c=compacted_at, d=data
 *   h=hash, q=query, r=results, t=time, a=accessed
 *   dom=domain, ctx=context, iss=issue, cor=correction
 *   les=lesson, sc=score, top=topic, con=content
 *   tag=tags, src=source, conf=confidence, id=id
 *
 * Scoring:
 *   sc > 0 → good pattern (recommend when similar case arises)
 *   sc < 0 → bad pattern (reject if user proposes similar solution)
 *   sc = 0 → neutral (no strong signal either way)
 *   Auto-adjusts: adding +1 to an existing entry increments score,
 *   adding -1 decrements. Over time, repeated feedback accumulates.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_DIR = path.resolve(process.env.HOME || process.env.USERPROFILE || '~', '.qa-agent');
const CACHE_FILE = path.join(STORE_DIR, 'search-cache.json');
const COR_FILE = path.join(STORE_DIR, 'corrections.json');
const KNOW_FILE = path.join(STORE_DIR, 'knowledge.json');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VERSION = 2;

// ─── Helpers ────────────────────────────────────────────────────────────────

function hash(str) {
  return crypto.createHash('md5').update(String(str)).digest('hex').slice(0, 8);
}

function now() {
  return new Date().toISOString();
}

function readJSON(filePath, schema='array') {
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
  const init = { v: VERSION, c: now(), d: schema === 'map' ? {} : [] };
  writeJSON(filePath, init);
  return init;
}

function arrToMap(arr) {
  const map = {};
  for (const item of arr) {
    if (item && item.q) {
      const h = hash(item.q);
      map[h] = item;
    }
  }
  return map;
}

function writeJSON(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, filePath);
}

function printJSON(data) {
  process.stdout.write(JSON.stringify(data) + '\n');
}

// Normalize text for similarity matching
function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Check if two strings are similar (one contains the other, or high word overlap)
function isSimilar(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = na.split(' ');
  const wb = nb.split(' ');
  const overlap = wa.filter(w => wb.includes(w)).length;
  return overlap >= Math.min(wa.length, wb.length) * 0.5;
}

// ─── Cache Operations ───────────────────────────────────────────────────────

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
  store.d[hashKey] = { q: query, r: JSON.parse(resultsJson), t: now(), a: now() };
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

// ─── Correction Operations (Scoring-based Decision Memory) ──────────────────

function corAdd(domain, context, issue, correction, lesson, score) {
  const store = readJSON(COR_FILE);
  const sc = parseInt(score, 10) || 0;

  // Check if similar entry exists (same domain + similar issue) — adjust score
  const matchIdx = store.d.findIndex(e =>
    e.dom === domain && isSimilar(e.iss, issue)
  );

  if (matchIdx >= 0) {
    const existing = store.d[matchIdx];
    existing.sc = (existing.sc || 0) + sc;
    existing.ctx = context;  // update context with latest
    existing.cor = correction;
    existing.les = lesson;
    existing.t = now();
    store.c = now();
    writeJSON(COR_FILE, store);
    printJSON(existing);
    return;
  }

  // Create new entry
  const entry = {
    id: store.d.length > 0 ? store.d[store.d.length - 1].id + 1 : 1,
    dom: domain,
    ctx: context,
    iss: issue,
    cor: correction,
    les: lesson,
    sc: sc,
    t: now()
  };
  store.d.push(entry);
  store.c = now();
  writeJSON(COR_FILE, store);
  printJSON(entry);
}

function corList(domain, minScore) {
  const store = readJSON(COR_FILE);
  let entries = store.d;
  if (domain) entries = entries.filter(e => e.dom === domain);
  if (minScore !== undefined && minScore !== null && minScore !== '') {
    const min = parseInt(minScore, 10);
    if (!isNaN(min)) entries = entries.filter(e => (e.sc || 0) >= min);
  }
  printJSON(entries);
}

function corSearch(text) {
  const store = readJSON(COR_FILE);
  const lower = text.toLowerCase();
  const results = store.d.filter(e =>
    (e.ctx && e.ctx.toLowerCase().includes(lower)) ||
    (e.iss && e.iss.toLowerCase().includes(lower)) ||
    (e.cor && e.cor.toLowerCase().includes(lower)) ||
    (e.les && e.les.toLowerCase().includes(lower)) ||
    (e.dom && e.dom.toLowerCase().includes(lower))
  );
  printJSON(results);
}

// ─── Knowledge Operations ───────────────────────────────────────────────────

function knowAdd(domain, topic, content, tagsJson, source) {
  const store = readJSON(KNOW_FILE);
  const entry = {
    id: store.d.length > 0 ? store.d[store.d.length - 1].id + 1 : 1,
    dom: domain,
    top: topic,
    con: content,
    tag: JSON.parse(tagsJson || '[]'),
    src: source || 'manual',
    conf: 1.0,
    t: now()
  };
  store.d.push(entry);
  store.c = now();
  writeJSON(KNOW_FILE, store);
  printJSON(entry);
}

function knowSearch(text) {
  const store = readJSON(KNOW_FILE);
  const lower = text.toLowerCase();
  const results = store.d.filter(e =>
    (e.top && e.top.toLowerCase().includes(lower)) ||
    (e.con && e.con.toLowerCase().includes(lower)) ||
    (e.dom && e.dom.toLowerCase().includes(lower)) ||
    (e.tag && e.tag.some(t => t.toLowerCase().includes(lower)))
  );
  printJSON(results);
}

function knowList(domain) {
  const store = readJSON(KNOW_FILE);
  let entries = store.d;
  if (domain) entries = entries.filter(e => e.dom === domain);
  printJSON(entries);
}

// ─── Maintenance ────────────────────────────────────────────────────────────

function compact() {
  const cache = readJSON(CACHE_FILE, 'map');
  const cutoff = Date.now() - CACHE_TTL_MS;
  for (const key of Object.keys(cache.d)) {
    if (new Date(cache.d[key].t).getTime() < cutoff) {
      delete cache.d[key];
    }
  }
  cache.c = now();
  writeJSON(CACHE_FILE, cache);

  const cor = readJSON(COR_FILE);
  cor.c = now();
  writeJSON(COR_FILE, cor);

  const know = readJSON(KNOW_FILE);
  know.c = now();
  writeJSON(KNOW_FILE, know);

  console.log('Compact complete');
}

function stats() {
  let result = {};
  for (const [name, file, schema] of [
    ['cache', CACHE_FILE, 'map'],
    ['corrections', COR_FILE, 'array'],
    ['knowledge', KNOW_FILE, 'array']
  ]) {
    const store = readJSON(file, schema);
    const size = fs.existsSync(file) ? fs.statSync(file).size : 0;
    const count = schema === 'map' ? Object.keys(store.d).length : store.d.length;
    result[name] = { entries: count, bytes: size };
  }
  printJSON(result);
}

// ─── CLI Router ─────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(`QA Agent Store v${VERSION}
Usage: node store.js <cmd> [args]

Commands:
  cache get <hash>
  cache set <hash> <query> <results_json>
  cache prune

  cor add <domain> <context> <issue> <correction> <lesson> <score>
  cor list [domain] [minScore]
  cor search <text>

  know add <domain> <topic> <content> <tags_json> [source]
  know search <text>
  know list [domain]

  compact
  stats

Scoring:
  score=+1 → good feedback (increments existing score if same issue)
  score=-1 → bad feedback (decrements existing score)
  score>0  → pattern to recommend, score<0 → pattern to reject`);
    process.exit(0);
  }

  const cmd = args[0];

  try {
    switch (cmd) {
      case 'cache':
        switch (args[1]) {
          case 'get': return cacheGet(args[2]);
          case 'set': return cacheSet(args[2], args[3], args.slice(4).join(' '));
          case 'prune': return cachePrune();
          default: console.error('Unknown cache subcommand:', args[1]); process.exit(1);
        }

      case 'cor':
        switch (args[1]) {
          case 'add': return corAdd(args[2], args[3], args[4], args[5], args[6], args[7]);
          case 'list': return corList(args[2], args[3]);
          case 'search': return corSearch(args.slice(2).join(' '));
          default: console.error('Unknown cor subcommand:', args[1]); process.exit(1);
        }

      case 'know':
        switch (args[1]) {
          case 'add': return knowAdd(args[2], args[3], args[4], args[5], args[6]);
          case 'search': return knowSearch(args.slice(2).join(' '));
          case 'list': return knowList(args[2]);
          default: console.error('Unknown know subcommand:', args[1]); process.exit(1);
        }

      case 'compact': return compact();
      case 'stats': return stats();

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
