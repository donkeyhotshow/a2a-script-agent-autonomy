/**
 * A2A Server proxy - Handles polling/fetch to A2A server
 */

import { pollA2ARequestResult } from '../../daemon/a2a-result-poll.js';

const A2A_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';

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

        if (data.data?.promiseId) {
            const r = await pollA2ARequestResult(data.data.promiseId, {
                baseUrl: A2A_URL,
                maxPolls: 30,
                intervalMs: 1000,
                headers: { 'x-skip-auth': 'true' },
            });
            if (r.outcome === 'completed') return r.data;
            if (r.outcome === 'failed') {
                console.error('[Proxy] Promise failed:', r.data?.error);
            }
            return null;
        }

        return data.data || data;
    } catch (e) {
        console.error('[Proxy] A2A request failed:', e.message);
        return null;
    }
}

export function useXHRProxy(requestOptions) {
    const xhr = require('http');
    return new Promise((resolve, reject) => {
        const req = xhr.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

