# Cross-project local memory (Node pilot)

**Goal:** satu hub lokal lintas project, tanpa Python, tanpa API key memory cloud.

| Layer | Path | Role |
|-------|------|------|
| **Hub** | `~/Documents/ai-memory` (`tools.ai_memory_hub`) | Dokumentasi + optional cursor-brain storage |
| **Engine (default)** | [cursor-memory](https://github.com/tranhuucanh/cursor-memory) npm | Global + per-repo SQLite, MCP `/memo` `/recall`, offline embeddings |
| **Engine (ringan)** | [cursor-brain](https://github.com/samhith123/cursor-brain) npm | 4 MCP tools, FTS; DB bisa di `ai-memory/cursor-brain/storage` |
| **Engine (opsional)** | [PMB](https://github.com/oleksiijko/pmb) Python | Hanya jika pip tersedia; pref `tools.ai_memory_engine=pmb` |
| **QA store** | `~/.qa-agent/` | TestRail, Shortcut, `cor`/`know` (tetap sumber QA) |

## Boot order (`agent.boot_ai_memory=true`)

1. `node scripts/ai-memory-boot.js plan`
2. `node scripts/boot-session.js plan` → `proj ensure` / store `boot`
3. Task + MCP

## Quick start (Node, recommended)

```powershell
cd <qa-agent-repo>
node scripts/ai-memory-init.js --engine cursor-memory
node scripts/ai-memory-install-node.js cursor-memory
```

Requires **Node 20, 22, or 24 LTS** for `cursor-memory` (native `better-sqlite3`).

Manual MCP (if setup did not write `mcp.json`):

```json
{
  "mcpServers": {
    "cursor-memory": {
      "command": "npx",
      "args": ["-y", "cursor-memory"]
    }
  }
}
```

Reload Cursor. Commands in chat: `/memo`, `/recall`, `/forget`.

**Catatan req “simpan semua chat”:** cursor-memory default **user-triggered** `/memo` + auto-recall rules. Untuk arsip otomatis penuh perlu engine lain (cursor-mem Python-style) atau disiplin `/memo` di akhir sesi penting.

## Alternatif ringan: cursor-brain

```powershell
node scripts/ai-memory-init.js --engine cursor-brain
node scripts/ai-memory-install-node.js cursor-brain
```

Copy `storagePath` dari `Documents\ai-memory\cursor-brain\config.json` ke `~/.cursor-brain/config.json`.

MCP: `npx -y @samhithgardas/cursor-brain` (atau global `cursor-brain`).

## Bun

Tidak ada engine memory Cursor yang dominan pakai **Bun** saat ini. Pakai **Node npm** di atas; Bun bisa menjalankan `npx` compat tapi belum kami uji untuk `better-sqlite3`.

## Dual-write

| Simpan di | Contoh |
|-----------|--------|
| `~/.qa-agent` | TestRail merge, Shortcut checklist |
| cursor-memory global | Keputusan lintas repo, diskusi fungsi di project A |
| Jangan | Secrets, customer PII |

## Prefs

| Pref | Default |
|------|---------|
| `tools.ai_memory_hub` | `%USERPROFILE%\Documents\ai-memory` |
| `tools.ai_memory_engine` | `cursor-memory` |
| `agent.boot_ai_memory` | `true` after init |

## Health

```powershell
node scripts/ai-memory-boot.js status --json
cursor-memory status
```

### User rule install fails (EEXIST on `mkdir .cursor/rules`)

On some machines `~/.cursor/rules` is a **legacy single file**, not a folder. Rename it (for example `rules-file-backup.mdc`), create `~/.cursor/rules/` as a directory, then run `cursor-memory setup` again or copy `cursor-memory.mdc` from the npm package.

Refs: [OPTIONAL_INTEGRATIONS.md](OPTIONAL_INTEGRATIONS.md) · [MEMORY_SYNC.md](MEMORY_SYNC.md)
