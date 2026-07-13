# QA Agent for Cursor

AI-powered Quality Engineering Assistant — search bugs, triage incidents, generate UI/performance tests, and manage test cases directly from Cursor chat.

---

## Overview

QA Agent is a **Cursor editor**-based system that turns Quality Engineering into a conversation. Just type "search ticket quote generation" or "generate automation for TestRail C23768", and the AI will:

- Search **Shortcut** tickets with intelligent query expansion
- **Triage** Helix incidents end-to-end (search duplicate → classify → draft ticket)
- Generate **Cypress Cucumber** UI automation tests
- Generate **k6** performance tests
- Create/manage **TestRail** test cases

All powered by a memory system that makes the AI smarter over time and saves tokens by only loading relevant instructions.

---

## Quick Start

```
git clone https://github.com/<your-org>/qa-agent.git
cd qa-agent
./install.sh
```

Then:
1. **Setup MCP servers** — create `~/.cursor/mcp.json` (see template below)
2. **Paste User Rules** — Cursor Settings > Rules > User Rules
3. **Restart Cursor**
4. **Type `@qa`** in chat to start

> **Remote install (without clone):** `curl -fsSL https://raw.githubusercontent.com/<user>/qa-agent/main/install.sh | bash`

---

## Prerequisites

| Item | Required | Notes |
|------|----------|-------|
| **Cursor editor** | ✅ | v0.45+ (MCP support) |
| **MCP Servers** | ✅ | Shortcut, TestRail, Glean, Context7, Cypress, Playwright |
| **Shortcut account** | ✅ | API token with search + read stories access |
| **TestRail account** | ✅ | API key with cases, runs, sections access |
| **Glean account** | ✅ | Tenant URL + MCP access (Confluence/knowledge) |
| **Context7 account** | ✅ | API key for framework documentation |
| **Cypress project** | ⚠️ | Required only for `@qa-ui-automation` |
| **Playwright** | ⚠️ | Required only for `@qa-ui-automation` (page exploration) |
| **Git** | ⚠️ | Required for `@qa-perf-test` (branching) |

---

## Installation

### 1. Setup MCP Configuration

Buat file `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "shortcut": {
      "url": "https://mcp.shortcut.com/mcp"
    },
    "testrail": {
      "command": "npx",
      "args": ["-y", "@uarlouski/testrail-mcp-server"],
      "env": {
        "TESTRAIL_URL": "https://your-org.testrail.io",
        "TESTRAIL_USERNAME": "your-email@company.com",
        "TESTRAIL_API_KEY": "your-api-key"
      }
    },
    "glean": {
      "url": "https://your-tenant-be.glean.com/mcp/default"
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "your-context7-key"
      }
    },
    "cypress": {
      "command": "npx",
      "args": ["-y", "cypress-mcp"],
      "env": {
        "CYPRESS_PROJECT_PATH": "."
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {}
    }
  }
}
```

> **⚠️ Do NOT commit this file to git** — contains personal credentials.

### 2. Paste User Rules

Buka **Cursor Settings > Rules > User Rules**, paste:

```
You are a QA Engineer Assistant with access to MCP servers: Shortcut, TestRail, Glean, Context7, Cypress, Playwright.

ALWAYS follow this memory protocol before/after every task: read/write .cursor/qa-memory/.
- Before searching: check search-cache first
- After user correction: save to corrections/
- Before generating: read project-context + corrections

Choose the right skill by task type:
- @qa-search-tickets → searching Shortcut tickets
- @qa-defect-triage → triaging Helix incidents
- @qa-ui-automation → generating Cypress UI tests
- @qa-perf-test → generating k6 performance tests
- @qa-test-cases → generating TestRail test cases

Never create Shortcut tickets or TestRail cases without user approval.
```

### 3. GitHub Installation (for new users)

Clone repo dan install otomatis:

```bash
git clone https://github.com/<your-org>/qa-agent.git
cd qa-agent
./install.sh
```

The `install.sh` script will:
- Copy semua skills ke project `.cursor/skills/` dan global `~/.cursor/skills/`
- Copy subagent ke `.cursor/agents/qa-agent.md`
- Copy project rules ke `.cursor/rules/qa-agent-rules.mdc`
- Copy `AGENTS.md` ke root project (auto-detect oleh Cursor)
- Buat struktur memory `.cursor/qa-memory/`
- Tampilkan next steps (MCP config, User Rules)

> **Remote install (tanpa clone):** `curl -fsSL https://raw.githubusercontent.com/<user>/qa-agent/main/install.sh | bash`

---

## Custom Agent Guide

