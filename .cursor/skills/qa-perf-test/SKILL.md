---
name: qa-perf-test
description: Generate k6 performance tests from Shortcut stories or API specs. Interactive flow: ask for scenario type, VUs, duration, thresholds, generates k6 script, auto-runs, auto-heals. Use when user asks for "perf test", "generate k6", "load test", "performance test", or provides a story ID for performance testing.
---

# QA Performance Test (k6)

## Interactive Flow

### Step 1: Gather Context
Ask the user:
1. **Source**: "Do you have a Shortcut story ID, API endpoint, or flow to load test?"
   - Story → read via Shortcut MCP (`get_story`)
   - Endpoint → ask for details (method, payload, headers)
   - Flow → ask for endpoint sequence
2. **Scenario Type**: "What test scenario?"
   - **Load** — normal traffic (baseline)
   - **Stress** — gradual increase until breakpoint
   - **Spike** — sudden surge
   - **Soak** — long duration (stamina)
   - **Smoke** — small validation (1-2 VUs)
3. **Workload**: "How many VUs (virtual users) and duration?"
   - Default: 10 VU, 30s for smoke
   - Ask if user wants custom values
4. **Thresholds**: "Is there any SLA / target response time?"
   - Default: p95 < 2000ms, error rate < 1%
   - Ask if there are custom thresholds
5. **Environment**: "Base URL environment? (staging, production, or custom)"

### Step 2: Check Memory & Existing
- Read `.cursor/qa-memory/project-context/current.md` — find base URL, auth pattern, existing k6 helpers
- Read `~/.qa-agent/corrections.json` — avoid previous mistakes
- Search for existing k6 files in the project — reuse helpers (getToken, getGlobal, defineSummary, thresholds, data generators)

### Step 3: Research (if needed)
- `.cursor/references/k6-testing.md` — k6 syntax & patterns
- Context7: `resolve-library-id("k6", "k6")` → `query-docs` for latest docs
- Glean: internal API docs / Confluence

### Step 4: Plan
Write a plan before coding:
- **Risk Analysis**: which endpoint/flow is most critical
- **Scenarios**: combination of load/stress/spike/soak needed
- **Thresholds**: target metrics per endpoint
- **Data variants**: whether different data is needed per VU

Risk Coverage > Endpoint Coverage. No risk = no test.

### Step 4b: Climb Decision Ladder
Call the decision ladder from `@qa-token-saver`:
1. **YAGNI**: Is performance test needed? Low risk? Skip.
2. **Reuse**: Any existing k6 helper (getToken, getGlobal)?
3. **Stdlib**: `check()`, `sleep()`, built-in metrics sufficient?
4. **Native**: Infrastructure metrics (CloudWatch, Prometheus) already exist?
5. **Existing dep**: Existing k6 extension/library?
6. **One-liner**: Can it be a single scenario? Parameterized?
7. **Minimum**: Is load test alone enough? Skip stress/spike/soak if not justified.

### Step 5b: Reflexion — Self-Review Before Preview
BEFORE showing to the user, review the generated output:
1. **Correctness**: Are endpoint, thresholds, and stages correct?
2. **Minimality**: Is 1 scenario type enough? Is stress/soak really needed?
3. **Reuse**: Any missed k6 helper (getToken, getGlobal)?
4. **Safety**: Any threshold that could cause false positives?
5. **If there is an issue → refine automatically**
6. **Then show** to the user for APPROVE/EDIT/REJECT

### Step 6: Generate k6 Script
Create k6 test file (`.js`) with the structure:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up
    { duration: '1m', target: 10 },   // steady
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // reuse existing helpers if available (getToken, getGlobal)
  const res = http.get('${BASE_URL}/api/v1/resource');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

**Coverage rules:**
- Load: 10-50 VU, ramp up 30s, steady 1-2m
- Stress: 10 → 100+ VU, find breakpoint
- Spike: 0 → 100 VU instant, 30s
- Soak: 10 VU, 10-30 minutes
- Smoke: 1-2 VU, 30s

Every test must have: checks, thresholds, assertions.

### Step 6: Preview & User Loop
Show the preview script + file path:

Ask: "APPROVE, EDIT, or REJECT?"
- **APPROVE** → save file
- **EDIT** → ask for correction → apply → preview again
- **REJECT** → append rejection reason to `~/.qa-agent/corrections.json`

### Step 8: Auto-Run (Optional)
Ask the user: "Would you like to run it now?"
```bash
k6 run path/to/test.js
```
Or with output:
```bash
k6 run --out json=results.json path/to/test.js
```

### Step 9: Auto-Healing (if run fails)
1. Read error log — identify the issue (endpoint typo, auth, threshold too strict)
2. Fix the issue
3. Re-run max 2x
4. If still failing → show error + ask for guidance

### Step 10: Save to Memory
- Update `.cursor/qa-memory/generated-tests/k6/` with new test reference
- Update `project-context/current.md` if there's new info (base URL, auth pattern)
- Save run results (metrics) to `~/.qa-agent/knowledge.json`

## MCP Tools
- **Shortcut**: `get_story()` — read story for context
- **Context7**: k6 documentation (only if needed)
- **Glean**: internal API docs / Confluence

## References
- `.cursor/references/k6-testing.md` — k6 syntax
- `.cursor/references/git-workflow.md` — branching for perf test PR
- `~/.qa-agent/` — global memory store
