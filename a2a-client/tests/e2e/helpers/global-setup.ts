import { chromium, firefox, webkit } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Ensures services are running and database is ready
 */
async function globalSetup() {
  console.log('🚀 Starting A2A E2E test environment...');

  // Verify services are running
  const services = [
    { name: 'Vite Dev Server', url: 'http://localhost:5173', timeout: 5000 },
    { name: 'Client API', url: 'http://localhost:3001/health', timeout: 10000 },
    { name: 'A2A Server', url: 'http://localhost:3000/health', timeout: 15000 },
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), service.timeout);

      const response = await fetch(service.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Playwright-E2E-Test' }
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status >= 500) {
        throw new Error(`Service returned ${response.status}`);
      }

      console.log(`✓ ${service.name} ready`);
    } catch (error) {
      console.error(`✗ ${service.name} not ready:`, error.message);
      throw new Error(`${service.name} failed health check`);
    }
  }

  // Pre-warm browsers for faster test execution
  console.log('🔥 Pre-warming browsers...');

  const browsers = [
    { name: 'Chromium', launch: chromium },
    { name: 'Firefox', launch: firefox },
    // Safari only on macOS
    ...(process.platform === 'darwin' ? [{ name: 'WebKit', launch: webkit }] : []),
  ];

  for (const browser of browsers) {
    try {
      const instance = await browser.launch();
      await instance.newPage();
      await instance.close();
      console.log(`✓ ${browser.name} pre-warmed`);
    } catch (error) {
      console.warn(`⚠ ${browser.name} pre-warm failed:`, error.message);
    }
  }

  console.log('✅ E2E test environment ready');
}

export default globalSetup;