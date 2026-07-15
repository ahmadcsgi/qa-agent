# Multi-project memory (3 layers)

Stays **lite**: tiny `boot` payload, no cloud, no embeddings.

## Layers

| Layer | Path | What belongs here |
|-------|------|-------------------|
| **1. Global (user)** | `~/.qa-agent/{prefs,corrections,knowledge}.json` | Standing prefs, universal lessons (`proj: "*"`) |
| **2. Project slice** | `~/.qa-agent/projects/<id>/` | Per-project prefs/cor/know + `context.md` snapshot |
| **3. Workspace** | `.cursor/qa-memory/` (gitignored) | Living project map in the repo |

Project `id` = first 8 chars of MD5(`git remote origin` || absolute cwd).

## CLI

```bash
# Register / detect current workspace
node ~/.qa-agent/lib/store.js proj ensure
node ~/.qa-agent/lib/store.js proj list
node ~/.qa-agent/lib/store.js proj sync          # copy project-context → snapshot

# Session brain (merged global + project)
node ~/.qa-agent/lib/store.js boot
node ~/.qa-agent/lib/store.js boot triage 5 --project auto

# Writes
node ~/.qa-agent/lib/store.js cor add ui "x" "bad wait" "use alias" "no hard waits" -1 "*"
node ~/.qa-agent/lib/store.js cor add ui "x" "login sel" "data-testid" "stable" 1 auto
node ~/.qa-agent/lib/store.js pref set default_env staging --project auto
```

`scope` / `--project`: `*` global · `auto` detect cwd · `<id>` explicit · `all` (read only).

## Agent protocol

1. `proj ensure` (once per workspace open / first task)
2. `boot [domain] --project auto` — apply merged prefs; follow `good`; avoid `bad`
3. Read `.cursor/qa-memory/project-context/current.md` when generating tests
4. After mapping / important context change → `proj sync`
5. Corrections: use `auto` when lesson is project-specific; `*` when universal

## Index

`~/.qa-agent/projects/index.json` maps `id → { name, path, remote, lastSeen }`.
