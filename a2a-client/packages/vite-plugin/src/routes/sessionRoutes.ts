import {
       listSessions,
       loadSession,
       saveSession,
       deleteSession,
       getProjectPathForSessions,
       resolveSessionProjectPath,
       findSessionProjectPath,
   } from '@a2a-client/storage/src/projectSessions.js';
import fs from 'node:fs';
import path from 'node:path';
import {
       listNewSessions,
       loadNewSession,
       saveNewSession,
       deleteNewSession,
       saveNewStep,
       getNewSessionDir,
   } from '@a2a-client/storage/src/newSessions.js';
import { getStorageMode, isValidSessionId } from '../utils/server.js';
import {
     collectSessionMessagesFlat,
     attachPromiseMeta,
     toPublicSession,
     getActiveAsyncWork,
     getProjectModeInflightPromise,
} from './utils/session-projection-dto.js';
import { pickInitialExecution } from './utils/session-create-initial.js';

const API_PREFIX = '/api/a2a';

function isNonEmptyString(x) {
    return typeof x === 'string' && x.trim().length > 0;
}

function tryParseJson(s) {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

function extractSessionIdFromUiFilename(name) {
    if (typeof name !== 'string' || !name) return null;
    // Common patterns:
    // - window_state_sess_123.tson
    // - window_state_sess_123_1536x864_125.tson
    const m = name.match(/\b((?:sess|test|session)_[A-Za-z0-9_-]+)\b/);
    return m ? m[1] : null;
}

function pruneUiWindowStateFiles({ cwd, existingSessionIds }) {
    const root = typeof cwd === 'string' && cwd.trim() ? cwd : process.cwd();
    const uiDir = path.join(root, 'storage', 'kv', 'ui');
    if (!fs.existsSync(uiDir)) return;

    // 1) Delete per-session window state files for sessions that no longer exist.
    const files = fs.readdirSync(uiDir).filter((f) => f.endsWith('.tson'));
    for (const f of files) {
        if (!f.startsWith('window_state_')) continue;
        const sid = extractSessionIdFromUiFilename(f);
        if (!sid) continue;
        if (existingSessionIds.has(sid)) continue;
        try {
            fs.unlinkSync(path.join(uiDir, f));
        } catch (e) {
            console.error('[sessionRoutes] Failed to delete stale ui window state:', f, e?.message || e);
        }
    }

    // 2) Prune the registry key so UI doesn't try to restore windows for missing sessions.
    const registryPath = path.join(uiDir, 'a2a_session_windows.tson');
    if (!fs.existsSync(registryPath)) return;
    try {
        const raw = fs.readFileSync(registryPath, 'utf8');
        const outer = tryParseJson(raw);
        if (!outer || typeof outer !== 'object') return;
        const innerRaw = outer.value;
        const inner =
            typeof innerRaw === 'string'
                ? tryParseJson(innerRaw)
                : innerRaw && typeof innerRaw === 'object'
                  ? innerRaw
                  : null;
        if (!inner || typeof inner !== 'object') return;

        const windowsIn = Array.isArray(inner.windows) ? inner.windows.map(String) : [];
        const windowsOut = windowsIn.filter((id) => existingSessionIds.has(String(id)));
        const activeIn = inner.active != null ? String(inner.active) : null;
        const activeOut = activeIn && existingSessionIds.has(activeIn) ? activeIn : windowsOut[0] ?? null;

        const innerOut = { ...inner, windows: windowsOut, active: activeOut, timestamp: Date.now() };
        const outerOut = { ...outer, value: JSON.stringify(innerOut), timestamp: new Date().toISOString() };
        fs.writeFileSync(registryPath, JSON.stringify(outerOut, null, 2));
    } catch (e) {
        console.error('[sessionRoutes] Failed to prune a2a_session_windows:', e?.message || e);
    }
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
            ...(isNonEmptyString(d.llmModel) ? { llmModel: d.llmModel.trim() } : {}),
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
            try {
                const existingSessionIds = new Set(
                    (Array.isArray(sessions) ? sessions : [])
                        .map((s) => (s && typeof s === 'object' ? s.id : null))
                        .filter(Boolean)
                        .map(String)
                );
                pruneUiWindowStateFiles({ cwd, existingSessionIds });
            } catch (e) {
                console.error('[sessionRoutes] UI window-state prune failed:', e?.message || e);
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, sessions, count: sessions.length }));
            return;
        }

        if (req.method === 'POST' && p === '/sessions') {
            parseJsonBody(req, res, (d) => {
                const session = buildNewSessionFromRequest({ cwd, d, storageMode });
                res.setHeader('Content-Type', 'application/json');
                // Create response includes full context (execution seeds, etc.) for tests and drivers.
                res.end(JSON.stringify({ success: true, session: toPublicSession(session, true) }));
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

        // Defer /sessions/:id/next to the step routes middleware.
        const nextMatch = p.match(/^\/sessions\/([^\/]+)\/next$/);
        const haltMatch = p.match(/^\/sessions\/([^\/]+)\/halt$/);
        const trajectoryMatch = p.match(/^\/sessions\/([^\/]+)\/trajectory$/);

        if (req.method === 'POST' && nextMatch) {
            return next();
        }

        if (req.method === 'GET' && trajectoryMatch) {
            const sessionId = trajectoryMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            const session = getSession(cwd, sessionId);
            if (!session) {
                res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                return;
            }
            // Simple trajectory export: all steps concatenated
            const trajectory = {
                id: sessionId,
                task: session.context?.task,
                steps: session.steps || []
            };
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(trajectory, null, 2));
            return;
        }

        if (req.method === 'DELETE' && haltMatch) {
            const sessionId = haltMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            const active = getActiveAsyncWork(cwd, sessionId);
            if (active?.promiseId) {
                // Call server to halt
                try {
                    const serverPort = process.env.A2A_SERVER_PORT || '3000';
                    const haltUrl = `http://localhost:${serverPort}/api/v1/requests/${active.promiseId}/halt`;
                    const haltRes = await fetch(haltUrl, { method: 'POST' });
                    if (haltRes.ok) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, halted: true, promiseId: active.promiseId }));
                        return;
                    }
                } catch (e) {
                    console.error('[Halt] Server call failed', e);
                }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, halted: false, message: 'No active promise found' }));
            return;
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

        const sequenceMatch = p.match(/^\/sessions\/([^/]+)\/sequence$/);
        if (sequenceMatch && (req.method === 'GET' || req.method === 'PUT')) {
            const sessionId = sequenceMatch[1];
            if (!isValidSessionId(sessionId)) {
                res.writeHead(400).end(JSON.stringify({ error: 'Invalid session ID' }));
                return;
            }
            if (storageMode === 'project') {
                res.writeHead(501).setHeader('Content-Type', 'application/json').end(
                    JSON.stringify({ error: 'sequence.tson is only supported in default (flat) session storage' })
                );
                return;
            }
            const seqPath = path.join(getNewSessionDir(cwd, sessionId), 'sequence.tson');
            if (req.method === 'GET') {
                if (!fs.existsSync(seqPath)) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, sequence: null }));
                    return;
                }
                try {
                    const data = JSON.parse(fs.readFileSync(seqPath, 'utf8'));
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, sequence: data }));
                } catch (e) {
                    res.writeHead(500).end(JSON.stringify({ error: String(e?.message || e) }));
                }
                return;
            }
            parseJsonBody(req, res, (body) => {
                try {
                    fs.mkdirSync(path.dirname(seqPath), { recursive: true });
                    fs.writeFileSync(seqPath, JSON.stringify(body ?? {}, null, 2), 'utf8');
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    res.writeHead(500).end(JSON.stringify({ error: String(e?.message || e) }));
                }
            });
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
                    try {
                        const { session: s } = locateProjectModeSession(cwd, sessionId, {
                            projectId: qPid || null,
                            projectRoot: qRoot || null,
                        });
                        session = s;
                    } catch (e) {
                        console.error('[sessionRoutes] Failed to locate project session:', e?.message || e);
                        res.writeHead(500).end(JSON.stringify({ error: 'Failed to load session configuration' }));
                        return;
                    }
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
                            try {
                                const located = locateProjectModeSession(cwd, sessionId, {
                                    projectId: qPid,
                                    projectRoot: qRoot,
                                });
                                existing = located.session;
                                projectPath = located.projectPath;
                            } catch (e) {
                                console.error('[sessionRoutes] Failed to locate project session:', e?.message || e);
                                res.writeHead(500).end(JSON.stringify({ error: 'Failed to load session configuration' }));
                                return;
                            }
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
                    let s, projectPath;
                    try {
                        const located = locateProjectModeSession(
                            cwd,
                            sessionId,
                            {
                                projectId: qPid || null,
                                projectRoot: qRoot || null,
                            }
                        );
                        s = located.session;
                        projectPath = located.projectPath;
                    } catch (e) {
                        console.error('[sessionRoutes] Failed to locate project session:', e?.message || e);
                        res.writeHead(500).end(JSON.stringify({ error: 'Failed to load session configuration' }));
                        return;
                    }
                    if (s) {
                        const inflight = getProjectModeInflightPromise(cwd, sessionId, projectPath, s);
                        if (inflight?.promiseId) {
                            res.writeHead(409, { 'Content-Type': 'application/json' }).end(
                                JSON.stringify({
                                    error:
                                        'Session has in-flight async work; wait for completion before delete',
                                    promiseId: inflight.promiseId,
                                })
                            );
                            return;
                        }
                        deleteSession(projectPath, sessionId);
                    }
                } else {
                    const inflight = getActiveAsyncWork(cwd, sessionId);
                    if (inflight?.promiseId) {
                        res.writeHead(409, { 'Content-Type': 'application/json' }).end(
                            JSON.stringify({
                                error:
                                    'Session has in-flight async work; wait for completion before delete',
                                promiseId: inflight.promiseId,
                            })
                        );
                        return;
                    }
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
