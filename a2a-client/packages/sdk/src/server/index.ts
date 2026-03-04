/**
 * A2A Client API Server
 *
 * Exposes client-side tools (terminal, fs-utils, etc.) via REST API
 * This runs on the client machine to provide local file system and terminal access
 *
 * ✅ IMPLEMENTED: session model with context, execute, status, exchangeLog[], messages[]
 * ✅ IMPLEMENTED: promiseId flow – poll /api/v1/requests/:id/status, propagate to Web via /api/sessions/:id/next and SSE
 * ✅ IMPLEMENTED: session DTO for Web: task, status, context.execution, messages, current execute
 * ✅ IMPLEMENTED: new protocol support - execute.form.choices, action-key shape for results
 */

import { config } from './config/index.js';
import { toSessionSummary, toSessionDetail, SessionDetail, SessionSummary } from './session-dto.js';

// Import modular components
import { WebSocketServerManager } from './server/websocket-server.js';
import { sessionService } from './services/session-service.js';

// Import required Node.js modules
import { exec as execAsync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import * as fs from 'fs/promises';
import { WebSocket, WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { Readable } from 'stream';
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';

// Import Meilisearch client
import { MeilisearchClient } from './services/meilisearch-client.js';

// Import WebSocket connections map
const wsConnections = new Map<string, Set<WebSocket>>();

const execAsyncPromisified = promisify(execAsync);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || 'localhost';
const WS_PORT = Number(process.env.WS_PORT || 3002);

// Initialize modular components
const websocketServer = new WebSocketServerManager();
const expressApp = express();

// The session service is a simple singleton and requires no explicit initialization.

// Handle WebSocket messages from clients
function handleWebSocketMessage(sessionId: string, ws: WebSocket, message: Record<string, unknown>): void {
    const type = message.type as string;
    
    switch (type) {
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
        case 'subscribe':
            // Already subscribed on connect
            ws.send(JSON.stringify({ type: 'subscribed', sessionId }));
            break;
        case 'unsubscribe':
            const connections = wsConnections.get(sessionId);
            if (connections) {
                connections.delete(ws);
                if (connections.size === 0) {
                    wsConnections.delete(sessionId);
                }
            }
            ws.send(JSON.stringify({ type: 'unsubscribed', sessionId }));
            break;
        case 'choice':
            // Handle form choice selection (new protocol)
            // Client sends: { type: 'choice', choiceId: 'fix-vue-imports', input?: {...} }
            handleChoiceSelection(sessionId, ws, message);
            break;
        case 'action_result':
            // Handle action result (new protocol)
            // Client sends: { type: 'action_result', actionType: 'script', result: {...} }
            handleActionResult(sessionId, ws, message);
            break;
        case 'ui_ready':
            // Client signals UI is ready for next step
            ws.send(JSON.stringify({ 
                type: 'ui_ready_ack', 
                sessionId, 
                timestamp: new Date().toISOString() 
            }));
            break;
        default:
            console.log(`[WS] Unknown message type: ${type}`);
    }
}

/**
 * Handle choice selection from client (new protocol)
 */
async function handleChoiceSelection(
    sessionId: string, 
    ws: WebSocket, 
    message: Record<string, unknown>
): Promise<void> {
    const choiceId = message.choiceId as string;
    const input = message.input as Record<string, unknown> | undefined;
    
    if (!choiceId) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: 'choiceId is required',
            sessionId 
        }));
        return;
    }
    
    try {
        const projects = await loadProjects();
        const project = projects[0];
        if (!project) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'Project not found',
                sessionId 
            }));
            return;
        }
        
        const session = await loadSession(project, sessionId);
        if (!session) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'Session not found',
                sessionId 
            }));
            return;
        }
        
        // Build result in action-key shape
        const result = input 
            ? { choice: choiceId, input }
            : { choice: choiceId };
        
        // Send to server
        const serverBase = await getServerBaseUrl();
        const requestBody = {
            context: {
                version: session.version || '2.0',
                session_id: sessionId,
                task: session.task,
                execution: session.execution,
            },
            result,
        };
        
        const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
        const payload = (await upstream.json().catch(() => ({}))) as any;
        
        // Update session
        const updatedSession = await updateSessionWithServerResponse(project, session, payload);
        await saveSession(project, updatedSession);
        
        // Send response back to client
        ws.send(JSON.stringify({
            type: 'choice_response',
            sessionId,
            serverResponse: payload,
            timestamp: new Date().toISOString(),
        }));
        
        // Also broadcast to all session clients
        broadcastProgress(sessionId, {
            status: 'choice_processed',
            message: 'Choice processed by server',
            result: payload,
        });
        
    } catch (error) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : String(error),
            sessionId 
        }));
    }
}

/**
 * Handle action result from client (new protocol)
 */
async function handleActionResult(
    sessionId: string, 
    ws: WebSocket, 
    message: Record<string, unknown>
): Promise<void> {
    const actionType = message.actionType as string;
    const result = message.result as Record<string, unknown>;
    
    if (!actionType || !result) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: 'actionType and result are required',
            sessionId 
        }));
        return;
    }
    
    try {
        const projects = await loadProjects();
        const project = projects[0];
        if (!project) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'Project not found',
                sessionId 
            }));
            return;
        }
        
        const session = await loadSession(project, sessionId);
        if (!session) {
            ws.send(JSON.stringify({ 
                type: 'error', 
                error: 'Session not found',
                sessionId 
            }));
            return;
        }
        
        // Send to server in action-key shape
        const serverBase = await getServerBaseUrl();
        const requestBody = {
            context: {
                version: session.version || '2.0',
                session_id: sessionId,
                task: session.task,
                execution: session.execution,
            },
            result: {
                [actionType]: result,
            },
        };
        
        const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
        const payload = (await upstream.json().catch(() => ({}))) as any;
        
        // Update session
        const updatedSession = await updateSessionWithServerResponse(project, session, payload);
        await saveSession(project, updatedSession);
        
        // Send response back to client
        ws.send(JSON.stringify({
            type: 'action_result_response',
            sessionId,
            serverResponse: payload,
            timestamp: new Date().toISOString(),
        }));
        
        // Also broadcast to all session clients
        broadcastProgress(sessionId, {
            status: 'action_result_processed',
            message: 'Action result processed by server',
            result: payload,
        });
        
    } catch (error) {
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : String(error),
            sessionId 
        }));
    }
}

