# Testing and SSE task dossier

Captures testing gaps highlighted in `a2a-client/DEV_STATE.md` (levels, SSE, Playwright, VueFlow).

## Related Workflows

For implementation of the testing scenarios and validation workflows:
- **[Testing Scenarios](../workflows/testing/)** - Comprehensive testing workflows and automation
- **[Communication Scenarios](../workflows/communication/)** - SSE reliability and fallback testing
- **[Session Lifecycle Scenarios](../workflows/session-lifecycle/)** - Session testing and validation criteria

| Task | Focus | Description | Acceptance criteria |
|------|-------|-------------|---------------------|
| **Task-Test-web-ui.ps1** | Web UI smoke | Replace placeholder script with real steps: start Vite (5173), run Client API proxy (3001), fire browser (Chromium/Firefox), exercise session load + SSE. | ✅ **COMPLETED** - `../../../scripts/test-web-ui.ps1` with Docker infra, health checks, browser launch, SSE verification, and log collection. |
| **Task-Health-SSE-Automation** | CI smoke test | Automated Playwright test covering /health endpoints + SSE connectivity for headless CI runs. | ✅ **COMPLETED** - `tests/e2e/health-sse-smoke.spec.ts` with service health checks, UI load verification, and SSE connection testing. |
| **Task-VueFlow coverage** | VueFlow nodes | Add unit tests for nodes (TaskInputNode, ActionProposalNode) + protocol mapping + flow manager interactions with `sessions.js`. | New Playwright/vitest suites covering nodes + integration hooking into SSE context. |
| **Task-Playwright cross-browser** | Cross-browser | Expand Playwright config to exercise Firefox/Safari, stabilize reuseExistingServer flag, and adjust maxFailures. | Playwright run against Chrome + Firefox results <5% flakiness. |
| **Task-SSE & reconnection tests** | SSE reliability | Build automated tests that open SSE `/api/sse/:sessionId`, verify event order, simulate disconnects, and confirm reconnection/backoff. | ✅ **COMPLETED** - `tests/e2e/health-sse-smoke.spec.ts` includes SSE connectivity testing; `tests/e2e/sse-reliability.spec.ts` covers advanced reconnection scenarios. |
| **Task-SSE fallback documentation** | SSE/WS | Document fallback path to WebSocket/polling when SSE blocked, update `DEV_STATE` referencing `WebSocketClient` states. | Doc captured in `web/docs/...` referencing actual endpoints + fallback triggers. |
| **Task-API test coverage** | API error handling | Create tests verifying error handler behavior (global notifications) for API errors simulated via client API. | Test asserts UI shows errors for 500/4xx responses and that error-handler.js logs appropriately. |
| **Task-SSE heartbeat/watchdog** | SSE health | Build instrumentation that watches SSE heartbeat events (every 30s) and alerts if they stop, validating server heartbeat + reconnection. | ✅ **COMPLETED** - `tests/e2e/sse-reliability.spec.ts` includes heartbeat monitoring, `tests/helpers/sse-instrumentation.ts` provides watchdog utilities. |
| **Task-SSE load / concurrency** | SSE performance | Simulate multiple SSE sessions (100+) to measure connection limits and verify SSEClient’s `maxReconnectAttempts` backoff. | Load test script capturing metrics + documentation of resource usage. |
| **Task-SSE message ordering** | SSE semantics | Introduce tests that inject events with out-of-order `context.execution.step` or duplicate IDs and confirm SessionSync resolves them to stable UI state. | Automated test harness (maybe via mocked SSE feed) and logged resolution path. |
| **Task-WS fallback automation** | WebSocket fallback | Automate switching from SSE to WebSocket when SSE blocked (e.g., by closing EventSource or causing network error) and ensure messaging continues. | Script/test verifying WebSocketClient handles failover, includes event log/tracing. |
| **Task-Playwright stability matrix** | Cross-browser | Beyond basic cross-browser, define matrix of locales/resolutions (mobile, desktop) and SSE load states to catch UI drift. | Playwright runs covering at least Chrome + Firefox + Safari + mobile width, with failure thresholds documented. |

## Web UI Smoke Script Integration

### Overview
The `scripts/test-web-ui.ps1` PowerShell script provides comprehensive smoke testing for the Web UI stack, automating service startup, health checks, browser testing, and log collection. This script serves as the primary manual verification tool for Web UI functionality.

