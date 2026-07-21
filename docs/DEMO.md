# QA Agent - Demo Walkthrough

End-to-end smoke path after install. No tickets are created unless you explicitly approve.

## 0. Prerequisites

```bash
# From repo root
./install.sh          # or .\install.ps1 on Windows
```

Installer can offer to run setup interactively. Or run manually:

```bash
node scripts/setup-mcp.js          # full MCP (default). --lite / --with-optional
node scripts/setup-git.js          # install Git if missing + user.name / user.email
node scripts/setup-tooling.js      # optional: k6, Java, Maven
node scripts/doctor.js
```

Switch MCP profile later (without re-entering tokens if catalog is synced):

```bash
node scripts/mcp-mode.js status
node scripts/mcp-mode.js full      # recommended 6 servers
node scripts/mcp-mode.js lite
```

1. Prefer `setup-mcp.js` over hand-copying. Template only: `mcp.json.example`. Optional k6/karate: `mcp.json.optional.example`.
2. Restart Cursor (Reload Window) after MCP changes.
3. Select **@qa** in the agent dropdown.

> Do **not** commit `~/.cursor/mcp.json` or `~/.qa-agent/mcp/catalog.json` if they contain secrets.

## 1. Health check

In a terminal:

```bash
node scripts/doctor.js
```

Expect checks for Node, `store.js`, `mcp-mode.js`, skills (including `@qa-test-execution`), rules (`testrail-case-draft.mdc`), references, agent, MCP config, Git identity, and optional CLI tooling.

## 2. Project mapping (first time in a real app repo)

In Cursor chat (`@qa`):

```
scan project structure
```

Confirm `.cursor/qa-memory/project-context/current.md` is filled (or start from the install template). Fill TestRail project/suite/milestone and section map when known. Set `paths.ui_tests` / `paths.api_tests` / `paths.perf_tests`.

## 3. Search tickets (read-only)

```
search tickets about NullPointerException in order generation
```

Expect Shortcut hits with citations. No ticket create.

## 4. Visual regression (optional, local Node)

See `@qa-visual-test` skill. Install visual deps if doctor warns.

## 5. Test cases (draft only until ACC)

```
create test cases for story <SHORTCUT_ID>
```

Expect Learn > Plan > draft batch of ≤5 > wait for **ACC** / EDIT / REJECT. Titles: `When …, then …`.

## 6. Automation skills (need paths)

| Skill | Needs |
|-------|--------|
| `@qa-ui-automation` | `paths.ui_tests` + Cypress MCP optional |
| `@qa-api-test` | `paths.api_tests` + Java/Maven (`setup-tooling.js`) |
| `@qa-perf-test` | `paths.perf_tests` + k6 CLI |

## 7. Label groom (optional)

Follow squad label lifecycle in project-context (TC-need / TC-ready / …).

## Safety

- Never create Shortcut tickets or TestRail cases without explicit ACC.
- Never paste Vault passwords into chat.
