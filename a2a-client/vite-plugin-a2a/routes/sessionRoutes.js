import { listSessions, loadSession, saveSession, deleteSession, getProjectPathForSessions } from '../storage/projectSessions.js';
import {
    listNewSessions,
    loadNewSession,
    saveNewSession,
    deleteNewSession,
    saveNewStep,
    listNewSteps,
    loadNewStep,
    loadStepFile
} from '../storage/newSessions.js';
import { getStorageMode, isValidSessionId } from '../utils/server.js';

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
                        messages: [
                            {
                                role: 'assistant',
                                content: 'What would you like me to do?',
                                step: 1
                            }
                        ],
                        context: { execution: { action: 'task', step: 'new' } },
                        execute: {
                            message: 'What would you like me to do?',
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
                            messages: session.messages || [],
                            context: session.context
                        });
                    }

                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true, session }));
                } catch (e) {
                    res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
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
                const session = storageMode === 'project'
                    ? loadSession(getProjectPathForSessions(cwd), sessionId)
                    : loadNewSession(cwd, sessionId);
                if (!session) {
                    res.writeHead(404).end(JSON.stringify({ error: 'Session not found' }));
                    return;
                }

                if (storageMode !== 'project') {
                    const steps = listNewSteps(cwd, sessionId);
                    const allMessages = [];
                    const seenMessages = new Set(); // Track seen content to avoid duplicates
                    
                    for (const stepNum of steps) {
                        const stepData = loadNewStep(cwd, sessionId, stepNum);
                        
                        // Only add execute.message if it's not already in stepData.messages
                        // This prevents duplication when messages are stored in both places
                        if (stepData?.execute?.message && (!stepData?.messages || !stepData.messages.some(m => m.content === stepData.execute.message))) {
                            const msgContent = typeof stepData.execute.message === 'string'
                                ? stepData.execute.message
                                : stepData.execute.message.content || stepData.execute.message.text || '';
                            
                            if (!seenMessages.has(msgContent)) {
                                allMessages.push({
                                    role: 'assistant',
                                    content: msgContent,
                                    step: stepNum
                                });
                                seenMessages.add(msgContent);
                            }
                        }

                        const clientResult = loadStepFile(cwd, sessionId, stepNum, 'client-result.json');
                        if (clientResult?.result?.message) {
                            const msgContent = clientResult.result.message;
                            if (!seenMessages.has(msgContent)) {
                                allMessages.push({
                                    role: 'user',
                                    content: msgContent,
                                    step: stepNum
                                });
                                seenMessages.add(msgContent);
                            }
                        }

                        if (stepData?.messages && Array.isArray(stepData.messages) && stepData.messages.length > 0) {
                            const stepMessages = stepData.messages.map((msg) => ({
                                ...msg,
                                step: stepNum
                            }));
                            // Filter out duplicates with existing messages
                            const newMessages = stepMessages.filter(msg => !seenMessages.has(msg.content));
                            newMessages.forEach(msg => seenMessages.add(msg.content));
                            allMessages.push(...newMessages);
                        }
                    }
                    if (allMessages.length > 0) {
                        session.messages = allMessages;
                    }
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(session));
                return;
            }

            if (req.method === 'PUT') {
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
                        res.end(JSON.stringify({ success: true, session }));
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
