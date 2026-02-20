import { test, expect } from '@playwright/test';
import { setupApiMocks, mockApiResponses, Project } from '../fixtures/test-fixtures';

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      projects: [],
      connected: true
    });
  });

  test('PRJ-01: Should display empty state when no projects', async ({ page }) => {
    await page.goto('/');
    
    const emptyMessage = page.locator('#projectsList .empty');
    await expect(emptyMessage).toHaveText('No projects. Add project path with .a2a folder.');
  });

  test('PRJ-02: Should open Add Project modal', async ({ page }) => {
    await page.goto('/');
    
    await page.click('#addProject');
    
    const modal = page.locator('#addProjectModal');
    await expect(modal).toBeVisible();
    
    const modalTitle = page.locator('#addProjectModal .modal-header h3');
    await expect(modalTitle).toHaveText('Add Project');
    
    await expect(page.locator('#projectName')).toBeVisible();
    await expect(page.locator('#projectPath')).toBeVisible();
  });

  test('PRJ-03: Should close modal on Cancel', async ({ page }) => {
    await page.goto('/');
    
    // Open modal
    await page.click('#addProject');
    const modal = page.locator('#addProjectModal');
    await expect(modal).toBeVisible();
    
    // Click Cancel
    await page.click('#addProjectModal .modal-cancel');
    await expect(modal).not.toBeVisible();
  });

  test('PRJ-04: Should close modal on X button', async ({ page }) => {
    await page.goto('/');
    
    // Open modal
    await page.click('#addProject');
    const modal = page.locator('#addProjectModal');
    await expect(modal).toBeVisible();
    
    // Click X button
    await page.click('#addProjectModal .modal-close');
    await expect(modal).not.toBeVisible();
  });

  test('PRJ-05: Should close modal on backdrop click', async ({ page }) => {
    await page.goto('/');
    
    // Open modal
    await page.click('#addProject');
    const modal = page.locator('#addProjectModal');
    await expect(modal).toBeVisible();
    
    // Click on modal backdrop (outside dialog)
    await modal.click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible();
  });

  test('PRJ-06: Should validate required fields', async ({ page }) => {
    await page.goto('/');
    
    // Open modal
    await page.click('#addProject');
    
    // Try to save without filling fields
    await page.click('#saveProject');
    
    // Modal should still be visible (validation failed)
    const modal = page.locator('#addProjectModal');
    await expect(modal).toBeVisible();
  });

  test('PRJ-07: Should create new project', async ({ page }) => {
    await page.goto('/');
    
    await page.click('#addProject');
    
    await page.fill('#projectName', 'New Test Project');
    await page.fill('#projectPath', '/path/to/new/project');
    
    await page.click('#saveProject');
    
    // Modal should close
    const modal = page.locator('#addProjectModal');
    await expect(modal).not.toBeVisible();
  });

  test('PRJ-08: Should display project cards', async ({ page }) => {
    // Setup mock with projects
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
    
    await page.goto('/');
    
    // Wait for projects to load
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toHaveCount(2);
    
    // Check first project
    const firstCard = projectCards.first();
    await expect(firstCard.locator('.project-name')).toHaveText('Test Project');
    await expect(firstCard.locator('.project-path')).toHaveText('/test/project');
  });

  test('PRJ-09: Should select project and navigate to Sessions', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
    
    await page.goto('/');
    
    // Click on first project card (not on action buttons)
    await page.click('.project-card:first-child');
    
    // Should navigate to Sessions page
    const sessionsPage = page.locator('#page-sessions');
    await expect(sessionsPage).toHaveClass(/active/);
  });

  test('PRJ-10: Should trigger index build', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
    
    await page.goto('/');
    
    await page.click('#buildIndex');
    await page.waitForTimeout(100);
  });

  test('PRJ-11: Should remove project with confirmation', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
    
    await page.goto('/');
    
    // Setup dialog handler
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Remove this project?');
      dialog.accept();
    });
    
    // Click Remove button
    await page.click('.project-card:first-child [data-action="remove"]');
    
    // Wait for reload
    await page.waitForTimeout(100);
  });

  test('PRJ-12: Should display project name and path', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
    
    await page.goto('/');
    
    const firstCard = page.locator('.project-card:first-child');
    await expect(firstCard.locator('.project-name')).toContainText('Test Project');
    await expect(firstCard.locator('.project-path')).toContainText('/test/project');
  });

  test('PRJ-13: Should show loading state', async ({ page }) => {
    await setupApiMocks(page, { projects: [], connected: true });
    await page.route('**/api/a2a/projects', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: [] })
      });
    });
    
    await page.goto('/');
    
    const loading = page.locator('#projectsList .loading');
    await expect(loading).toBeVisible();
  });

  test('PRJ-14: Should show error state on API failure', async ({ page }) => {
    await setupApiMocks(page, { projects: [], connected: true });
    await page.route('**/api/a2a/projects', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.goto('/');
    
    const error = page.locator('#projectsList .error');
    await expect(error).toHaveText('Failed to load');
  });

  test('PRJ-15: Should highlight selected project', async ({ page }) => {
    await setupApiMocks(page, {
      projects: mockApiResponses.sampleProjects.data.projects,
      connected: true
    });
    
    await page.goto('/');
    
    // Click on first project
    await page.click('.project-card:first-child');
    
    // Navigate back to projects
    await page.click('.nav-link[data-page="projects"]');
    
    // First card should be active
    const firstCard = page.locator('.project-card:first-child');
    await expect(firstCard).toHaveClass(/active/);
  });
});
