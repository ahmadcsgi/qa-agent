# Setup guide (complete)

End-to-end install for QA Agent. Secrets stay on your machine. Never commit `~/.cursor/mcp.json` or `~/.qa-agent/mcp/catalog.json` if they contain tokens.

**New clone?** Start with [FIRST_RUN.md](FIRST_RUN.md) (install → Reload → `/qa onboard`).

## 1. Prerequisites

| Need | Notes |
|------|--------|
| Cursor | Desktop, Agent + MCP |
| Node.js | 18+ (`node -v`) |
| Git | Or run `node scripts/setup-git.js` after clone |
| Accounts | Shortcut, TestRail, Glean (as required by your org) |

**Repo:** https://github.com/ahmadcsgi/qa-agent

```bash
git clone https://github.com/ahmadcsgi/qa-agent.git
cd qa-agent
```

## 2. Installer

| OS | Command |
|----|---------|
| Windows | `.\install.ps1` |
| macOS / Linux | `chmod +x install.sh && ./install.sh` |

What it does:

- Copies skills, rules, agent, references
- Installs `~/.qa-agent/lib/store.js`, `mcp-lib.js`, `mcp-mode.js`
- Seeds MCP catalog from examples **only if missing** (never overwrites your secrets)
- Optionally offers one-shot `setup-mcp` + `setup-git` + `setup-tooling`

Update later: `.\update.ps1` / `./update.sh` (force reinstall from this checkout).

## 3. MCP

```bash
node scripts/setup-mcp.js
# --lite | --full (default) | --with-optional | --non-interactive
```

| Profile | Servers |
|---------|---------|
| **full** (recommended) | Shortcut, TestRail, Glean, Context7, Cypress, Playwright |
| **lite** | Shortcut, TestRail, Glean |
| **optional** | full + k6 + karate MCP |

Switch without re-typing tokens (catalog-backed):

```bash
node scripts/mcp-mode.js full
node scripts/mcp-mode.js lite
node scripts/mcp-mode.js status
```

Details: [MCP.md](MCP.md). Optional k6/karate notes: [../mcp.json.optional.md](../mcp.json.optional.md).

## 4. Git identity

```bash
node scripts/setup-git.js
# --install  --non-interactive
```

Installs Git via winget/brew if missing. Asks `user.name` / `user.email`. Optional GPG helper on Windows.

## 5. CLI tooling (perf / API)

```bash
node scripts/setup-tooling.js
```

Detects/installs **k6**, **Java**, **Maven**. Karate MCP needs a separate `karate` CLI. Most API repos use Maven only.

## 6. Project prefs

```bash
node scripts/setup-prefs.js
```

Sets `squad.name`, `paths.ui_tests`, `paths.api_tests`, `paths.perf_tests` (project scope) and patches `project-context` when present.

## 7. Health + version

```bash
node scripts/doctor.js
node scripts/check-version.js
```

Doctor soft-warns on missing full MCP servers, placeholders, optional CLIs, and secret-looking catalog fields.

## 8. Start working

1. **Reload Cursor window** (required so `/qa` and `@qa` appear)
2. Dry-run: `node scripts/onboard-status.js`
3. Chat: `/qa onboard` (or `@qa` → `onboard`)
4. Private CSG process: ask teammate for gitignored `onboard.md` (see [ONBOARDING.md](ONBOARDING.md))

If `/qa` is missing after Reload, see [FIRST_RUN.md](FIRST_RUN.md).

## 9. Uninstall (global Cursor bits)

```powershell
.\uninstall.ps1              # removes skills/agent + ~/.qa-agent
.\uninstall.ps1 -KeepMemory  # keeps prefs/corrections, removes mcp-mode helpers
```

```bash
./uninstall.sh
./uninstall.sh --keep-memory
```

Does **not** delete project `.cursor/` or your `mcp.json` unless you remove them yourself.

## Script map

| Script | Purpose |
|--------|---------|
| `setup-mcp.js` | Write/merge `~/.cursor/mcp.json` + sync catalog |
| `mcp-mode.js` | lite / full / optional / all / status |
| `mcp-catalog-scrub.js` | Scan secrets, write redacted catalog copy |
| `setup-git.js` | Git install + identity |
| `setup-tooling.js` | k6 / Java / Maven |
| `setup-prefs.js` | squad + paths wizard (+ Cypress MCP sync) |
| `onboard-status.js` | Ready table dry-run (✓/✗) |
| `check-version.js` | local vs remote VERSION |
| `doctor.js` | Health check |
| `store.js` | Memory CLI (`boot`, `pref`, `cor`, …) |

## Safety

- No TestRail/Shortcut **writes** without explicit ACC
- No passwords in chat / `qa-memory` / git
- Catalog and mcp.json are personal
