# TestRail CLI tools (Windows)

Reusable PowerShell tools for TestRail REST gaps (MCP has no `update_plan_entry`, `updateCases` returns 403).

**Before writing `tmp-*.ps1`:** check these tools first.

Location:
- Source: `scripts/testrail-tools/` in qa-agent repo
- Sync target: `AI/MCP/testrail-mcp/scripts/tools/` (via `node scripts/update-agent.js`)

Credentials: `testrail-mcp/config/env.local` (via `TestRailApi.ps1`).

Pref (optional): `paths.testrail_mcp` or env `TESTRAIL_MCP_ROOT`.

## Tools

| Script | Purpose |
|--------|---------|
| `tr-get-cases.ps1` | Paginated export JSON/CSV |
| `tr-update-fields.ps1` | Bulk `update_case` for custom fields only |
| `tr-update-plan-entry.ps1` | REST `update_plan_entry` (merge existing case_ids by default) |
| `tr-audit-automation.ps1` | Scan UI/API `.feature` refs vs suite cases → CSV (+ XLSX) |
| `tr-export-xlsx.ps1` | CSV → styled XLSX (Python openpyxl) |

## Examples

```powershell
cd scripts/testrail-tools

# Export suite cases
.\tr-get-cases.ps1 -ProjectId 3 -SuiteId 282 -OutFile cases.json -Json

# Bulk squad + feature (section tree)
.\tr-update-fields.ps1 -ProjectId 3 -SuiteId 282 -SectionIds 32209 `
  -FieldsJson '{"custom_case_squadname":9,"custom_case_feature_component":5}' -DryRun

# Add case to plan run (merge uses get_tests on the run, not get_plan)
.\tr-update-plan-entry.ps1 -PlanId 849 -EntryId '<uuid>' -SuiteId 282 -CaseIds @(386293)

# Automation audit (uses paths.ui_tests / paths.api_tests or pass -UiRepo -ApiRepo)
.\tr-audit-automation.ps1 -ProjectId 3 -SuiteId 282 `
  -UiRepo "C:\...\telflow-ui-automation-test" `
  -ApiRepo "C:\...\telflow-rest-api-test" `
  -OutDir .
```

## Agent rules

- Squad-only updates: send `custom_case_squadname` only
- Never modify steps, expected, preconditions, title, or refs unless user explicitly asks
- Plan-owned runs: never `updateRun` (403). Use `tr-update-plan-entry.ps1`
- Bulk field updates: never `updateCases` (403). Use `tr-update-fields.ps1`
- **Plan entry merge:** `Update-TestRailPlanEntryCases` merges existing IDs via **`get_tests/{runId}`**, not `get_plan` (`case_ids` is empty there). Sending only new IDs without merge **replaces** the run and **deletes prior test results**. After merge, verify count with `get_tests`. Restored cases return as new test rows (usually Untested)

Refs: `testrail-api.md` · `@qa-test-execution` · `@qa-test-cases`
