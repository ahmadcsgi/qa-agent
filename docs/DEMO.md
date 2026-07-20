# QA Agent - Demo Walkthrough

End-to-end smoke path after install. No tickets are created unless you explicitly approve.

## 0. Prerequisites

```bash
# From repo root
./install.sh          # or .\install.ps1 on Windows
node scripts/doctor.js
```

1. Copy `mcp.json.example` to `~/.cursor/mcp.json` and fill credentials (never commit that file).
2. Restart Cursor.
3. Select **@qa** in the agent dropdown.

## 1. Health check

In a terminal:

```bash
node scripts/doctor.js
```

Expect checks for Node, `store.js`, skills (including `@qa-test-execution`), rules (`testrail-case-draft.mdc`), references, agent, and MCP config presence.

## 2. Project mapping (first time in a real app repo)

In Cursor chat (`@qa`):

```
scan project structure
```

Confirm `.cursor/qa-memory/project-context/current.md` is filled (or start from the install template). Fill TestRail project/suite/milestone and section map when known.

## 3. Search tickets (read-only)

```
search tickets about NullPointerException in order generation
```

Expected agent behavior:
1. Expand queries then `cache hash` / `cache get`
2. Call Shortcut `stories-search`
3. If empty/error then Glean `search` fallback
4. Show scored table (see `@qa-search-tickets` rubric)
5. Ask: APPROVE / NARROW / EXPAND. No writes without approval

## 4. Visual regression (optional, local Node)

```bash
cd .cursor/skills/qa-visual-test/scripts
npm install
npx playwright install chromium
node run.js init
# edit visual-test.config.json to your staging URL
node run.js --update-baselines   # first run
node run.js
```

Or in chat: `run visual test on the login page`.

## 5. Test case generation (preview only)

```
create test cases for story <ID> - positive + negative, preview only
```

Agent drafts under `.cursor/qa-memory/generated-tests/manual/sc-<id>-preview.md`. Reply **ACC** only if you want cases written to TestRail (+ Shortcut checklist).

## 6. Test plan + mark Passed (preview / ACC)

```
buat test plan [TEST PLAN] <version> <Squad> di milestone <id>, masukkan FeatureArea kecuali section X
```

Then:

```
centang test cases di story <ID> di run <runId>
```

Routes to `@qa-test-execution`. Plan create needs ACC. Explicit "centang / set passed" is enough for results.

## 7. Label groom (optional)

```
cek stories TC-on-progress yang sudah punya checklist qa test, ganti ke TC-ready
```

Agent proposes flips. ACC before `stories-update`.

## Done

You have verified: install, doctor, skills routing, memory, MCP search, draft ACC, plan/results gates.

More: `README.md`, `AGENTS.md`, `.cursor/MCP_TOOLS.md`, `.cursor/references/qa-testcase-methodology.md`.