// Broadcast message to all clients subscribed to a session
function broadcastToSession(sessionId: string, data: unknown): void {
    const connections = wsConnections.get(sessionId);
    if (!connections) return;
    
    const message = JSON.stringify(data);
    for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

// Broadcast progress update to session
function broadcastProgress(sessionId: string, progress: {
    promiseId?: string;
    status: string;
    progress?: number;
    message?: string;
    result?: unknown;
}): void {
    broadcastToSession(sessionId, {
        type: 'progress',
        timestamp: new Date().toISOString(),
        ...progress,
    });
}

// ==================== NEW PROTOCOL HELPERS ====================

/**
 * Detect the type of response from server.
 * Determines whether the response requires UI interaction (form/message) or client execution.
 * 
 * @returns 'form' - UI needs to show a form with choices/input
 * @returns 'message' - UI needs to display a message
 * @returns 'action' - Client should execute an action (script, read-file, etc.)
 * @returns 'unknown' - Unknown or unsupported response type
 */
function detectServerResponseType(response: {
    execute?: Record<string, unknown>;
}): 'form' | 'message' | 'action' | 'unknown' {
    if (!response?.execute) {
        return 'unknown';
    }
    
    const executeKeys = Object.keys(response.execute);
    if (executeKeys.length === 0) {
        return 'unknown';
    }
    
    const firstKey = executeKeys[0];
    
    // UI-only types
    if (firstKey === 'form' || firstKey === 'message') {
        return firstKey;
    }
    
    // Client execution types
    const clientActionTypes = ['script', 'read-file', 'write-file', 'rag-search', 'execute-command'];
    if (clientActionTypes.includes(firstKey)) {
        return 'action';
    }
    
    return 'unknown';
}

/**
 * Check if response contains form choices (new protocol)
 */
function hasFormChoices(response: { execute?: Record<string, unknown> }): boolean {
    return !!(response?.execute && 'form' in response.execute);
}

/**
 * Extract form choices from response (new protocol)
 */
function extractFormChoices(response: { execute?: Record<string, unknown> }): { 
    title?: string; 
    choices?: Array<{ id: string; label: string }>;
    input?: unknown[];
} | null {
    if (!response?.execute?.form) return null;
    return response.execute.form as { title?: string; choices?: Array<{ id: string; label: string }>; input?: unknown[] };
}

// Middleware
expressApp.use(cors());
expressApp.use(express.json({limit: '50mb'}));

// Logging middleware
expressApp.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==================== STORAGE / CONFIG ====================

type ClientConfig = {
    serverUrl: string;
    token?: string | null;
};

type Project = {
    id: string;
    name: string;
    path?: string;
    description?: string;
};

type Session = {
    id: string;
    projectId: string;
    title: string;
    task?: string;
    status?: string;
    selectedAction?: string;
    context?: Record<string, unknown>;
    lastPromiseId?: string;
    createdAt: string;
    updatedAt: string;
    messages?: unknown[];
    // New protocol fields
    version?: string;
    execution?: {
        action?: string;
        step?: string;
        progress?: number;
        status?: string;
    };
};

const packageRoot = path.resolve(__dirname, '..');
const a2aClientRoot = path.resolve(packageRoot, '../..');
const storageDir = process.env.A2A_CLIENT_STORAGE_DIR || path.join(a2aClientRoot, 'storage');
const PROJECTS_FILE = path.join(storageDir, 'projects.json');
const CONFIG_FILE = path.join(storageDir, 'config.json');

const DEFAULT_CONFIG: ClientConfig = {
    serverUrl: process.env.A2A_SERVER_URL || 'http://localhost:3000/api/v1',
    token: process.env.A2A_SERVER_TOKEN || null,
};

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), {recursive: true});
    const tmp = `${filePath}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    try {
        await fs.rm(filePath, {force: true});
    } catch {
        // ignore
    }
    await fs.rename(tmp, filePath);
}

async function loadConfig(): Promise<ClientConfig> {
    return readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);
}

async function saveConfig(config: ClientConfig): Promise<ClientConfig> {
    const normalized: ClientConfig = {
        serverUrl: String(config.serverUrl || DEFAULT_CONFIG.serverUrl).replace(/\/?$/, ''),
        token: config.token ?? null,
    };
    await writeJsonFile(CONFIG_FILE, normalized);
    return normalized;
}

async function loadProjects(): Promise<Project[]> {
    const data = await readJsonFile<{projects: Project[]}>(PROJECTS_FILE, {projects: []});
    return Array.isArray(data.projects) ? data.projects : [];
}

async function saveProjects(projects: Project[]): Promise<void> {
    await writeJsonFile(PROJECTS_FILE, {projects});
}

function safePath(base: string, subPath: string): string | null {
    const resolved = path.resolve(base, subPath);
    const baseResolved = path.resolve(base);
    const prefix = baseResolved.endsWith(path.sep) ? baseResolved : baseResolved + path.sep;
    if (resolved !== baseResolved && !resolved.startsWith(prefix)) return null;
    return resolved;
}

function getSessionDir(project: Project): string {
    if (project.path) return path.join(project.path, '.a2a', 'sessions');
    return path.join(storageDir, 'sessions', project.id);
}

async function listSessions(project: Project): Promise<Array<{id: string; title: string; createdAt?: string}>> {
    const dir = getSessionDir(project);
    try {
        const entries = await fs.readdir(dir);
        const sessions: Array<{id: string; title: string; createdAt?: string}> = [];
        for (const file of entries) {
            if (!file.endsWith('.json')) continue;
            try {
                const raw = await fs.readFile(path.join(dir, file), 'utf-8');
                const s = JSON.parse(raw) as Partial<Session>;
                if (!s.id) continue;
                sessions.push({id: s.id, title: String(s.title || s.id), createdAt: s.createdAt});
            } catch {
                // ignore bad session file
            }
        }
        sessions.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return sessions;
    } catch {
        return [];
    }
}

async function loadSession(project: Project, sessionId: string): Promise<Session | null> {
    const file = path.join(getSessionDir(project), `${sessionId}.json`);
    try {
        const raw = await fs.readFile(file, 'utf-8');
        return JSON.parse(raw) as Session;
    } catch {
        return null;
    }
}

async function saveSession(project: Project, session: Session): Promise<void> {
    const dir = getSessionDir(project);
    await fs.mkdir(dir, {recursive: true});
    const file = path.join(dir, `${session.id}.json`);
    await writeJsonFile(file, session);
}

async function deleteSession(project: Project, sessionId: string): Promise<void> {
    const file = path.join(getSessionDir(project), `${sessionId}.json`);
    try {
        await fs.unlink(file);
    } catch {
        // ignore
    }
}

async function serverFetch(
    method: string,
    serverBaseUrl: string,
    pathName: string,
    body: unknown | null = null
): Promise<Response> {
    const cfg = await loadConfig();
    const headers: Record<string, string> = {};
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;
    if (body != null) headers['Content-Type'] = 'application/json';

    const url = `${serverBaseUrl.replace(/\/?$/, '')}${pathName}`;
    return fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
    });
}

async function getServerBaseUrl(): Promise<string> {
    const cfg = await loadConfig();
    return cfg.serverUrl.replace(/\/?$/, '');
}

function jsonError(res: express.Response, status: number, message: string, details?: unknown) {
    res.status(status).json({success: false, error: {message}, details});
}

// ==================== CLIENT API (NEW-REQUEST-FLOW) ====================

// --- config
expressApp.get(['/api/config', '/api/v1/config'], async (_req, res) => {
    const cfg = await loadConfig();
    res.json(cfg);
});

expressApp.post(['/api/config', '/api/v1/config'], async (req, res) => {
    const body = (req.body || {}) as Partial<ClientConfig>;
    if (!body.serverUrl && body.serverUrl !== '') {
        jsonError(res, 400, 'serverUrl is required');
        return;
    }
    const saved = await saveConfig({
        serverUrl: String(body.serverUrl),
        token: body.token ?? null,
    });
    res.json(saved);
});

// --- projects
expressApp.get(['/api/projects', '/api/v1/projects'], async (_req, res) => {
    const projects = await loadProjects();
    // Web UI expects a bare array
    res.json(projects);
});

expressApp.post(['/api/projects', '/api/v1/projects'], async (req, res) => {
    const body = (req.body || {}) as Partial<Project>;
    const name = String(body.name || '').trim();
    if (!name) {
        jsonError(res, 400, 'name is required');
        return;
    }
    const projects = await loadProjects();
    const project: Project = {
        id: body.id ? String(body.id) : `p_${Date.now()}`,
        name,
        description: body.description ? String(body.description) : undefined,
        path: body.path ? String(body.path) : undefined,
    };
    projects.unshift(project);
    await saveProjects(projects);
    res.status(201).json(project);
});

expressApp.delete(['/api/projects/:projectId', '/api/v1/projects/:projectId'], async (req, res) => {
    const projectId = String(req.params.projectId || '');
    const projects = await loadProjects();
    const next = projects.filter((p) => p.id !== projectId);
    await saveProjects(next);
    res.json({success: true});
});

// --- project files (used by PanelManager and other UI features)
expressApp.get(['/api/projects/:projectId/files/*', '/api/v1/projects/:projectId/files/*'], async (req, res) => {
    const projectId = String(req.params.projectId || '');
    const fileRel = decodeURIComponent(String((req.params as any)[0] || '')).replace(/^\/+/, '');

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project?.path) {
        jsonError(res, 404, 'Project not found or missing path');
        return;
    }

    const fullPath = safePath(project.path, fileRel);
    if (!fullPath) {
        jsonError(res, 400, 'Invalid file path');
        return;
    }

    try {
        const content = await fs.readFile(fullPath, 'utf-8');
        res.type('application/json').send(content);
    } catch {
        res.status(404).json({error: 'File not found'});
    }
});

expressApp.put(['/api/projects/:projectId/files/*', '/api/v1/projects/:projectId/files/*'], async (req, res) => {
    const projectId = String(req.params.projectId || '');
    const fileRel = decodeURIComponent(String((req.params as any)[0] || '')).replace(/^\/+/, '');

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project?.path) {
        jsonError(res, 404, 'Project not found or missing path');
        return;
    }

    const fullPath = safePath(project.path, fileRel);
    if (!fullPath) {
        jsonError(res, 400, 'Invalid file path');
        return;
    }

    await fs.mkdir(path.dirname(fullPath), {recursive: true});
    await fs.writeFile(fullPath, JSON.stringify(req.body ?? {}, null, 2), 'utf-8');
    res.json({success: true, path: fullPath});
});

// --- sessions (stored per-project in <projectPath>/.a2a/sessions)
expressApp.get(['/api/sessions', '/api/v1/sessions'], async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        res.json([]);
        return;
    }
    const sessions = await listSessions(project);
    res.json(sessions);
});

expressApp.post(['/api/sessions', '/api/v1/sessions'], async (req, res) => {
    const body = (req.body || {}) as {projectId?: string; title?: string; task?: string};
    const projectId = String(body.projectId || '').trim();
    if (!projectId) {
        jsonError(res, 400, 'projectId is required');
        return;
    }
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }

    const now = new Date().toISOString();
    const session: Session = {
        id: `sess_${randomUUID()}`,
        projectId,
        title: String(body.title || 'New Session'),
        task: body.task ? String(body.task) : undefined,
        status: 'PENDING',
        version: '2.0', // New protocol version
        createdAt: now,
        updatedAt: now,
        messages: [],
        context: {}, // Initialize empty context for panelLayout storage
    };
    
    // If task is provided, send request to server with new protocol format
    if (body.task) {
        try {
            const serverBase = await getServerBaseUrl();
            
            // Build new protocol request
            const requestBody: Record<string, unknown> = {};
            if (session.task) {
                requestBody.task = session.task;
            }

            const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
            const payload = (await upstream.json().catch(() => ({}))) as any;
            
            if (upstream.ok) {
                // Update session with server response
                const updatedSession = await updateSessionWithServerResponse(project, session, payload);
                
                // Check for promiseId (async response)
                const promiseId = payload?.data?.promiseId || payload?.promiseId;
                if (promiseId) {
                    updatedSession.lastPromiseId = promiseId;
                    updatedSession.status = 'IN_PROGRESS';
                } else {
                    // Check if response has form choices (synchronous first response)
                    if (hasFormChoices(payload)) {
                        updatedSession.status = 'READY';
                    }
                }
                
                await saveSession(project, updatedSession);
                
                // Broadcast to WebSocket clients
                broadcastProgress(session.id, {
                    status: 'session_created',
                    message: 'Session created and server response received',
                    result: {
                        session: toSessionDetail(updatedSession),
                        serverResponse: payload,
                    },
                });
                
                // Return both session and server response
                res.status(201).json({
                    session: toSessionDetail(updatedSession),
                    serverResponse: payload,
                });
                return;
            } else {
                // Server error but session created
                await saveSession(project, session);
                res.status(201).json({
                    session: toSessionDetail(session),
                    serverError: payload,
                });
                return;
            }
        } catch (error) {
            console.error('Error sending task to server:', error);
            // Save session anyway even if server communication fails
            await saveSession(project, session);
            res.status(201).json({
                session: toSessionDetail(session),
                serverError: error instanceof Error ? error.message : String(error),
            });
            return;
        }
    }
    
    await saveSession(project, session);
    res.status(201).json(session);
});

expressApp.get(['/api/sessions/:sessionId', '/api/v1/sessions/:sessionId'], async (req, res) => {
    try {
        const sessionId = String(req.params.sessionId || '');
        const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';

        const projects = await loadProjects();
        const project = projects.find((p) => p.id === projectId) ?? projects[0];
        if (!project) {
            jsonError(res, 404, 'Project not found');
            return;
        }
        const session = await loadSession(project, sessionId);
        if (!session) {
            jsonError(res, 404, 'Session not found');
            return;
        }
        
        // Convert to SessionDetail DTO
        const sessionDetail = toSessionDetail(session);
        res.json(sessionDetail);
    } catch (error) {
        console.error('[Sessions API] GET /api/sessions/:sessionId failed', error);
        res.status(500).json({
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unexpected error'
            }
        });
    }
});

expressApp.delete(['/api/sessions/:sessionId', '/api/v1/sessions/:sessionId'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    await deleteSession(project, sessionId);
    res.json({success: true});
});

// Best-effort helpers for the new-request-flow endpoints (kept minimal for compatibility)
expressApp.post(['/api/sessions/:sessionId/action', '/api/v1/sessions/:sessionId/action'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');
    const action = String(req.body?.action || req.body?.actionId || '').trim();

    if (!action) {
        jsonError(res, 400, 'action is required');
        return;
    }

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }

    const existing = await loadSession(project, sessionId);
    if (!existing) {
        jsonError(res, 404, 'Session not found');
        return;
    }

    const updated: Session = {
        ...existing,
        selectedAction: action,
        status: 'READY',
        updatedAt: new Date().toISOString(),
    };
    await saveSession(project, updated);
    res.json(updated);
});

expressApp.post(['/api/sessions/:sessionId/next', '/api/v1/sessions/:sessionId/next'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    const session = await loadSession(project, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }

    const serverBase = await getServerBaseUrl();

    const sessionContext = session.context ? {...session.context} : {};
    const contextTask = typeof sessionContext.task === 'string' ? sessionContext.task : undefined;
    const executionFromSession = session.execution ?? (sessionContext.execution as Session['execution'] | undefined);
    const hasExecution = Boolean(executionFromSession?.action && executionFromSession?.step);
    const effectiveTask = session.task ?? contextTask;

    if (!effectiveTask && !hasExecution) {
        jsonError(res, 400, 'task is required to continue the session');
        return;
    }

    const requestBody: Record<string, unknown> = {};

    if (hasExecution) {
        const context: Record<string, unknown> = {...sessionContext};
        context.execution = executionFromSession!;
        context.task = effectiveTask;
        context.version = session.version ?? context.version;
        context.session_id = sessionId;
        requestBody.context = context;
    } else if (effectiveTask) {
        requestBody.task = effectiveTask;
    }

    if (req.body?.result) {
        requestBody.result = req.body.result;
    }
    
    // Forward to server /invoke
    const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
    const payload = (await upstream.json().catch(() => ({}))) as any;
    if (!upstream.ok) {
        res.status(upstream.status).json(payload);
        return;
    }

    const promiseId: string | undefined = payload?.data?.promiseId || payload?.promiseId;
    if (promiseId) {
        const updated: Session = {
            ...session,
            lastPromiseId: promiseId,
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
        };
        await saveSession(project, updated);
        
        // Broadcast promiseId to Web UI via WebSocket
        broadcastProgress(sessionId, {
            promiseId,
            status: 'promise_id_assigned',
            message: `New promiseId assigned: ${promiseId}`,
            result: { promiseId, sessionId },
        });
    }

    // Update session with server response data
    const updatedSession = await updateSessionWithServerResponse(project, session, payload);
    await saveSession(project, updatedSession);

    // Broadcast server response to Web UI
    broadcastProgress(sessionId, {
        promiseId,
        status: 'server_response_received',
        message: 'Server response received and session updated',
        result: payload,
    });

    res.status(upstream.status).json(payload);
});

// POST /api/sessions/:sessionId/result - Отправка результата form choice (для Web совместимости)
expressApp.post(['/api/sessions/:sessionId/result', '/api/v1/sessions/:sessionId/result'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');
    
    // Поддержка плоского формата { choice: "..." } и вложенного { result: { form: { choice: "..." } } }
    const rawResult = req.body?.result ?? req.body;
    let result: Record<string, unknown>;
    
    if (rawResult?.form?.choice) {
        // Вложенный формат: { result: { form: { choice: "..." } } }
        result = rawResult.form;
    } else if (rawResult?.choice) {
        // Плоский формат: { choice: "..." }
        result = rawResult;
    } else if (typeof rawResult === 'object' && rawResult !== null) {
        // Другие форматы результатов
        result = rawResult;
    } else {
        jsonError(res, 400, 'result is required (expected { choice: "..." } or { form: { choice: "..." } })');
        return;
    }

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    
    const session = await loadSession(project, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }

    const serverBase = await getServerBaseUrl();
    
    // Build request body for new protocol - используем action-key shape
    const requestBody: Record<string, unknown> = {
        context: {
            version: session.version || '2.0',
            session_id: sessionId,
            task: session.task,
            execution: session.execution,
            history: session.context?.history || [],
        },
        result: {
            form: result,
        },
    };
    
    // Forward to server /invoke
    const upstream = await serverFetch('POST', serverBase, '/invoke', requestBody);
    const payload = (await upstream.json().catch(() => ({}))) as any;
    if (!upstream.ok) {
        res.status(upstream.status).json(payload);
        return;
    }

    const promiseId: string | undefined = payload?.data?.promiseId || payload?.promiseId;
    if (promiseId) {
        const updated: Session = {
            ...session,
            lastPromiseId: promiseId,
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
        };
        await saveSession(project, updated);
        
        broadcastProgress(sessionId, {
            promiseId,
            status: 'promise_id_assigned',
            message: `New promiseId assigned: ${promiseId}`,
            result: { promiseId, sessionId },
        });
    }

    const updatedSession = await updateSessionWithServerResponse(project, session, payload);
    await saveSession(project, updatedSession);

    broadcastProgress(sessionId, {
        promiseId,
        status: 'server_response_received',
        message: 'Result processed and session updated',
        result: payload,
    });

    res.status(upstream.status).json(payload);
});

/**
 * Updates session with data from server response
 */
async function updateSessionWithServerResponse(
    project: Project,
    session: Session,
    serverResponse: any
): Promise<Session> {
    const updatedSession: Session = { ...session };
    
    // Update version if provided
    if (serverResponse?.context?.version) {
        updatedSession.version = serverResponse.context.version;
    }
    
    // Update context from server response
    if (serverResponse?.context) {
        updatedSession.context = { ...session.context, ...serverResponse.context };
        
        // Extract execution info from context
        if (serverResponse.context.execution) {
            updatedSession.execution = serverResponse.context.execution as Session['execution'];
        }
    }
    
    // Update execute information from server response (new protocol)
    if (serverResponse?.execute) {
        // Store execute information in context for now
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.execute = serverResponse.execute;
        
        // Check for form choices and extract them
        if (serverResponse.execute.form) {
            updatedSession.context.formChoices = serverResponse.execute.form;
        }
    }
    
    // Handle completed status
    if (serverResponse?.execute?.completed === true || serverResponse?.finalResult) {
        updatedSession.status = 'COMPLETED';
        if (serverResponse.finalResult) {
            updatedSession.context = updatedSession.context || {};
            updatedSession.context.finalResult = serverResponse.finalResult;
        }
    }
    
    // Update messages from server response
    if (serverResponse?.messages && Array.isArray(serverResponse.messages)) {
        updatedSession.messages = [...(session.messages || []), ...serverResponse.messages];
    }
    
    // Update exchange log from server response
    if (serverResponse?.exchangeLog && Array.isArray(serverResponse.exchangeLog)) {
        // Store exchange log in context
        updatedSession.context = updatedSession.context || {};
        const existingLog = Array.isArray(session.context?.exchangeLog) ? session.context.exchangeLog : [];
        updatedSession.context.exchangeLog = [
            ...existingLog,
            ...serverResponse.exchangeLog
        ];
    }
    
    // Update history (new protocol)
    if (serverResponse?.context?.history && Array.isArray(serverResponse.context.history)) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.history = serverResponse.context.history;
    }
    
    // Update docVirtual (new protocol)
    if (serverResponse?.context?.docVirtual) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.docVirtual = serverResponse.context.docVirtual;
    }
    
    updatedSession.updatedAt = new Date().toISOString();
    return updatedSession;
}

/**
 * Updates session with data from server status response
 */
async function updateSessionWithStatusResponse(
    project: Project,
    session: Session,
    statusResponse: any
): Promise<Session> {
    const updatedSession: Session = { ...session };
    
    // Update context from status response
    if (statusResponse?.context) {
        updatedSession.context = { ...session.context, ...statusResponse.context };
    }
    
    // Update execute information from status response
    if (statusResponse?.execute) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.execute = statusResponse.execute;
    }
    
    // Update messages from status response
    if (statusResponse?.messages && Array.isArray(statusResponse.messages)) {
        updatedSession.messages = [...(session.messages || []), ...statusResponse.messages];
    }
    
    // Update exchange log from status response
    if (statusResponse?.exchangeLog && Array.isArray(statusResponse.exchangeLog)) {
        updatedSession.context = updatedSession.context || {};
        const existingLog = Array.isArray(session.context?.exchangeLog) ? session.context.exchangeLog : [];
        updatedSession.context.exchangeLog = [
            ...existingLog,
            ...statusResponse.exchangeLog
        ];
    }
    
    // Update status if provided
    if (statusResponse?.status) {
        updatedSession.status = statusResponse.status;
    }
    
    updatedSession.updatedAt = new Date().toISOString();
    return updatedSession;
}

expressApp.post(['/api/sessions/:sessionId/cancel', '/api/v1/sessions/:sessionId/cancel'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    const session = await loadSession(project, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    const updated: Session = {...session, status: 'CANCELLED', updatedAt: new Date().toISOString()};
    await saveSession(project, updated);
    res.json(updated);
});

// --- server proxy (web must not know server address). Body: task, sessionId?, projectId?
expressApp.post('/api/v1/invoke', async (req, res) => {
    const body = (req.body || {}) as { task?: string; sessionId?: string; projectId?: string; context?: unknown };
    const serverBody: Record<string, unknown> = { task: body.task };
    if (body.context) serverBody.context = body.context;

    const serverBase = await getServerBaseUrl();
    const upstream = await serverFetch('POST', serverBase, '/invoke', serverBody);
    const payload = (await upstream.json().catch(() => ({}))) as { data?: { promiseId?: string }; promiseId?: string };
    if (upstream.ok) {
        const promiseId = payload?.data?.promiseId ?? payload?.promiseId;
        const sessionId = body.sessionId;
        const projectId = body.projectId;
        if (promiseId && sessionId && projectId) {
            const projects = await loadProjects();
            const project = projects.find((p) => p.id === projectId);
            if (project) {
                const session = await loadSession(project, sessionId);
                if (session) {
                    const updated: Session = {
                        ...session,
                        lastPromiseId: promiseId,
                        status: 'IN_PROGRESS',
                        updatedAt: new Date().toISOString(),
                    };
                    await saveSession(project, updated);
                }
            }
        }
    }
    res.status(upstream.status).json(payload);
});

expressApp.all(['/api/requests*', '/api/v1/requests*'], async (req, res) => {
    const serverBase = await getServerBaseUrl();
    const pathName = req.originalUrl.replace(/^\/api(?:\/v1)?/, '');
    const body = req.method === 'GET' || req.method === 'HEAD' ? null : (req.body ?? {});
    const upstream = await serverFetch(req.method, serverBase, pathName, body);
    const payload = (await upstream.json().catch(() => ({}))) as any;
    
    // If this is a status request and we have a session, update session with response
    if (pathName.includes('/status') && payload) {
        try {
            const sessionId = extractSessionIdFromPath(pathName);
            if (sessionId) {
                const projects = await loadProjects();
                const project = projects[0]; // Use first project for now
                if (project) {
                    const session = await loadSession(project, sessionId);
                    if (session) {
                        const updatedSession = await updateSessionWithStatusResponse(project, session, payload);
                        await saveSession(project, updatedSession);
                        
                        // Check for promiseId in status response and broadcast
                        const promiseId: string | undefined = payload?.data?.promiseId || payload?.promiseId;
                        
                        // Broadcast update via WebSocket
                        broadcastProgress(sessionId, {
                            promiseId,
                            status: 'status_updated',
                            message: 'Session status updated from server',
                            result: updatedSession,
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error updating session from status response:', error);
        }
    }
    
    res.status(upstream.status).json(payload);
});

/**
 * Extracts session ID from request path
 */
function extractSessionIdFromPath(pathName: string): string | null {
    // Path format: /requests/:id/status
    const match = pathName.match(/\/requests\/([^\/]+)\/status/);
    return match ? match[1] : null;
}

expressApp.get(['/api/v1/sse/:sessionId', '/api/sse/:sessionId'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const serverBase = await getServerBaseUrl();
    const cfg = await loadConfig();
    const headers: Record<string, string> = {};
    if (cfg.token) headers['Authorization'] = `Bearer ${cfg.token}`;

    let upstream: Response;
    try {
        upstream = await fetch(`${serverBase}/sse/${encodeURIComponent(sessionId)}`, {headers});
    } catch (error) {
        console.error('Error connecting to upstream SSE server:', error);
        res.writeHead(502, {'Content-Type': 'text/plain'});
        res.end('Unable to connect to upstream SSE service');
        return;
    }

    if (!upstream.ok || !upstream.body) {
        const text = await upstream.text().catch(() => '');
        res.status(upstream.status).send(text || upstream.statusText);
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    const nodeStream = Readable.fromWeb(upstream.body as any);
    
    // Transform SSE events for new protocol
    let buffer = '';
    
    nodeStream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    
                    // Transform for new protocol: check for execute.form.choices
                    const responseType = detectServerResponseType(data);
                    const transformed = {
                        ...data,
                        _responseType: responseType,
                        _timestamp: new Date().toISOString(),
                    };
                    
                    // If it's a form, also extract choices
                    if (responseType === 'form') {
                        transformed._formChoices = extractFormChoices(data);
                    }
                    
                    res.write(`data: ${JSON.stringify(transformed)}\n\n`);
                } catch {
                    // Not JSON, send as-is
                    res.write(`${line}\n\n`);
                }
            } else {
                // Pass through other SSE lines (event, etc.)
                res.write(`${line}\n\n`);
            }
        }
    });

    nodeStream.on('end', () => {
        if (buffer) {
            res.write(`data: ${buffer}\n\n`);
        }
        res.end();
    });

    nodeStream.on('error', (err) => {
        console.error('SSE stream error:', err);
        res.end();
    });

    req.on('close', () => {
        nodeStream.destroy();
    });
});

expressApp.get(['/api/v1/sse', '/api/sse'], async (_req, res) => {
    // Keep it simple: web should subscribe to a session SSE stream.
    res.writeHead(200, {'Content-Type': 'text/event-stream'});
    res.write(`event: connected\ndata: ${JSON.stringify({timestamp: new Date().toISOString()})}\n\n`);
});

// ==================== TERMINAL API ====================

// Execute terminal command
expressApp.post('/api/terminal/execute', async (req, res) => {
    try {
        const {command, timeout = 120, cwd} = req.body;

        if (!command) {
            return res.status(400).json({error: 'Command is required'});
        }

        // Security: block dangerous commands
        const cmdLower = command.toLowerCase().trim();
        const dangerousPatterns = ['rm -rf /', 'format', 'del /f /s /q', 'rmdir /s /q', 'shutdown', 'taskkill /f'];

        for (const pattern of dangerousPatterns) {
            if (cmdLower.includes(pattern)) {
                return res.status(403).json({error: `Command blocked: potentially dangerous pattern: ${pattern}`});
            }
        }

        // Set working directory
        const workDir = cwd || process.cwd();

        // Execute command with timeout
        const startTime = Date.now();
        let output = '';
        let errorOutput = '';
        let exitCode = 0;

        try {
            // Use PowerShell on Windows for better command handling
            const {stdout, stderr} = await execAsync(command, {
                cwd: workDir,
                timeout: timeout * 1000,
                shell: process.platform === 'win32' ? 'powershell.exe' : undefined,
                maxBuffer: 10 * 1024 * 1024 // 10MB
            });
            output = stdout || '';
            errorOutput = stderr || '';
        } catch (execError: any) {
            exitCode = execError.code || 1;
            errorOutput = execError.message || '';
        }

        const duration = Date.now() - startTime;

        let response = `OK (dur=${duration}, code=${exitCode})`;
        if (output) response += `\n${output}`;
        if (errorOutput) response += `\n${errorOutput}`;

        res.json({output: response, exitCode, duration});
    } catch (error: any) {
        console.error('Terminal execution error:', error);
        res.status(500).json({error: error.message});
    }
});

// Terminal structured actions (workspace, history, session)
expressApp.post('/api/terminal/action', async (req, res) => {
    try {
        const {action, subAction, path: actionPath} = req.body;

        let output = '';

        switch (action) {
            case 'workspace':
                if (subAction === 'get') {
                    output = `🏠 Current workspace: ${process.cwd()}`;
                } else if (subAction === 'set') {
                    // Check if directory exists
                    try {
                        const stats = await fs.stat(actionPath);
                        if (!stats.isDirectory()) {
                            return res.status(400).json({error: 'Path is not a directory'});
                        }
                        output = `✅ Workspace set to: ${actionPath}`;
                    } catch {
                        return res.status(400).json({error: `Directory does not exist: ${actionPath}`});
                    }
                }
                break;
            case 'pwd':
                output = `📁 Current directory: ${process.cwd()}`;
                break;
            case 'session':
                if (subAction === 'info') {
                    output = JSON.stringify({
                        cwd: process.cwd(),
                        platform: process.platform,
                        pid: process.pid
                    }, null, 2);
                } else if (subAction === 'reset') {
                    output = 'Session state reset';
                }
                break;
            default:
                return res.status(400).json({error: `Unknown action: ${action}`});
        }

        res.json({output});
    } catch (error: any) {
        console.error('Terminal action error:', error);
        res.status(500).json({error: error.message});
    }
});

// ==================== FILE SYSTEM API ====================

// Scan directory for files
async function scanFiles(dir: string, options: {recursive?: boolean; maxDepth?: number; includeHidden?: boolean} = {}): Promise<{
    directory: string;
    files: Array<{name: string; path: string; size: number; modified: string}>;
    directories: Array<{name: string; path: string; modified: string}>;
    totalFiles: number;
    totalSize: number;
}> {
    const recursive = options.recursive ?? true;
    const maxDepth = options.maxDepth ?? 10;
    const includeHidden = options.includeHidden ?? false;
    
    const result = {
        directory: dir,
        files: [] as Array<{name: string; path: string; size: number; modified: string}>,
        directories: [] as Array<{name: string; path: string; modified: string}>,
        totalFiles: 0,
        totalSize: 0
    };

    async function scanDir(currentDir: string, depth: number = 0): Promise<void> {
        if (depth > maxDepth) return;

        try {
            const entries = await fs.readdir(currentDir, {withFileTypes: true});
            
            for (const entry of entries) {
                // Skip hidden files/directories if not included
                if (!includeHidden && entry.name.startsWith('.')) continue;
                
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    result.directories.push({
                        name: entry.name,
                        path: fullPath,
                        modified: (await fs.stat(fullPath)).mtime.toISOString()
                    });
                    
                    if (recursive) {
                        await scanDir(fullPath, depth + 1);
                    }
                } else if (entry.isFile()) {
                    const stats = await fs.stat(fullPath);
                    result.files.push({
                        name: entry.name,
                        path: fullPath,
                        size: stats.size,
                        modified: stats.mtime.toISOString()
                    });
                    result.totalFiles++;
                    result.totalSize += stats.size;
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${currentDir}:`, error);
        }
    }

    await scanDir(dir);
    return result;
}

