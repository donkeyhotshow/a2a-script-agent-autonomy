import {defineConfig, devices} from '@playwright/test';

/**
 * Playwright configuration for A2A Client E2E tests
 * Cross-browser stability matrix with Firefox/Safari support
 *
 * Stability Goals:
 * - Chrome + Firefox: <5% flakiness across all test suites
 * - WebKit/Safari: <10% flakiness (more lenient due to rendering differences)
 * - Mobile variants: <8% flakiness
 *
 * Environment Variables:
 * - REUSE_SERVER=true: Force server reuse even on CI
 * - FRESH_SERVER=true: Force fresh server even in development
 * - CROSS_BROWSER=true: Enable all browser matrix combinations
 *
 * @see https://playwright.dev/docs/test-configuration
 */

// Browser stability matrix configurations
const BROWSER_MATRIX = [
    // Desktop browsers - primary support
    {
        name: 'chromium-desktop',
        use: {
            ...devices['Desktop Chrome'],
            viewport: {width: 1280, height: 720}
        },
    },
    {
        name: 'chromium-mobile',
        use: {
            ...devices['Pixel 5'],
            viewport: {width: 393, height: 851}
        },
    },
    {
        name: 'firefox-desktop',
        use: {
            ...devices['Desktop Firefox'],
            viewport: {width: 1280, height: 720}
        },
    },
    {
        name: 'firefox-mobile',
        use: {
            ...devices['Pixel 5'],
            browserName: 'firefox',
            viewport: {width: 393, height: 851}
        },
    },
    // Safari support - expanded for better cross-platform coverage
    // On macOS: use native Safari
    // On other platforms: use WebKit (fallback simulation)
    {
        name: 'webkit-desktop',
        use: {
            ...(process.platform === 'darwin' ? devices['Desktop Safari'] : {
                browserName: 'webkit',
                viewport: {width: 1280, height: 720}
            }),
            viewport: {width: 1280, height: 720}
        },
    },
    {
        name: 'webkit-mobile',
        use: {
            ...(process.platform === 'darwin' ? devices['iPhone 12'] : {
                browserName: 'webkit',
                viewport: {width: 390, height: 844}
            }),
            viewport: {width: 390, height: 844}
        },
    }
];

// Locale configurations for i18n testing
const LOCALE_MATRIX = [
    { locale: 'en-US', timezoneId: 'America/New_York' },
    { locale: 'en-GB', timezoneId: 'Europe/London' },
    { locale: 'de-DE', timezoneId: 'Europe/Berlin' },
];

export default defineConfig({
    // Test directory
    testDir: './tests/e2e',

    // Run tests in parallel (reduced on CI for stability)
    fullyParallel: !process.env.CI,

    // Stabilized failure handling: adaptive maxFailures based on browser matrix
    // Allow more failures for cross-browser tests but cap at reasonable limit
    maxFailures: process.env.CI ? Math.min(BROWSER_MATRIX.length * 2, 10) : 5,

    // Fail build on CI if you accidentally left test.only in source code
    forbidOnly: !!process.env.CI,

    // Retry configuration: more retries for flaky cross-browser tests
    // Firefox and WebKit often need extra retries due to rendering differences
    retries: process.env.CI ? 3 : 1,

    // Worker configuration: reduce parallelism on CI for stability
    // Scale workers based on available browsers to maximize coverage efficiency
    workers: process.env.CI ? Math.min(BROWSER_MATRIX.length, 4) : undefined,

    // Enhanced reporter configuration
    reporter: [
        ['list'],
        ['html', { open: 'never' }],
        ...(process.env.CI ? [['junit', { outputFile: 'test-results.xml' }]] : []),
    ],

    // Shared settings for all tests
    use: {
        // Base URL for tests
        baseURL: 'http://localhost:5173',

        // Collect trace on retry for debugging
        trace: 'on-first-retry',

        // Screenshot on failure for visual debugging
        screenshot: 'only-on-failure',

        // Video on failure for CI debugging
        video: process.env.CI ? 'retain-on-failure' : 'off',

        // Action timeout: increased for cross-browser consistency
        actionTimeout: 15000,

        // Navigation timeout: increased for slower browsers
        navigationTimeout: 45000,

        expect: {
            timeout: 10000,
        },
    },

    // Cross-browser projects with stability matrix
    projects: BROWSER_MATRIX.map(browser => ({
        ...browser,
        // Add metadata for test filtering
        metadata: {
            browser: browser.name.split('-')[0],
            device: browser.name.split('-')[1],
        },
        // Test grouping for better parallelization
        testMatch: [
            '**/*.spec.ts',
            '**/*.test.ts',
        ],
        // Browser-specific overrides for cross-browser stability
        use: {
            ...browser.use,
            // Firefox needs longer timeouts due to slower rendering
            ...(browser.name.includes('firefox') && {
                actionTimeout: 25000,
                navigationTimeout: 75000,
                // Firefox-specific stability settings
                launchOptions: {
                    slowMo: process.env.CI ? 100 : 0, // Slow down on CI for stability
                },
            }),
            // WebKit (Safari) needs extra time for WebGL and complex rendering
            ...(browser.name.includes('webkit') && {
                actionTimeout: 30000,
                navigationTimeout: 90000,
                // WebKit-specific settings
                launchOptions: {
                    slowMo: process.env.CI ? 150 : 0,
                },
            }),
            // Mobile browsers need adjusted viewports and touch simulation
            ...(browser.name.includes('mobile') && {
                hasTouch: true,
                isMobile: true,
                // Mobile-specific timeouts
                actionTimeout: 20000,
                navigationTimeout: 60000,
            }),
        },
    })),

    // Enhanced web server configuration with cross-browser stability
    // Note: Using reuseExistingServer: true to connect to already running servers
    webServer: [
        {
            // Main Vite dev server
            command: 'npm run dev',
            cwd: '.',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 120000,
            // Enhanced health check for cross-browser stability
            healthCheck: {
                path: '/',
                timeout: 10000, // Increased for slower browsers
                interval: 3000, // More frequent checks
            },
            // Graceful shutdown for clean cross-browser transitions
            gracefulShutdown: {
                signal: 'SIGTERM',
                timeout: 30000,
            },
        },
        // Client API proxy server - disabled, using existing server
        // {
        //     command: 'npm run dev',
        //     cwd: './packages/sdk',
        //     url: 'http://localhost:3001',
        //     reuseExistingServer: true,
        //     timeout: 60000,
        // },
    ],

    // Global setup and teardown
    globalSetup: './tests/e2e/helpers/global-setup.ts',
    globalTeardown: './tests/e2e/helpers/global-teardown.ts',

    // Test configuration
    testConfig: {
        // Stability matrix metadata
        matrix: {
            browsers: BROWSER_MATRIX.map(b => b.name),
            locales: LOCALE_MATRIX.map(l => l.locale),
        },
    },
});
