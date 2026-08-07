# QA PR review — output detail

Loaded when `@qa-pr-review` needs full template. Skill body stays short.

## Output

```markdown
## PR Review: <title>

**Repo type:** UI | API | perf
**Verdict:** Approve | Request changes | Block (P0)

### P0: Must fix
- `path:line` - issue - suggested fix

### P1: Should fix
...

### P2: Nice to have
...

### P3: Nit
...

### What looks good
- bullet
```

## Angles checklist

- Security via `@qa-security-review` (secrets = P0)
- Flake: fixed waits, missing intercepts, shared state, bad k6 thresholds
- Tests: meaningful asserts, reuse, no duplicate AC
- Design: YAGNI > KISS > Rule of Three / DRY > SOLID
- Architecture: repo conventions, PR title from `squad.name` / onboard A9

Cite `path:line`. No unasked push. Fix P0/P1 before offering push commands.
