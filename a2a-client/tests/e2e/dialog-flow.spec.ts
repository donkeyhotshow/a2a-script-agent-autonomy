import { test, expect } from '@playwright/test';

test.describe('Dialog Flow E2E Test', () => {
    const consoleErrors: string[] = [];

    test.beforeEach(async ({ page }) => {
        // Reset console errors for each test
        consoleErrors.length = 0;
        const baseUrl = 'http://localhost:5173';

        // Listen for console errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navigate to the page
        await page.goto(baseUrl);
        await page.waitForLoadState('networkidle');
    });

    test('main page loads without crash', async ({ page }) => {
        // 1. Verify main page loads
        await expect(page.locator('#app')).toBeVisible();
        
        // 2. Check page has content
        const body = await page.locator('body').textContent();
        expect(body).toContain('A2A');

        // 3. Check no critical console errors
        const criticalErrors = consoleErrors.filter(err => 
            !err.includes('favicon') && 
            !err.includes('net::ERR') &&
            !err.includes('Failed to load')
        );
        expect(criticalErrors).toHaveLength(0);
    });

    test('API projects endpoint returns data', async ({ page }) => {
        // Test projects API - returns { projects: [...] }
        const baseUrl = 'http://localhost:5173';
        const projectsResponse = await page.request.get(baseUrl + '/api/a2a/projects');
        expect(projectsResponse.ok()).toBe(true);
        const projectsData = await projectsResponse.json();
        expect(projectsData.projects).toBeDefined();
        expect(Array.isArray(projectsData.projects)).toBe(true);
    });

    test('API sessions endpoint returns data', async ({ page }) => {
        // Test sessions API - returns { sessions: [...] }
        const baseUrl = 'http://localhost:5173';
        const sessionsResponse = await page.request.get(baseUrl + '/api/a2a/sessions');
        expect(sessionsResponse.ok()).toBe(true);
        const sessionsData = await sessionsResponse.json();
        expect(sessionsData.sessions).toBeDefined();
        expect(Array.isArray(sessionsData.sessions)).toBe(true);
    });

    test('can create session via API', async ({ page }) => {
        // Create session via API
        const baseUrl = 'http://localhost:5173';
        const response = await page.request.post(baseUrl + '/api/a2a/sessions', {
            data: { projectId: 'test' }
        });
        
        expect(response.ok()).toBe(true);
        const sessionData = await response.json();
        expect(sessionData.success).toBe(true);
        expect(sessionData.session).toBeDefined();
        expect(sessionData.session.id).toBeDefined();
    });

    test('session returns with execute data', async ({ page }) => {
        // Create session and check it returns execute data
        const baseUrl = 'http://localhost:5173';
        const response = await page.request.post(baseUrl + '/api/a2a/sessions', {
            data: { projectId: 'test' }
        });
        
        const sessionData = await response.json();
        expect(sessionData.success).toBe(true);
        
        // Session should have execute data with form
        const execute = sessionData.session?.execute;
        expect(execute).toBeDefined();
        expect(execute.form).toBeDefined();
    });

    test('page renders without console errors', async ({ page }) => {
        // Wait for any async operations
        await page.waitForTimeout(2000);

        // Check for console errors
        const criticalErrors = consoleErrors.filter(err => 
            !err.includes('favicon') && 
            !err.includes('net::ERR') &&
            !err.includes('Failed to load') &&
            !err.includes('404')
        );
        
        // Log any errors found for debugging
        if (criticalErrors.length > 0) {
            console.log('Console errors found:', criticalErrors);
        }
        
        expect(criticalErrors).toHaveLength(0);
    });
});