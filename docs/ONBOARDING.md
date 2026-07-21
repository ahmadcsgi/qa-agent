# Onboarding distribution (public vs private)

## How teammates get `/qa` the first time

1. Clone + open **qa-agent** in Cursor  
2. Run installer  
3. **Reload Window**  
4. `/qa onboard` (chat wizard)  

Or terminal: `node scripts/onboard-wizard.js`

Without step 2–3, slash command / agent often missing. See [FIRST_RUN.md](FIRST_RUN.md).

Dry-run only: `node scripts/onboard-status.js`

## Primary path: onboard wizard

| Step | What |
|------|------|
| Learn table | Catalog vs active MCP + links from `onboard.md` / example |
| MCP | Install **full** into `~/.qa-agent/mcp/catalog.json` once |
| Prefs | Squad + `paths.ui_tests` / `api` / `perf` (multi: `a|b`) |
| Tooling | Picker `1,2` or `5`=all missing (git / k6 / java / mvn) |
| Auto | `mcp.path_aware` + user `sessionStart` hook + `mcp-mode auto` |

Chat (`/qa onboard`): `--print-learn` then ask answers then `--apply …`.  
Terminal: interactive `onboard-wizard.js`.

## Why two files?

| File | In git? | Audience |
|------|---------|----------|
| [`onboard.example.md`](../onboard.example.md) | Yes | Anyone cloning the repo |
| `onboard.md` | **No** (gitignore) | CSG/DGIT teammates only |

Private onboard holds org-specific hubs, triage tone, env portals, signing wiki links, and Ready checklists that should not live in a public or semi-public repo.

Wizard parses links from whichever file exists (private preferred) into prefs `links.*` + knowledge.

## How to share private `onboard.md`

1. Maintainer keeps a current `onboard.md` locally (aligned with `VERSION`).
2. Share via **secure channel** only: encrypted attachment, Confluence restricted page, or 1:1.
3. Recipient places the file at repo root: `qa-agent/onboard.md`.
4. In Cursor: `/qa onboard` or say **run onboard**.

Never:

- Commit `onboard.md`
- Paste Vault passwords into it
- Attach it to a public PR

## Agent behaviour

When the user says **run onboard** / `/qa onboard`:

1. If `~/.qa-agent/lib/store.js` missing → [FIRST_RUN.md](FIRST_RUN.md). Stop.
2. Chat wizard: `--print-learn` → ask squad/paths/tools → `--apply`.
3. Prefer private `onboard.md` links if present (auto-parsed).
4. Else `onboard.example.md` + [SETUP.md](SETUP.md).
5. `node scripts/check-version.js` if useful.
6. Do not dump secrets or boot JSON.

## Checklist for maintainers (before sharing)

- [ ] `VERSION` matches shipped tag/commit on `mine`
- [ ] Clone URL: `https://github.com/ahmadcsgi/qa-agent`
- [ ] Wizard path-aware docs match [MCP.md](MCP.md)
- [ ] No live API keys in the file
- [ ] Recipient told to gitignore (already in repo `.gitignore`)

See also: [SETUP.md](SETUP.md) · [DEMO.md](DEMO.md) · [MCP.md](MCP.md)
