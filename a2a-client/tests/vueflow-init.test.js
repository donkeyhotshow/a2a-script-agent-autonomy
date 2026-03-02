/**
 * VueFlow Initialization Test
 *
 * Tests that VueFlow elements are properly initialized on the page.
 * Run with: npx playwright test a2a-client/tests/vueflow-init.test.js
 * Or: node a2a-client/tests/vueflow-init.test.js
 */

const {chromium} = require('playwright');

const BASE_URL = 'http://localhost:5173';

async function runTest() {
    console.log('Starting VueFlow initialization test...\n');

    const browser = await chromium.launch({
        headless: false // Set to true for headless mode
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Collect console messages
    const consoleLogs = [];
    const consoleErrors = [];

    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        consoleLogs.push({type, text});

        if (type === 'error') {
            consoleErrors.push(text);
            console.log(`[CONSOLE ERROR] ${text}`);
        } else {
            console.log(`[CONSOLE ${type.toUpperCase()}] ${text}`);
        }
    });

    page.on('pageerror', error => {
        consoleErrors.push(error.message);
        console.log(`[PAGE ERROR] ${error.message}`);
    });

    try {
        console.log(`Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL, {waitUntil: 'networkidle', timeout: 30000});
        console.log('Page loaded successfully!\n');

        // Wait a bit for modules to load
        await page.waitForTimeout(3000);

        // Check 1: Check if VueFlow container exists
        console.log('=== Test 1: VueFlow Container ===');
        const flowContainer = await page.$('#flow-container');
        if (flowContainer) {
            console.log('✓ #flow-container found');
            const display = await flowContainer.evaluate(el => window.getComputedStyle(el).display);
            console.log(`  Display: ${display}`);
        } else {
            console.log('✗ #flow-container NOT FOUND');
        }

        // Check 2: Check if VueFlow graph container exists
        console.log('\n=== Test 2: VueFlow Graph Container ===');
        const vueflowGraph = await page.$('#vueflow-graph');
        if (vueflowGraph) {
            console.log('✓ #vueflow-graph found');
            const display = await vueflowGraph.evaluate(el => window.getComputedStyle(el).display);
            const width = await vueflowGraph.evaluate(el => window.getComputedStyle(el).width);
            const height = await vueflowGraph.evaluate(el => window.getComputedStyle(el).height);
            console.log(`  Display: ${display}, Width: ${width}, Height: ${height}`);
        } else {
            console.log('✗ #vueflow-graph NOT FOUND');
        }

        // Check 3: Check for VueFlow internal elements
        console.log('\n=== Test 3: VueFlow Internal Elements ===');
        const vueflowContainer = await page.$('.vue-flow__container');
        if (vueflowContainer) {
            console.log('✓ .vue-flow__container found (VueFlow initialized)');
        } else {
            console.log('✗ .vue-flow__container NOT FOUND (VueFlow may not be initialized)');
        }

        // Check 4: Check for nodes
        console.log('\n=== Test 4: VueFlow Nodes ===');
        const nodes = await page.$$('.vue-flow__node');
        console.log(`Found ${nodes.length} VueFlow nodes`);

        // Check 5: Check Sessions initialization
        console.log('\n=== Test 5: Sessions Object ===');
        const sessionsExists = await page.evaluate(() => typeof window.Sessions !== 'undefined');
        console.log(`window.Sessions exists: ${sessionsExists}`);

        if (sessionsExists) {
            const sessionState = await page.evaluate(() => window.Sessions.state);
            console.log(`Sessions state:`, JSON.stringify(sessionState, null, 2));
        }

        // Check 6: Check VueFlow global functions
        console.log('\n=== Test 6: VueFlow Global Functions ===');
        const initFlowExists = await page.evaluate(() => typeof window.initFlow !== 'undefined');
        const loadContextExists = await page.evaluate(() => typeof window.loadContext !== 'undefined');
        console.log(`window.initFlow exists: ${initFlowExists}`);
        console.log(`window.loadContext exists: ${loadContextExists}`);

        // Check 7: Console logs summary
        console.log('\n=== Console Summary ===');
        console.log(`Total console messages: ${consoleLogs.length}`);
        console.log(`Total errors: ${consoleErrors.length}`);

        // Look for specific log messages
        const vueflowInitLog = consoleLogs.find(log =>
            log.text.includes('VueFlow initialized')
        );
        if (vueflowInitLog) {
            console.log(`✓ Found VueFlow initialization log: "${vueflowInitLog.text}"`);
        } else {
            console.log('✗ VueFlow initialization log NOT found');
        }

        // Take screenshot
        console.log('\n=== Taking Screenshot ===');
        await page.screenshot({path: 'a2a-client/tests/vueflow-screenshot.png', fullPage: true});
        console.log('Screenshot saved to: a2a-client/tests/vueflow-screenshot.png');

        // Final verdict
        console.log('\n=== FINAL RESULT ===');
        // 404 for CSS is not a critical error
        const criticalErrors = consoleErrors.filter(e => !e.includes('404'));
        if (criticalErrors.length > 0) {
            console.log('✗ FAILED: Critical console errors detected');
            process.exitCode = 1;
        } else if (!vueflowContainer) {
            console.log('✗ FAILED: VueFlow container not found');
            process.exitCode = 1;
        } else {
            console.log('✓ PASSED: VueFlow initialized successfully');
        }

    } catch (error) {
        console.error('\n[TEST ERROR]', error.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
        console.log('\nBrowser closed.');
    }
}

// Run the test
runTest().catch(console.error);
