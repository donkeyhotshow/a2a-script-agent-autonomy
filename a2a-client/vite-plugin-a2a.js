/**
 * Vite plugin: serve .a2a data from project folders.
 * Projects stored in storage/projects.json
 * Also handles /api/storage for KV storage
 * Storage (sessions, kv) is outside project - in user data dir
 */
import fs from 'fs';
import path from 'path';
import { getStorageRoot } from './vite-plugin-a2a/storage/root.js';
import { loadProjects, saveProjects } from './vite-plugin-a2a/storage/projects.js';
import {
    getProjectPathForSessions,
    listSessions,
    loadSession,
    saveSession,
    deleteSession
} from './vite-plugin-a2a/storage/projectSessions.js';
import {
    getNewSessionLatestStep,
    getNewStepDir,
    listNewSessions,
    listNewSteps,
    loadNewSession,
    saveNewSession,
    saveNewStep,
    loadNewStep,
    deleteNewSession,
    saveServerResponse,
    loadServerPromise,
    saveServerPromise,
    saveClientResult,
    saveRequestToServer,
    loadStepFile,
    loadServerResponse
} from './vite-plugin-a2a/storage/newSessions.js';
import { kvGet, kvSet, kvDelete, kvKeys, kvClear } from './vite-plugin-a2a/storage/kv.js';
const API_PREFIX = '/api/a2a';
const STORAGE_PREFIX = '/api/storage';
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function safePath(base, sub) {
    const resolved = path.resolve(base, sub);
    if (!resolved.startsWith(path.resolve(base))) return null;
    return resolved;
}

function isValidSessionId(id) {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 64;
}

function getStorageMode(req) {
    const h = req.headers['x-storage-mode'];
    return (h === 'project' || h === 'storage') ? h : 'storage';
}

