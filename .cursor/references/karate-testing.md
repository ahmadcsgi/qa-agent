# Karate API Testing Quick Reference

## Installation
```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.intuit.karate</groupId>
    <artifactId>karate-junit5</artifactId>
    <version>1.4.1</version>
    <scope>test</scope>
</dependency>
```

```bash
# Run all tests
mvn test -Dtest=KarateTests

# Run specific feature
mvn test -Dkarate.options="classpath:features/users.feature"

# With tags
mvn test -Dkarate.options="--tags @smoke"
```

## Feature File Structure
```gherkin
Feature: User Management API

  Background:
    * url 'https://api.example.com/v1'
    * configure headers = { Authorization: '#(authToken)' }

  Scenario: Get user by ID
    Given path '/users/123'
    When method GET
    Then status 200
    And match response ==
    """
    {
      "id": 123,
      "name": "#string",
      "email": "#regex ^[\\w.-]+@[\\w.-]+\\.\\w+$"
    }
    ```

  Scenario: Create user
    Given path '/users'
    And request { name: 'John', email: 'john@example.com' }
    When method POST
    Then status 201
    And match response contains { name: 'John' }
    And match response.id == '#number'
```

## Core Keywords

| Keyword | Example | Description |
|---------|---------|-------------|
| `Given` | `Given path '/users'` | Setup precondition |
| `And` | `And request {}` | Additional condition |
| `When` | `When method POST` | The action |
| `Then` | `Then status 200` | Assertion |
| `*` | `* url 'https://...'` | Shortcut for any keyword |

## HTTP Methods
```gherkin
When method GET
When method POST
When method PUT
When method DELETE
When method PATCH
When method OPTIONS
When method HEAD
```

## Request Configuration
```gherkin
# URL
* url 'https://api.example.com/v1'

# Path
Given path '/users', '/123'     # → /users/123

# Query params
Given param page = 1
Given param size = 20

# Headers
And header Content-Type = 'application/json'
And header Authorization = 'Bearer xxx'

# Request body (JSON)
And request { name: 'John', email: 'john@test.com' }

# Request body (from file)
And request read('data/create-user.json')

# Multi-part
And multipart field file = { read: 'file.pdf', contentType: 'application/pdf' }
And multipart field metadata = { name: 'test' }

# Form fields
And form field username = 'john'
And form field password = 'secret'
```

## Response Assertions

### Status code
```gherkin
Then status 200
Then status 201
Then status 404
```

### Response body matching
```gherkin
# Exact match
Then match response == { id: 1, name: 'John' }

# Partial match
Then match response contains { name: 'John' }

# Ignore order (arrays)
Then match response contains only [{ id: 1 }, { id: 2 }]
Then match response contains any [{ id: 1 }, { id: 3 }]
Then match response contains deep { id: 1 }

# Deep contains (nested)
Then match response contains deep { address: { city: 'Jakarta' } }
```

### Type & Format Validation
```gherkin
# Type validators
'#string'      - any string
'#number'      - any number
'#boolean'     - true or false
'#null'        - null
'#array'       - any array
'#object'      - any object
'#present'     - not null
'#notnull'     - not null
'#ignore'      - skip validation

# Regex validation
'#regex ^\\d{3}-\\d{4}$'

# Array validators
'#[]'          - empty array
'#[5]'         - array with exactly 5 items
'#[_>0]'       - array where all items > 0

# Optional (null or type)
'##string'     - optional string (null or string)
'##number'     - optional number
```

### Chained assertions
```gherkin
Then assert response.length == 3
Then assert response[0].name == 'John'
Then assert response.total > 0
```

## Variables & Reuse

### Define and use variables
```gherkin
* def userId = 123
* def userName = 'John'
Given path '/users', userId
```

### Extract from response
```gherkin
* def createdId = response.id
* def authToken = response.token
```

### Call other feature files
```gherkin
# Call with params
* def result = call read('login.feature') { username: 'admin', password: 'pass' }
* def token = result.token

# Call once (reuse same result for all scenarios)
* callonce read('login.feature') { username: 'admin', password: 'pass' }
```

## Data-Driven Testing

### Scenario Outline
```gherkin
Scenario Outline: Create user <name>
  Given path '/users'
  And request { name: '<name>', email: '<email>' }
  When method POST
  Then status 201

  Examples:
    | name  | email               |
    | John  | john@example.com    |
    | Jane  | jane@example.com    |
    | Bob   | bob+test@example.com|
```

### Dynamic data from JSON
```gherkin
* def data = read('data/users.json')
* def data = data.users

Scenario Outline: Create user <name>
  Given path '/users'
  And request __row
  When method POST
  Then status 201

  Examples:
    | karate.forEach(data, function(x){ return x }) |
```

## Tags & Filtering
```gherkin
@smoke @regression
Scenario: Critical path
  ...

@regression
Scenario: Full validation
  ...
```

```bash
mvn test -Dkarate.options="--tags @smoke"
mvn test -Dkarate.options="--tags @regression --tags ~@slow"
```

## Hooks
```javascript
// Karate-config.js — runs before every feature
function fn() {
  var config = {
    baseUrl: 'https://api.example.com/v1',
    authToken: 'default-token',
  };
  return config;
}
```

```javascript
// karate-config-{env}.js — per environment
// karate-config-staging.js
function fn() {
  return { baseUrl: 'https://staging.example.com/v1' };
}
```

## Best Practices
1. Use `callonce` for authentication (login once per feature)
2. Use `configure headers` in Background for auth headers
3. Use data-driven tests instead of copy-paste
4. Use type validators (`#string`, `#number`) for flexible assertions
5. Keep features small and focused (1 endpoint per feature)
6. Use `karate.abort()` to skip remaining steps on failure
7. Use `karate.log()` for debugging
8. Store test data in `data/` directory as JSON files
