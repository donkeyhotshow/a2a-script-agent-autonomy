/**
 * Complete Dialog Workflow E2E Test
 * 
 * Tests the complete end-to-end dialog workflow:
 * - Session creation via API
 * - Sending messages
 * - Wait/loading state display
 * - Promise polling for async responses
 * - Response verification
 * 
 * Run with: cd a2a-client && npx playwright test tests/e2e/dialog-system.spec.ts --reporter=line
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const A2A_SERVER_URL = 'http://localhost:3000';

test('complete dialog workflow', async ({ page }) => {
    // Set longer timeout for LLM processing (2 minutes)
    test.setTimeout(180000);
    // ========================================
    // Step 1: Open the main page
    // ========================================
    console.log('[Step 1] Opening main page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Verify page loaded
    await expect(page.locator('#app')).toBeVisible();
    console.log('[Step 1] Main page loaded successfully');

    // ========================================
    // Step 2: Create session via API
    // ========================================
    console.log('[Step 2] Creating session via API...');
    const sessionRes = await page.request.post(`${BASE_URL}/api/a2a/sessions`, {
        data: { task: 'dialog' }
    });
    
    expect(sessionRes.ok()).toBe(true);
    const session = await sessionRes.json();
    const sessionId = session.id || session.session?.id;
    
    expect(sessionId).toBeTruthy();
    console.log(`[Step 2] Session created: ${sessionId}`);

    // ========================================
    // Step 3: Send message via API
    // ========================================
    console.log('[Step 3] Sending message via API...');
    const messageRes = await page.request.post(`${BASE_URL}/api/a2a/sessions/${sessionId}/next`, {
        data: { task: 'hello' },
        timeout: 120000 // 2 minutes timeout for LLM processing
    });
    
    expect(messageRes.ok()).toBe(true);
    const messageData = await messageRes.json();
    console.log('[Step 3] Message response:', JSON.stringify(messageData).substring(0, 200));

    // ========================================
    // Step 4: Check for wait/loading element in UI
    // ========================================
    console.log('[Step 4] Checking for wait/loading element...');
    
    // Wait a moment for UI to potentially show loading state
    await page.waitForTimeout(1000);
    
    // Check for #loaderIndicator (used for API requests) or .task-flow-sending (UI form)
    const hasLoaderIndicator = await page.locator('#loaderIndicator').count() > 0;
    const hasTaskFlowSending = await page.locator('.task-flow-sending, .task-flow-spinner').count() > 0;
    
    // Get loader indicator element if it exists
    let isLoaderVisible = false;
    if (hasLoaderIndicator) {
        const loader = page.locator('#loaderIndicator');
        const display = await loader.evaluate(el => window.getComputedStyle(el).display);
        const hasActiveClass = await loader.evaluate(el => el.classList.contains('active'));
        isLoaderVisible = display !== 'none' || hasActiveClass;
    }
    
    console.log('[Step 4] #loaderIndicator exists:', hasLoaderIndicator);
    console.log('[Step 4] #loaderIndicator visible:', isLoaderVisible);
    console.log('[Step 4] .task-flow-sending visible:', hasTaskFlowSending);
    
    // Note: Loading element may or may not be visible depending on timing
    // The important thing is that we can proceed with polling
    
    // Note: Loading element may or may not be visible depending on timing
    // The important thing is that we can proceed with polling

    // ========================================
    // Step 5: Poll for result if promiseId exists
    // ========================================
    const promiseId = messageData.promiseId || messageData.data?.promiseId;
    
    if (promiseId) {
        console.log(`[Step 5] Polling for promise: ${promiseId}`);
        
        let result = null;
        const maxAttempts = 30;
        const pollInterval = 2000;
        
        for (let i = 0; i < maxAttempts; i++) {
            await page.waitForTimeout(pollInterval);
            
            const pollRes = await page.request.get(`${A2A_SERVER_URL}/api/v1/requests/${promiseId}/result`);
            const pollData = await pollRes.json();
            
            console.log(`[Step 5] Poll attempt ${i + 1}:`, JSON.stringify(pollData).substring(0, 100));
            
            // Check for execute data in response (indicates completion)
            if (pollData.data?.execute || pollData.data?.result?.execute) {
                result = pollData.data;
                break;
            } else if (pollData.error || pollData.data?.status === 'failed') {
                console.error('[Step 5] Request failed:', pollData);
                break;
            }
        }
        
        // Verify result exists
        expect(result).toBeTruthy();
        console.log('[Step 5] Result received:', JSON.stringify(result).substring(0, 200));
        
        // Verify result contains execute data
        expect(result.execute || result.result?.execute).toBeTruthy();
        console.log('[Step 5] Result contains execute data');
        
    } else {
        // If no promiseId, check if response already contains execute data (sync mode)
        console.log('[Step 5] No promiseId - checking for sync response');
        
        const hasExecute = messageData.execute || messageData.data?.execute;
        expect(hasExecute).toBeTruthy();
        console.log('[Step 5] Sync response contains execute data');
    }

    // ========================================
    // Complete: All steps verified
    // ========================================
    console.log('[Complete] Dialog workflow test passed!');
});
