import { test, expect } from '@playwright/test';
import { setupApiMocks, mockApiResponses, completePromise, clearPromiseStore } from '../fixtures/test-fixtures';

test.describe('Integration Tests - Promise Protocol', () => {
  test.beforeEach(async ({ page }) => {
    clearPromiseStore();
  });

  test('INT-01: Full workflow - create project, session, send message with promise', async ({ page }) => {
    await setupApiMocks(page, {
      projects: [],
      sessions: [],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Start on Projects page
    await expect(page.locator('#page-projects')).toHaveClass(/active/);
    
    // 2. Create a new project
    await page.click('#addProject');
    await page.fill('#projectName', 'Integration Test Project');
    await page.fill('#projectPath', '/test/integration');
    await page.click('#saveProject');
    
    // 3. Navigate to Sessions
    await page.click('.nav-link[data-page="sessions"]');
    await expect(page.locator('#page-sessions')).toHaveClass(/active/);
    
    // 4. Navigate to Explorer
    await page.click('.nav-link[data-page="explorer"]');
    await expect(page.locator('#page-explorer')).toHaveClass(/active/);
    
    // 5. Navigate back to Projects
    await page.click('.nav-link[data-page="projects"]');
    await expect(page.locator('#page-projects')).toHaveClass(/active/);
  });

  test('INT-02: Build index and view files', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Click Build Index in footer
    await page.click('#buildIndex');
    
    // 2. Wait for button to change state
    await page.waitForTimeout(100);
    
    // 3. Navigate to Explorer
    await page.click('.nav-link[data-page="explorer"]');
    
    // 4. Check files are displayed
    const fileItems = page.locator('.file-item');
    await expect(fileItems).toHaveCount(5);
  });

  test('INT-03: Switch between projects', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Select first project
    await page.click('.project-card:first-child');
    await expect(page.locator('#page-sessions')).toHaveClass(/active/);
    
    // 2. Go back to projects
    await page.click('.nav-link[data-page="projects"]');
    
    // 3. Select second project
    await page.click('.project-card:nth-child(2)');
    await expect(page.locator('#page-sessions')).toHaveClass(/active/);
    
    // 4. Check project name in footer
    const currentProject = page.locator('#currentProject');
    await expect(currentProject).toContainText('Another Project');
  });

  test('INT-04: Session with promise-based messaging', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Select project
    await page.click('.project-card:first-child');
    
    // 2. Open existing session
    await page.click('.session-item:first-child');
    
    // 3. Check messages are displayed
    const messages = page.locator('#sessionMessages .msg');
    await expect(messages).toHaveCount(2);
    
    // 4. Send a new message
    await page.fill('#messageInput', 'New test message');
    await page.click('#sendMessage');
    
    // 5. Input should be disabled (waiting for promise)
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
    
    // 6. Complete the promise
    await completePromise(page, 'promise-msg-test', {
      id: 'msg-server-new',
      role: 'server',
      content: 'Response from server'
    });
    
    // 7. Wait for polling
    await page.waitForTimeout(3000);
    
    // 8. Input should be enabled again
    await expect(messageInput).toBeEnabled();
  });

  test('INT-05: Project selection persists in localStorage', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: [],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Select first project
    await page.click('.project-card:first-child');
    
    // 2. Check localStorage
    const storedProject = await page.evaluate(() => localStorage.getItem('a2a_project'));
    expect(storedProject).toBe('proj-1');
    
    // 3. Reload page
    await page.reload();
    
    // 4. Check project is still selected
    const firstCard = page.locator('.project-card:first-child');
    await expect(firstCard).toHaveClass(/active/);
  });

  test('INT-06: Navigation state preserved across pages', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      files: mockApiResponses.files.files,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Select project (navigates to sessions)
    await page.click('.project-card:first-child');
    
    // 2. Navigate to Explorer
    await page.click('.nav-link[data-page="explorer"]');
    
    // 3. Navigate back to Sessions
    await page.click('.nav-link[data-page="sessions"]');
    
    // 4. Session should still be selected
    const sessionItems = page.locator('.session-item');
    await expect(sessionItems).toHaveCount(2);
  });

  test('INT-07: Error handling across pages', async ({ page }) => {
    // Setup failing API
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('/');
    
    // 1. Check disconnected status
    const statusDot = page.locator('#statusDot');
    await expect(statusDot).not.toHaveClass(/connected/);
    
    // 2. Check error on projects page
    const projectsError = page.locator('#projectsList .error');
    await expect(projectsError).toBeVisible();
    
    // 3. Navigate to sessions
    await page.click('.nav-link[data-page="sessions"]');
    
    // 4. Navigate to explorer
    await page.click('.nav-link[data-page="explorer"]');
    const filesError = page.locator('#fileTree .error');
    await expect(filesError).toBeVisible();
  });

  test('INT-08: Continue button workflow with promise', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Select project and session
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // 2. Click Continue (Делаем) button
    await page.click('#btnContinue');
    
    // 3. Input should be disabled
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
    
    // 4. Complete the promise
    await completePromise(page, 'promise-continue-test', {
      id: 'msg-continue-1',
      role: 'server',
      content: 'Continuing...'
    });
    
    // 5. Wait for polling
    await page.waitForTimeout(3000);
  });

  test('INT-09: File selection and chat workflow', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Navigate to Explorer
    await page.click('.nav-link[data-page="explorer"]');
    
    // 2. Select a file
    await page.click('.file-item:first-child');
    
    // 3. Check editor shows content
    const editorContent = page.locator('#editorContent');
    await expect(editorContent).not.toBeEmpty();
    
    // 4. Send chat message about the file
    await page.fill('#chatInput', 'Explain this file');
    await page.click('#sendChat');
    
    // 5. Check message appears
    const chatMessages = page.locator('#chatMessages .msg');
    await expect(chatMessages).toHaveCount(1);
  });

  test('INT-10: Full user journey - new user experience', async ({ page }) => {
    // Setup empty state
    await setupApiMocks(page, {
      projects: [],
      sessions: [],
      files: [],
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    
    // 1. Check empty state
    const emptyProjects = page.locator('#projectsList .empty');
    await expect(emptyProjects).toHaveText('No projects. Click + Add');
    
    // 2. Check connection status
    const statusText = page.locator('#statusText');
    await expect(statusText).toHaveText('Connected');
    
    // 3. Create first project
    await page.click('#addProject');
    await page.fill('#projectName', 'My First Project');
    await page.fill('#projectPath', '/home/user/my-project');
    await page.click('#saveProject');
    
    // 4. Navigate through all pages
    await page.click('.nav-link[data-page="sessions"]');
    await expect(page.locator('#page-sessions')).toHaveClass(/active/);
    
    await page.click('.nav-link[data-page="explorer"]');
    await expect(page.locator('#page-explorer')).toHaveClass(/active/);
    
    await page.click('.nav-link[data-page="projects"]');
    await expect(page.locator('#page-projects')).toHaveClass(/active/);
  });

  test('INT-11: Promise polling timeout handling', async ({ page }) => {
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
    await page.fill('#messageInput', 'Test timeout');
    await page.click('#sendMessage');
    
    // Input should be disabled
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeDisabled();
    
    // Wait for a while without completing promise
    await page.waitForTimeout(2000);
    
    // Input should still be disabled (promise still pending)
    await expect(messageInput).toBeDisabled();
  });

  test('INT-12: Multiple messages queue', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      sessions: mockApiResponses.sampleSessions.sessions,
      connected: true,
      usePromiseProtocol: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.session-item:first-child');
    
    // Send first message
    await page.fill('#messageInput', 'First message');
    await page.click('#sendMessage');
    
    // Input should be disabled - can't send second message
    await expect(page.locator('#messageInput')).toBeDisabled();
    await expect(page.locator('#sendMessage')).toBeDisabled();
    
    // Complete first promise
    await completePromise(page, 'promise-msg-test', {
      id: 'msg-server-1',
      role: 'server',
      content: 'Response 1'
    });
    
    // Wait for polling
    await page.waitForTimeout(3000);
    
    // Now can send second message
    await expect(page.locator('#messageInput')).toBeEnabled();
    await page.fill('#messageInput', 'Second message');
    await page.click('#sendMessage');
  });
});