### Script Annotations & Architecture

```powershell
# Core service orchestration:
# 1. Docker infrastructure (PostgreSQL + Redis)
# 2. A2A Server (port 3000) - backend API
# 3. Client API proxy (port 3001) - SDK endpoint
# 4. Vite dev server (port 5173) - Web UI

# Health check sequence:
# - /health endpoints for all services
# - HTTP status < 500 validation
# - 30s timeout with retry logic

# Browser automation:
# - Cross-browser support (chromium/firefox/edge)
# - Manual validation steps for developers
# - SSE connectivity verification via browser dev tools

# Log collection:
# - Service stdout/stderr redirected to $env:TEMP
# - Automatic collection to proxy_logs/ directory
# - Test result summary in test-results/ JSON format
```

### Run Procedure

#### Prerequisites
- PowerShell 7+ (Windows/Linux/macOS)
- Docker Desktop running
- Node.js 18+ with npm
- Clean `$env:TEMP` directory (script handles cleanup)

#### Execution Steps

```powershell
# Basic smoke test (default chromium)
.\scripts\test-web-ui.ps1

# Cross-browser testing
.\scripts\test-web-ui.ps1 -Browser firefox
.\scripts\test-web-ui.ps1 -Browser edge

# Headless mode (no browser opening)
.\scripts\test-web-ui.ps1 -SkipBrowser

# Custom ports
.\scripts\test-web-ui.ps1 -Port 5174 -ClientApiPort 3002
```

#### Manual Validation Checklist
When browser opens, verify:
1. ✅ Page loads without console errors
2. ✅ Session panel appears in UI
3. ✅ SSE connection establishes (check Network tab for `/api/sse/:sessionId`)
4. ✅ No WebSocket fallback triggered (unless SSE blocked)

### Log Examples & Analysis

#### Success Run Output
```
ℹ A2A Web UI Smoke Test
ℹ ===================
ℹ Starting infrastructure services...
✓ A2A Server is healthy
✓ Client API is healthy
✓ Web UI is healthy
✓ All services started successfully
ℹ Opening chromium browser at http://localhost:5173
ℹ Browser opened. Please manually verify:
ℹ 1. Page loads without errors
ℹ 2. Session panel appears
ℹ 3. SSE connection establishes (check browser dev tools)
ℹ Press Enter when ready to continue with automated checks...
✓ SSE connectivity test initiated
✓ Web UI smoke test completed successfully
```

#### Service Log Collection
Logs collected from `$env:TEMP` to `proxy_logs/web-ui-smoke-{timestamp}/`:
- `A2A Server.out.log` - Server startup and API requests
- `Client API.out.log` - SDK proxy operations
- `Vite Dev Server.out.log` - Frontend build/dev server logs

#### Test Result Summary (`test-results/web-ui-smoke-{timestamp}.json`)
```json
{
  "runId": "web-ui-smoke-20240306_184200",
  "timestamp": "20240306_184200",
  "exitCode": 0,
  "services": {
    "serverPort": 3000,
    "clientApiPort": 3001,
    "webUiPort": 5173
  },
  "logsCollected": 3,
  "logDirectory": "C:\\workspace\\org-carrier\\a2a-script-agent\\proxy_logs\\web-ui-smoke-20240306_184200",
  "browser": "chromium",
  "skipBrowser": false
}
```

### CI Integration & Automation

#### Automated Counterpart
For headless CI runs, use `tests/e2e/web-ui-smoke-api.spec.ts`:
- ✅ Service health endpoint validation
- ✅ SSE `/api/sse/:sessionId` connectivity testing
- ✅ Session creation via API without browser
- ✅ CORS header validation for browser SSE

#### Run in CI Pipeline
```bash
# Start services in background
docker compose up -d postgres redis
npm run dev:a2a-server &
npm run dev:client-api &
npm run dev:web-ui &

# Run smoke tests
npm run test:e2e -- --grep "Web UI Smoke Test - API Level"
```

### SSE Instrumentation Links