QA Agent is a **reference implementation** for creating custom AI agents in Cursor. Here's how it works and how to create your own.

### Cara Cursor Custom Agent Bekerja (v2.1+)

Cursor v2.1+ uses 3 mechanisms for agent customization:

| Mekanisme | File | Cara Kerja |
|-----------|------|------------|
| **AGENTS.md** | `AGENTS.md` di root project | Auto-dibaca Cursor, isinya role definition + instruksi global |
| **Subagents** | `.cursor/agents/*.md` | Cursor Agent can delegate tasks to specific subagents. Format: YAML frontmatter + prompt |
| **Rules** | `.cursor/rules/*.mdc` | Aturan yang selalu aktif di project. Bisa Always/Intelligent/Term-based |
| **User Rules** | Cursor Settings > Rules > User Rules | Aturan global di semua project |
| **Skills** | `.cursor/skills/*/SKILL.md` | Dipanggil via `@skill-name` di chat. Modular — hanya load yang relevan |

> **Custom Modes were removed** in Cursor v2.1. Use a combination of Rules + Subagents + AGENTS.md instead.

### How to Create Your Own Custom Agent

1. **Create a subagent** — file `.cursor/agents/<name>.md`:
   ```markdown
   ---
   name: my-agent
   description: Brief description of this agent's capabilities
   model: inherit
   readonly: false
   ---

   # My Agent — Instructions

   You are a specialist agent for [domain].
   - Do [task A] using [method X]
   - Use [tool Y] for [purpose Z]
   - Never [prohibition]
   ```

2. **Create project rules** — file `.cursor/rules/<name>.mdc`:
   ```markdown
   ---
   name: my-rules
   description: Rules for [context]
   ---

   - Always [do this]
   - Never [do that]
   ```

3. **Create AGENTS.md** at the project root — for global instructions auto-detected by Cursor.

4. **(Optional) Create a skill** — `.cursor/skills/<name>/SKILL.md` for instructions called via `@name`.

### Bagaimana QA Agent Memanfaatkan Ini

| Layer | File | Function |
|-------|------|--------|
| AGENTS.md | `AGENTS.md` | Role definition + memory protocol + anti-hallucination + skill routing |
| Subagent | `.cursor/agents/qa-agent.md` | Custom subagent for Cursor agent delegation |
| Rules | `.cursor/rules/qa-agent-rules.mdc` | Project rules, always active |
| Skills (9) | `.cursor/skills/<name>/SKILL.md` | Modular domain instructions, called via @-mention |
| Memory | `.cursor/qa-memory/` | Persistent learning (cache, corrections, project context) |

All these files are in the repo and ready to use after clone + install.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER RULES (Layer 4)                         │
│              Role definition + routing + safety gates               │
│              (Cursor Settings > Rules > User Rules)                 │
├─────────────────────────────────────────────────────────────────────┤
│                         SKILLS (Layer 3)                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │qa-search     │ │qa-defect     │ │qa-ui         │ │qa-perf     │ │
│  │-tickets      │ │-triage       │ │-automation   │ │-test       │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│  ┌──────────────┐                                                   │
│  │qa-test       │  .cursor/skills/<name>/SKILL.md + reference/     │
│  │-cases        │                                                   │
│  └──────────────┘                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                      MEMORY SYSTEM (Layer 2)                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │project       │ │search-cache  │ │corrections   │ │generated   │ │
│  │-context      │ │(shortcut.json)│ │(domain .md)  │ │-tests/     │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│  ┌──────────────┐  .cursor/qa-memory/                               │
│  │knowledge/    │                                                   │
│  └──────────────┘                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                      MCP SERVERS (Layer 1)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌────────┐ ┌───────┐ ┌────────┐│
│  │ Shortcut  │ │ TestRail │ │Glean │ │Context7│ │Cypress│ │Playwright│
│  │ (tickets) │ │ (cases)  │ │(docs)│ │(docs)  │ │(run)  │ │(explore)│
│  └──────────┘ └──────────┘ └──────┘ └────────┘ └───────┘ └────────┘│
│  ~/.cursor/mcp.json                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer Explanation

| Layer | What | Location | Purpose |
|-------|------|----------|---------|
| **1. MCP Servers** | Tool providers | `~/.cursor/mcp.json` | Provides AI access to Shortcut, TestRail, Glean, Context7, Cypress, Playwright |
| **2. Memory System** | Persistent context | `.cursor/qa-memory/` | AI learns from corrections, cache, project context |
| **3. Skills** | Domain instructions | `.cursor/skills/<name>/` | Step-by-step flow per task type, modular & token-efficient |
| **4. User Rules** | Global role & routing | Cursor Settings > Rules | Role definition + routing ke skill + safety gates |

