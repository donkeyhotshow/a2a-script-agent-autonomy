/**
 * Mock API Handler for E2E Tests
 * Intercepts network requests and returns fixture data
 */

import {fixtures} from './index.js';

/**
 * Creates a mock API handler for Playwright tests
 * Uses page.route() to intercept requests
 */
export function createMockApiHandler(page) {
    // Track pending requests for polling simulation
    const pendingRequests = new Map();

    // Session storage
    let sessions = [fixtures.session.data];
    let currentSessionId = 'session_001';

    // Request promise ID mapping
    const requestPromises = new Map();

    page.route('**/api/a2a/projects', async (route) => {
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                projects: [{id: 'proj-mock', name: 'Mock project', path: '/'}]
            })
        });
    });

    // Client API: /api/a2a/sessions (same shape as @a2a-client/vite-plugin)
    page.route('**/api/a2a/sessions**', async (route) => {
        const method = route.request().method();
        const pathname = new URL(route.request().url()).pathname;

        if (method === 'GET' && pathname === '/api/a2a/sessions') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({sessions})
            });
        }

        if (method === 'POST' && pathname === '/api/a2a/sessions') {
            const newSession = {
                ...fixtures.createSession.data,
                id: `session_${Date.now()}`,
                title: 'New Session',
                createdAt: new Date().toISOString(),
                messages: []
            };
            sessions.unshift(newSession);
            currentSessionId = newSession.id;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({success: true, session: newSession})
            });
        }

        return route.continue();
    });

    page.route(/\/api\/a2a\/sessions\/[^/]+$/, async (route) => {
        if (route.request().method() !== 'GET') {
            return route.continue();
        }
        const url = route.request().url();
        const sessionId = url.split('/').pop();
        const session = sessions.find(s => s.id === sessionId);

        if (session) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(session)
            });
        }

        return route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({error: 'Session not found'})
        });
    });

    // POST /api/v1/requests - create request
    page.route('**/api/v1/requests', async (route) => {
        if (route.request().method() === 'POST') {
            const body = JSON.parse(route.request().postData() || '{}');
            const promiseId = `promise_${Date.now()}`;

            // Store promise for polling
            requestPromises.set(promiseId, {
                context: body.context,
                status: 'completed',
                result: fixtures.taskRequest.data.result
            });

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({success: true, data: {promiseId}})
            });
        }
    });

    // GET /api/v1/requests/:promiseId/status - poll status
    page.route(/\/api\/v1\/requests\/[^/]+\/status$/, async (route) => {
        const url = route.request().url();
        const promiseId = url.split('/').slice(-2)[0];
        const request = requestPromises.get(promiseId);

        if (request) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {status: request.status}
                })
            });
        }

        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({success: true, data: {status: 'processing'}})
        });
    });

    // GET /api/v1/requests/:promiseId/result - get result
    page.route(/\/api\/v1\/requests\/[^/]+\/result$/, async (route) => {
        const url = route.request().url();
        const promiseId = url.split('/').slice(-2)[0];
        const request = requestPromises.get(promiseId);

        if (request) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    data: {result: request.result}
                })
            });
        }

        return route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({success: false, error: {message: 'Request not found'}})
        });
    });

    // Default API fallback
    page.route('**/api/**', async (route) => {
        console.log('[Mock API] Unhandled request:', route.request().url(), route.request().method());
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({success: true, data: {}})
        });
    });

    return {
        /**
         * Simulate a multi-step workflow response
         */
        simulateWorkflow: async (promiseId, steps) => {
            const results = {
                [promiseId]: {
                    status: 'completed',
                    result: steps[0]
                }
            };

            // For each subsequent step, create new promise
            for (let i = 1; i < steps.length; i++) {
                const stepPromiseId = `promise_${Date.now()}_${i}`;
                results[stepPromiseId] = {
                    status: 'completed',
                    result: steps[i]
                };
                requestPromises.set(stepPromiseId, results[stepPromiseId]);
            }

            return results;
        },

        /**
         * Get current sessions
         */
        getSessions: () => sessions,

        /**
         * Clear all sessions
         */
        clearSessions: () => {
            sessions = [];
            requestPromises.clear();
        },

        /**
         * Add a session
         */
        addSession: (session) => {
            sessions.unshift(session);
        }
    };
}

export default createMockApiHandler;