expressApp.post('/api/fs/scan', async (req, res) => {
    try {
        const {dir, options = {}} = req.body;

        if (!dir) {
            return res.status(400).json({error: 'Directory path is required'});
        }

        const result = await scanFiles(dir, options);
        res.json(result);
    } catch (error: any) {
        console.error('File scan error:', error);
        res.status(500).json({error: error.message});
    }
});

// Read file
expressApp.post('/api/fs/read', async (req, res) => {
    try {
        const {filePath, encoding = 'utf-8'} = req.body;

        if (!filePath) {
            return res.status(400).json({error: 'File path is required'});
        }

        const content = await fs.readFile(filePath, encoding as BufferEncoding);
        res.json({content});
    } catch (error: any) {
        console.error('File read error:', error);
        res.status(500).json({error: error.message});
    }
});

// Write file
expressApp.post('/api/fs/write', async (req, res) => {
    try {
        const {filePath, content} = req.body;

        if (!filePath || content === undefined) {
            return res.status(400).json({error: 'File path and content are required'});
        }

        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, {recursive: true});

        await fs.writeFile(filePath, content, 'utf-8');
        res.json({success: true, path: filePath});
    } catch (error: any) {
        console.error('File write error:', error);
        res.status(500).json({error: error.message});
    }
});

