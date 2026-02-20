# E2E Tests for A2A Client

End-to-end tests using Playwright for the A2A Client web interface.

## Protocol Support

Tests support the **Promise-based Protocol**:
1. Client sends request → Server returns `promiseId`
2. Client polls `GET /api/promises/:promiseId` for result
3. While pending: input is disabled, spinner shows near message
4. When completed: input enabled, result displayed

## Structure

```
e2e/
├── fixtures/
│   └── test-fixtures.ts    # Custom fixtures, API mocks, promise helpers
├── pages/
│   ├── base.page.ts        # Base page object
│   ├── projects.page.ts    # Projects page object
│   ├── sessions.page.ts    # Sessions page object
│   └── explorer.page.ts    # Explorer page object
├── tests/
│   ├── navigation.spec.ts  # Navigation tests (8 tests)
│   ├── projects.spec.ts    # Projects page tests (15 tests)
│   ├── sessions.spec.ts    # Sessions page tests (18 tests) ← Promise protocol
│   ├── explorer.spec.ts    # Explorer page tests (15 tests)
│   └── integration.spec.ts # Integration tests (12 tests) ← Promise protocol
└── tsconfig.json           # TypeScript config
```

## Running Tests

```bash
# Install dependencies (first time)
npm install

# Install Playwright browsers (first time)
npx playwright install chromium

# Run all tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Show test report
npm run test:e2e:report

# Run specific test file
npx playwright test tests/sessions.spec.ts

# Run specific test
npx playwright test -g "SES-06"
```

## Test Coverage

| Category | Tests | Description |
|----------|-------|-------------|
| Navigation | 8 | Page navigation, status display |
| Projects | 15 | CRUD operations, modal, selection |
| Sessions | 18 | Session management, messaging, **promise protocol** |
| Explorer | 15 | File tree, editor, chat |
| Integration | 12 | Full workflows, **promise protocol** |
| **Total** | **68** | |

## Promise Protocol Testing

### Key Test Scenarios

| Test ID | Description |
|---------|-------------|
| SES-06 | Send message → receive promiseId → input disabled |
| SES-07 | Preloader visible near message while pending |
| SES-08 | Input unlocked after promise completes |
| SES-17 | Send button disabled while pending |
| SES-18 | Pending message shows with spinner |
| INT-04 | Full session with promise-based messaging |
| INT-11 | Promise polling timeout handling |
| INT-12 | Multiple messages queue |

### Using Promise Helpers

```typescript
import { 
  setupApiMocks, 
  completePromise, 
  clearPromiseStore 
} from '../fixtures/test-fixtures';

test('my promise test', async ({ page }) => {
  clearPromiseStore();
  
  await setupApiMocks(page, {
    projects: [...],
    sessions: [...],
    usePromiseProtocol: true  // Enable promise protocol
  });
  
  // Send message - input becomes disabled
  await page.fill('#messageInput', 'Test');
  await page.click('#sendMessage');
  await expect(page.locator('#messageInput')).toBeDisabled();
  
  // Complete the promise
  await completePromise(page, 'promise-msg-test', {
    id: 'msg-1',
    role: 'server',
    content: 'Response'
  });
  
  // Wait for polling - input becomes enabled
  await page.waitForTimeout(3000);
  await expect(page.locator('#messageInput')).toBeEnabled();
});
```

## API Mocking

All tests use API mocking via `page.route()` for isolation and reliability.

### Available Mock Data

```typescript
mockApiResponses.status           // Server status
mockApiResponses.sampleProjects   // Sample projects
mockApiResponses.sampleSessions   // Sample sessions with pending messages
mockApiResponses.files            // Sample file list
mockApiResponses.promiseCreated   // New promise response
mockApiResponses.promisePending   // Pending promise status
mockApiResponses.promiseCompleted // Completed promise with result
```

### Mock Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/sessions/:id/messages` | POST | `{ promiseId, status: 'pending' }` |
| `/api/promises/:promiseId` | GET | `{ promiseId, status, result? }` |
| `/api/sessions/:id/continue` | POST | `{ promiseId, status: 'pending' }` |

## Page Objects

Tests use the Page Object Model pattern:

```typescript
import { SessionsPage } from '../pages/sessions.page';

test('example', async ({ page }) => {
  const sessionsPage = new SessionsPage(page);
  await sessionsPage.goto();
  await sessionsPage.sendMessage('Hello');
  
  // Check input is disabled while pending
  await expect(sessionsPage.messageInput).toBeDisabled();
});
```

## Configuration

Playwright configuration in [`playwright.config.ts`](../playwright.config.ts):

- **Browser:** Chromium only
- **Base URL:** http://localhost:5173
- **Traces:** On first retry
- **Screenshots:** On failure
- **Videos:** On failure

## Debugging

```bash
# Run specific test in debug mode
npx playwright test tests/sessions.spec.ts --debug

# Run with trace viewer
npx playwright test --trace on
npx playwright show-trace trace.zip

# UI mode for interactive debugging
npm run test:e2e:ui
```

## CI Integration

Tests are configured for CI with:
- 2 retries on failure
- Single worker
- HTML reporter

## Writing New Tests

1. Create file in `tests/` with `.spec.ts` extension
2. Use promise protocol for session tests:

```typescript
import { test, expect } from '@playwright/test';
import { setupApiMocks, mockApiResponses, clearPromiseStore } from '../fixtures/test-fixtures';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    clearPromiseStore();
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      usePromiseProtocol: true
    });
  });
  
  test('TEST-ID: Description', async ({ page }) => {
    // Test code
  });
});
```
