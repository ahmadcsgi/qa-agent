# Git Workflow Quick Reference

## Branch Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| UI Automation | `auto/{story-id}-{feature-desc}` | `auto/12345-quote-generation` |
| API Test | `api-test/{story-id}-{endpoint}` | `api-test/12345-create-quote` |
| Performance Test | `perf/{story-id}-{desc}` | `perf/12345-quote-load-test` |
| Bug Fix | `fix/{story-id}-{bug-desc}` | `fix/12345-null-pointer-quote` |
| Enhancement | `enhance/{story-id}-{desc}` | `enhance/12345-add-export` |

## Commit Convention
```
type(scope): brief description

Types: feat, fix, test, refactor, chore, docs
Scope: component/area
```

Examples:
```
test(quote): add Cypress test for quote generation with premium > 1M

fix(api): correct NullPointerException on empty response

perf(quote): add k6 load test for quote generation endpoint
```

## Workflow

### Creating a branch
```bash
git checkout -b auto/12345-quote-generation
```

### Committing
```bash
git add cypress/features/quote-generation.feature cypress/support/aliases/quote.js
git commit -m "test(quote): add Cypress test for quote generation"
```

### Pushing & PR
```bash
git push -u origin auto/12345-quote-generation
# Create PR via GitHub CLI
gh pr create --title "test(quote): add Cypress test" --body "Closes #12345"
```

### Before starting work
```bash
git checkout main
git pull origin main
```

## Tips
- Keep commits atomic (1 feature = 1 commit)
- Never commit `.cursor/qa-memory/` (already gitignored)
- Never commit credentials or tokens
- Use `git status` and `git diff` before committing
- Reference story ID in commit messages
