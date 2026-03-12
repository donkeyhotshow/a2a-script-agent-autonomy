#!/usr/bin/env node

/**
 * Debug script - opens browser, clicks session and logs console messages
 */

const { chromium } = require('playwright');

async function main() {
    console.log('Starting debug session...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console messages
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (text.includes('[WindowState]') || text.includes('[WindowEvents]') || text.includes('[Render]') || text.includes('[SessionStore]') || text.includes('toggleSessionWindow') || text.includes('createSessionWindow')) {
            console.log(`[CONSOLE ${type}]: ${text}`);
        }
    });
    
    // Capture all errors
    page.on('pageerror', error => {
        console.error('[PAGE ERROR]:', error.message);
    });
    
    try {
        // Navigate to the app
        console.log('Navigating to http://localhost:5173...');
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
        console.log('Page loaded');
        
        // Wait for any async operations
        await page.waitForTimeout(2000);
        
        // Look for session buttons - they might be in a list
        // Let's find any element with session in data attributes or class
        const sessionButtons = await page.locator('[data-session-id], .session-button, .session-item, .session-list button').all();
        console.log(`Found ${sessionButtons.length} session buttons`);
        
        // Let's also try clicking on any element that might open a session
        // Look for elements with click handlers
        await page.evaluate(() => {
            // Try to find session-related clickable elements
            const buttons = document.querySelectorAll('button');
            buttons.forEach((btn, i) => {
                const text = btn.textContent?.trim() || '';
                const id = btn.id || '';
                const dataSession = btn.getAttribute('data-session-id') || '';
                console.log(`Button ${i}: "${text}" id="${id}" data-session="${dataSession}"`);
            });
        });
        
        // Try to click on first visible session-like element
        const clickableSession = await page.locator('button:visible, [role="button"]:visible').first();
        if (clickableSession) {
            console.log('Clicking first visible button...');
            await clickableSession.click();
            await page.waitForTimeout(3000);
        }
        
        // Now try calling WindowState directly
        console.log('Calling WindowState.createSessionWindow directly...');
        await page.evaluate(async () => {
            const sessionId = 'sess_1773327747655';
            if (window.WindowState && window.WindowState.createSessionWindow) {
                console.log('WindowState.createSessionWindow exists, calling...');
                try {
                    await window.WindowState.createSessionWindow(sessionId);
                    console.log('createSessionWindow completed');
                } catch (e) {
                    console.error('Error in createSessionWindow:', e.message);
                }
            } else {
                console.log('WindowState.createSessionWindow NOT FOUND');
                console.log('Available window globals:', Object.keys(window).filter(k => k.toLowerCase().includes('window') || k.toLowerCase().includes('session')));
            }
        });
        
        await page.waitForTimeout(3000);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);
