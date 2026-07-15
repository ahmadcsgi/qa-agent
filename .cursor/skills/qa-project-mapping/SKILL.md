---
name: qa-project-mapping
description: Scan, map, and maintain project structure for QA context. Like Aider's repo map but specifically for test infrastructure, page objects, step definitions, and config. Called automatically before other automation skills. Use when entering a new project or when project structure changes.
---

# QA Project Mapping

## Why This Matters
Aider proved that LLMs work significantly better when they have a **compact map** of the codebase. With a project map, the AI knows:
- Where important files are located
- Patterns and conventions being used
- File relationships (test → page object → step def)
- Without reading all files (saves tokens)

## Flow

### Step 1: Scan Project Structure
Use glob/list files for mapping:

```bash
# Core structure
ls <root>/
ls <root>/src/
ls <root>/cypress/
ls <root>/test/
ls <root>/features/
```

Goal: identify main directories, framework, and project layout.

### Step 2: Identify Key Config Files
Read config files to understand framework & setup:
- `package.json` → dependencies, scripts, framework name
- `cypress.config.js` / `cypress.config.ts` → Cypress config
- `tsconfig.json` → TypeScript setup
- `.env`, `.env.example` → environment variables
- `karate-config.js` → Karate config
- `pom.xml` / `build.gradle` → Java/Maven project

### Step 3: Map Test Infrastructure
Extract symbol definitions from test files (without reading full files):

| Area | What to Find | Method |
|------|-------------|--------|
| **Page Objects** | class/export names, selector patterns | Grep `class | export | selector` |
| **Step Definitions** | function names, regex patterns | Grep `Given|When|Then|cy.step` |
| **Aliases/POM** | element mapping names | Grep `data-testid|getAlias|alias` |
| **Feature files** | feature names, scenario count | Grep `Feature:|Scenario:|@test_id` |
| **Test suites** | run configurations, tags | Grep `@daily|@smoke|@regression|@flex_quote` |
| **API tests** | endpoint patterns, base URLs | Grep `Given path|url|baseUrl|karate-config` |
| **k6 scripts** | scenario types, thresholds | Grep `export let options|stages|threshold` |
| **Fixtures/data** | test data files | Glob `*.json|*.csv|*.yml` |

### Step 4: Build Reference Graph
Identify file relationships (like Aider's edges):
```
quote-page.js → uses → quote.aliases.js
quote.feature → depends → quote-steps.js
quote-steps.js → imports → quote-page.js
```

Save this graph as part of the map.

### Step 5: Rank Files by Importance
Priority (like Aider's PageRank):
1. **High** - Config files, base page object, main step registry, feature files with @daily tags
2. **Medium** - Page objects, step definitions, test data
3. **Low** - Helper utilities, rarely-changed files

### Step 6: Generate Compact Map
Output format (token-efficient, like Aider). Example shape — replace with **actual** project paths/names:
```
project/
  package.json: { scripts: {test, test:smoke}, deps: <frameworks> }
  <test-config>: { baseUrl, supportFile, specPattern }
  <ui-tests>/
    support/
      commands.js: { login(), <helpers...> }
    aliases/ or page-objects/: { <element maps> }
    step_definitions/ or steps/: { <step names> }
    features/ or e2e/: { <feature files + tags> }
  <api-tests>/
    { <endpoint features / specs> }
  <perf>/
    { <k6 scenarios + thresholds> }
```

### Step 7: Save to Memory
- Save map to `.cursor/qa-memory/project-context/current.md`
- Include: timestamp, file count, test count, framework version
- Also save graph: `.cursor/qa-memory/project-context/graph.md`

### Step 8: Refresh Strategy
- **First time** → full scan → save
- **Subsequent** → check config file modification time → if changed, refresh
- **Manual** → user calls `@qa refresh map`
- Cache valid for 7 days (if no changes detected)

## MCP Tools
- `glob`, `grep`, `read` - for file scanning
- Git: `git log --oneline -5` - recent changes context

## References
- Aider's repo map: https://aider.chat/docs/repomap.html
- Global memory: `~/.qa-agent/`