- **SSE Reliability Tests**: `tests/e2e/sse-reliability.spec.ts` - Advanced reconnection scenarios
- **SSE Instrumentation Helpers**: `tests/e2e/helpers/sse-instrumentation.ts` - Monitoring utilities
- **WebSocket Fallback Tests**: `tests/e2e/websocket-fallback.spec.ts` - Fallback behavior
- **Session Persistence Tests**: `tests/e2e/session-persistence.spec.ts` - State management

### Troubleshooting

#### Common Issues
- **Port conflicts**: Kill processes on 3000/3001/5173 before running
- **Docker not running**: Start Docker Desktop, verify `docker ps` works
- **Browser fails to open**: Check default browser associations
- **SSE not connecting**: Verify CORS headers in server logs

#### Debug Mode
```powershell
# Enable verbose logging
$DebugPreference = 'Continue'
.\scripts\test-web-ui.ps1 -Browser chromium

# Check collected logs
Get-Content proxy_logs/web-ui-smoke-*/A2A\ Server.err.log
```

## SSE Load Testing Implementation

### Load Test Suite (`tests/e2e/sse-load-test.spec.ts`)

Comprehensive load testing for concurrent SSE connections with multiple test scenarios:

**Test Scenarios**:
- **Light Load**: 5 concurrent connections (30 seconds)
- **Medium Load**: 10 concurrent connections (45 seconds)
- **Heavy Load**: 20 concurrent connections (60 seconds)
- **Stress Test**: 50 concurrent connections burst (30 seconds)

**Execution**:
```bash
# Run specific load test
npx playwright test tests/e2e/sse-load-test.spec.ts --grep "Light Load"

# Run all load tests (requires significant resources)
npx playwright test tests/e2e/sse-load-test.spec.ts
```

**Metrics Collected**:
- Connection establishment success/failure rates
- Average connection time
- Message throughput (messages received)
- Peak memory usage across browser instances
- Connection health monitoring during test duration

**Artifacts**:
- Results: `test-results/sse-load-test-{timestamp}.json`
- Logs: `tests/logs/sse-load-test/load-test-{connections}-{timestamp}.log`

**Requirements**:
- All services running (Docker, A2A Server, Client API, Web UI)
- Sufficient system resources for concurrent browser contexts
- Minimum 8GB RAM recommended for heavy load tests

## Performance Monitoring Implementation

### Performance Monitor (`tests/helpers/performance-monitor.ts`)

Comprehensive performance monitoring utility that collects metrics across Node.js, browser, and connection layers.

**Metrics Collected**:
- **Node.js Metrics**: Heap usage, CPU usage, event loop lag, active handles/requests
- **Page Metrics**: Load times, Web Vitals, memory usage, network request counts
- **Connection Metrics**: SSE connection health, message throughput, error tracking

### Performance Tests (`tests/e2e/performance-monitoring.spec.ts`)

**Test Scenarios**:
- **Web UI Performance Baseline**: Page load times, DOM ready, network requests
- **SSE Connection Performance**: Connection establishment, message throughput, stability
- **Memory Leak Detection**: Heap usage monitoring during repeated operations
- **Performance Regression Detection**: Compare against baseline metrics

**Execution**:
```bash
# Run all performance tests
npx playwright test tests/e2e/performance-monitoring.spec.ts

# Run specific test
npx playwright test tests/e2e/performance-monitoring.spec.ts --grep "baseline"
```

**Artifacts**:
- Results: `test-results/performance-*.json`
- Baselines: `test-results/performance-baseline.json` (auto-updated)
- Logs: `tests/logs/performance-monitoring/`

**Performance Thresholds**:
- Page load time: < 5-10 seconds
- Connection time: < 5 seconds
- Heap growth: < 50MB during stress tests
- Zero failed network requests in baseline scenarios

## Parallel Browser Testing Implementation

### Cross-Browser Matrix Test (`tests/e2e/parallel-browser-test.spec.ts`)

Comprehensive parallel testing across multiple browser and device combinations simultaneously.

**Browser Matrix**:
- **Chromium**: Desktop (1280x720) + Mobile (393x851)
- **Firefox**: Desktop (1280x720) + Mobile (393x851)
- **WebKit**: Desktop (1280x720) + Mobile (390x844)

**Test Scenarios**:
- **Cross-browser smoke test**: Basic functionality across all browser/device combinations
- **Browser compatibility matrix**: Aggregated results and pass/fail rates
- **Performance comparison**: Load time and resource usage comparison across browsers