// List directory
expressApp.post('/api/fs/list', async (req, res) => {
    try {
        const {dirPath} = req.body;

        if (!dirPath) {
            return res.status(400).json({error: 'Directory path is required'});
        }

        const entries = await fs.readdir(dirPath, {withFileTypes: true});
        const result = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            path: path.join(dirPath, entry.name)
        }));

        res.json({entries: result});
    } catch (error: any) {
        console.error('Directory list error:', error);
        res.status(500).json({error: error.message});
    }
});

// Check if path exists
expressApp.post('/api/fs/exists', async (req, res) => {
    try {
        const {path: checkPath} = req.body;

        if (!checkPath) {
            return res.status(400).json({error: 'Path is required'});
        }

        try {
            const stats = await fs.stat(checkPath);
            res.json({exists: true, isDirectory: stats.isDirectory(), isFile: stats.isFile()});
        } catch {
            res.json({exists: false});
        }
    } catch (error: any) {
        console.error('Path check error:', error);
        res.status(500).json({error: error.message});
    }
});

// Get current working directory
expressApp.get('/api/fs/cwd', (req, res) => {
    res.json({cwd: process.cwd()});
});

// ==================== RAG API ====================

// RAG configuration
const RAG_STORAGE_PATH = process.env['RAG_STORAGE_PATH'] || './rag-storage';
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css'];