---

## Available Skills

| Skill | Trigger | MCP Tools | Output |
|-------|---------|-----------|--------|
| **@qa-search-tickets** | "search ticket about...", "search bug...", "find ticket...", paste error message | Shortcut (`search_stories`), Glean, Memory cache | Similar tickets + relevance score + ownership prediction + historical patterns |
| **@qa-defect-triage** | Helix link/ID/description, bug report | Shortcut (`search_stories`, `create_story`), Glean (`search`, `read_document`), TestRail | Triage report (classification, severity, RCA draft, test coverage) + draft ticket + approval gate |
| **@qa-ui-automation** | TestRail URL, "create automation", "generate cypress test" | TestRail (`get_cases`), Cypress (`run_test`), Playwright (`explore_page`), Context7, Glean | `.feature` file + step definitions + aliases + validated via Cypress run |
| **@qa-perf-test** | Story ID, "create perf test", "generate k6 test", "load test" | Shortcut (`get_story`), Git, Context7 | k6 script + risk analysis + thresholds + branch (`perf/<id>-<desc>`) |
| **@qa-test-cases** | Story ID, "create test case", "generate test case" | Shortcut (`get_story`), TestRail (`get_cases`, `add_case`, `update_case`, `delete_case`) | TestRail test cases (happy path + negative + boundary) |
| **@qa-visual-test** | "check UI", "visual regression", "screenshot compare", "layout check", "visual test" | Playwright (internal script), pixelmatch, look_at | JSON report (pass/fail/new) + diff image on failure |

---

## Memory System

Location: `.cursor/qa-memory/`

```
.cursor/qa-memory/
├── MEMORY_PROTOCOL.md         ← Memory read/write rules (AI MUST follow)
├── project-context/
│   └── current.md             ← Current project context (framework, conventions, test pattern)
├── search-cache/
│   └── shortcut.json          ← Cache query → results (TTL: 24 jam)
├── corrections/
│   ├── automation.md          ← Correction: automation
│   ├── search.md              ← Correction: search
│   ├── test-cases.md          ← Correction: test cases
│   └── triage.md              ← Correction: triage
├── generated-tests/
│   ├── cypress/               ← Generated UI test references
│   ├── k6/                    ← Reference: perf test
│   ├── karate/                ← Reference: API test (future)
│   └── visual/                ← Reference: visual test
└── knowledge/
    ├── framework-tips.md       ← Tips from Context7
    └── project-tips.md         ← Project-specific knowledge
```

### How the AI Learns

1. **Cache** → Before searching Shortcut, the AI checks the cache first. Same query within 24 hours returns cached results without calling MCP.
2. **Corrections** → Every user correction is saved to `corrections/<domain>.md`. Before generating similar tasks, the AI reads previous corrections.
3. **Project Context** → First time in a project, the AI explores and saves framework/conventions to `project-context/current.md`.
4. **Knowledge** → Results from Context7/Glean are saved to `knowledge/` — no need to re-fetch.

> **Note:** Memory is personal and `gitignore`-d (see `.cursor/qa-memory/.gitignore`).

---

## Token Efficiency

QA Agent is designed to minimize tokens per session:

| Strategy | Detail | Estimated Token Saving |
|----------|--------|-----------------------|
| **Modular Skills** | Each SKILL.md is only 50-100 lines. AI only loads 1 skill per task, not all | ~70% |
| **Reference Files** | Detailed flow separated into `reference/`. AI reads only when needed | ~40% |
| **Search Cache** | Same query within 24 hours returns from cache, no MCP call | ~60% |
| **Lightweight User Rules** | Only 10-15 lines — enough to route to the right skill | ~80% |
| **Memory Protocol** | AI reads memory first before MCP call → avoids re-fetching | ~50% |
| **Gated Learning** | Corrections read only before similar tasks | ~30% |

**Estimated total tokens per session:** < 500 tokens for instructions (User Rules + 1 skill + relevant memory).

---

## Workflow Overview

### General Automation Flow (@qa-ui-automation, @qa-perf-test)

```
Learn Project → Get Context → Check Existing → Research → Plan
      ↓                                                        ↓
    (first time)                                            Generate
      ↓                                                        ↓
 Save to memory                                           Validate (MCP)
                                                               ↓
                                                          User Loop
                                                         /   |    \
                                                    APPROVE EDIT REJECT
                                                       ↓     ↓      ↓
                                                     Done  Save    Save &
                                                          memory  regenerate
```

### Test Case Flow (@qa-test-cases, @qa-search-tickets)

