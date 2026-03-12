/**
 * A2A Server proxy - Handles polling/fetch to A2A server
 */

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
            // Poll for async result
            return await pollPromise(data.data.promiseId);
        }

        return data.data || data;
    } catch (e) {
        console.error('[Proxy] A2A request failed:', e.message);
        return null;
    }
}

async function pollPromise(promiseId, maxPolls = 30) {
    for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 1000));
        try {
            const res = await fetch(`${A2A_URL}/api/v1/requests/${promiseId}/result`, {
                headers: { 'x-skip-auth': 'true' }
            });
            const data = await res.json();
            if (data.data?.status === 'completed') {
                return data.data;
            } else if (data.data?.status === 'failed') {
                console.error('[Proxy] Promise failed:', data.data.error);
                break;
            }
        } catch (e) {
            console.error('[Proxy] Poll failed:', e.message);
        }
    }
    return null;
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