// In-memory file metadata store
interface FileMetadata {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    uploadedAt: string;
    indexed: boolean;
    path: string;
    extension: string;
}

const filesStore: Map<string, FileMetadata> = new Map();

// Ensure storage directory exists
async function ensureStorageDir(): Promise<void> {
    try {
        await fs.mkdir(RAG_STORAGE_PATH, {recursive: true});
    } catch {
        // Directory may already exist
    }
}

// Validate file extension
function isAllowedExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
}

// POST /api/rag/search - Search through indexed documents
expressApp.post('/api/rag/search', async (req, res) => {
    try {
        const {query, limit = 10, filters} = req.body as {
            query?: string;
            limit?: number;
            filters?: Record<string, unknown>;
        };

        if (!query || typeof query !== 'string') {
            return res.status(400).json({error: 'Query is required and must be a string'});
        }

        const validLimit = typeof limit === 'number' ? Math.min(Math.max(1, limit), 100) : 10;

        // Build filter string
        let filter: string[] | undefined;
        if (filters && Object.keys(filters).length > 0) {
            filter = Object.entries(filters).map(([key, value]) => {
                if (typeof value === 'string') {
                    return `${key} = "${value}"`;
                }
                return `${key} = ${value}`;
            });
        }

        const client = new MeilisearchClient({
            host: process.env['MEILISEARCH_HOST'] || 'http://localhost:7700',
            apiKey: process.env['MEILISEARCH_API_KEY'] ?? undefined,
            indexName: process.env['MEILISEARCH_INDEX'] || 'code',
        });

        const isAvailable = await client.isAvailable();
        if (!isAvailable) {
            return res.status(503).json({error: 'Search service is not available'});
        }

        const results = await client.search(query, {
            limit: validLimit,
            filter: filter,
            attributesToRetrieve: ['id', 'path', 'content', 'name', 'extension', 'type'],
        });

        const formattedResults = results.hits.map((hit) => {
            const hitRecord = hit as Record<string, unknown>;
            return {
                id: hitRecord['id'],
                content: hitRecord['content'] || '',
                score: (hitRecord['_rankingScore'] as number) || 0,
                metadata: {
                    path: hitRecord['path'],
                    name: hitRecord['name'],
                    extension: hitRecord['extension'],
                    type: hitRecord['type'],
                },
            };
        });

        res.json({
            results: formattedResults,
            total: formattedResults.length,
            query,
        });
    } catch (error: any) {
        console.error('RAG search error:', error);
        res.status(500).json({error: error.message});
    }
});