**Execution**:
```bash
# Run all parallel browser tests (runs 6 test instances in parallel)
npm run test:e2e -- tests/e2e/parallel-browser-test.spec.ts

# Run specific browser combination
npm run test:e2e -- tests/e2e/parallel-browser-test.spec.ts --grep "chromium-desktop"
```

**Artifacts**:
- Screenshots: `tests/logs/parallel-browser-testing/*.png` (initial, session, final, error states)
- Results: `test-results/parallel-*.json` (per browser/device combination)
- Summary: `test-results/browser-matrix-summary-*.json` (aggregated results)
- Comparison: `test-results/performance-comparison-*.json` (cross-browser analysis)

**Performance Thresholds**:
- Load time: < 30 seconds per browser
- Pass rate: ≥ 80% across all combinations
- Failed requests: < 3 per test instance

**Parallel Execution Benefits**:
- Tests all browser combinations simultaneously
- Identifies browser-specific issues quickly
- Performance benchmarking across rendering engines
- Mobile vs desktop performance comparison

## Visual Regression Testing Implementation

### Screenshot Comparison Utility (`tests/helpers/screenshot-comparison.ts`)

Advanced visual regression testing with pixel-perfect comparison and baseline management.

**Features**:
- **Pixel-level comparison**: Detects visual differences down to individual pixels
- **Baseline management**: Automatic baseline creation and updating
- **Difference visualization**: Generates diff images highlighting changes
- **Configurable thresholds**: Adjustable sensitivity for different test scenarios

**Configuration**:
```typescript
const config: VisualRegressionConfig = {
  threshold: 0.01,        // 1% difference allowed
  baselineDir: 'tests/visual-baselines',
  currentDir: 'tests/visual-current',
  diffDir: 'tests/visual-diffs',
  updateBaselines: false  // Set to true to create/update baselines
};
```

### Visual Regression Tests (`tests/e2e/visual-regression.spec.ts`)

**Test Scenarios**:
- **Web UI Visual Baseline**: Full page, viewport, and component screenshots
- **Interactive Elements**: Button states, hover effects, form interactions
- **Responsive Design**: Mobile, tablet, desktop, and wide screen layouts
- **Theme Consistency**: Light/dark theme visual consistency
- **Regression Summary**: Aggregated results across all visual tests

**Execution**:
```bash
# Run visual regression tests
npm run test:e2e -- tests/e2e/visual-regression.spec.ts

# Update baselines (after intentional UI changes)
UPDATE_BASELINES=true npm run test:e2e -- tests/e2e/visual-regression.spec.ts
```

**Artifacts**:
- Baselines: `tests/visual-baselines/*.png` (reference screenshots)
- Current: `tests/visual-current/*.png` (test run screenshots)
- Diffs: `tests/visual-diffs/*.png` (highlighted differences)
- Results: `test-results/visual-*.json` (detailed comparison data)
- Summary: `test-results/visual-regression-summary-*.json` (aggregated report)

**Thresholds & Assertions**:
- Pixel difference threshold: 1% (configurable)
- Overall pass rate: ≥ 95% across all comparisons
- Zero visual regressions allowed in CI
- Automatic baseline updates with `UPDATE_BASELINES=true`

**Visual Test Types**:
- **Baseline Tests**: Verify core UI elements haven't changed
- **Interaction Tests**: Test UI state changes and transitions
- **Responsive Tests**: Ensure consistent appearance across devices
- **Theme Tests**: Validate theme switching doesn't break visuals

## Extended Reliability Plan Implementation

### SSE Heartbeat Monitoring (`tests/e2e/sse-reliability.spec.ts`)

**Concrete Checks Added:**
- ✅ **Heartbeat Interval Validation**: Monitors server-sent heartbeat events every 30 seconds
- ✅ **Connection Health Watchdog**: Detects heartbeat gaps > 35 seconds and triggers alerts
- ✅ **Automatic Reconnection Testing**: Verifies client reconnects after simulated heartbeat loss
- ✅ **Heartbeat Message Format**: Validates heartbeat contains `timestamp`, `sessionId`, and `status`

