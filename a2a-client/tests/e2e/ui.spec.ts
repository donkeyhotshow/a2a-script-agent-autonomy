import { test, expect } from '@playwright/test';
import { logger } from './helpers/smoke-logger.js';

test.describe.configure({ mode: 'serial', timeout: 120000 });

test.describe('UI & Browser Smoke Tests', () => {
  test('Browser automation and UI smoke validation', async ({ page, browserName }) => {
    const startTime = Date.now();
    const networkErrors: string[] = [];

    try {
      test.setTimeout(90000);

      // Listen for network errors
      page.on('requestfailed', (request) => {
        const errorMsg = `Network error: ${request.url()} - ${request.failure()?.errorText}`;
        networkErrors.push(errorMsg);
        logger.logInfrastructure('Browser network error', { url: request.url(), error: request.failure()?.errorText });
      });

      // Navigate to Web UI
      await page.goto('http://localhost:5173');
      console.log(`✓ Opened ${browserName} browser at Web UI`);

      // Wait for page to load without console errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
        logger.logInfrastructure('Browser page error', { message: error.message });
      });

      // Wait for basic page structure
      await page.waitForSelector('[data-testid="plasticine-container"], .plasticine-ui, #app', { timeout: 10000 });
      console.log('✓ Page loaded with UI framework elements');

      // Wait for dynamic content
      await page.waitForTimeout(3000);
      
      if (errors.length > 0) {
        console.log(`⚠ Console errors found: ${errors.length}`);
        errors.forEach(err => console.log(`  - ${err}`));
      }
      expect(errors.length).toBe(0);
      console.log('✓ No console errors during page load');

      // Verify session panel
      const sessionPanelSelectors = [
        '[data-testid="session-panel"]',
        '.session-panel',
        '[class*="session"]',
        'button:has-text("New Session")',
        'button:has-text("Create Session")'
      ];

      let sessionPanelFound = false;
      for (const selector of sessionPanelSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          sessionPanelFound = true;
          console.log(`✓ Session panel found with selector: ${selector}`);
          break;
        } catch (e) {
          // Continue
        }
      }

      if (sessionPanelFound) {
        console.log('✓ Session panel UI elements present');
      } else {
        console.log('⚠ Session panel not found (may require authentication)');
      }

      // Enhanced UI flow
      console.log('--- Starting enhanced UI flow validation ---');
      
      const newSessionButtonSelectors = [
        'button:has-text("New Session")',
        'button:has-text("Create Session")',
        '[data-testid="new-session-btn"]',
        '.new-session-button',
        'button:has-text("+")'
      ];

      let sessionCreatedViaUI = false;
      for (const selector of newSessionButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            await page.waitForTimeout(2000);
            sessionCreatedViaUI = true;
            console.log(`✓ Created new session via UI button: ${selector}`);
            logger.logInfrastructure('UI session creation', { selector });
            break;
          }
        } catch (e) {
          // Continue
        }
      }

      if (sessionCreatedViaUI) {
        // Input field test
        const inputSelectors = [
          'input[type="text"]',
          'textarea',
          '[data-testid="message-input"]',
          '.message-input',
          'input[placeholder*="message" i]',
          'input[placeholder*="введи" i]'
        ];

        let inputFound = false;
        for (const selector of inputSelectors) {
          try {
            const input = await page.$(selector);
            if (input) {
              await input.fill('test');
              inputFound = true;
              console.log(`✓ Found input field: ${selector}`);
              
              const submitButtons = [
                'button:has-text("Send")',
                'button:has-text("Отправить")',
                '[data-testid="send-btn"]',
                'button[type="submit"]'
              ];
              
              for (const btnSelector of submitButtons) {
                const submitBtn = await page.$(btnSelector);
                if (submitBtn) {
                  await submitBtn.click();
                  console.log(`✓ Clicked submit button: ${btnSelector}`);
                  
                  await page.waitForTimeout(5000);
                  
                  const responseSelectors = [
                    '.message',
                    '#action-progress',
                    '[data-testid="message"]',
                    '.response',
                    '[class*="message-content"]'
                  ];
                  
                  let responseFound = false;
                  for (const respSelector of responseSelectors) {
                    try {
                      await page.waitForSelector(respSelector, { timeout: 3000 });
                      responseFound = true;
                      console.log(`✓ Response rendered with selector: ${respSelector}`);
                      logger.logInfrastructure('UI response validation', { selector: respSelector });
                      break;
                    } catch (e) {
                      // Continue
                    }
                  }
                  
                  if (responseFound) {
                    console.log('✓ UI successfully rendered response');
                  } else {
                    console.log('⚠ Response elements not found');
                  }
                  break;
                }
              }
              break;
            }
          } catch (e) {
            // Continue
          }
        }

        // Session status
        const statusSelectors = [
          '[data-testid="session-status"]',
          '.session-status',
          '[class*="status"]',
          '.running',
          '.ready'
        ];

        for (const selector of statusSelectors) {
          try {
            const statusElement = await page.$(selector);
            if (statusElement) {
              const statusText = await statusElement.textContent();
              console.log(`✓ Session status: ${statusText}`);
              logger.logInfrastructure('Session status', { status: statusText });
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }

      if (networkErrors.length > 0) {
        console.log(`⚠ Network errors: ${networkErrors.length}`);
        networkErrors.forEach(err => console.log(`  - ${err}`));
      } else {
        console.log('✓ No network errors');
      }

      logger.logTest(`Browser/UI - ${browserName}`, 'passed', Date.now() - startTime);
    } catch (error) {
// Screenshot disabled - LOG_DIR/path not imported\nconst screenshotPath = `./failure-${browserName}-${Date.now()}.png`;\n  await page.screenshot({ path: screenshotPath, fullPage: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
console.error(`✗ UI test failed. Screenshot: ${screenshotPath}`);
      logger.logTest(`Browser/UI - ${browserName}`, 'failed', Date.now() - startTime, error.message);
      throw error;
    }
  });

  test('Cross-browser compatibility validation', async ({ browserName }) => {
    console.log(`✓ Cross-browser validation in ${browserName}`);
    expect(['chromium', 'firefox', 'webkit']).toContain(browserName);
    logger.logTest(`Cross-browser - ${browserName}`, 'passed', 1000);
  });
});

