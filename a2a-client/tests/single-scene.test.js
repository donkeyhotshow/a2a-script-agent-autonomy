/**
 * Single Scene VueFlow UI Test
 * 
 * Tests that Single Scene UI with panels is properly initialized.
 * Run with: node a2a-client/tests/single-scene.test.js
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5173';

async function runTest() {
  console.log('Starting Single Scene UI Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const consoleLogs = [];
  const consoleErrors = [];
  
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push({ type, text });
    
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
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Page loaded!\n');
    
    // Wait for modules to load
    await page.waitForTimeout(3000);
    
    // Test 1: Check PanelManager
    console.log('=== Test 1: PanelManager ===');
    const panelManagerExists = await page.evaluate(() => typeof window.PanelManager !== 'undefined');
    console.log(`PanelManager exists: ${panelManagerExists}`);
    
    if (panelManagerExists) {
      const panels = await page.evaluate(() => window.PanelManager.getNodes());
      console.log(`Panels loaded: ${panels.length}`);
      console.log(`Panel data:`, panels.map(p => ({ id: p.id, type: p.data?.panelType })));
      
      // Test 2: Check default panels
      console.log('\n=== Test 2: Default Panels ===');
      const hasProjectPanel = await page.evaluate(() => {
        const pm = window.PanelManager;
        const project = pm.getPanelByType('project');
        return project !== null;
      });
      console.log(`Project panel exists: ${hasProjectPanel}`);
      
      // Test 3: Check available panel types
      console.log('\n=== Test 3: Available Panel Types ===');
      const panelTypes = await page.evaluate(() => window.PanelManager.getAvailablePanelTypes());
      console.log(`Available types:`, panelTypes.map(t => t.type));
      
      // Test 4: Check VueFlow integration
      console.log('\n=== Test 4: VueFlow Integration ===');
      const setFlowNodesExists = await page.evaluate(() => typeof window.setFlowNodes !== 'undefined');
      console.log(`setFlowNodes exists: ${setFlowNodesExists}`);
      
      const getFlowNodes = await page.evaluate(() => typeof window.getFlowNodes !== 'undefined');
      console.log(`getFlowNodes exists: ${getFlowNodes}`);
      
      // Test 5: Single Scene Full script
      console.log('\n=== Test 5: Single Scene Scripts ===');
      const singleSceneLogs = consoleLogs.filter(log => 
        log.text.includes('Single Scene') || log.text.includes('PanelManager')
      );
      console.log(`Single Scene related logs: ${singleSceneLogs.length}`);
      
      // Test 6: Canvas configuration
      console.log('\n=== Test 6: Canvas Configuration ===');
      const canvasWidth = await page.evaluate(() => {
        const el = document.getElementById('vueflow-graph');
        return el ? el.style.width : 'not found';
      });
      console.log(`Canvas width: ${canvasWidth}`);
      
      // Test 7: Console errors check
      console.log('\n=== Test 7: Error Check ===');
      console.log(`Total errors: ${consoleErrors.length}`);
      
      // Test Result
      console.log('\n=== RESULT ===');
      if (consoleErrors.length > 0) {
        console.log('✗ FAILED: Console errors detected');
        console.log('Errors:', consoleErrors);
        process.exitCode = 1;
      } else if (!panelManagerExists) {
        console.log('✗ FAILED: PanelManager not found');
        process.exitCode = 1;
      } else if (!hasProjectPanel) {
        console.log('✗ FAILED: Project panel not loaded');
        process.exitCode = 1;
      } else {
        console.log('✓ PASSED: Single Scene UI working!');
      }
      
    } else {
      console.log('✗ FAILED: PanelManager not found');
      process.exitCode = 1;
    }
    
    // Screenshot
    console.log('\n=== Screenshot ===');
    await page.screenshot({ path: 'a2a-client/tests/single-scene-screenshot.png', fullPage: true });
    console.log('Saved: single-scene-screenshot.png');
    
  } catch (error) {
    console.error('\n[TEST ERROR]', error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('\nDone.');
  }
}

runTest().catch(console.error);