// POST /api/rag/upload - Upload files for indexing
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
        if (ALLOWED_EXTENSIONS.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 20,
    },
});

expressApp.post('/api/rag/upload', upload.array('files', 20), async (req, res) => {
    try {
        await ensureStorageDir();

        const files = req.files as Express.Multer.File[] | undefined;

        if (!files || files.length === 0) {
            return res.status(400).json({error: 'No files provided for upload'});
        }

        const uploaded: Array<{id: string; filename: string; size: number}> = [];
        const failed: Array<{filename: string; error: string}> = [];
        const indexed: Array<{id: string; filename: string}> = [];

        const client = new MeilisearchClient({
            host: process.env['MEILISEARCH_HOST'] || 'http://localhost:7700',
            apiKey: process.env['MEILISEARCH_API_KEY'] ?? undefined,
            indexName: process.env['MEILISEARCH_INDEX'] || 'code',
        });

        for (const file of files) {
            try {
                if (!isAllowedExtension(file.originalname)) {
                    failed.push({
                        filename: file.originalname,
                        error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
                    });
                    continue;
                }

                const {randomUUID} = await import('crypto');
                const fileId = randomUUID();
                const ext = path.extname(file.originalname);
                const storedFilename = `${fileId}${ext}`;
                const filePath = path.join(RAG_STORAGE_PATH, storedFilename);

                await fs.writeFile(filePath, file.buffer);

                const metadata: FileMetadata = {
                    id: fileId,
                    filename: storedFilename,
                    originalName: file.originalname,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                    indexed: false,
                    path: filePath,
                    extension: ext.slice(1),
                };

                filesStore.set(fileId, metadata);
                uploaded.push({id: fileId, filename: file.originalname, size: file.size});

                // Index file content
                try {
                    const document = {
                        id: fileId,
                        path: filePath,
                        name: file.originalname,
                        content: file.buffer.toString('utf-8'),
                        extension: ext.slice(1),
                        type: 'file',
                    };

                    await client.addDocuments([document]);
                    metadata.indexed = true;
                    indexed.push({id: fileId, filename: file.originalname});
                } catch (indexError) {
                    console.error(`Failed to index file ${file.originalname}:`, indexError);
                }
            } catch (fileError) {
                failed.push({
                    filename: file.originalname,
                    error: fileError instanceof Error ? fileError.message : 'Unknown error',
                });
            }
        }

        res.json({uploaded, failed, indexed});
    } catch (error: any) {
        console.error('RAG upload error:', error);
        res.status(500).json({error: error.message});
    }
});

