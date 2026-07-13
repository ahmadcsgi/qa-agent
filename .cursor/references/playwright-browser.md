# Playwright Browser Automation Quick Reference

## Installation
```bash
# Install Playwright and browser
npm init -y
npm install @playwright/mcp@latest
npx playwright install chromium

# Run MCP server
npx @playwright/mcp@latest
```

## Browser Actions

### Navigation & Page
```javascript
// Navigate to URL
browser_navigate(url: 'https://example.com')

// Get page title
browser_evaluate(script: 'document.title')

// Get accessibility tree (best for understanding page structure)
browser_get_accessibility_tree()

// Screenshot
browser_screenshot(fullPage: true)

// Get page HTML
browser_evaluate(script: 'document.documentElement.outerHTML')
```

### Locators & Selectors
Priority order (most stable first):
1. `data-testid` — `[data-testid="login-button"]`
2. `data-namespace` / `data-id` — `[data-namespace="quote"]`
3. `role` + `name` — `button[name="Submit"]`, `textbox[name="Email"]`
4. `label` — `text=Submit`, `label="Email Address"`
5. `#id` — `#login-form`
6. CSS selectors — `.btn-primary`, `div.form-group > input`
7. XPath (last resort) — `//button[contains(text(), 'Submit')]`

### Click
```javascript
// Click element
browser_click(selector: '[data-testid="submit-btn"]')

// Click with options
browser_click(selector: 'text=Save', options: { force: true })
```

### Type / Fill
```javascript
// Type into input
browser_type(selector: '#email', text: 'user@example.com')

// Clear and type
browser_type(selector: '[data-testid="search"]', text: 'hello', options: { clear: true })
```

### Select
```javascript
// Select dropdown option by label
browser_select_option(selector: '[data-testid="country"]', value: 'ID')

// Select by value or label
browser_select_option(selector: '#month', label: 'January')
```

### Checkbox / Radio
```javascript
// Check/uncheck
browser_check(selector: '[data-testid="agree-terms"]')
browser_uncheck(selector: '[data-testid="agree-terms"]')
```

### Wait & Assert
```javascript
// Wait for element
browser_wait_for_selector(selector: '.loading-spinner', options: { state: 'hidden' })

// Wait for navigation
browser_wait_for_url(url: '**/dashboard')

// Assert element exists
browser_is_visible(selector: '[data-testid="success-message"]')
```

### Keyboard & Special
```javascript
// Press Enter/Tab
browser_press_key(selector: '#search', key: 'Enter')
browser_press_key(selector: '#email', key: 'Tab')

// File upload
browser_set_input_files(selector: 'input[type="file"]', files: ['/path/to/file.pdf'])
```

## Element Collection Strategy (POM Builder)
1. Navigate to page
2. Get accessibility tree — gives you roles, names, and hierarchy
3. Map visible elements:
   - Form inputs → `textbox`, `searchbox`
   - Buttons → `button`, `link`
   - Dropdowns → `combobox`, `listbox`
   - Tables → `table`, `grid`, `row`
   - Checkboxes/Radios → `checkbox`, `radio`
4. Create alias file with stable selectors

## Best Practices
1. Prefer `data-testid` — most stable across UI changes
2. Use accessibility tree before raw HTML
3. Screenshot after each step for exploration log
4. Wait for elements before interaction
5. Use page URL assertions to confirm navigation
