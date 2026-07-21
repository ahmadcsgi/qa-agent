# QA Agent onboard (public stub)

> **This file is safe to commit.** It does **not** contain CSG/DGIT private process, Vault paths, or credentials.

## First-time (important)

`/qa onboard` only works **after** Cursor loads the QA command. New clones must:

1. Open this **qa-agent** folder in Cursor  
2. Run `.\install.ps1` or `./install.sh`  
3. **Reload Window**  
4. Then type `/qa onboard`  

Details: [docs/FIRST_RUN.md](docs/FIRST_RUN.md)

Dry-run Ready table (works in terminal even before `/qa`):

```bash
node scripts/onboard-status.js
```

## Clone

```bash
git clone https://github.com/ahmadcsgi/qa-agent.git
cd qa-agent
```

| OS | Install |
|----|---------|
| Windows | `.\install.ps1` |
| macOS / Linux | `chmod +x install.sh && ./install.sh` |

## After install + Reload

**Chat (recommended):** `/qa onboard`  
Agent prints learn table, asks squad + paths + tooling, then applies.

**Terminal:**

```bash
node scripts/onboard-wizard.js
# learn table → full MCP → squad + paths (multi a|b) → tooling (1,2 or 5) → hook + auto

# Or chat-equivalent apply:
# node scripts/onboard-wizard.js --apply --squad "MyTeam" --ui "C:\ui" --api "C:\api" --perf "C:\perf" --tools 1,2

node scripts/onboard-status.js
```

Hub links in this file (and private `onboard.md`) are parsed into prefs `links.*`.

Example public docs:

- Repo: https://github.com/ahmadcsgi/qa-agent
- MCP guide: see [docs/MCP.md](docs/MCP.md)

## Private CSG overlay

Teammates who need DGIT/Q&O specifics get private `onboard.md` **offline**. Gitignored. Never push.

| Public (this repo) | Private (offline only) |
|--------------------|------------------------|
| `onboard.example.md` (this file) | `onboard.md` |
| `docs/FIRST_RUN.md`, `docs/SETUP.md`, … | Org URLs, Vault, Helix templates |

## Version

Local: [`VERSION`](VERSION). Compare: `node scripts/check-version.js`.

## Next docs

- [docs/FIRST_RUN.md](docs/FIRST_RUN.md) — clone → install → Reload → `/qa`  
- [docs/SETUP.md](docs/SETUP.md)  
- [docs/MCP.md](docs/MCP.md)  
- [docs/DEMO.md](docs/DEMO.md)  
- [docs/ONBOARDING.md](docs/ONBOARDING.md)  
- [AGENTS.md](AGENTS.md)  