// GET /api/rag/files/:fileId - Get file metadata
expressApp.get('/api/rag/files/:fileId', async (req, res) => {
    try {
        const {fileId} = req.params;

        if (!fileId) {
            return res.status(400).json({error: 'File ID is required'});
        }

        const metadata = filesStore.get(fileId);

        if (!metadata) {
            return res.status(404).json({error: 'File not found'});
        }

        res.json({
            id: metadata.id,
            filename: metadata.originalName,
            size: metadata.size,
            uploadedAt: metadata.uploadedAt,
            indexed: metadata.indexed,
            extension: metadata.extension,
        });
    } catch (error: any) {
        console.error('RAG get file error:', error);
        res.status(500).json({error: error.message});
    }
});

// DELETE /api/rag/files/:fileId - Delete file
expressApp.delete('/api/rag/files/:fileId', async (req, res) => {
    try {
        const {fileId} = req.params;

        if (!fileId) {
            return res.status(400).json({error: 'File ID is required'});
        }

        const metadata = filesStore.get(fileId);

        if (!metadata) {
            return res.status(404).json({error: 'File not found'});
        }

        // Delete from storage
        try {
            await fs.unlink(metadata.path);
        } catch {
            // File may not exist
        }

        // Delete from search index
        try {
            const client = new MeilisearchClient({
                host: process.env['MEILISEARCH_HOST'] || 'http://localhost:7700',
                apiKey: process.env['MEILISEARCH_API_KEY'] ?? undefined,
                indexName: process.env['MEILISEARCH_INDEX'] || 'code',
            });
            await client.deleteDocument(fileId);
        } catch {
            // Index may not have the document
        }

        filesStore.delete(fileId);

        res.json({success: true, message: 'File deleted successfully', id: fileId});
    } catch (error: any) {
        console.error('RAG delete file error:', error);
        res.status(500).json({error: error.message});
    }
});

