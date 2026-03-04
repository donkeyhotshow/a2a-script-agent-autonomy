#!/usr/bin/env node
/**
 * Simple demo runner that creates a session and listens to the local SSE stream.
 * Useful to verify that server responses make it into the SSE channel.
 */

import fetch from 'node-fetch';
import EventSource from 'eventsource';

const API_BASE = (process.env.A2A_CLIENT_API || 'http://localhost:3001/api').replace(/\/$/, '');

async function getFirstProject() {
    const res = await fetch(`${API_BASE}/projects`);
    const projects = await res.json();
    const projectId = Array.isArray(projects) && projects.length ? projects[0].id : undefined;
    if (!projectId) {
        throw new Error('No project found. Create one with the UI or POST /api/projects first.');
    }
    return projectId;
}

async function createSession(projectId, task) {
    const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, task, title: task }),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Creating session failed (${res.status}): ${errText}`);
    }
    return res.json();
}

function prettyEvent(eventName, data) {
    console.log(`[SSE][${eventName}]`, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

async function main() {
    console.log('API base:', API_BASE);

    const projectId = await getFirstProject();
    console.log('Using project:', projectId);

    const task = process.argv[2] || 'sse demo run';
    const sessionPayload = await createSession(projectId, task);
    const session = sessionPayload.session ?? sessionPayload;
    const sessionId = session?.id;

    if (!sessionId) {
        throw new Error('Session creation response did not include an id');
    }

    console.log('Created session', sessionId);

    const sseUrl = `${API_BASE}/sse/${sessionId}`;
    const sse = new EventSource(sseUrl);

    const handleEvent = (name) => (event) => {
        let payload = event.data;
        try {
            payload = JSON.parse(event.data || null);
        } catch (err) {
            // keep raw data
        }
        prettyEvent(name, payload);
    };

    sse.addEventListener('connected', handleEvent('connected'));
    sse.addEventListener('progress', handleEvent('progress'));
    sse.addEventListener('task_response', handleEvent('task_response'));
    sse.addEventListener('status', handleEvent('status'));
    sse.addEventListener('session_update', handleEvent('session_update'));
    sse.addEventListener('message', handleEvent('message'));
    sse.addEventListener('error', (event) => {
        console.error('[SSE][error]', event);
    });

    console.log('Listening to SSE stream at', sseUrl);

    const completePromise = new Promise((resolve) => {
        sse.addEventListener('complete', () => {
            console.log('[SSE][complete] closing listener');
            resolve();
        });
        setTimeout(() => {
            console.log('[SSE] timeout reached, closing listener');
            resolve();
        }, Number(process.env.SSE_DEMO_TIMEOUT_MS || 60000));
    });

    process.on('SIGINT', () => {
        console.log('\nInterrupted. Closing SSE stream.');
        sse.close();
        process.exit(0);
    });

    await completePromise;
    sse.close();
    console.log('SSE demo finished');
}

main().catch((err) => {
    console.error('SSE demo failed:', err);
    process.exit(1);
});
