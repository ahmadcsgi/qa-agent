# Optional integrations

QA Agent ships **lite by default**. These tools are **not bundled**. Add only when you need them.

| Tool | What it adds | Ship with QA Agent? | How to use |
|------|--------------|---------------------|------------|
| [ponytail-lite](https://github.com/ilindaniel/ponytail-lite) | Generic anti-over-engineering decision ladder (1 file) | **No** (already adapted) | Reference only. QA uses `@qa-token-saver` |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Code knowledge graph + Graph RAG MCP | **Optional** | Pref `tools.gitnexus=true` + MCP install (below) |
| [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | Curated `.mdc` rules per stack | **No bulk** | Cherry-pick patterns. QA rules cover TestRail/Cypress |
| [ECC](https://github.com/affaan-m/ECC) | Full agent harness (skills, instincts, AgentShield) | **No** | Ideas only. `doctor.js` includes AgentShield-style scan |

## ponytail-lite

QA Agent already embeds a **QA-specific** decision ladder in `@qa-token-saver` (YAGNI > Reuse > Stdlib > … > Reflexion).

[ponytail-lite](https://github.com/ilindaniel/ponytail-lite) is the generic coding version (7 rungs, one `AGENTS.md`). Use it as reading material, not as a second install.

```text
/qa save tokens
@qa-token-saver
```

## GitNexus (optional MCP)

For **large unfamiliar test repos**, GitNexus indexes call chains and dependencies. QA Agent default is `@qa-project-mapping` (compact, token-thrifty).

### When to enable

- Repo has thousands of files and grep/glob is too slow
- You need call-chain or dependency tracing beyond the project map
- You accept extra MCP weight and index time

### Setup

1. Install GitNexus MCP per [GitNexus docs](https://github.com/abhigyanpatwari/GitNexus) (CLI or MCP server).
2. Merge server entry into `~/.qa-agent/mcp/catalog.json` manually (do not commit).
3. Enable pref:

```bash
node ~/.qa-agent/lib/store.js pref set tools.gitnexus true --project auto
```

4. Reload Cursor after MCP profile change.

### Behavior in QA Agent

When `tools.gitnexus=true` and `@qa-project-mapping` runs on a root with **>500** source files (excluding `node_modules`), the agent **may suggest** GitNexus for deep exploration before writing the compact map. Default mapping flow still applies.

## awesome-cursorrules

Do **not** copy the whole catalog into QA Agent. Overlap with existing rules:

| awesome-cursorrules topic | QA Agent equivalent |
|---------------------------|---------------------|
| TestRail Test Case | `testrail-case-generate.mdc` |
| Cypress E2E | `@qa-ui-automation` + `cypress-testing.md` |
| QA Bug Report | `shortcut-bug-description.mdc` |
| PR Review (security/tests) | `@qa-pr-review` |

Review upstream rules for **gaps** only. Adapt patterns, do not vendor files.

## ECC (Everything Claude Code)

ECC is a full harness (67 agents, 281 skills). QA Agent intentionally stays smaller:

| ECC feature | QA Agent approach |
|-------------|-------------------|
| AgentShield | `scripts/agent-shield-scan.js` + `doctor.js` section |
| Instincts / continuous learning | `cor` / `know` / `pref` + `session-end-memory.mdc` |
| Research-first | TestRail Learn step + Glean in `@qa-test-cases` |
| 281 skills | `@qa-*` skill routing only |

Do not install ECC alongside QA Agent unless you want two parallel harnesses.

## AgentShield-style scan

Run as part of doctor or standalone:

```bash
node scripts/doctor.js
node scripts/agent-shield-scan.js
node scripts/agent-shield-scan.js --json
```

Checks: no `mcp.json` in repo, `.gitignore` hygiene, untracked secrets patterns, MCP catalog secrets hint, hook safety, commit signing hint.

## Related

- [MCP.md](MCP.md) — profiles and optional servers
- [SETUP.md](SETUP.md) — install and doctor
- `@qa-pr-review` — PR review for test automation repos
- `@qa-token-saver` — decision ladder
