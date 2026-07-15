# Playwright Browser Automation Quick Reference

Actual tool names from `@playwright/mcp`.

## Installation
```bash
npx @playwright/mcp@latest
```

## Browser Actions

### Navigation & Page
```javascript
// Navigate to URL
browser_navigate({ url: 'https://example.com' })

// Accessibility / DOM snapshot (best for understanding page structure)
browser_snapshot()

// Screenshot
browser_take_screenshot({ fullPage: true })

// Evaluate JS
browser_evaluate({ function: '() => document.title' })
```

### Locators & Selectors
Priority order (most stable first):
1. `data-testid` - `[data-testid="login-button"]`
2. `data-namespace` / `data-id` - `[data-namespace="quote"]`
3. `role` + `name` - button named "Submit", textbox named "Email"
4. `label` / visible text
5. `#id` - `#login-form`
6. CSS selectors - `.btn-primary`
7. XPath (last resort)

### Click / Type / Select
```javascript
browser_click({ element: 'Submit button', ref: '<snapshot-ref>' })
browser_type({ element: 'Email field', ref: '<snapshot-ref>', text: 'user@example.com' })
browser_select_option({ element: 'Country', ref: '<snapshot-ref>', values: ['ID'] })
```

### Wait & Other
```javascript
browser_wait_for({ text: 'Dashboard' })
browser_press_key({ key: 'Enter' })
browser_file_upload({ paths: ['/path/to/file.pdf'] })
```

## Element Collection Strategy (POM Builder)
1. Navigate to page
2. Call `browser_snapshot()` - roles, names, hierarchy
3. Map visible elements:
   - Form inputs → textbox, searchbox
   - Buttons → button, link
   - Dropdowns → combobox, listbox
   - Tables → table, grid, row
   - Checkboxes/Radios → checkbox, radio
4. Create alias file with stable selectors

## Best Practices
1. Prefer `data-testid` - most stable across UI changes
2. Use `browser_snapshot` before raw HTML
3. Screenshot after each step for exploration log (`browser_take_screenshot`)
4. Wait for elements/text before interaction
5. Confirm navigation via URL or visible text