```
Check Shortcut → Check TestRail → Generate → User Loop → Memory
     ↓                ↓               ↓         / | \
  Read story     Check existing    Happy +    APPR EDIT REJ
  + AC           cases (MCP)       Negative
                                   + Boundary
```

---

## File Structure

```
.cursor/
├── MCP_TOOLS.md                          ← Mapping MCP server → tool → use case
├── qa-memory/                            ← Memory system (personal, gitignored)
│   ├── MEMORY_PROTOCOL.md                ← Aturan baca/tulis memory
│   ├── project-context/current.md        ← Project mapping
│   ├── search-cache/shortcut.json        ← Search cache
│   ├── corrections/                      ← User correction history
│   │   ├── automation.md
│   │   ├── search.md
│   │   ├── test-cases.md
│   │   └── triage.md
│   ├── generated-tests/                  ← Test reference
│   │   ├── cypress/
│   │   ├── k6/
│   │   └── karate/
│   └── knowledge/                        ← Accumulated tips
│       ├── framework-tips.md
│       └── project-tips.md
└── skills/                               ← Domain-specific instructions
    ├── qa-search-tickets/
    │   ├── SKILL.md
    │   └── reference/
    │       ├── search-strategy.md
    │       └── output-format.md
    ├── qa-defect-triage/
    │   ├── SKILL.md
    │   └── reference/
    │       ├── triage-process.md
    │       ├── email-templates.md
    │       └── output-format.md
    ├── qa-ui-automation/
    │   └── SKILL.md
    ├── qa-perf-test/
    │   └── SKILL.md
    ├── qa-test-cases/
    │   └── SKILL.md
    └── qa-visual-test/
        ├── SKILL.md
        ├── reference/
        │   ├── architecture.md
        │   └── visual-test-config.md
        └── scripts/
            ├── package.json
            ├── run.js
            └── compare.js
```

---

## Configuration Reference

### `~/.cursor/mcp.json` Template

```json
{
  "mcpServers": {
    "shortcut": {
      "url": "https://mcp.shortcut.com/mcp"
    },
    "testrail": {
      "command": "npx",
      "args": ["-y", "@uarlouski/testrail-mcp-server"],
      "env": {
        "TESTRAIL_URL": "<your-testrail-url>",
        "TESTRAIL_USERNAME": "<your-email>",
        "TESTRAIL_API_KEY": "<your-api-key>"
      }
    },
    "glean": {
      "url": "https://<your-tenant>-be.glean.com/mcp/default"
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "<your-context7-key>"
      }
    },
    "cypress": {
      "command": "npx",
      "args": ["-y", "cypress-mcp"],
      "env": {
        "CYPRESS_PROJECT_PATH": "."
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "env": {}
    }
  }
}
```

### User Rules Text

```
You are a QA Engineer Assistant with access to MCP servers: Shortcut, TestRail, Glean, Context7, Cypress, Playwright.

ALWAYS follow this memory protocol before/after every task: read/write .cursor/qa-memory/.
- Before searching: check search-cache first
- After user correction: save to corrections/
- Before generating: read project-context + corrections

Choose the right skill by task type:
- @qa-search-tickets → searching Shortcut tickets
- @qa-defect-triage → triaging Helix incidents
- @qa-ui-automation → generating Cypress UI tests
- @qa-perf-test → generating k6 performance tests
- @qa-test-cases → generating TestRail test cases
- @qa-visual-test → visual regression testing

Never create Shortcut tickets or TestRail cases without user approval.
```

---

## Future Enhancements

| Feature | Phase | Status |
|---------|-------|--------|
| **Custom Mode "QA Agent"** | — | ❌ Deprecated — Cursor v2.1 removed Custom Modes. Replaced by Subagents + Rules + AGENTS.md (see Custom Agent Guide) |
| **Karate API test skill** | Phase 2 | 📋 Planned — API test generation from OpenAPI specs |
| **Multi-project memory** | Phase 2 | 📋 Planned — isolate memory per project |
| **Slack integration** | Phase 3 | 🔮 Research — triage notifications via Slack |
| **CI/CD integration** | Phase 3 | 🔮 Research — auto-run tests on PR |
| **Visual regression** | Phase 3 | ✅ Done — `@qa-visual-test` skill with token-efficient pixelmatch + Playwright |
| **AI test data generator** | Phase 3 | 🔮 Research — synthetic test data for edge cases |
| **Performance regression dashboard** | Phase 3 | 🔮 Research — track k6 results over time |

---

> **Note:** The entire system is based on configuration files and markdown — zero code deployment. Simply clone the `.cursor/` structure to any project and the QA Agent is ready to use.

