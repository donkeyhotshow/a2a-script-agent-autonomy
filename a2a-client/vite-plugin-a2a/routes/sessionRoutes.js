import { listSessions, loadSession, saveSession, deleteSession, getProjectPathForSessions } from '../storage/projectSessions.js';
import {
    listNewSessions,
    loadNewSession,
    saveNewSession,
    deleteNewSession,
    saveNewStep,
} from '../storage/newSessions.js';
import { getStorageMode, isValidSessionId } from '../utils/server.js';
import {
    collectSessionMessagesFlat,
    attachPromiseMeta,
    toPublicSession,
} from './utils/web-session-dto.js';

const API_PREFIX = '/api/a2a';

export function createSessionRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(`${API_PREFIX}/sessions`)) {
            return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(API_PREFIX.length);
        const storageMode = getStorageMode(req);

        if (req.method === 'GET' && p === '/sessions') {
            const sessions = storageMode === 'project'
                ? listSessions(getProjectPathForSessions(cwd))
                : listNewSessions(cwd);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ sessions }));
            return;
        }

        if (req.method === 'POST' && p === '/sessions') {
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', () => {
                try {
                    if (!body || body.trim() === '') {
                        throw new Error('Empty request body');
                    }
                    const d = JSON.parse(body);
                    const title = d.title || 'New Session';
                    const sessionId = d.id || `sess_${Date.now()}`;
                    const session = {
                        id: sessionId,
                        title,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        status: 'created',
                        currentStep: 1,
                        messages: [
                            {
                                role: 'assistant',
                                content: 'What would you like me to do?',
                                step: 1
                            }
                        ],
                        context: { execution: { action: 'task', step: 'new' } },
                        // Initial execute until user submits; after POST /next use GET /sessions/:id (ack-only /next)
                        execute: {
                            message: 'What would you like me to do?',
                            form: {
                                input: [
                                    {
                                        name: 'task',
                                        type: 'text',
                                        label: 'Enter your task',
                                        required: true
                                    }
                                ]
                            }
                        }
                    };

                    if (storageMode === 'project') {
                        const projectPath = getProjectPathForSessions(cwd);
                        saveSession(projectPath, session);
                    } else {
                        saveNewSession(cwd, session);
                        saveNewStep(cwd, sessionId, 1, {
                            step: 1,
                            title,
                            execute: session.execute,
                            messages: session.messages || [],
                            context: session.context
                        });
                    }

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, session: toPublicSession(session, false) }));
                } catch (e) {
                    res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
                }
            });
            return;
        }

        const sessionMessagesMatch = p.match(/^\/sessions\/([^/]+)\/messages$/);
        if (req.method === 'GET' && sessionMessagesMatch) {
            const sessionId = sessionMessagesMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            if (storageMode === 'project') {
                res.writeHead(404).end(JSON.stringify({ error: 'messages delta not available in project storage mode' }));
                return;
            }
            const session = loadNewSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            attachPromiseMeta(cwd, sessionId, session);
            const afterSeq = Math.max(0, parseInt(url.searchParams.get('afterSeq') || '0', 10) || 0);
            const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
            const withExecute = url.searchParams.get('withExecute') === '1';
            const { messages, lastSeq } = collectSessionMessagesFlat(cwd, sessionId);
            const batch = messages.filter((m) => m.seq > afterSeq).slice(0, limit);
            const publicSnap = toPublicSession(session, false);
            const payload = {
                sessionId,
                afterSeq,
                lastSeq,
                hasMore: afterSeq + batch.length < lastSeq,
                messages: batch,
                asyncPending: publicSnap.asyncPending ?? false,
                promiseStatus: publicSnap.promiseStatus ?? null,
                currentStep: publicSnap.currentStep,
            };
            if (withExecute) {
                payload.execute = publicSnap.execute ?? null;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
            return;
        }

        const newSessionMatch = p.match(/^\/sessions\/([^/]+)$/);
        if (newSessionMatch) {
            const sessionId = newSessionMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }

            if (req.method === 'GET') {
                const includeContext = url.searchParams.get('includeContext') === '1';
                const session = storageMode === 'project'
                    ? loadSession(getProjectPathForSessions(cwd), sessionId)
                    : loadNewSession(cwd, sessionId);
                if (!session) {
                    res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }

                console.log('[SessionRoutes] GET session:', sessionId, 'storageMode:', storageMode, 'currentStep:', session.currentStep);
                if (storageMode !== 'project') {
                    attachPromiseMeta(cwd, sessionId, session);
                    console.log('[SessionRoutes] After attachPromiseMeta:', sessionId, 'promiseId:', session.promiseId);
                    const { messages, lastSeq } = collectSessionMessagesFlat(cwd, sessionId);
                    session.messages = messages;
                    session.lastMessageSeq = lastSeq;
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(toPublicSession(session, includeContext)));
                return;
            }

            if (req.method === 'PUT') {
                let body = '';
                req.on('data', (c) => (body += c));
                req.on('end', () => {
                    try {
                        if (!body || body.trim() === '') {
                            throw new Error('Empty request body');
                        }
                        const d = JSON.parse(body);
                        const projectPath = storageMode === 'project' ? getProjectPathForSessions(cwd) : null;
                        const existing = storageMode === 'project'
                            ? loadSession(projectPath, sessionId)
                            : loadNewSession(cwd, sessionId);
                        if (!existing) {
                            res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                            return;
                        }
                        const session = {
                            ...existing,
                            ...(d.title !== undefined && { title: d.title }),
                            ...(d.status !== undefined && { status: d.status }),
                            ...(d.execute !== undefined && { execute: d.execute }),
                            ...(d.context !== undefined && { context: d.context }),
                            ...(d.currentStep !== undefined && { currentStep: d.currentStep }),
                            ...(d.messages !== undefined && { messages: d.messages }),
                            updatedAt: new Date().toISOString()
                        };
                        if (storageMode === 'project') {
                            saveSession(projectPath, session);
                        } else {
                            saveNewSession(cwd, session);
                        }
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, session: toPublicSession(session, false) }));
                    } catch (e) {
                        res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
                    }
                });
                return;
            }

            if (req.method === 'DELETE') {
                if (storageMode === 'project') {
                    deleteSession(getProjectPathForSessions(cwd), sessionId);
                } else {
                    deleteNewSession(cwd, sessionId);
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
                return;
            }
        }

        next();
    };
}
