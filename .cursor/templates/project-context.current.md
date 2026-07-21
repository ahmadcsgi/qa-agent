# Project Context — QA Memory

> Fill this in (or let `@qa-project-mapping` generate it). Used by test-case and automation skills.

**Last updated:** YYYY-MM-DD
**Framework:** (e.g. Cypress + Cucumber, Playwright, Karate, k6)
**App base URL(s):**
- staging:
- production:

## Local identity (fill on each machine)

| Field | Value |
|-------|-------|
| Squad / team (Shortcut + TestRail + PR `[Squad]`) | |
| Pref | `squad.name` |

## Local test asset paths (fill on each machine — do not commit secrets)

> Used by `@qa-ui-automation`, `@qa-api-test`, `@qa-perf-test`. Leave blank until you know the folder. Agent must ask if empty.

| Asset | Absolute path on this machine |
|-------|-------------------------------|
| UI tests (Cypress / Playwright) | |
| API tests (Karate / Bruno / collections) | |
| Performance tests (k6) | |

Optional prefs (same values): `paths.ui_tests` · `paths.api_tests` · `paths.perf_tests`

**Perf secrets:** follow `EncryptSecret.md` in telflow-product-perf-test (Ansible Vault).  
**PRs:** `[Squad][TaskId] …` + signed commits. See telflow-rest-api-test `CONTRIBUTING.md` PR rules.

## Defaults for QA Agent

| Setting | Value |
|---------|-------|
| Default test user | (ask user / use secret manager — never commit passwords) |
| Default environment | |
| Default squad / team | |
| Shortcut team | |
| TestRail base URL | (e.g. `https://your-org.testrail.io`) |
| TestRail suite id | |
| TestRail milestone id (current) | |
| Test plan name pattern | `[TEST PLAN] <version> <Squad>` |

## TestRail section map (product area)

| Product area | Root section id | Version bucket notes |
|--------------|-----------------|----------------------|
| (e.g. ProductArea) | | |
| (e.g. Lifecycle) | | |

## Label lifecycle (Shortcut)

| Label | Meaning |
|-------|---------|
| TC-need | Cases not started |
| TC-on-progress | Cases being written |
| TC-ready | Cases exist (checklist with `qa test: …/cases/view/<id>`) |
| TC-review | Cases under review |

## Product notes (domain)

- Put product-specific defaults here (per project), not in global repo docs.
- Exact UI validation copy belongs in cases, not invented here.

## Conventions

- Selector priority:
- Test file locations: see **Local test asset paths** above
- Branch naming:
- Auth pattern: (env vars / vault / cookies file. No secrets here)
- Chat language / TestRail language:

## Sample /qa prompts (after paths filled)

```text
/qa create test cases for story <SHORTCUT_ID>
/qa automate case C12345
/qa automate story <SHORTCUT_ID>
/qa search tickets about <error keyword>
/qa triage <incident id or paste>
/qa onboard
```

## Test infrastructure map

```
# Compact map from @qa-project-mapping
project/
  ...
```

## Notes

- Known flaky areas:
- Ownership / component mapping:
