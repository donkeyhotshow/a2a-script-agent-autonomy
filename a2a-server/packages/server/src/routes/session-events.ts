/**
 * Session Events Routes
 *
 * GET  /:id/events  — SSE stream of all agent events for a session (TASK 1)
 * POST /:id/stop    — Operator-requested stop, publishes OPERATOR_STOP (TASK 3)
 * GET  /:id/messages — Read session messages from on-disk storage (TASK 4)
 */

import {Router, Request, Response} from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {globalEventBus, type AgentEventType} from '../event-bus.js';
import {logger} from '../utils/logger.js';

const router = Router({mergeParams: true});

/** All event types for wildcard subscription over all sessions. */
const ALL_EVENT_TYPES: AgentEventType[] = [
    'FSM_TRANSITION',
    'ARTIFACT_WRITTEN',
    'REASONING_COMPLETE',
    'GOAL_UPDATED',
    'MEMORY_RECALLED',
    'DRIFT_DETECTED',
    'DECISION_MADE',
    'TOOL_RESULT',
    'SAFETY_INTERCEPT',
    'SESSION_ENDED',
    'OPERATOR_STOP',
];

/**
 * Root for on-disk session storage.
 * Override with SESSION_STORAGE_PATH env var; defaults to the sibling a2a-client storage directory.
 */
const SESSION_STORAGE_PATH: string =
    process.env['SESSION_STORAGE_PATH'] ??
    path.join(process.cwd(), '..', 'a2a-client', 'storage', 'sessions');

// ── TASK 1: SSE event stream ────────────────────────────────────────────────

/**
 * GET /:id/events
 * Opens an SSE stream for the given session.
 * - Immediately sends `{"type":"connected"}` and replays buffered events.
 * - Forwards future events whose session_id matches.
 * - Sends `:heartbeat` comments every 30 s to keep the connection alive.
 */
router.get('/:id/events', (req: Request, res: Response): void => {
    const sessionId = String(req.params['id'] ?? '');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const send = (data: unknown): void => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Confirm connection
    send({type: 'connected', session_id: sessionId, timestamp: Date.now()});

    // Replay buffered history for this session
    for (const evt of globalEventBus.replay(sessionId)) {
        send(evt);
    }

    // Subscribe to all future events and forward those matching this session
    const unsubscribers = ALL_EVENT_TYPES.map((type) =>
        globalEventBus.subscribe(type, (evt) => {
            if (evt.session_id === sessionId) send(evt);
        }),
    );

    // Heartbeat every 30 s
    const heartbeat = setInterval(() => {
        res.write(':heartbeat\n\n');
    }, 30_000);

    req.on('close', () => {
        clearInterval(heartbeat);
        for (const unsub of unsubscribers) unsub();
        logger.debug(`[session-events] SSE closed for session ${sessionId}`);
    });
});

// ── TASK 3: Operator stop ───────────────────────────────────────────────────

/**
 * POST /:id/stop
 * Publishes an OPERATOR_STOP event for the session so server-side agents can
 * react (e.g. OrchestratorKernel can abort mid-turn).
 */
router.post('/:id/stop', (req: Request, res: Response): void => {
    const sessionId = String(req.params['id'] ?? '');
    const body = req.body as {reason?: string} | undefined;
    const reason: string = typeof body?.reason === 'string' ? body.reason : 'user_requested';

    globalEventBus.publish({
        type: 'OPERATOR_STOP',
        session_id: sessionId,
        payload: {reason},
    });

    logger.info(`[session-events] OPERATOR_STOP for session ${sessionId}`, {reason});
    res.json({success: true, data: {session_id: sessionId, stopped: true, reason}});
});

// ── TASK 4: Read session messages ───────────────────────────────────────────

interface MessageEntry {
    role: string;
    content: unknown;
    step: number;
    source: string;
}

/**
 * GET /:id/messages
 * Reads all numeric step directories under SESSION_STORAGE_PATH/{sessionId}/,
 * extracts `execute.message` (agent) and the last role:'user' entry from
 * `context.messages` in each server-response.json, and returns them in order.
 */
router.get('/:id/messages', (req: Request, res: Response): void => {
    const sessionId = String(req.params['id'] ?? '');
    const sessionDir = path.join(SESSION_STORAGE_PATH, sessionId);

    if (!fs.existsSync(sessionDir)) {
        res.status(404).json({
            success: false,
            error: {code: 'SESSION_NOT_FOUND', message: `Session ${sessionId} not found`},
        });
        return;
    }

    let steps: number[];
    try {
        const entries = fs.readdirSync(sessionDir, {withFileTypes: true});
        steps = entries
            .filter((e) => e.isDirectory() && /^\d+$/.test(e.name))
            .map((e) => parseInt(e.name, 10))
            .sort((a, b) => a - b);
    } catch (err) {
        logger.error(`[session-events] Failed to list steps for session ${sessionId}`, err);
        res.status(500).json({
            success: false,
            error: {code: 'READ_ERROR', message: 'Failed to read session directory'},
        });
        return;
    }

    const messages: MessageEntry[] = [];

    for (const stepNum of steps) {
        const filePath = path.join(sessionDir, String(stepNum), 'server-response.json');
        if (!fs.existsSync(filePath)) continue;

        let serverResponse: Record<string, unknown>;
        try {
            serverResponse = JSON.parse(
                fs.readFileSync(filePath, 'utf-8'),
            ) as Record<string, unknown>;
        } catch {
            continue;
        }

        // Agent message from execute.message
        const execute = serverResponse['execute'] as Record<string, unknown> | undefined;
        if (typeof execute?.['message'] === 'string') {
            messages.push({
                role: 'agent',
                content: execute['message'],
                step: stepNum,
                source: 'execute.message',
            });
        }

        // Last user message from context.messages
        const context = serverResponse['context'] as Record<string, unknown> | undefined;
        const ctxMessages = context?.['messages'];
        if (Array.isArray(ctxMessages)) {
            const userMsg = [...ctxMessages]
                .reverse()
                .find(
                    (m): m is Record<string, unknown> =>
                        typeof m === 'object' &&
                        m !== null &&
                        (m as Record<string, unknown>)['role'] === 'user',
                );
            if (userMsg !== undefined) {
                messages.push({
                    role: 'user',
                    content: userMsg['content'],
                    step: stepNum,
                    source: 'context.messages',
                });
            }
        }
    }

    res.json({success: true, messages});
});

export default router;
