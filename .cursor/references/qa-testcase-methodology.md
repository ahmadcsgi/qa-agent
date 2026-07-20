# QA Test Case Methodology

**Single standard** for every test-case task — no lite/deep modes.

**Token-thrifty delivery:** run full analysis; put detail in preview file, summary in chat.

**@qa-token-saver** still applies to *how many cases to write* (N/A/backlog vs redundant) — not to skipping analysis.

---

## When unclear — ASK (mandatory)

Do **not** guess or invent:

- Acceptance criteria, business rules, error messages
- UI labels, dialog copy, validation text
- API behavior, permissions, integrations
- Section placement when ambiguous

**If story/AC/screenshots are insufficient → list what you know, what is missing, and ask the user before drafting cases.**

Reasonable industry defaults are allowed **only** after you state the assumption in preview and user does not object — prefer asking first.

---

## Phase 1 — Multi-perspective analysis

Think from: End User · Business User · PO · BA · Developer · QA · Security · Performance · Support.

- What is the user trying to accomplish?
- What mistakes could users make?
- What assumptions are hidden?
- What could break, fail silently, corrupt data, or become a support ticket?

---

## Phase 2 — Feature map

From Shortcut story (AC, description, comments, screenshots):

| Area | Capture |
|------|---------|
| Business objective | Why this exists |
| User goal | Outcome |
| Workflow | Steps, states |
| UI | Inputs, buttons, dropdowns, tables, uploads |
| Rules | Validations, permissions, error copy |
| Dependencies | APIs, integrations, email, DB |
| NFR | Performance, a11y (if relevant) |

---

## Phase 2b — Duplicate case check (before draft)

Before drafting new cases, search TestRail:

1. `getCases` by **sectionId** (and children if needed)
2. `getCases` by **refs** = story id (e.g. `276352`) when available

**Score each overlap (0–100):**

| Signal | Weight hint |
|--------|-------------|
| Same trigger + outcome in title | High |
| Same section + same story refs | High |
| Same validation / UI copy in expected | Medium |
| Same object, different trigger | Low (not a dup) |

| Score | Action |
|------:|--------|
| **≥80** | Ask user: **reuse** · **update** existing (`updateCase` after ACC) · **skip** |
| **50–79** | Note in preview as related. Prefer reuse unless gap is clear |
| **under 50** | Draft new |

Never silently create a near-duplicate of an active case.

---

## Phase 3 — UI component probes

Per component present — plan cases or mark N/A:

**Inputs:** empty · valid · invalid · boundary · min/max · over max · special chars · unicode · whitespace · trim  
**Buttons:** single/double/rapid · disabled · loading  
**Dropdowns:** no selection · valid · dependency  
**Tables:** empty · sort/filter/search/pagination  
**Uploads:** valid · invalid · large · empty · wrong format  

---

## Phase 4 — Category checklist

Never silently skip. Per category: **case planned** · **N/A (reason)** · **backlog**.

| Category | Focus |
|----------|--------|
| Happy path | Intended journey, every AC |
| Validation | Required, format, length, dependency |
| Negative | Invalid, missing, malformed |
| Boundary | Min, max, just below/above |
| Business rules | Hidden rules, duplicates, restrictions |
| User mistakes | Wrong sequence, refresh, back, multi-tab |
| Exploratory | Break workflow, partial actions |
| Security | Injection, XSS, authz, direct URL (if exposed) |
| State transition | Draft→Published, invalid transitions |
| Data lifecycle | CRUD, clone, archive, integrity |
| Integration | API success/fail/timeout/unavailable |
| Error handling | 4xx/5xx, network, timeout messaging |
| Concurrency | Multi-user/tab, duplicate submit |
| Recovery | Retry after failure, session restore |
| Accessibility | Keyboard, focus, screen reader (if UI) |
| Usability | Error clarity, labels, navigation |
| Regression | Related modules, side effects |

---

## Phase 5 — Risk prioritization

Per candidate case in preview:

| Factor | 1–5 |
|--------|-----|
| Business impact | |
| User impact | |
| Probability of failure | |

**Risk score** = BI + UI + PoF · **Priority:** P0 · P1 · P2 · P3

Write P0–P1 in first pass; propose backlog for P2–P3 if scope is large — **ask user** before expanding.

---

## Phase 6 — Hidden assumptions

