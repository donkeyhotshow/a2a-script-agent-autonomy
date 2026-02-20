import { test, expect } from '@playwright/test';
import { setupApiMocks, mockApiResponses } from '../fixtures/test-fixtures';

test.describe('Explorer Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: [],
      connected: true
    });
  });

  test('EXP-01: Should show empty state without files', async ({ page }) => {
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    const emptyMessage = page.locator('#fileTree .empty');
    await expect(emptyMessage).toHaveText('No index. Run indexer on project.');
  });

  test('EXP-02: Should display file tree', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    const fileItems = page.locator('.file-item');
    await expect(fileItems).toHaveCount(5);
  });

  test('EXP-03: Should open file in editor', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    await page.click('.file-item:first-child');
    
    // Check editor header shows file path
    const editorHeader = page.locator('#editorHeader');
    await expect(editorHeader).not.toBeEmpty();
    
    // Check editor content is shown
    const editorContent = page.locator('#editorContent');
    await expect(editorContent).toBeVisible();
  });

  test('EXP-04: Should highlight selected file', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Click on first file
    await page.click('.file-item:first-child');
    
    // Check it's active
    const firstFile = page.locator('.file-item:first-child');
    await expect(firstFile).toHaveClass(/active/);
  });

  test('EXP-05: Should refresh file tree', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Click refresh button
    await page.click('#refreshFiles');
    
    // Wait for reload
    await page.waitForTimeout(100);
  });

  test('EXP-06: Should send chat message', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Type chat message
    await page.fill('#chatInput', 'Test chat message');
    
    // Send
    await page.click('#sendChat');
    
    // Input should be cleared
    const inputValue = await page.inputValue('#chatInput');
    expect(inputValue).toBe('');
  });

  test('EXP-07: Should send chat on Enter', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Type chat message and press Enter
    await page.fill('#chatInput', 'Test chat with Enter');
    await page.press('#chatInput', 'Enter');
    
    // Input should be cleared
    const inputValue = await page.inputValue('#chatInput');
    expect(inputValue).toBe('');
  });

  test('EXP-08: Should display chat messages', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Send a message
    await page.fill('#chatInput', 'Hello from test');
    await page.click('#sendChat');
    
    // Check message appears in chat
    const chatMessages = page.locator('#chatMessages .msg');
    await expect(chatMessages).toHaveCount(1);
    
    // Check message content
    const lastMsg = chatMessages.last();
    await expect(lastMsg.locator('.msg-content')).toHaveText('Hello from test');
  });

  test('EXP-09: Should show placeholder when no file selected', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Check placeholder is shown
    const placeholder = page.locator('#editorContent .placeholder');
    await expect(placeholder).toHaveText('Select a file');
  });

  test('EXP-10: Should show loading state', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: [],
      connected: true
    });
    await page.route('**/api/a2a/projects/*/data', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ index: { files: [] }, files: [] })
      });
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Should show loading initially
    const loading = page.locator('#fileTree .loading');
    await expect(loading).toBeVisible();
  });

  test('EXP-11: Should show error state on API failure', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: [],
      connected: true
    });
    await page.route('**/api/a2a/projects/*/data', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Should show error
    const error = page.locator('#fileTree .error');
    await expect(error).toHaveText('Failed');
  });

  test('EXP-12: Should not send empty chat message', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Try to send empty message
    await page.click('#sendChat');
    
    // No message should be added
    const chatMessages = page.locator('#chatMessages .msg');
    await expect(chatMessages).toHaveCount(0);
  });

  test('EXP-13: Should display file names correctly', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Check file names are displayed (just the filename, not full path)
    const firstFile = page.locator('.file-item:first-child');
    await expect(firstFile).toContainText('index.js');
  });

  test('EXP-14: Should show file icon', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: mockApiResponses.files.files,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    // Check file icon is present
    const firstFile = page.locator('.file-item:first-child');
    const text = await firstFile.textContent();
    expect(text).toContain('📄');
  });

  test('EXP-15: Should limit file display to 300 files', async ({ page }) => {
    const manyFiles = Array.from({ length: 350 }, (_, i) => `file${i}.js`);
    
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      files: manyFiles,
      connected: true
    });
    
    await page.goto('/');
    await page.click('.project-card:first-child');
    await page.click('.nav-link[data-page="explorer"]');
    
    const fileItems = page.locator('.file-item');
    const count = await fileItems.count();
    expect(count).toBe(300);
  });
});
