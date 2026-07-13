# k6 Performance Testing Quick Reference

## Installation
```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js

# Latest binary
curl -LO https://github.com/grafana/k6/releases/latest/download/k6-linux-amd64.tar.gz
```

## Script Structure
```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '1m', target: 10 },    // steady
    { duration: '10s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
  },
  ext: {
    loadimpact: {
      projectID: 123456,
      name: 'Test Name'
    }
  }
};
```

## Scenario Types

| Type | Config | Use Case |
|------|--------|----------|
| **Load** | `stages: [{duration: '1m', target: 50}]` | Normal traffic baseline |
| **Stress** | `stages: [{duration: '2m', target: 200}]` | Find breakpoint |
| **Spike** | `stages: [{duration: '10s', target: 0}, {duration: '10s', target: 500}]` | Sudden traffic burst |
| **Soak** | `stages: [{duration: '30m', target: 30}]` | Long-duration stability |
| **Smoke** | `vus: 1, duration: '30s'` | Validation test |

## Common Patterns

### GET request
```javascript
const res = http.get('https://api.example.com/v1/resource');
check(res, {
  'status is 200': (r) => r.status === 200,
  'response time OK': (r) => r.timings.duration < 1000,
});
```

### POST with JSON
```javascript
const payload = JSON.stringify({ key: 'value' });
const params = {
  headers: { 'Content-Type': 'application/json' },
};
const res = http.post('https://api.example.com/v1/resource', payload, params);
```

### POST with form data
```javascript
const payload = { username: 'user', password: 'pass' };
const res = http.post('https://api.example.com/login', payload);
```

### Authenticated request
```javascript
const params = {
  headers: {
    'Authorization': `Bearer ${__ENV.TOKEN}`,
    'Content-Type': 'application/json',
  },
};
const res = http.get('https://api.example.com/v1/protected', params);
```

### Using environment variables
```javascript
const BASE_URL = __ENV.BASE_URL || 'https://staging.example.com';
const TOKEN = __ENV.TOKEN;
```

## Key Metrics

| Metric | Description |
|--------|-------------|
| `http_req_duration` | Total request duration (ms) |
| `http_req_failed` | Request failure rate |
| `http_req_waiting` | Time to first byte (TTFB) |
| `http_reqs` | Request rate (req/s) |
| `vus` | Active virtual users |
| `iterations` | Total iterations completed |

## Custom Metrics
```javascript
const myTrend = new Trend('my_custom_metric');
const myRate = new Rate('my_error_rate');
const myCounter = new Counter('my_call_count');

export default function () {
  const res = http.get('...');
  myTrend.add(res.timings.duration);
  myRate.add(res.status !== 200);
  myCounter.add(1);
}
```

## Data-Driven Testing
```javascript
const data = JSON.parse(open('./data.json'));

export default function () {
  const user = data[__VU % data.length];  // round-robin by VU
  // use user.email, user.password
}
```

## Helper: Login once per VU
```javascript
let token;  // initialized per VU

export function setup() {
  // runs once globally
  const res = http.post('https://api.example.com/login', { username: 'admin', password: 'pass' });
  return JSON.parse(res.body).token;
}

export default function (data) {
  token = token || data;  // use setup data
  const params = { headers: { Authorization: `Bearer ${token}` } };
  http.get('https://api.example.com/v1/protected', params);
}
```

## Running Tests
```bash
# Simple run
k6 run script.js

# With environment variables
k6 run -e BASE_URL=https://prod.example.com -e TOKEN=xxx script.js

# With output
k6 run --out json=results.json script.js

# With HTML report (needs k6-reporter)
k6 run script.js && cat results.json | xcresults > report.html

# Cloud run
k6 cloud script.js

# Threshold violation exit code
k6 run script.js  # exit 0 = pass, exit 99 = thresholds failed
```

## Cheatsheet
- `check(res, { 'name': (r) => condition })` — assert condition
- `group('name', () => { ... })` — group requests in report
- `sleep(1)` — think time between iterations
- `__VU` — current VU number (1-indexed)
- `__ITER` — current iteration number
- `__ENV.VAR` — environment variable
- `open('file.json')` — read file at init
- `JSON.parse(str)` — parse JSON
- `JSON.stringify(obj)` — serialize JSON
- `${}` — template literals