**Test Implementation:**
```typescript
test('SSE Heartbeat Monitoring', async ({ page }) => {
  const heartbeatEvents = [];
  page.on('console', msg => {
    if (msg.text().includes('SSE heartbeat')) {
      heartbeatEvents.push({
        timestamp: Date.now(),
        message: msg.text()
      });
    }
  });

  // Monitor for 90 seconds (3 heartbeat cycles)
  await page.waitForTimeout(90000);

  // Assertions
  expect(heartbeatEvents.length).toBeGreaterThanOrEqual(2);
  heartbeatEvents.forEach(event => {
    expect(event.message).toContain('timestamp');
    expect(event.message).toContain('sessionId');
  });
});
```

### WebSocket Fallback Mechanisms (`tests/e2e/websocket-fallback.spec.ts`)

**Concrete Checks Added:**
- ✅ **SSE Blockage Detection**: Simulates SSE being blocked (CORS/proxy issues)
- ✅ **Automatic WebSocket Fallback**: Verifies seamless switch to WebSocket transport
- ✅ **Connection State Preservation**: Ensures session state maintained during fallback
- ✅ **Message Continuity**: Validates no message loss during transport switch

**Fallback Trigger Scenarios:**
```typescript
// Test scenarios for fallback activation
const fallbackScenarios = [
  'SSE blocked by corporate proxy',
  'SSE connection timeout > 30 seconds',
  'SSE EventSource error event',
  'SSE readyState becomes CLOSED',
  'Browser SSE API disabled/unavailable'
];
```

### Session Persistence Testing (`tests/e2e/session-persistence.spec.ts`)

**Concrete Checks Added:**
- ✅ **Browser Refresh Persistence**: Session state survives page reload
- ✅ **Tab Recovery**: Session data persists across browser tabs
- ✅ **Network Interruption Recovery**: Sessions recover after connection loss
- ✅ **LocalStorage Synchronization**: Session metadata stored persistently
- ✅ **Context State Preservation**: `execution.step`, `messages[]`, `context.docVirtual` maintained

**Persistence Test Matrix:**
```typescript
const persistenceScenarios = [
  {
    trigger: 'page refresh',
    expectation: 'session list and active session preserved',
    test: 'browser-refresh-persistence'
  },
  {
    trigger: 'network disconnect 30s',
    expectation: 'automatic reconnection with state sync',
    test: 'network-recovery-persistence'
  },
  {
    trigger: 'browser tab close/reopen',
    expectation: 'session recoverable via project API',
    test: 'tab-recovery-persistence'
  }
];
```

### Reliability Monitoring Dashboard

**Real-time Metrics Collection:**
- **Connection Health**: SSE/WebSocket connection status with latency
- **Heartbeat Timeline**: Visual timeline of heartbeat events
- **Reconnection Events**: Log of all reconnection attempts and success/failure
- **Session State Changes**: Timeline of session state transitions
- **Error Rate Tracking**: SSE/WebSocket error rates over time

**Alert Thresholds:**
```typescript
const reliabilityThresholds = {
  heartbeatGap: 35, // seconds - alert if no heartbeat
  reconnectionTime: 10, // seconds - max time to reconnect
  errorRate: 0.05, // 5% - max error rate before alert
  sessionLoss: 0, // sessions - zero tolerance for data loss
};
```

### Automated Reliability Regression Tests

**Daily/Weekly Reliability Suite:**
```bash
# Run reliability regression suite
npm run test:reliability

# Components tested:
# - sse-reliability.spec.ts (heartbeat, reconnection)
# - websocket-fallback.spec.ts (transport failover)
# - session-persistence.spec.ts (state management)
# - performance-monitoring.spec.ts (resource usage)
```

**Reliability Metrics Baseline:**
- Heartbeat success rate: > 99.9%
- Reconnection time: < 5 seconds average
- Session persistence: 100% success rate
- Transport fallback: < 10 second transition time

### CI/CD Reliability Gates

**Pre-deployment Checks:**
```yaml
# GitHub Actions reliability gate
- name: Reliability Tests
  run: |
    npm run test:reliability
    npm run test:performance
  continue-on-error: false

# Reliability metrics validation
- name: Validate Metrics
  run: |
    node scripts/validate-reliability-metrics.js
    # Fails if any metric below threshold
```

This extended reliability plan ensures the Web UI maintains robust real-time connectivity and state management across all deployment scenarios.
