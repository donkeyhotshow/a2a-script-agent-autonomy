/**
 * A2A Client API Server
 *
 * Exposes client-side tools (terminal, fs-utils, etc.) via REST API
 * This runs on the client machine to provide local file system and terminal access
 */
import express from 'express';
import cors from 'cors';
import { scanFiles } from '@a2a/fs-utils';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Configuration
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || 'localhost';
// Create Express app
const app = express();
// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
const packageRoot = path.resolve(__dirname, '..');
const a2aClientRoot = path.resolve(packageRoot, '../..');
const storageDir = path.join(a2aClientRoot, 'storage');
const PROJECTS_FILE = path.join(storageDir, 'projects.json');
const CONFIG_FILE = path.join(storageDir, 'config.json');
const DEFAULT_CONFIG = {
    serverUrl: process.env.A2A_SERVER_URL || 'http://localhost:3000/api/v1',
    token: process.env.A2A_SERVER_TOKEN || null,
};
async function readJsonFile(filePath, fallback) {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return fallback;
    }
}
async function writeJsonFile(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8');
    try {
        await fs.rm(filePath, { force: true });
    }
    catch {
        // ignore
    }
    await fs.rename(tmp, filePath);
}
async function loadConfig() {
    return readJsonFile(CONFIG_FILE, DEFAULT_CONFIG);
}
async function saveConfig(config) {
    const normalized = {
        serverUrl: String(config.serverUrl || DEFAULT_CONFIG.serverUrl).replace(/\/?$/, ''),
        token: config.token ?? null,
    };
    await writeJsonFile(CONFIG_FILE, normalized);
    return normalized;
}
async function loadProjects() {
    const data = await readJsonFile(PROJECTS_FILE, { projects: [] });
    return Array.isArray(data.projects) ? data.projects : [];
}
async function saveProjects(projects) {
    await writeJsonFile(PROJECTS_FILE, { projects });
}
function safePath(base, subPath) {
    const resolved = path.resolve(base, subPath);
    const baseResolved = path.resolve(base);
    const prefix = baseResolved.endsWith(path.sep) ? baseResolved : baseResolved + path.sep;
    if (resolved !== baseResolved && !resolved.startsWith(prefix))
        return null;
    return resolved;
}
function sessionDirForProject(projectPath) {
    return path.join(projectPath, '.a2a', 'sessions');
}
async function listSessions(projectPath) {
    const dir = sessionDirForProject(projectPath);
    try {
        const entries = await fs.readdir(dir);
        const sessions = [];
        for (const file of entries) {
            if (!file.endsWith('.json'))
                continue;
            try {
                const raw = await fs.readFile(path.join(dir, file), 'utf-8');
                const s = JSON.parse(raw);
                if (!s.id)
                    continue;
                sessions.push({ id: s.id, title: String(s.title || s.id), createdAt: s.createdAt });
            }
            catch {
                // ignore bad session file
            }
        }
        sessions.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return sessions;
    }
    catch {
        return [];
    }
}
async function loadSession(projectPath, sessionId) {
    const file = path.join(sessionDirForProject(projectPath), `${sessionId}.json`);
    try {
        const raw = await fs.readFile(file, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function saveSession(projectPath, session) {
    const dir = sessionDirForProject(projectPath);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${session.id}.json`);
    await writeJsonFile(file, session);
}
async function deleteSession(projectPath, sessionId) {
    const file = path.join(sessionDirForProject(projectPath), `${sessionId}.json`);
    try {
        await fs.unlink(file);
    }
    catch {
        // ignore
    }
}
async function serverFetch(method, serverBaseUrl, pathName, body = null) {
    const cfg = await loadConfig();
    const headers = {};
    if (cfg.token)
        headers['Authorization'] = `Bearer ${cfg.token}`;
    if (body != null)
        headers['Content-Type'] = 'application/json';
    const url = `${serverBaseUrl.replace(/\/?$/, '')}${pathName}`;
    return fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
    });
}
async function getServerBaseUrl() {
    const cfg = await loadConfig();
    return cfg.serverUrl.replace(/\/?$/, '');
}
function jsonError(res, status, message, details) {
    res.status(status).json({ success: false, error: { message }, details });
}
// ==================== CLIENT API (NEW-REQUEST-FLOW) ====================
// --- config
app.get(['/api/config', '/api/v1/config'], async (_req, res) => {
    const cfg = await loadConfig();
    res.json(cfg);
});
app.post(['/api/config', '/api/v1/config'], async (req, res) => {
    const body = (req.body || {});
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
app.get(['/api/projects', '/api/v1/projects'], async (_req, res) => {
    const projects = await loadProjects();
    // Web UI expects a bare array
    res.json(projects);
});
app.post(['/api/projects', '/api/v1/projects'], async (req, res) => {
    const body = (req.body || {});
    const name = String(body.name || '').trim();
    if (!name) {
        jsonError(res, 400, 'name is required');
        return;
    }
    const projects = await loadProjects();
    const project = {
        id: body.id ? String(body.id) : `p_${Date.now()}`,
        name,
        description: body.description ? String(body.description) : undefined,
        path: body.path ? String(body.path) : undefined,
    };
    projects.unshift(project);
    await saveProjects(projects);
    res.status(201).json(project);
});
app.delete(['/api/projects/:projectId', '/api/v1/projects/:projectId'], async (req, res) => {
    const projectId = String(req.params.projectId || '');
    const projects = await loadProjects();
    const next = projects.filter((p) => p.id !== projectId);
    await saveProjects(next);
    res.json({ success: true });
});
// --- project files (used by PanelManager and other UI features)
app.get(['/api/projects/:projectId/files/*', '/api/v1/projects/:projectId/files/*'], async (req, res) => {
    const projectId = String(req.params.projectId || '');
    const fileRel = decodeURIComponent(String(req.params[0] || '')).replace(/^\/+/, '');
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
    }
    catch {
        res.status(404).json({ error: 'File not found' });
    }
});
app.put(['/api/projects/:projectId/files/*', '/api/v1/projects/:projectId/files/*'], async (req, res) => {
    const projectId = String(req.params.projectId || '');
    const fileRel = decodeURIComponent(String(req.params[0] || '')).replace(/^\/+/, '');
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
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(req.body ?? {}, null, 2), 'utf-8');
    res.json({ success: true, path: fullPath });
});
// --- sessions (stored per-project in <projectPath>/.a2a/sessions)
app.get(['/api/sessions', '/api/v1/sessions'], async (req, res) => {
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project?.path) {
        res.json([]);
        return;
    }
    const sessions = await listSessions(project.path);
    res.json(sessions);
});
app.post(['/api/sessions', '/api/v1/sessions'], async (req, res) => {
    const body = (req.body || {});
    const projectId = String(body.projectId || '').trim();
    if (!projectId) {
        jsonError(res, 400, 'projectId is required');
        return;
    }
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project?.path) {
        jsonError(res, 404, 'Project not found or missing path');
        return;
    }
    const now = new Date().toISOString();
    const session = {
        id: `sess_${randomUUID()}`,
        projectId,
        title: String(body.title || 'New Session'),
        task: body.task ? String(body.task) : undefined,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
        messages: [],
    };
    await saveSession(project.path, session);
    res.status(201).json(session);
});
app.get(['/api/sessions/:sessionId', '/api/v1/sessions/:sessionId'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project?.path) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    const session = await loadSession(project.path, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    res.json(session);
});
app.delete(['/api/sessions/:sessionId', '/api/v1/sessions/:sessionId'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : '';
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project?.path) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    await deleteSession(project.path, sessionId);
    res.json({ success: true });
});
// Best-effort helpers for the new-request-flow endpoints (kept minimal for compatibility)
app.post(['/api/sessions/:sessionId/action', '/api/v1/sessions/:sessionId/action'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');
    const action = String(req.body?.action || req.body?.actionId || '').trim();
    if (!action) {
        jsonError(res, 400, 'action is required');
        return;
    }
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project?.path) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    const existing = await loadSession(project.path, sessionId);
    if (!existing) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    const updated = {
        ...existing,
        selectedAction: action,
        status: 'READY',
        updatedAt: new Date().toISOString(),
    };
    await saveSession(project.path, updated);
    res.json(updated);
});
app.post(['/api/sessions/:sessionId/next', '/api/v1/sessions/:sessionId/next'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project?.path) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    const session = await loadSession(project.path, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    const serverBase = await getServerBaseUrl();
    // Forward to server /invoke, and store promiseId if returned
    const upstream = await serverFetch('POST', serverBase, '/invoke', req.body ?? {});
    const payload = (await upstream.json().catch(() => ({})));
    if (!upstream.ok) {
        res.status(upstream.status).json(payload);
        return;
    }
    const promiseId = payload?.data?.promiseId || payload?.promiseId;
    if (promiseId) {
        const updated = {
            ...session,
            lastPromiseId: promiseId,
            status: 'IN_PROGRESS',
            updatedAt: new Date().toISOString(),
        };
        await saveSession(project.path, updated);
    }
    res.status(upstream.status).json(payload);
});
app.post(['/api/sessions/:sessionId/cancel', '/api/v1/sessions/:sessionId/cancel'], async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : String(req.body?.projectId || '');
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId) ?? projects[0];
    if (!project?.path) {
        jsonError(res, 404, 'Project not found');
        return;
    }
    const session = await loadSession(project.path, sessionId);
    if (!session) {
        jsonError(res, 404, 'Session not found');
        return;
    }
    const updated = { ...session, status: 'CANCELLED', updatedAt: new Date().toISOString() };
    await saveSession(project.path, updated);
    res.json(updated);
});
// --- server proxy (web must not know server address)
app.post('/api/v1/invoke', async (req, res) => {
    const serverBase = await getServerBaseUrl();
    const upstream = await serverFetch('POST', serverBase, '/invoke', req.body ?? {});
    const payload = (await upstream.json().catch(() => ({})));
    res.status(upstream.status).json(payload);
});
app.all('/api/v1/requests*', async (req, res) => {
    const serverBase = await getServerBaseUrl();
    const pathName = req.originalUrl.replace(/^\/api\/v1/, '');
    const body = req.method === 'GET' || req.method === 'HEAD' ? null : (req.body ?? {});
    const upstream = await serverFetch(req.method, serverBase, pathName, body);
    const payload = (await upstream.json().catch(() => ({})));
    res.status(upstream.status).json(payload);
});
app.get('/api/v1/sse/:sessionId', async (req, res) => {
    const sessionId = String(req.params.sessionId || '');
    const serverBase = await getServerBaseUrl();
    const cfg = await loadConfig();
    const headers = {};
    if (cfg.token)
        headers['Authorization'] = `Bearer ${cfg.token}`;
    const upstream = await fetch(`${serverBase}/sse/${encodeURIComponent(sessionId)}`, { headers });
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
    const nodeStream = Readable.fromWeb(upstream.body);
    nodeStream.pipe(res);
    const cleanup = () => {
        nodeStream.unpipe(res);
        nodeStream.destroy();
        res.end();
    };
    req.on('close', cleanup);
});
app.get('/api/v1/sse', async (_req, res) => {
    // Keep it simple: web should subscribe to a session SSE stream.
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
});
// ==================== TERMINAL API ====================
// Execute terminal command
app.post('/api/terminal/execute', async (req, res) => {
    try {
        const { command, timeout = 120, cwd } = req.body;
        if (!command) {
            return res.status(400).json({ error: 'Command is required' });
        }
        // Security: block dangerous commands
        const cmdLower = command.toLowerCase().trim();
        const dangerousPatterns = ['rm -rf /', 'format', 'del /f /s /q', 'rmdir /s /q', 'shutdown', 'taskkill /f'];
        for (const pattern of dangerousPatterns) {
            if (cmdLower.includes(pattern)) {
                return res.status(403).json({ error: `Command blocked: potentially dangerous pattern: ${pattern}` });
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
            const { stdout, stderr } = await execAsync(command, {
                cwd: workDir,
                timeout: timeout * 1000,
                shell: process.platform === 'win32' ? 'powershell.exe' : undefined,
                maxBuffer: 10 * 1024 * 1024 // 10MB
            });
            output = stdout || '';
            errorOutput = stderr || '';
        }
        catch (execError) {
            exitCode = execError.code || 1;
            errorOutput = execError.message || '';
        }
        const duration = Date.now() - startTime;
        let response = `OK (dur=${duration}, code=${exitCode})`;
        if (output)
            response += `\n${output}`;
        if (errorOutput)
            response += `\n${errorOutput}`;
        res.json({ output: response, exitCode, duration });
    }
    catch (error) {
        console.error('Terminal execution error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Terminal structured actions (workspace, history, session)
app.post('/api/terminal/action', async (req, res) => {
    try {
        const { action, subAction, path: actionPath } = req.body;
        let output = '';
        switch (action) {
            case 'workspace':
                if (subAction === 'get') {
                    output = `🏠 Current workspace: ${process.cwd()}`;
                }
                else if (subAction === 'set') {
                    // Check if directory exists
                    try {
                        const stats = await fs.stat(actionPath);
                        if (!stats.isDirectory()) {
                            return res.status(400).json({ error: 'Path is not a directory' });
                        }
                        output = `✅ Workspace set to: ${actionPath}`;
                    }
                    catch {
                        return res.status(400).json({ error: `Directory does not exist: ${actionPath}` });
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
                }
                else if (subAction === 'reset') {
                    output = 'Session state reset';
                }
                break;
            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }
        res.json({ output });
    }
    catch (error) {
        console.error('Terminal action error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ==================== FILE SYSTEM API ====================
// Scan directory for files
app.post('/api/fs/scan', async (req, res) => {
    try {
        const { dir, options = {} } = req.body;
        if (!dir) {
            return res.status(400).json({ error: 'Directory path is required' });
        }
        const result = await scanFiles(dir, options);
        res.json(result);
    }
    catch (error) {
        console.error('File scan error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Read file
app.post('/api/fs/read', async (req, res) => {
    try {
        const { filePath, encoding = 'utf-8' } = req.body;
        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }
        const content = await fs.readFile(filePath, encoding);
        res.json({ content });
    }
    catch (error) {
        console.error('File read error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Write file
app.post('/api/fs/write', async (req, res) => {
    try {
        const { filePath, content } = req.body;
        if (!filePath || content === undefined) {
            return res.status(400).json({ error: 'File path and content are required' });
        }
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        res.json({ success: true, path: filePath });
    }
    catch (error) {
        console.error('File write error:', error);
        res.status(500).json({ error: error.message });
    }
});
// List directory
app.post('/api/fs/list', async (req, res) => {
    try {
        const { dirPath } = req.body;
        if (!dirPath) {
            return res.status(400).json({ error: 'Directory path is required' });
        }
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const result = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            path: path.join(dirPath, entry.name)
        }));
        res.json({ entries: result });
    }
    catch (error) {
        console.error('Directory list error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Check if path exists
app.post('/api/fs/exists', async (req, res) => {
    try {
        const { path: checkPath } = req.body;
        if (!checkPath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        try {
            const stats = await fs.stat(checkPath);
            res.json({ exists: true, isDirectory: stats.isDirectory(), isFile: stats.isFile() });
        }
        catch {
            res.json({ exists: false });
        }
    }
    catch (error) {
        console.error('Path check error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get current working directory
app.get('/api/fs/cwd', (req, res) => {
    res.json({ cwd: process.cwd() });
});
// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'a2a-client-api',
        timestamp: new Date().toISOString()
    });
});
// ==================== START SERVER ====================
app.listen(PORT, HOST, () => {
    console.log(`A2A Client API Server started on http://${HOST}:${PORT}`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
    console.log(`Terminal: http://${HOST}:${PORT}/api/terminal/execute`);
    console.log(`File System: http://${HOST}:${PORT}/api/fs/*`);
});
export default app;
//# sourceMappingURL=index.js.map