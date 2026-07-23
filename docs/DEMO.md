# QA Agent - Demo Walkthrough (≈3 minutes)

End-to-end smoke after install. No tickets created unless you approve.

Full setup: [SETUP.md](SETUP.md) · [FIRST_RUN.md](FIRST_RUN.md) · [MCP.md](MCP.md)

## 0. Three-minute path

```text
1. Clone + Open qa-agent in Cursor
2. .\install.ps1  (or ./install.sh)
3. Reload Window
4. /qa onboard
   - see Ready / resume
   - fill spaced form (squad + paths + tooling)
   - Windows + CSG-blocked host k6: pick tooling **6** (k6 in WSL)
5. Reload once if MCP profile changed
6. /qa   > ask anything (e.g. search a known story)
```

Verify WSL k6 (Windows):

```bash
wsl -- k6 version
# or
node scripts/setup-wsl-tooling.js --status
```

```bash
./install.sh   # or .\install.ps1
node scripts/onboard-wizard.js --resume
node scripts/onboard-wizard.js --print-learn
node scripts/onboard-wizard.js --print-tools
node scripts/doctor.js
```

Auto profile:

```bash
node scripts/mcp-mode.js auto
node scripts/mcp-mode.js status
```

> Do **not** commit `~/.cursor/mcp.json` or catalogs with secrets.

## 1. Health check

```bash
node scripts/onboard-progress.js
node scripts/doctor.js
```

Expect: Node, store, mcp-mode, hook (after onboard), skills, MCP catalog.

## 2. Skill smoke (optional)

| Say | Skill |
|-----|-------|
| `run onboard` | entry / wizard |
| paste Shortcut URL | ask: cases / UI / search |
| `C12345` + automate | `@qa-ui-automation` |
| Incident / INC | `@qa-defect-triage` |

## 3. Onboard again / resume

```bash
node scripts/onboard-wizard.js --resume
```

Only incomplete fields are needed. Multi-product: open that product folder (prefs per cwd).

## 4. Private overlay

`/qa onboard` uses private `onboard.md` if present. Else [onboard.example.md](../onboard.example.md).  
Part C (triage/GPG) is optional after wizard.

Dry-run Ready: `node scripts/onboard-progress.js --resume`
