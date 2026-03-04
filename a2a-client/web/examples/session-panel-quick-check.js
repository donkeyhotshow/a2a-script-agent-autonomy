const { chromium } = require('playwright');

const APP_URL = process.env.A2A_WEB_URL || 'http://127.0.0.1:5173/';
const HEADLESS = process.env.A2A_WEB_HEADLESS !== 'false';

const log = (...args) => console.log('[session-panel-quick-check]', ...args);

async function setupMockRoutes(page) {
    const project = { id: 'proj-demo', name: 'Playwright demo project' };
    const session = { id: 'session-demo', projectId: project.id, status: 'READY', messages: [] };
    const serverResponse = {
        context: {
            messages: [
                { role: 'assistant', content: 'Server replied: ready to help' }
            ],
            execution: {
                action: 'demo-action',
                step: 'initial',
                status: 'in_progress',
                progress: 12
            },
            version: '2.0'
        },
        execute: {
            action: 'demo-action',
            message: { content: 'Server action is running' },
            status: 'in_progress',
            progress: 12
        }
    };

    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        const method = route.request().method().toUpperCase();

        if (path === '/api/projects' && method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: [project] })
            });
            return;
        }

        if (path === '/api/sessions' && method === 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true, data: [session] })
            });
            return;
        }

        if (path === '/api/sessions' && method === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {
                        session,
                        serverResponse
                    }
                })
            });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: {} })
        });
    });

    await page.route('**/api/sse/**', async (route) => {
        await route.fulfill({
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache'
            },
            body: 'retry: 1000\\n\\n'
        });
    });

}

async function checkSessionViewModel(page) {
    const state = await page.evaluate(() => {
        const vm = window.SessionViewModel;
        if (!vm) return null;
        vm.reset('session-smoke', 'proj-demo');
        vm.pushMessage('Manual user note', 'user');
        return vm.getState();
    });
    log('SessionViewModel basic state', state?.messages?.length ? 'messages seeded' : 'no view model');
}

async function runTaskFlow(page) {
    log('Running TaskFlow...');
    await page.fill('#taskInputField', 'Playwright quick check');
    await page.click('#taskSendBtn');
    await page.waitForFunction(() => {
        const nodes = Array.from(document.querySelectorAll('.session-panel-message-body'));
        return nodes.some((node) => node.textContent?.includes('Server action is running'));
    }, { timeout: 15000 });
    const summary = await page.evaluate(() => {
        const vm = window.SessionViewModel;
        const lastMessage = vm?.messages?.slice(-1)[0];
        return {
            sessionId: vm?.sessionId,
            projectId: vm?.projectId,
            execute: vm?.execute,
            lastMessage: lastMessage?.content
        };
    });
    log('SessionViewModel after TaskFlow', summary);
}

async function simulateEvents(page) {
    log('Simulating SSE and error events...');
    await page.evaluate(() => {
        window.SSEClient?.emit('progress', { progress: 73 });
        window.SSEClient?.emit('message', { message: 'Live SSE notice', role: 'assistant' });
        window.ErrorHandler?.handleApiError(
            {
                status: 500,
                data: { error: { code: 'PLAYWRIGHT_MOCK', message: 'Mock server error' } }
            },
            { action: 'playwright-check' }
        );
    });
    await page.waitForFunction(() => {
        const vm = window.SessionViewModel;
        return vm?.messages?.some(msg => msg.content?.includes('Live SSE notice'));
    }, { timeout: 5000 });
    const tail = await page.evaluate(() => {
        const vm = window.SessionViewModel;
        const messages = vm?.messages?.slice(-3) || [];
        return messages.map((msg) => ({ role: msg.role, content: msg.content }));
    });
    log('Last messages after SSE/error', tail);
}

async function ensureSessionPanel(page) {
    log('Preparing session panel for quick review');
    await page.evaluate(() => {
        if (window.PlasticineWorkflow?.run) {
            window.PlasticineWorkflow.run(document.body, { types: ['sessions'] });
        }
    });
    await page.waitForSelector('.session-panel', { timeout: 3000 });
    log('Session panel rendered');
}

(async () => {
    const browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();
    try {
        await setupMockRoutes(page);
        await page.goto(APP_URL, { waitUntil: 'networkidle' });
        await page.waitForSelector('#taskSendBtn');
        await ensureSessionPanel(page);
        await checkSessionViewModel(page);
        await runTaskFlow(page);
        await simulateEvents(page);
        log('Playwright quick-check finished – review logs and session panel');
    } catch (err) {
        console.error('[session-panel-quick-check] failed', err);
        process.exitCode = 1;
    } finally {
        await page.close();
        await browser.close();
    }
})();
