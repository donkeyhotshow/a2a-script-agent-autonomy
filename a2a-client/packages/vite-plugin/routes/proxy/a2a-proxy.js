/**
 * A2A Server proxy - Handles polling/fetch to A2A server
 */

import { pollA2ARequestResult } from '../../daemon/a2a-result-poll.js';
import { getA2aServerBaseUrl } from '@a2a-client/shared/a2a-server-base.js';

const A2A_URL = getA2aServerBaseUrl();

export async function proxyToA2AServer(requestBody) {
    try {
        const response = await fetch(`${A2A_URL}/api/v1/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-skip-auth': 'true'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (!response.ok) {
            return {
                success: false,
                error: {
                    code: 'A2A_UPSTREAM_HTTP',
                    message: `A2A request failed: ${response.status}`,
                    status: response.status,
                },
            };
        }

        const proxiedPromiseId = data?.data?.promiseId;
        if (proxiedPromiseId) {
            const r = await pollA2ARequestResult(proxiedPromiseId, {
                baseUrl: A2A_URL,
                intervalMs: 1000,
                headers: { 'x-skip-auth': 'true' },
            });
            if (r.outcome === 'completed') return r.data;
            if (r.outcome === 'failed') {
                console.error('[Proxy] Promise failed:', r.data?.error);
                return {
                    success: false,
                    error: {
                        code: 'A2A_PROMISE_FAILED',
                        message: r.data?.error || 'A2A promise failed',
                    },
                };
            }
            return {
                success: false,
                error: {
                    code: 'A2A_PROMISE_TIMEOUT',
                    message: 'A2A promise did not complete in polling window',
                },
            };
        }

        return data.data || data;
    } catch (e) {
        console.error('[Proxy] A2A request failed:', e.message);
        return {
            success: false,
            error: {
                code: 'A2A_TRANSPORT_ERROR',
                message: e.message,
            },
        };
    }
}

