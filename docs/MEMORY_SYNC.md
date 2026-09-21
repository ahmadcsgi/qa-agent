# Memory sync (continual learning + store)

QA Agent uses **two durable layers**:

| Layer | Path | Role |
|-------|------|------|
| Store | `~/.qa-agent/` (`cor`, `know`, `pref`, `boot`) | Scored corrections, searchable facts, boot payload |
| Workspace | `.cursor/qa-memory/` (gitignored) | Project context, previews, local corrections markdown |

`AGENTS.md` **Learned** sections: stable principles only (max ~12 bullets each). Long operational maps belong in **`know`**, not duplicated in git.

## Continual learning → store

When running **continual-learning** / `agents-memory-updater`:

1. High-signal **preferences** → prefer `pref set` or `cor add` with score `+1`
2. Durable **workspace facts** (plan ids, sections, tooling paths) → `know add` with `--project auto`
3. Update `AGENTS.md` only for cross-cutting principles not expressible as one `know` row
4. Run `node scripts/seed-workspace-know.js` after major TestRail map changes (idempotent)

Commands:

```bash
node ~/.qa-agent/lib/store.js know add testrail "topic" "content" '["tag"]' manual --project auto
node ~/.qa-agent/lib/store.js cor add testcases context issue fix lesson 1 --project auto
node scripts/seed-workspace-know.js
```

## Boot speed

```bash
node scripts/boot-session.js plan
node ~/.qa-agent/lib/store.js boot testcases --project auto   # includes know[] excerpt
```

Pref **`agent.boot_minimal=true`**: `/qa` skips boot when session cache is fresh unless domain is testcases/automation/execution/onboard.

## Health

```bash
node scripts/qa-health.js
node scripts/doctor.js
```
