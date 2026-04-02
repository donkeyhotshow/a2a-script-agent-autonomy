import {
    listSessions,
    loadSession,
    saveSession,
    deleteSession,
    getProjectPathForSessions,
    resolveSessionProjectPath,
    findSessionProjectPath,
} from '../storage/projectSessions.js';
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
} from './utils/session-projection-dto.js';
import { pickInitialExecution } from './utils/session-create-initial.js';

const API_PREFIX = '/api/a2a';

function isNonEmptyString(x) {
    return typeof x === 'string' && x.trim().length > 0;
}

function parseJsonBody(req, res, onJson) {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
        try {
            if (!body || body.trim() === '') throw new Error('Empty request body');
            onJson(JSON.parse(body));
        } catch (e) {
            res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
        }
    });
}

function buildNewSessionFromRequest({ cwd, d, storageMode }) {
    const title = d.title || 'New Session';
    const task = d.task;
    const projectId = isNonEmptyString(d.projectId) ? d.projectId.trim() : '';
    const projectRoot = isNonEmptyString(d.projectRoot) ? d.projectRoot.trim() : '';
    const sessionId = d.id || `sess_${Date.now()}`;
    const initialExec = pickInitialExecution(d);

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
                step: 1,
            },
        ],
        context: {
            execution: initialExec,
            ...(task ? { task } : {}),
            ...(projectId ? { projectId } : {}),
            ...(projectRoot ? { projectRoot } : {}),
        },
        // After POST /next (stepRoutes), poll GET /sessions/:id or .../async
        execute: {
            message: 'What would you like me to do?',
            form: {
                input: [
                    {
                        name: 'task',
                        type: 'text',
                        label: 'Enter your task',
                        required: true,
                    },
                ],
            },
        },
    };

    if (storageMode === 'project') {
        const projectPath = resolveSessionProjectPath(cwd, { projectId, projectRoot });
        session.context = {
            ...session.context,
            ...projectStorageContextFields(projectId, projectPath),
        };
        saveSession(projectPath, session);
    } else {
        saveNewSession(cwd, session);
        saveNewStep(cwd, sessionId, 1, {
            step: 1,
            title,
            execute: session.execute,
            messages: session.messages || [],
            context: session.context,
        });
    }

    return session;
}

/**
 * @param {string} cwd
 * @param {string} sessionId
 * @param {{ projectId?: string | null, projectRoot?: string | null }} [q]
 */
function locateProjectModeSession(cwd, sessionId, q = {}) {
    const qRoot = typeof q.projectRoot === 'string' && q.projectRoot.trim() ? q.projectRoot.trim() : '';
    const qPid = typeof q.projectId === 'string' && q.projectId.trim() ? q.projectId.trim() : '';
    if (qRoot) {
        const projectPath = resolveSessionProjectPath(cwd, { projectRoot: qRoot });
        const session = loadSession(projectPath, sessionId);
        return { session, projectPath };
    }
    if (qPid) {
        const projectPath = resolveSessionProjectPath(cwd, { projectId: qPid });
        const session = loadSession(projectPath, sessionId);
        return { session, projectPath };
    }
    const primary = getProjectPathForSessions(cwd);
    let session = loadSession(primary, sessionId);
    if (session) return { session, projectPath: primary };
    // Also check new session format (storage/sessions/{id}/)
    session = loadNewSession(cwd, sessionId);
    if (session) return { session, projectPath: primary };
    // Fallback: scan all projects for legacy session
    const found = findSessionProjectPath(cwd, sessionId);
    if (!found) return { session: null, projectPath: primary };
    return { session: loadSession(found, sessionId), projectPath: found };
}

/** Persist resolved root so ADR state file `projectRoot` can align (orchestrator step 1). */
function projectStorageContextFields(projectId, resolvedProjectPath) {
    return {
        ...(projectId ? { projectId } : {}),
        projectRoot: resolvedProjectPath,
    };
}