Challenge: "What could the business be wrong about?"

Examples: double submit · refresh mid-save · clear field after save · session expiry · dependency down · partial save.

---

## Generate flow (mandatory)

Canonical rule: `.cursor/rules/testrail-case-generate.mdc`

1. **Learn** from Shortcut. Unclear → ask user or Glean. Never invent.
2. **Plan** (proposed titles table). Wait ACC plan / EDIT plan.
3. **Draft** full fields. Preview file complete.
4. **Chat batches of 5.** If >5 cases, show 5 only. Wait ACC / EDIT / REJECT / DELETE before next batch.
5. **TestRail write** only after every surviving case is ACC'd.

## Preview output (mandatory before TestRail write)

See `testrail-case-generate.mdc` and `testrail-case-draft.mdc`.

Every case draft must include:

**Title · Test case objective · Precondition · Test step · Expectation** (+ **Test data** when values used).

### Chat

- Open questions first. Stop if unanswered.
- After plan ACC: show full fields for **at most 5** cases (`Part k/N`).
- User: **ACC** · **EDIT** · **REJECT** · **DELETE** (or **ACC all** for current batch only).

### File - `.cursor/qa-memory/generated-tests/manual/sc-XXXXX-preview.md`

Always **complete**: feature summary, assumptions, business rules, risks, category coverage, **every case with all fields**, coverage estimate, gaps/questions.

No `addCase` before all surviving cases are ACC'd.

---

## TestRail write rules

1. **All batches ACC'd first** - `testrail-case-generate.mdc`
2. **One scenario per case** - one variable per variant
3. **Title:** `When <trigger>, then <outcome>` · `testrail-case-titles.mdc`
4. **Fields:** Objective · Precondition · Steps · Expectation · Test data (if any) · `templateId: 1`
5. **After each `addCase`:** Shortcut checklist · `testrail-shortcut-checklist.mdc`

---

## Phase 7 — After cases exist (plan · run · results)

Use when user asks to create a **test plan**, add cases to a plan/run, or **mark Passed/Failed**.

### 7a. Test plan (ACC required)

1. Resolve: projectId · milestoneId · plan name (e.g. `[TEST PLAN] <version> <Squad>`) · suiteId · case IDs (or section filter)
2. Preview in chat: name, milestone, run entry name, case count, **excluded** sections/cases
3. Wait for **ACC**
4. `addPlan` with `entries` (`include_all: false` + `case_ids` when selective)
5. Cite plan URL / run URL

### 7b. Mark results (ACC or explicit “centang / set passed”)

1. Confirm runId (or plan entry run) + case IDs from Shortcut checklist / user list
2. `addResultsForCases` — statusId: `1` Pass · `2` Blocked · `4` Retest · `5` Fail
3. Comment: short reason + story id

Never invent pass/fail. Only mark what the user asked (or confirmed).

---

## Case maintenance (update existing)

When UI copy or behavior changed and a case is wrong:

1. `getCase` (current)
2. Draft **diff** in chat: old vs new title/steps/expected/data
3. Wait for **ACC**
4. `updateCase` (+ `moveToSection` if section wrong)
5. `cor add` lesson if pattern is reusable

Same ACC gate as create (`testrail-case-draft.mdc`).

---

## Label groom (Shortcut)

After checklist `qa test: …/cases/view/<id>` exists for the story:

1. List tasks with TestRail case links
2. If cases exist and label is `TC-on-progress` (or similar) → **propose** flip to `TC-ready`
3. Wait for **ACC** (or user said “ganti ke tc-ready”)
4. `stories-update` labels: keep other labels, replace TC-on-progress with TC-ready

Do **not** flip if checklist is empty and no TestRail refs for the story.

---

## Anti-patterns

| Bad | Good |
|-----|------|
| Guess error text or AC | Ask user or cite story/screenshot |
| Bundle scenarios in one case | 1 scenario = 1 case |
| Skip analysis | Always Phase 1–6 + 2b |
| Write 20 cases without approval | Plan + draft batches of 5 + ACC all first |
| Dump >5 full cases in one chat | Max 5 per turn. Wait ACC/EDIT/REJECT/DELETE |
| Multiple modes (lite/deep) | One methodology every time |
| Mark Passed without user ask | Explicit request or ACC |
| Auto TC-ready without checklist | Verify qa-test tasks first |