export default function vitePluginA2a() {
    // Use absolute path to a2a-client directory
    // This ensures storage goes to the correct location regardless of where vite is launched from
    // Try multiple approaches to find the correct path
    let basePath = process.cwd();
    
    // Check if we're in a2a-client or in a2a-script-agent
    if (!fs.existsSync(path.join(basePath, 'a2a-client'))) {
        // Maybe we're in a2a-client already
        if (fs.existsSync(path.join(basePath, 'web')) || fs.existsSync(path.join(basePath, 'packages'))) {
            // We're likely in a2a-client, use this as base
        } else {
            // Try parent directory (a2a-script-agent case)
            const parentPath = path.join(basePath, '..');
            if (fs.existsSync(path.join(parentPath, 'a2a-client'))) {
                basePath = parentPath;
            }
        }
    }
    
    const cwd = fs.existsSync(path.join(basePath, 'a2a-client')) 
        ? path.join(basePath, 'a2a-client') 
        : basePath;
    
    const storageRoot = getStorageRoot();
    console.log('[vite-plugin-a2a] Project path:', cwd, '| Storage:', storageRoot);
    
    return {
        name: 'vite-plugin-a2a',
        configureServer(server) {
            // Use console.error to ensure visibility
            console.error('[VitePlugin-A2A] Starting initialization...');
            
            server.middlewares.use((req, res, next) => {
                console.error('[VitePlugin-A2A] REQUEST:', req.method, req.url);
                if (!req.url?.startsWith(API_PREFIX)) {
                    console.error('[VitePlugin-A2A] Skipping - not API prefix');
                    return next();
                }
                console.error('[VitePlugin-A2A] Processing:', req.method, req.url);

                const url = new URL(req.url, 'http://localhost');
                const p = url.pathname.slice(API_PREFIX.length);

                if (req.method === 'GET' && p === '/projects') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({projects: loadProjects(cwd)}));
                    return;
                }

                if (req.method === 'POST' && p === '/projects') {
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            const projects = d.projects ?? (Array.isArray(d) ? d : null);
                            if (Array.isArray(projects)) {
                                saveProjects(cwd, projects);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({success: true, projects}));
                            } else res.writeHead(400).end(JSON.stringify({error: 'projects array required'}));
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                const m = p.match(/^\/projects\/([^/]+)\/data$/);
                if (req.method === 'GET' && m) {
                    const projects = loadProjects(cwd);
                    const proj = projects.find((x) => x.id === m[1]);
                    if (!proj?.path) {
                        res.writeHead(404).end(JSON.stringify({error: 'Project not found'}));
                        return;
                    }
                    const a2aDir = path.join(proj.path, '.a2a');
                    if (!fs.existsSync(a2aDir)) {
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({index: {}, files: []}));
                        return;
                    }
                    const out = {index: {}, files: []};
                    const indexDir = path.join(a2aDir, 'index');
                    if (fs.existsSync(indexDir)) {
                        const ragFile = path.join(indexDir, 'rag-files.json');
                        if (fs.existsSync(ragFile)) {
                            out.index = JSON.parse(fs.readFileSync(ragFile, 'utf8'));
                        }
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(out));
                    return;
                }

                const fileMatch = p.match(/^\/projects\/([^/]+)\/files\/(.+)$/);
                if (req.method === 'GET' && fileMatch) {
                    const projects = loadProjects(cwd);
                    const proj = projects.find((x) => x.id === fileMatch[1]);
                    if (!proj?.path) {
                        res.writeHead(404).end('Not found');
                        return;
                    }
                    const filePath = decodeURIComponent(fileMatch[2]);
                    const full = safePath(proj.path, filePath);
                    if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) {
                        res.writeHead(404).end('Not found');
                        return;
                    }
                    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                    res.end(fs.readFileSync(full, 'utf8'));
                    return;
                }

                // Removed old project-based session routes - using direct /sessions API instead

                // Session storage API - supports project (.a2a) or storage/sessions via X-Storage-Mode
                const storageMode = getStorageMode(req);
                console.log('[VitePlugin] Request:', req.method, p, 'storageMode:', storageMode);

                // GET /api/a2a/sessions - list all sessions
                if (req.method === 'GET' && p === '/sessions') {
                    const sessions = storageMode === 'project'
                        ? listSessions(getProjectPathForSessions(cwd))
                        : listNewSessions(cwd);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({sessions}));
                    return;
                }

                // POST /api/a2a/sessions - create new session
                if (req.method === 'POST' && p === '/sessions') {
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            const title = d.title || 'New Session';
                            const sessionId = d.id || `sess_${Date.now()}`;
                            const session = {
                                id: sessionId,
                                title,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                status: 'created',
                                currentStep: 1,
                                context: { execution: { action: 'task', step: 'new' } },
                                execute: {
                                    message:'What would you like me to do?',
                                    form: {
                                        input: {
                                            name: 'task',
                                            label: 'Enter your task'
                                        }
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
                                    execute: session.execute,
                                    messages: [],
                                    context: session.context
                                });
                            }

                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({success: true, session}));
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                // GET /api/a2a/sessions/:sessionId - get session metadata
                const newSessionMatch = p.match(/^\/sessions\/([^/]+)$/);
                if (req.method === 'GET' && newSessionMatch) {
                    const sessionId = newSessionMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    const session = storageMode === 'project'
                        ? loadSession(getProjectPathForSessions(cwd), sessionId)
                        : loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(session));
                    return;
                }

                // PUT /api/a2a/sessions/:sessionId - update session
                if (req.method === 'PUT' && newSessionMatch) {
                    const sessionId = newSessionMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            const projectPath = storageMode === 'project' ? getProjectPathForSessions(cwd) : null;
                            const existing = storageMode === 'project'
                                ? loadSession(projectPath, sessionId)
                                : loadNewSession(cwd, sessionId);
                            if (!existing) {
                                res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                                return;
                            }
                            const session = {
                                ...existing,
                                ...(d.title !== undefined && {title: d.title}),
                                ...(d.status !== undefined && {status: d.status}),
                                ...(d.execute !== undefined && {execute: d.execute}),
                                ...(d.context !== undefined && {context: d.context}),
                                ...(d.currentStep !== undefined && {currentStep: d.currentStep}),
                                updatedAt: new Date().toISOString(),
                            };
                            if (storageMode === 'project') {
                                saveSession(projectPath, session);
                            } else {
                                saveNewSession(cwd, session);
                            }
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({success: true, session}));
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                // DELETE /api/a2a/sessions/:sessionId - delete session
                if (req.method === 'DELETE' && newSessionMatch) {
                    const sessionId = newSessionMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    if (storageMode === 'project') {
                        deleteSession(getProjectPathForSessions(cwd), sessionId);
                    } else {
                        deleteNewSession(cwd, sessionId);
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({success: true}));
                    return;
                }

                // Steps API - only for storage mode (project mode uses single file)
                const stepsListMatch = p.match(/^\/sessions\/([^/]+)\/steps$/);
                if (req.method === 'GET' && stepsListMatch && storageMode === 'storage') {
                    const sessionId = stepsListMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    const steps = listNewSteps(cwd, sessionId);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({steps}));
                    return;
                }

                const stepDetailMatch = p.match(/^\/sessions\/([^/]+)\/steps\/(\d+)$/);
                if (req.method === 'GET' && stepDetailMatch && storageMode === 'storage') {
                    const sessionId = stepDetailMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    const stepNum = parseInt(stepDetailMatch[2], 10);
                    const step = loadNewStep(cwd, sessionId, stepNum);
                    if (!step) {
                        res.writeHead(404).end(JSON.stringify({error: 'Step not found'}));
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(step));
                    return;
                }

                if (req.method === 'POST' && stepsListMatch && storageMode === 'storage') {
                    const sessionId = stepsListMatch[1];
                    console.log('[VitePlugin] POST /steps - sessionId:', sessionId, 'storageMode:', storageMode);
                    if (!isValidSessionId(sessionId)) {
                        console.log('[VitePlugin] Invalid session ID:', sessionId);
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', async () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            console.log('[VitePlugin] Step data keys:', Object.keys(d));
                            const session = loadNewSession(cwd, sessionId);
                            console.log('[VitePlugin] Loaded session:', session ? 'found' : 'NOT FOUND', sessionId);
                            if (!session) {
                                res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                                return;
                            }
                            
                            const nextStepNum = (session.currentStep || 0) + 1;
                            const stepDir = getNewStepDir(cwd, sessionId, nextStepNum);
                            
                            // Save client-result.json in CURRENT step (N)
                            if (d.result) {
                                saveClientResult(cwd, sessionId, currentStep, d.result);
                            }
                            
                            // Save messages
                            const messages = d.messages || [];
                            
                            // Prepare context from previous steps
                            const context = d.context || session.context || {};
                            
                            // Build request-to-server.json if there's execute or result
                            let requestToServer = null;
                            if (d.result || d.execute) {
                                requestToServer = {
                                    step: nextStepNum,
                                    timestamp: new Date().toISOString(),
                                    result: d.result,
                                    execute: d.execute,
                                    context,
                                    messages
                                };
                                saveRequestToServer(cwd, sessionId, nextStepNum, requestToServer);
                            }
                            
                            // If there's a task or result, make request to A2A Server
                            let serverResponse = null;
                            let serverPromise = null;
                            
                            if (d.execute?.form?.input || d.result) {
                                try {
                                    const a2aUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
                                    const requestBody = {
                                        id: `req_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                                        sessionId: sessionId,
                                        message: d.result?.message || d.execute?.form?.input?.value || '',
                                        context,
                                        execution: {
                                            action: d.execute?.script ? 'script' : (d.result?.choice ? 'action' : 'continue'),
                                            step: d.execute?.script ? 'run' : 'next'
                                        }
                                    };
                                    
                                    const serverReqRes = await fetch(`${a2aUrl}/api/v1/requests`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'x-skip-auth': 'true'
                                        },
                                        body: JSON.stringify(requestBody)
                                    });
                                    
                                    const serverData = await serverReqRes.json();
                                    
                                    // Save server-promise.json
                                    if (serverData.data?.promiseId) {
                                        serverPromise = {
                                            promiseId: serverData.data.promiseId,
                                            status: serverData.data.status || 'pending',
                                            pollUrl: serverData.data.pollUrl,
                                            submittedAt: new Date().toISOString()
                                        };
                                        saveServerPromise(cwd, sessionId, nextStepNum, serverPromise);
                                        
                                        // Poll for result
                                        let pollResult = null;
                                        const maxPolls = 10;
                                        for (let i = 0; i < maxPolls; i++) {
                                            await new Promise(r => setTimeout(r, 1000));
                                            const pollRes = await fetch(`${a2aUrl}/api/v1/requests/${serverPromise.promiseId}/result`, {
                                                headers: { 'x-skip-auth': 'true' }
                                            });
                                            const pollData = await pollRes.json();
                                            if (pollData.data?.status === 'completed') {
                                                pollResult = pollData.data;
                                                break;
                                            }
                                        }
                                        
                                        if (pollResult) {
                                            serverResponse = {
                                                step: nextStepNum,
                                                timestamp: new Date().toISOString(),
                                                ...pollResult
                                            };
                                        }
                                    } else if (serverData.data) {
                                        // Sync response
                                        serverResponse = {
                                            step: nextStepNum,
                                            timestamp: new Date().toISOString(),
                                            ...serverData.data
                                        };
                                    }
                                } catch (e) {
                                    console.error('[vite-plugin-a2a] A2A Server request failed:', e.message);
                                }
                            }
                            
                            // Save server-response.json
                            if (serverResponse) {
                                saveServerResponse(cwd, sessionId, nextStepNum, serverResponse);
                            }
                            
                            // Save step file ONLY if there's real data (server response or client result)
                            // According to api-client-server-logic.md - save step only when there's actual data
                            const hasRealData = serverResponse || d.result;
                            if (hasRealData) {
                                console.log('[VitePlugin] Saving step:', nextStepNum, 'hasRealData:', hasRealData);
                                saveNewStep(cwd, sessionId, nextStepNum, {
                                    step: nextStepNum,
                                    execute: serverResponse?.result?.execute || d.execute,
                                    messages: messages,
                                    context: serverResponse?.context || context,
                                    result: d.result
                                });
                            } else {
                                console.log('[VitePlugin] Skipping step save - no real data');
                            }
                            
                            // Update session metadata
                            session.currentStep = nextStepNum;
                            session.updatedAt = new Date().toISOString();
                            if (serverResponse?.result?.execute) session.execute = serverResponse.result.execute;
                            if (serverResponse?.context) session.context = serverResponse.context;
                            if (serverPromise) session.lastPromiseId = serverPromise.promiseId;
                            saveNewSession(cwd, session);
                            
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                success: true,
                                step: nextStepNum,
                                session,
                                serverPromise,
                                serverResponse
                            }));
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                const latestMatch = p.match(/^\/sessions\/([^/]+)\/latest$/);
                if (req.method === 'GET' && latestMatch && storageMode === 'storage') {
                    const sessionId = latestMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    const session = loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                        return;
                    }
                    const latestStepNum = getNewSessionLatestStep(cwd, sessionId);
                    const latestStep = latestStepNum > 0 ? loadNewStep(cwd, sessionId, latestStepNum) : null;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        session,
                        latestStep: latestStepNum,
                        stepData: latestStep,
                        hasResponse: latestStep?.result !== undefined
                    }));
                    return;
                }

                const historyMatch = p.match(/^\/sessions\/([^/]+)\/history\/(\d+)$/);
                if (req.method === 'GET' && historyMatch && storageMode === 'storage') {
                    const sessionId = historyMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    const fromStep = parseInt(historyMatch[2], 10);
                    const session = loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                        return;
                    }
                    const allSteps = listNewSteps(cwd, sessionId);
                    const stepsFrom = allSteps.filter(s => s >= fromStep);
                    const history = stepsFrom.map(stepNum => ({
                        step: stepNum,
                        data: loadNewStep(cwd, sessionId, stepNum)
                    }));
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({history}));
                    return;
                }

                // === Step Action API: POST /sessions/:id/next - submit client result ===
                const nextMatch = p.match(/^\/sessions\/([^/]+)\/next$/);
                if (req.method === 'POST' && nextMatch && storageMode === 'storage') {
                    const sessionId = nextMatch[1];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            const { result, context, task } = d;
                            
                            const session = loadNewSession(cwd, sessionId);
                            if (!session) {
                                res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                                return;
                            }
                            
                            const currentStep = session.currentStep || 1;
                            
                            // Save client-result.json
                            saveClientResult(cwd, sessionId, currentStep, {
                                result,
                                context,
                                timestamp: new Date().toISOString()
                            });
                            
                            // Create next step with request-to-server.json
                            const nextStepNum = currentStep + 1;
                            
                            // Load context from previous step's server-response
                            const previousStepData = loadServerResponse(cwd, sessionId, currentStep);
                            const previousContext = previousStepData?.context || {};
                            console.log('[VitePlugin] Previous step context:', previousContext);
                            
                            // Merge contexts: client context overrides previous
                            const mergedContext = { ...previousContext, ...context };
                            
                            // Add session_id to context as required by a2a-server
                            mergedContext.session_id = sessionId;
                            
                            // Build request to A2A Server
                            const requestToServer = {
                                sessionId,
                                step: nextStepNum,
                                context: mergedContext,
                                task: task,
                                result: result,
                                previousStep: currentStep
                            };
                            
                            // Save request-to-server.json for NEXT step (N+1)
                            // According to api-client-server-logic.md - request is prepared in current step but stored for next
                            saveRequestToServer(cwd, sessionId, nextStepNum, requestToServer);
                            
                            // Initialize next step directory
                            const stepDir = getNewStepDir(cwd, sessionId, nextStepNum);
                            if (!fs.existsSync(stepDir)) fs.mkdirSync(stepDir, {recursive: true});
                            
                            // Send request to A2A Server (localhost:3000) using Node.js http
                            const xhr = require('http');
                            const a2aServerUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
                            const urlObj = new URL(`${a2aServerUrl}/api/v1/invoke`);
                            
                            let serverResponse = null;
                            let promiseData = null;
                            
                            const reqOptions = {
                                hostname: urlObj.hostname,
                                port: urlObj.port,
                                path: urlObj.pathname,
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            };
                            
                            const xhrReq = xhr.request(reqOptions, async (xhrRes) => {
                                let data = '';
                                xhrRes.on('data', chunk => data += chunk);
                                xhrRes.on('end', async () => {
                                    console.log('[VitePlugin] A2A response:', xhrRes.statusCode, 'data:', data.substring(0, 200));
                                    try {
                                        const a2aData = JSON.parse(data || '{}');
                                        
                                        if (a2aData.data?.promiseId) {
                                            // Async response - save promise AND wait for completion
                                            console.log('[VitePlugin] Async response - promiseId:', a2aData.data.promiseId);
                                            promiseData = {
                                                promiseId: a2aData.data.promiseId,
                                                status: 'pending',
                                                submittedAt: new Date().toISOString()
                                            };
                                            saveServerPromise(cwd, sessionId, nextStepNum, promiseData);
                                            
                                            // Poll for result (max 30 seconds)
                                            const maxPolls = 30;
                                            for (let i = 0; i < maxPolls; i++) {
                                                await new Promise(r => setTimeout(r, 1000));
                                                try {
                                                    const pollRes = await fetch(`${a2aServerUrl}/api/v1/requests/${promiseData.promiseId}/result`, {
                                                        method: 'GET'
                                                    });
                                                    const pollData = await pollRes.json();
                                                    console.log('[VitePlugin] Poll result:', i, pollData.data?.status);
                                                    if (pollData.data?.status === 'completed') {
                                                        serverResponse = pollData.data;
                                                        saveServerResponse(cwd, sessionId, nextStepNum, {
                                                            step: nextStepNum,
                                                            timestamp: new Date().toISOString(),
                                                            ...pollData.data
                                                        });
                                                        break;
                                                    } else if (pollData.data?.status === 'failed') {
                                                        console.error('[VitePlugin] Promise failed:', pollData.data.error);
                                                        break;
                                                    }
                                                } catch (pollErr) {
                                                    console.error('[VitePlugin] Poll error:', pollErr.message);
                                                }
                                            }
                                        } else if (xhrRes.statusCode >= 200 && xhrRes.statusCode < 300) {
                                            // Sync response - save server response directly
                                            console.log('[VitePlugin] Sync response saved');
                                            serverResponse = a2aData;
                                            saveServerResponse(cwd, sessionId, nextStepNum, {
                                                step: nextStepNum,
                                                timestamp: new Date().toISOString(),
                                                ...a2aData
                                            });
                                        } else {
                                            console.error('[VitePlugin] A2A error status:', xhrRes.statusCode);
                                        }
                                    } catch (parseErr) {
                                        console.error('[vite-plugin-a2a] Failed to parse A2A response:', parseErr.message);
                                    }
                                    
                                    // Update session metadata (continue even if A2A request failed)
                                    session.currentStep = nextStepNum;
                                    session.updatedAt = new Date().toISOString();
                                    if (serverResponse?.result?.execute) session.execute = serverResponse.result.execute;
                                    if (serverResponse?.context) session.context = serverResponse.context;
                                    if (promiseData?.promiseId) session.promiseId = promiseData.promiseId;
                                    saveNewSession(cwd, session);
                                    
                                    // Return response to client
                                    const response = {
                                        success: true,
                                        step: nextStepNum,
                                        session,
                                        execute: serverResponse?.result?.execute || null,
                                        promiseId: promiseData?.promiseId || null,
                                        sync: !promiseData
                                    };
                                    
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify(response));
                                });
                            });
                            
                            xhrReq.on('error', (e) => {
                                console.error('[vite-plugin-a2a] A2A Server request failed:', e.message);
                                // Continue with error response
                                session.currentStep = nextStepNum;
                                session.updatedAt = new Date().toISOString();
                                saveNewSession(cwd, session);
                                
                                const response = {
                                    success: true,
                                    step: nextStepNum,
                                    session,
                                    execute: null,
                                    promiseId: null,
                                    sync: true,
                                    error: 'A2A server unavailable'
                                };
                                
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify(response));
                            });
                            
                            // Send request to A2A Server
                            console.log('[VitePlugin] === SENDING TO A2A SERVER ===');
                            xhrReq.write(JSON.stringify(requestToServer));
                            xhrReq.end();
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                // === Promise Status API: GET /sessions/:id/promise/:promiseId ===
                const promiseMatch = p.match(/^\/sessions\/([^/]+)\/promise\/([^/]+)$/);
                if (req.method === 'GET' && promiseMatch && storageMode === 'storage') {
                    const sessionId = promiseMatch[1];
                    const promiseId = promiseMatch[2];
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    
                    const session = loadNewSession(cwd, sessionId);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                        return;
                    }
                    
                    // Poll A2A Server for promise status - using callback style
                    const a2aServerUrl = process.env.A2A_SERVER_URL || 'http://localhost:3000';
                    const xhr = require('http');
                    const urlObj = new URL(`${a2aServerUrl}/api/v1/requests/${promiseId}/result`);
                    
                    const reqOptions = {
                        hostname: urlObj.hostname,
                        port: urlObj.port,
                        path: urlObj.pathname,
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    };
                    
                    const xhrReq = xhr.request(reqOptions, (xhrRes) => {
                        let data = '';
                        xhrRes.on('data', chunk => data += chunk);
                        xhrRes.on('end', () => {
                            try {
                                const promiseStatus = JSON.parse(data || '{}');
                                
                                // Update server-promise.json with latest status
                                const currentStep = session.currentStep || 1;
                                const existingPromise = loadServerPromise(cwd, sessionId, currentStep);
                                const updatedPromise = {
                                    ...existingPromise,
                                    ...promiseStatus,
                                    checkedAt: new Date().toISOString()
                                };
                                saveServerPromise(cwd, sessionId, currentStep, updatedPromise);
                                
                                // If completed, save server response
                                if (promiseStatus.status === 'completed' || promiseStatus.status === 'done') {
                                    saveServerResponse(cwd, sessionId, currentStep, {
                                        step: currentStep,
                                        timestamp: new Date().toISOString(),
                                        ...promiseStatus
                                    });
                                    
                                    // Update session with response data
                                    if (promiseStatus.execute) session.execute = promiseStatus.execute;
                                    if (promiseStatus.context) session.context = promiseStatus.context;
                                    session.status = 'completed';
                                    session.updatedAt = new Date().toISOString();
                                    saveNewSession(cwd, session);
                                }
                                
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({
                                    promiseId,
                                    status: promiseStatus.status || 'pending',
                                    result: promiseStatus.result || null,
                                    execute: promiseStatus.execute || null,
                                    completed: promiseStatus.status === 'completed' || promiseStatus.status === 'done'
                                }));
                            } catch (e) {
                                res.writeHead(500).end(JSON.stringify({error: 'Failed to parse promise response'}));
                            }
                        });
                    });
                    
                    xhrReq.on('error', (e) => {
                        res.writeHead(500).end(JSON.stringify({error: 'Failed to check promise status: ' + e.message}));
                    });
                    
                    xhrReq.end();
                    return;
                }

                // === Step Files API: GET/PUT /sessions/:id/step/:stepNum/files/:filename ===
                const stepFileMatch = p.match(/^\/sessions\/([^/]+)\/step\/(\d+)\/(server-promise|client-result|request-to-server|server-response)\.json$/);
                if (req.method === 'GET' && stepFileMatch && storageMode === 'storage') {
                    const sessionId = stepFileMatch[1];
                    const stepNum = parseInt(stepFileMatch[2], 10);
                    const filename = stepFileMatch[3] + '.json';
                    
                    if (!isValidSessionId(sessionId)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid session ID'}));
                        return;
                    }
                    
                    const data = loadStepFile(cwd, sessionId, stepNum, filename);
                    if (!data) {
                        res.writeHead(404).end(JSON.stringify({error: 'File not found'}));
                        return;
                    }
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                    return;
                }

                next();
            });

            // Storage KV API handler
            server.middlewares.use((req, res, next) => {
                if (!req.url?.startsWith(STORAGE_PREFIX)) return next();

                const url = new URL(req.url, 'http://localhost');
                const p = url.pathname.slice(STORAGE_PREFIX.length);

                // GET /:namespace/keys
                const keysMatch = p.match(/^\/([^/]+)\/keys$/);
                if (req.method === 'GET' && keysMatch) {
                    const ns = keysMatch[1];
                    if (!SAFE_SEGMENT.test(ns)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid namespace'}));
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({keys: kvKeys(cwd, ns)}));
                    return;
                }

                // GET/PUT/DELETE /:namespace/:key
                const kvMatch = p.match(/^\/([^/]+)\/([^/]+)$/);
                if (kvMatch) {
                    const [, ns, key] = kvMatch;
                    if (!SAFE_SEGMENT.test(ns) || !SAFE_SEGMENT.test(key)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid namespace or key'}));
                        return;
                    }

                    if (req.method === 'GET') {
                        const data = kvGet(cwd, ns, key);
                        if (data === null) {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({value: null}));
                            return;
                        }
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                        return;
                    }

                    if (req.method === 'PUT') {
                        let body = '';
                        req.on('data', c => (body += c));
                        req.on('end', () => {
                            try {
                                const data = JSON.parse(body || '{}');
                                kvSet(cwd, ns, key, data);
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({success: true}));
                            } catch (e) {
                                res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                            }
                        });
                        return;
                    }

                    if (req.method === 'DELETE') {
                        kvDelete(cwd, ns, key);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({success: true}));
                        return;
                    }
                }

                // DELETE /:namespace (clear all)
                const nsMatch = p.match(/^\/([^/]+)$/);
                if (req.method === 'DELETE' && nsMatch) {
                    const ns = nsMatch[1];
                    if (!SAFE_SEGMENT.test(ns)) {
                        res.writeHead(400).end(JSON.stringify({error: 'Invalid namespace'}));
                        return;
                    }
                    kvClear(cwd, ns);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({success: true}));
                    return;
                }

                next();
            });
        },
    };
}
