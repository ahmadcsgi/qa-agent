# QA Agent onboard (public stub)

> **This file is safe to commit.** It does **not** contain CSG/DGIT private process, Vault paths, or credentials.

## First-time (important)

`/qa onboard` only works **after** Cursor loads the QA command. New clones must:

1. Open this **qa-agent** folder in Cursor  
2. Run `.\install.ps1` or `./install.sh`  
3. **Reload Window**  
4. Then type `/qa onboard`  

Details: [docs/FIRST_RUN.md](docs/FIRST_RUN.md)

```bash
node scripts/onboard-progress.js --resume   # Ready + what is left
node scripts/onboard-status.js              # legacy dry-run table
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
Flow: resume → learn table → tooling OK/MISS → spaced form → apply → Reload if needed.

**Terminal:**

```bash
node scripts/onboard-wizard.js --resume
node scripts/onboard-wizard.js --print-learn
node scripts/onboard-wizard.js --print-tools
node scripts/onboard-wizard.js --print-form
# preview:
node scripts/onboard-wizard.js --dry-run --squad "MyTeam" --ui "C:\ui"
# apply:
node scripts/onboard-wizard.js --apply --squad "MyTeam" --ui "C:\ui" --api "C:\api" --perf "C:\perf" --tools 1,2
# or fully interactive:
node scripts/onboard-wizard.js
```

Hub links here (and private `onboard.md`) are parsed into prefs `links.*`.

- Repo: https://github.com/ahmadcsgi/qa-agent
- MCP: [docs/MCP.md](docs/MCP.md)

## Private CSG overlay

Teammates who need DGIT/Q&O specifics get private `onboard.md` **offline**. Gitignored. Never push.  
After wizard, agent may offer **Part C** (triage / GPG) from that file.

| Public (this repo) | Private (offline only) |
|--------------------|------------------------|
| `onboard.example.md` (this file) | `onboard.md` |
| `docs/FIRST_RUN.md`, `docs/SETUP.md`, … | Org URLs, Vault, Helix templates |

## Version

Local: [`VERSION`](VERSION). Compare: `node scripts/check-version.js`.

## Next docs

- [docs/FIRST_RUN.md](docs/FIRST_RUN.md)  
- [docs/SETUP.md](docs/SETUP.md)  
- [docs/MCP.md](docs/MCP.md)  
- [docs/DEMO.md](docs/DEMO.md)  
- [docs/ONBOARDING.md](docs/ONBOARDING.md)  
- [AGENTS.md](AGENTS.md)  
