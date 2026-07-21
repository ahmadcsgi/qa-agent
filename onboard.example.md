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

```bash
node scripts/setup-mcp.js
node scripts/mcp-mode.js full
node scripts/setup-git.js
node scripts/setup-tooling.js      # optional: k6, Java, Maven
node scripts/setup-prefs.js
node scripts/onboard-status.js
node scripts/doctor.js
```

Then in chat: `/qa onboard` (or `@qa` → `onboard`).

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
