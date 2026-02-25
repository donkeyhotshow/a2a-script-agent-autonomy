/**
 * Complete Workflow E2E Tests
 * Tests the full A2A workflow: task request -> action proposal -> execution -> completion
 */

import { test, expect, type Page } from '@playwright/test';
import { fixtures } from './fixtures/index.js';

test.describe('Complete Workflow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up mock API handlers
    await setupMockApi(page);
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete full workflow: task -> proposal -> execution -> complete', async ({ page }) => {
    // Step 1: User enters task in input
    const messageInput = page.locator('#messageInput');
    await expect(messageInput).toBeVisible();
    
    await messageInput.fill('исправить импорты в vue компонентах');
    
    // Click send button
    await page.click('#sendMessage');
    
    // Step 2: Check that session was created and message appears
    const sessionMessages = page.locator('#sessionMessages');
    await expect(sessionMessages).toBeVisible();
    
    // Should have user message
    const userMessage = sessionMessages.locator('.msg.user');
    await expect(userMessage).toContainText('исправить импорты в vue компонентах');
    
    // Step 3: Wait for server response (proposal)
    // The mock API should return action_proposal
    await page.waitForTimeout(1000);
    
    // Should show server response with proposal
    const serverMessage = sessionMessages.locator('.msg.server');
    await expect(serverMessage.first()).toBeVisible({ timeout: 5000 });
    
    // Step 4: Verify action proposal is displayed
    // Check for action proposal in the response
    const proposalText = await serverMessage.first().locator('.msg-content').textContent();
    expect(proposalText).toContain('action_proposal');
    
    // Step 5: User clicks "Делаем" (Continue) to approve action
    const btnContinue = page.locator('#btnContinue');
    await expect(btnContinue).toBeVisible();
    await btnContinue.click();
    
    // Step 6: Wait for action execution
    await page.waitForTimeout(1500);
    
    // Step 7: Check action progress panel appears
    const actionProgress = page.locator('#action-progress');
    await expect(actionProgress).toBeVisible();
    
    // Step 8: Verify action steps are displayed
    const actionSteps = actionProgress.locator('.action-step');
    await expect(actionSteps.first()).toBeVisible();
    
    // Step 9: Wait for action completion
    await page.waitForTimeout(2000);
    
    // Step 10: Verify completion
    const completedMessage = sessionMessages.locator('.msg.server');
    const lastMessage = completedMessage.last();
    const content = await lastMessage.locator('.msg-content').textContent();
    expect(content).toContain('completed');
  });

  test('should handle action_proposal outcome correctly', async ({ page }) => {
    // Set up mock to return action_proposal
    await page.route('**/api/v1/requests', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixtures.taskRequest)
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Send message
    await page.fill('#messageInput', 'проанализировать проект');
    await page.click('#sendMessage');
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Check for proposal display
    const serverMessage = page.locator('#sessionMessages .msg.server').first();
    await expect(serverMessage).toBeVisible();
    
    // Should show action proposal with subActions
    const content = await serverMessage.locator('.msg-content').textContent();
    expect(content).toContain('action_proposal');
  });

  test('should handle action_executing outcome correctly', async ({ page }) => {
    // Set up mock to return action_executing
    await page.route('**/api/v1/requests', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixtures.actionExecuting)
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Send message
    await page.fill('#messageInput', 'выполнить действие');
    await page.click('#sendMessage');
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Action progress panel should be visible
    const actionProgress = page.locator('#action-progress');
    await expect(actionProgress).toBeVisible();
    
    // Should show running step
    const runningStep = actionProgress.locator('.action-step.running');
    await expect(runningStep).toBeVisible();
  });

  test('should handle action_complete outcome correctly', async ({ page }) => {
    // Set up mock to return action_complete
    await page.route('**/api/v1/requests', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixtures.actionComplete)
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Send message
    await page.fill('#messageInput', 'завершить действие');
    await page.click('#sendMessage');
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Check for completed message
    const serverMessage = page.locator('#sessionMessages .msg.server').first();
    await expect(serverMessage).toBeVisible();
    
    // Should show completion
    const content = await serverMessage.locator('.msg-content').textContent();
    expect(content).toContain('completed');
    
    // Progress bar should show completed state
    const progressBar = page.locator('#action-progress-bar');
    await expect(progressBar).toHaveClass(/completed/);
  });

  test('should handle graph_incomplete outcome correctly', async ({ page }) => {
    // Set up mock to return graph_incomplete
    await page.route('**/api/v1/requests', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fixtures.graphIncomplete)
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Send message
    await page.fill('#messageInput', 'анализ проекта');
    await page.click('#sendMessage');
    
    // Wait for response
    await page.waitForTimeout(1000);
    
    // Check for incomplete card
    const incompleteCard = page.locator('.result-card.incomplete');
    await expect(incompleteCard).toBeVisible();
    
    // Should show questions
    const questions = incompleteCard.locator('.result-questions');
    await expect(questions).toBeVisible();
  });
});

/**
 * Set up mock API handlers for testing
 */
async function setupMockApi(page: Page) {
  let requestCounter = 0;
  const requestResults = new Map();

  // Mock sessions list
  await page.route('**/api/v1/sessions**', async (route) => {
    const method = route.request().method();
    
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtures.sessions)
      });
    }
    
    if (method === 'POST') {
      const newSession = {
        ...fixtures.createSession.data,
        id: `session_${Date.now()}`,
        createdAt: new Date().toISOString(),
        messages: []
      };
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newSession })
      });
    }
  });

  // Mock single session
  await page.route(/\/api\/v1\/sessions\/[^/]+$/, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtures.session)
    });
  });

  // Mock create request - returns taskRequest (action_proposal)
  await page.route('**/api/v1/requests', async (route) => {
    if (route.request().method() === 'POST') {
      requestCounter++;
      const promiseId = `promise_${Date.now()}`;
      
      // Store result based on request counter
      let result = fixtures.taskRequest.data.result;
      
      if (requestCounter === 2) {
        result = fixtures.actionExecuting.data.result;
      } else if (requestCounter === 3) {
        result = fixtures.stepResult.data.result;
      } else if (requestCounter >= 4) {
        result = fixtures.actionComplete.data.result;
      }
      
      requestResults.set(promiseId, result);
      
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { promiseId } })
      });
    }
  });

  // Mock request status
  await page.route(/\/api\/v1\/requests\/[^/]+\/status$/, async (route) => {
    const url = route.request().url();
    const promiseId = url.split('/').slice(-2)[0];
    
    if (requestResults.has(promiseId)) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { status: 'completed' } })
      });
    }
    
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { status: 'processing' } })
    });
  });

  // Mock request result
  await page.route(/\/api\/v1\/requests\/[^/]+\/result$/, async (route) => {
    const url = route.request().url();
    const promiseId = url.split('/').slice(-2)[0];
    const result = requestResults.get(promiseId);
    
    if (result) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { result } })
      });
    }
    
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { result: fixtures.taskRequest.data.result } })
    });
  });
}