export function createSessionRoutes({ cwd }) {
    return async (req, res, next) => {
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
            parseJsonBody(req, res, (d) => {
                const session = buildNewSessionFromRequest({ cwd, d, storageMode });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, session: toPublicSession(session, false) }));
            });
            return;
        }

        // Legacy aliases (kept for compatibility): behave like POST /sessions
        if (req.method === 'POST' && (p === '/sessions/task-add' || p === '/sessions/task-execute')) {
            parseJsonBody(req, res, (d) => {
                const session = buildNewSessionFromRequest({ cwd, d, storageMode });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, session: toPublicSession(session, false) }));
            });
            return;
        }

        // GET /sessions/:id - get single session
        const sessionIdMatch = p.match(/^\/sessions\/([^\/]+)$/);
        if (req.method === 'GET' && sessionIdMatch) {
            const sessionId = sessionIdMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            const { session, projectPath } = locateProjectModeSession(cwd, sessionId, {
                projectId: url.searchParams.get('projectId'),
                projectRoot: url.searchParams.get('projectRoot')
            });
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            const sessionWithMeta = await attachPromiseMeta(cwd, sessionId, session);
            const publicSession = toPublicSession(sessionWithMeta, url.searchParams.get('includeContext') === '1');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(publicSession));
            return;
        }

        // Defer /sessions/:id/next to the step routes middleware.
        const nextMatch = p.match(/^\/sessions\/([^\/]+)\/next$/);
        if (req.method === 'POST' && nextMatch) {
            return next();
        }

        if (req.method === 'POST' && p === '/sessions/task-execute') {
            // This route is handled above as an alias.
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
            await attachPromiseMeta(cwd, sessionId, session);
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
                const includeContextRaw = url.searchParams.get('includeContext');
                // DEBUG-ONLY: ?includeContext=1 разрешён только в dev mode
                const isProduction = process.env.NODE_ENV === 'production';
                if (includeContextRaw === '1' && isProduction) {
                    res.writeHead(403).end(JSON.stringify({ error: 'includeContext is debug-only and not available in production' }));
                    return;
                }
                const includeContext = includeContextRaw === '1';
                let session = null;
                if (storageMode === 'project') {
                    const qPid = url.searchParams.get('projectId')?.trim() || '';
                    const qRoot = url.searchParams.get('projectRoot')?.trim() || '';
                    const { session: s } = locateProjectModeSession(cwd, sessionId, {
                        projectId: qPid || null,
                        projectRoot: qRoot || null,
                    });
                    session = s;
                } else {
                    session = loadNewSession(cwd, sessionId);
                }
                if (!session) {
                    res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }

                if (storageMode !== 'project') {
                    await attachPromiseMeta(cwd, sessionId, session);
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
                        let projectPath = null;
                        let existing = null;
                        if (storageMode === 'project') {
                            const qPid =
                                typeof d.projectId === 'string' && d.projectId.trim()
                                    ? d.projectId.trim()
                                    : null;
                            const qRoot =
                                typeof d.projectRoot === 'string' && d.projectRoot.trim()
                                    ? d.projectRoot.trim()
                                    : null;
                            const located = locateProjectModeSession(cwd, sessionId, {
                                projectId: qPid,
                                projectRoot: qRoot,
                            });
                            existing = located.session;
                            projectPath = located.projectPath;
                        } else {
                            existing = loadNewSession(cwd, sessionId);
                        }
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
                    const qPid = url.searchParams.get('projectId')?.trim() || '';
                    const qRoot = url.searchParams.get('projectRoot')?.trim() || '';
                    const { session: s, projectPath } = locateProjectModeSession(
                        cwd,
                        sessionId,
                        {
                            projectId: qPid || null,
                            projectRoot: qRoot || null,
                        }
                    );
                    if (s) deleteSession(projectPath, sessionId);
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