// ==================== ENHANCED SESSION STORAGE ====================

// GET /api/sessions/:sessionId/metadata - Get session metadata
expressApp.get(['/api/sessions/:sessionId/metadata', '/api/v1/sessions/:sessionId/metadata'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    
    const session = await loadSession(project, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    
    res.json({
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages?.length ?? 0,
        lastPromiseId: session.lastPromiseId,
    });
});

// PATCH /api/sessions/:sessionId - Update session
expressApp.patch(['/api/sessions/:sessionId', '/api/v1/sessions/:sessionId'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const updates = req.body || {};

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    
    const session = await loadSession(project, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    
    const updated: Session = {
        ...session,
        ...updates,
        // Merge context instead of replacing
        context: updates.context 
            ? { ...session.context, ...updates.context }
            : session.context,
        updatedAt: new Date().toISOString(),
    };
    
    await saveSession(project, updated);
    
    // Broadcast update via WebSocket
    broadcastProgress(sessionId, {
        status: 'session_updated',
        message: 'Session updated',
        result: updated,
    });
    
    res.json(updated);
});

// POST /api/sessions/:sessionId/messages - Add message to session
expressApp.post(['/api/sessions/:sessionId/messages', '/api/v1/sessions/:sessionId/messages'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const message = req.body || {};

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    
    const session = await loadSession(project, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    
    const messages = session.messages ?? [];
    messages.push({
        ...message,
        id: `msg_${randomUUID()}`,
        timestamp: new Date().toISOString(),
    });
    
    const updated: Session = {
        ...session,
        messages,
        updatedAt: new Date().toISOString(),
    };
    
    await saveSession(project, updated);
    
    const lastMessage = messages[messages.length - 1] as { id?: string } | undefined;
    res.status(201).json({ success: true, messageId: lastMessage?.id });
});

// DELETE /api/sessions - Delete multiple sessions
expressApp.delete(['/api/sessions', '/api/v1/sessions'], async (req, res) => {
    const sessionIds = req.body?.sessionIds as string[] | undefined;
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';

    if (!sessionIds || !Array.isArray(sessionIds)) {
        jsonError(res, 400, 'sessionIds array is required');
        return;
    }

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    
    const deleted: string[] = [];
    const failed: string[] = [];
    
    for (const sessionId of sessionIds) {
        try {
            await deleteSession(project, sessionId);
            deleted.push(sessionId);
        } catch {
            failed.push(sessionId);
        }
    }
    
    res.json({ deleted, failed });
});

// ==================== FILE UPLOAD/DOWNLOAD ====================

// Configure multer for general file uploads
const fileUpload = multer({
    storage: multer.diskStorage({
        destination: async (req, file, cb) => {
            const uploadDir = process.env.UPLOAD_DIR || path.join(storageDir, 'uploads');
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}-${randomUUID()}-${file.originalname}`;
            cb(null, uniqueName);
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 10,
    },
});

// POST /api/files/upload - Upload files
expressApp.post(['/api/files/upload', '/api/v1/files/upload'], fileUpload.array('files', 10), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[] | undefined;
        
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files provided' });
        }
        
        const uploaded = files.map(file => ({
            id: randomUUID(),
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            uploadedAt: new Date().toISOString(),
        }));
        
        res.status(201).json({ uploaded });
    } catch (error: any) {
        console.error('File upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/files/:fileId - Download file
expressApp.get(['/api/files/:fileId', '/api/v1/files/:fileId'], async (req, res) => {
    try {
        const fileId = String(req.params.fileId || '');
        const uploadDir = process.env.UPLOAD_DIR || path.join(storageDir, 'uploads');
        
        // Find file by ID (stored in memory for this implementation)
        const files = await fs.readdir(uploadDir);
        let filePath: string | null = null;
        
        for (const file of files) {
            if (file.includes(fileId)) {
                filePath = path.join(uploadDir, file);
                break;
            }
        }
        
        if (!filePath) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.download(filePath);
    } catch (error: any) {
        console.error('File download error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/files/:fileId - Delete uploaded file
expressApp.delete(['/api/files/:fileId', '/api/v1/files/:fileId'], async (req, res) => {
    try {
        const fileId = String(req.params.fileId || '');
        const uploadDir = process.env.UPLOAD_DIR || path.join(storageDir, 'uploads');
        
        const files = await fs.readdir(uploadDir);
        let deleted = false;
        
        for (const file of files) {
            if (file.includes(fileId)) {
                await fs.unlink(path.join(uploadDir, file));
                deleted = true;
                break;
            }
        }
        
        if (!deleted) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.json({ success: true, message: 'File deleted' });
    } catch (error: any) {
        console.error('File delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/files - List uploaded files
expressApp.get(['/api/files', '/api/v1/files'], async (req, res) => {
    try {
        const uploadDir = process.env.UPLOAD_DIR || path.join(storageDir, 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        
        const files = await fs.readdir(uploadDir);
        const fileList = await Promise.all(
            files
                .filter(f => !f.startsWith('.'))
                .map(async (file) => {
                    const stats = await fs.stat(path.join(uploadDir, file));
                    return {
                        id: file.split('-')[1] || file, // Extract UUID part
                        filename: file,
                        size: stats.size,
                        uploadedAt: stats.mtime.toISOString(),
                    };
                })
        );
        
        res.json({ files: fileList });
    } catch (error: any) {
        console.error('File list error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== WEBSOCKET INFO ENDPOINT ====================

// Get WebSocket connection info
expressApp.get(['/api/ws', '/api/v1/ws'], (req, res) => {
    res.json({
        wsUrl: `ws://${HOST}:${WS_PORT}`,
        activeSessions: Array.from(wsConnections.keys()),
        connectionCount: Array.from(wsConnections.values()).reduce((sum, set) => sum + set.size, 0),
    });
});

// ==================== HEALTH CHECK ====================

expressApp.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'a2a-client-api',
        timestamp: new Date().toISOString()
    });
});

// ==================== START SERVER ====================

if (process.env.NODE_ENV !== 'test') {
    expressApp.listen(PORT, HOST, () => {
        console.log(`A2A Client API Server started on http://${HOST}:${PORT}`);
        console.log(`WebSocket Server started on ws://${HOST}:${WS_PORT}`);
        console.log(`Health check: http://${HOST}:${PORT}/health`);
        console.log(`Terminal: http://${HOST}:${PORT}/api/terminal/execute`);
        console.log(`File System: http://${HOST}:${PORT}/api/fs/*`);
        console.log(`Sessions: http://${HOST}:${PORT}/api/sessions/*`);
        console.log(`File Upload: http://${HOST}:${PORT}/api/files/upload`);
    });
}

export default expressApp;
