# First run (new clone) — before `/qa` exists

`/qa onboard` needs Cursor to load the QA Agent **command** (and usually the installer for memory + MCP). A fresh clone alone is not enough if you never install or never Reload.

## Recommended path (this repo as workspace)

```text
1. git clone https://github.com/ahmadcsgi/qa-agent.git
2. Open the qa-agent folder in Cursor (File > Open Folder)
3. Terminal in that folder:
     Windows:  .\install.ps1
     macOS/Linux:  chmod +x install.sh && ./install.sh
4. Cursor: Developer: Reload Window  (or restart Cursor)
5. Chat: `/qa onboard`  (runs onboard-wizard)
   Or terminal: `node scripts/onboard-wizard.js`
   Or `@qa` then type: onboard
```

| Step | Why |
|------|-----|
| Open **this** folder | Project already has `.cursor/commands/qa.md`, `.cursor/agents/qa.md`, `.cursor/skills/` |
| `install.ps1` / `install.sh` | Installs `~/.qa-agent` (store, mcp-mode), global skills/agent, scaffolds memory |
| **Reload Window** | Cursor reloads slash commands + agents. Without this, `/qa` often missing |
| `/qa onboard` | Runs checklist (MCP, git, prefs, doctor). Uses private `onboard.md` if you added it |

## If `/qa` still does not appear

1. Confirm you opened the **qa-agent** root (file `AGENTS.md` visible).
2. Confirm `.cursor/commands/qa.md` exists.
3. Reload Window again.
4. Fallback (no slash command):
   - Agent dropdown → **@qa**, then type `onboard`
   - Or plain chat: *Read `onboard.example.md` and `docs/SETUP.md`. Run install/setup steps with me.*
5. Or run setup yourself in terminal (no agent yet):

```bash
node scripts/setup-mcp.js
node scripts/setup-git.js
node scripts/setup-tooling.js
node scripts/setup-prefs.js
node scripts/mcp-mode.js full
node scripts/doctor.js
```

Then Reload and retry `/qa`.

## Using QA Agent inside another product repo

1. Clone + install **qa-agent** once (global skills under `~/.cursor/skills/`).
2. Open your **product** repo in Cursor.
3. Reload if needed. `/qa` / `@qa` should work from the global install.
4. Run `setup-prefs.js` (or `/qa` ask to set paths) for that product’s UI/API/perf folders.

## Private CSG `onboard.md`

Optional. Place at repo root (gitignored). Share offline only.  
Without it, `/qa onboard` still works via `onboard.example.md` + `docs/SETUP.md`.

## Status table (dry-run)

```bash
node scripts/onboard-status.js
```

Prints ✓/✗ for install, MCP, git, prefs, doctor hints. Safe to run anytime.

More: [SETUP.md](SETUP.md) · [ONBOARDING.md](ONBOARDING.md) · [onboard.example.md](../onboard.example.md)
