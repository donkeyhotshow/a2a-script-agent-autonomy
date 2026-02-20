import { test, expect } from '@playwright/test';
import { setupApiMocks, mockApiResponses } from '../fixtures/test-fixtures';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
  });

  test('NAV-01: Should load app and show Projects page by default', async ({ page }) => {
    await page.goto('/');
    
    // Check that Projects page is active
    const projectsPage = page.locator('#page-projects');
    await expect(projectsPage).toHaveClass(/active/);
    
    // Check that Projects nav link is active
    const projectsLink = page.locator('.nav-link[data-page="projects"]');
    await expect(projectsLink).toHaveClass(/active/);
  });

  test('NAV-02: Should navigate to Sessions page', async ({ page }) => {
    await page.goto('/');
    
    // Click Sessions link
    await page.click('.nav-link[data-page="sessions"]');
    
    // Check that Sessions page is active
    const sessionsPage = page.locator('#page-sessions');
    await expect(sessionsPage).toHaveClass(/active/);
    
    // Check that Sessions nav link is active
    const sessionsLink = page.locator('.nav-link[data-page="sessions"]');
    await expect(sessionsLink).toHaveClass(/active/);
    
    // Projects page should not be active
    const projectsPage = page.locator('#page-projects');
    await expect(projectsPage).not.toHaveClass(/active/);
  });

  test('NAV-03: Should navigate to Explorer page', async ({ page }) => {
    await page.goto('/');
    
    // Click Explorer link
    await page.click('.nav-link[data-page="explorer"]');
    
    // Check that Explorer page is active
    const explorerPage = page.locator('#page-explorer');
    await expect(explorerPage).toHaveClass(/active/);
    
    // Check that Explorer nav link is active
    const explorerLink = page.locator('.nav-link[data-page="explorer"]');
    await expect(explorerLink).toHaveClass(/active/);
  });

  test('NAV-04: Should update active nav link on navigation', async ({ page }) => {
    await page.goto('/');
    
    // Start on Projects
    let activeLink = await page.locator('.nav-link.active').getAttribute('data-page');
    expect(activeLink).toBe('projects');
    
    // Navigate to Sessions
    await page.click('.nav-link[data-page="sessions"]');
    activeLink = await page.locator('.nav-link.active').getAttribute('data-page');
    expect(activeLink).toBe('sessions');
    
    // Navigate to Explorer
    await page.click('.nav-link[data-page="explorer"]');
    activeLink = await page.locator('.nav-link.active').getAttribute('data-page');
    expect(activeLink).toBe('explorer');
    
    // Navigate back to Projects
    await page.click('.nav-link[data-page="projects"]');
    activeLink = await page.locator('.nav-link.active').getAttribute('data-page');
    expect(activeLink).toBe('projects');
  });

  test('NAV-05: Should display connection status', async ({ page }) => {
    await page.goto('/');
    
    // Check status dot is connected
    const statusDot = page.locator('#statusDot');
    await expect(statusDot).toHaveClass(/connected/);
    
    // Check status text
    const statusText = page.locator('#statusText');
    await expect(statusText).toHaveText('Connected');
  });

  test('NAV-06: Should display disconnected status when API is unavailable', async ({ page }) => {
    // Override mock to simulate disconnected state
    await page.route('**/api/status', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('/');
    
    // Check status dot is not connected
    const statusDot = page.locator('#statusDot');
    await expect(statusDot).not.toHaveClass(/connected/);
    
    // Check status text
    const statusText = page.locator('#statusText');
    await expect(statusText).toHaveText('Disconnected');
  });

  test('NAV-07: Should display logo and header elements', async ({ page }) => {
    await page.goto('/');
    
    // Check logo
    const logo = page.locator('.logo');
    await expect(logo).toHaveText('A2A');
    
    // Check header is visible
    const header = page.locator('.header');
    await expect(header).toBeVisible();
    
    // Check all nav links are present
    const navLinks = page.locator('.nav-link');
    await expect(navLinks).toHaveCount(3);
  });

  test('NAV-08: Should display footer elements', async ({ page }) => {
    await page.goto('/');
    
    // Check current project display
    const currentProject = page.locator('#currentProject');
    await expect(currentProject).toBeVisible();
    
    // Check index status
    const indexStatus = page.locator('#indexStatus');
    await expect(indexStatus).toBeVisible();
    
    // Check Build Index button
    const buildIndexBtn = page.locator('#buildIndex');
    await expect(buildIndexBtn).toBeVisible();
    await expect(buildIndexBtn).toHaveText('Build Index');
  });
});
