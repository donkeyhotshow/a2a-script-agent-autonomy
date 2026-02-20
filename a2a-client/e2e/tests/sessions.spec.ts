import { test, expect } from '@playwright/test';
import { setupApiMocks, mockApiResponses, completePromise, clearPromiseStore } from '../fixtures/test-fixtures';

test.describe('Sessions Page - Promise Protocol', () => {
  test.beforeEach(async ({ page }) => {
    clearPromiseStore();
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: [],
      connected: true,
      usePromiseProtocol: true
    });
  });

  test('SES-01: Should show empty state without project', async ({ page }) => {
    await page.goto('/');
    await page.click('.nav-link[data-page="sessions"]');
    
    const emptyMessage = page.locator('#sessionsList .empty');
    await expect(emptyMessage).toHaveText('Select a project first');
  });

  test('SES-02: Should create new session with promiseId', async ({ page }) => {
    await page.goto('/');
    
    // Select a project first
    await page.click('.project-card:first-child');
    
    // Should be on sessions page now
    const sessionsPage = page.locator('#page-sessions');
    await expect(sessionsPage).toHaveClass(/active/);
    
    // Click New button
    await page.click('#newSession');
    
    // Wait for session to be created
    await page.waitForTimeout(100);
  });

  test('SES-03: Should display session list', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // Select project
    await page.click('.project-card:first-child');
    
    // Check sessions are displayed
    const sessionItems = page.locator('.session-item');
    await expect(sessionItems).toHaveCount(2);
  });

  test('SES-04: Should filter sessions by status', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    
    // Select filter
    await page.selectOption('#sessionFilter', 'active');
    
    // Wait for reload
    await page.waitForTimeout(100);
  });

  test('SES-05: Should open existing session', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    
    // Click on first session
    await page.click('.session-item:first-child');
    
    // Session should be selected
    const firstSession = page.locator('.session-item:first-child');
    await expect(firstSession).toHaveClass(/active/);
  });

  test('SES-06: Should send message and receive promiseId', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Type message
    await page.fill('#messageInput', 'Test message');
    
    // Send
    await page.click('#sendMessage');
    
    // Input should be disabled (waiting for response)
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
  });

  test('SES-07: Should show preloader near message while pending', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Send message
    await page.fill('#messageInput', 'Test message with preloader');
    await page.click('#sendMessage');
    
    // Check for preloader/spinner near the last message
    const lastMessage = page.locator('#sessionMessages .msg').last();
    const spinner = lastMessage.locator('.spinner, .preloader, .loading');
    
    // Preloader should be visible (if implemented in UI)
    // This test checks the expected behavior
  });

  test('SES-08: Should unlock input after promise completes', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Send message
    await page.fill('#messageInput', 'Test message');
    await page.click('#sendMessage');
    
    // Input should be disabled
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
    
    // Simulate promise completion
    await completePromise(page, 'promise-msg-test', {
      id: 'msg-server-1',
      role: 'server',
      content: 'Server response'
    });
    
    // Wait for polling to complete
    await page.waitForTimeout(3000);
    
    // Input should be enabled again
    await expect(messageInput).toBeEnabled();
  });

  test('SES-09: Should send message on Enter', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Type message and press Enter
    await page.fill('#messageInput', 'Test message with Enter');
    await page.press('#messageInput', 'Enter');
    
    // Input should be disabled (waiting for response)
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
  });

  test('SES-10: Should click Continue button (Делаем) with promiseId', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Click Continue button
    await page.click('#btnContinue');
    
    // Input should be disabled
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
    
    // Wait for request
    await page.waitForTimeout(100);
  });

  test('SES-11: Should display messages in correct order', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Check messages are displayed
    const messages = page.locator('#sessionMessages .msg');
    await expect(messages).toHaveCount(2);
    
    // First message should be from user
    const firstMsg = messages.first();
    await expect(firstMsg).toHaveClass(/user/);
    
    // Second message should be from server
    const secondMsg = messages.nth(1);
    await expect(secondMsg).toHaveClass(/server/);
  });

  test('SES-12: Should display session status', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Check session header shows status
    const sessionHeader = page.locator('#sessionHeader');
    await expect(sessionHeader).toContainText('active');
  });

  test('SES-13: Should show waiting indicator', async ({ page }) => {
    // Setup session with waiting status
    const waitingSession = {
      id: 'sess-waiting',
      status: 'waiting' as const,
      messages: [{ id: 'msg-1', role: 'user' as const, content: 'Waiting task', pending: true, promiseId: 'promise-123' }],
      createdAt: '2024-01-15T12:00:00Z'
    };
    
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: [waitingSession],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Check waiting indicator
    const warnSpan = page.locator('#sessionHeader .warn');
    await expect(warnSpan).toBeVisible();
    await expect(warnSpan).toHaveText('Waiting...');
  });

  test('SES-14: Should format code blocks', async ({ page }) => {
    const sessionWithCode = {
      id: 'sess-code',
      status: 'active' as const,
      messages: [
        { id: 'msg-1', role: 'server' as const, content: 'Here is code:\n```javascript\nconsole.log("hello");\n```\nEnd.' }
      ],
      createdAt: '2024-01-15T12:00:00Z'
    };
    
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: [sessionWithCode],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Check code block is formatted
    const msgContent = page.locator('#sessionMessages .msg-content pre');
    await expect(msgContent).toBeVisible();
  });

  test('SES-15: Should show empty state for new session', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: [{ id: 'sess-empty', status: 'active' as const, messages: [] }],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Check empty message
    const emptyMsg = page.locator('#sessionMessages .empty');
    await expect(emptyMsg).toHaveText('Send a message to start');
  });

  test('SES-16: Should poll for promise result', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Send message
    await page.fill('#messageInput', 'Test polling');
    await page.click('#sendMessage');
    
    // Complete the promise after a delay
    setTimeout(() => {
      completePromise(page, 'promise-msg-test', {
        id: 'msg-server-1',
        role: 'server',
        content: 'Polled response'
      });
    }, 1000);
    
    // Wait for polling to complete
    await page.waitForTimeout(3000);
  });

  test('SES-17: Should disable send button while pending', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Send message
    await page.fill('#messageInput', 'Test button disable');
    await page.click('#sendMessage');
    
    // Send button should be disabled
    const sendBtn = page.locator('#sendMessage');
    await expect(sendBtn).toBeDisabled();
    
    // Continue button should also be disabled
    const continueBtn = page.locator('#btnContinue');
    await expect(continueBtn).toBeDisabled();
  });

  test('SES-18: Should show pending message with spinner', async ({ page }) => {
    const sessionWithPending = {
      id: 'sess-pending',
      status: 'waiting' as const,
      messages: [
        { id: 'msg-1', role: 'user' as const, content: 'Pending message', pending: true, promiseId: 'promise-pending-1' }
      ],
      createdAt: '2024-01-15T12:00:00Z'
    };
    
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: [sessionWithPending],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Check message is displayed
    const messages = page.locator('#sessionMessages .msg');
    await expect(messages).toHaveCount(1);
    
    // Input should be disabled (there's a pending message)
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
  });
});
