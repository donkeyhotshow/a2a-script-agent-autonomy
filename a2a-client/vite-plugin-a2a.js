/**
 * Vite plugin: serve .a2a data from project folders.
 * Projects stored in storage/projects.json
 */
import fs from 'fs';
import path from 'path';

const PROJECTS_FILE = 'storage/projects.json';
const API_PREFIX = '/api/a2a';

function loadProjects(cwd) {
    const file = path.join(cwd, PROJECTS_FILE);
    try {
        const raw = fs.readFileSync(file, 'utf8');
        const d = JSON.parse(raw);
        return Array.isArray(d.projects) ? d.projects : [];
    } catch {
        return [{id: 'default', name: 'Workspace', path: cwd}];
    }
}

function saveProjects(cwd, projects) {
    const dir = path.join(cwd, 'storage');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'projects.json'), JSON.stringify({projects}, null, 2));
}

function safePath(base, sub) {
    const resolved = path.resolve(base, sub);
    if (!resolved.startsWith(path.resolve(base))) return null;
    return resolved;
}

function getSessionsDir(projectPath) {
    return path.join(projectPath, '.a2a', 'sessions');
}

function listSessions(projectPath) {
    const dir = getSessionsDir(projectPath);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
            try {
                const raw = fs.readFileSync(path.join(dir, f), 'utf8');
                const s = JSON.parse(raw);
                return {id: s.id, title: s.title || s.id, createdAt: s.createdAt};
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function loadSession(projectPath, sessionId) {
    const file = path.join(getSessionsDir(projectPath), `${sessionId}.json`);
    if (!fs.existsSync(file)) return null;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function saveSession(projectPath, session) {
    const dir = getSessionsDir(projectPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    const file = path.join(dir, `${session.id}.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

function deleteSession(projectPath, sessionId) {
    const file = path.join(getSessionsDir(projectPath), `${sessionId}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
}

export default function vitePluginA2a() {
    const cwd = process.cwd();
    return {
        name: 'vite-plugin-a2a',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (!req.url?.startsWith(API_PREFIX)) return next();

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

                const sessionsListMatch = p.match(/^\/projects\/([^/]+)\/sessions$/);
                if (req.method === 'GET' && sessionsListMatch) {
                    const projects = loadProjects(cwd);
                    const proj = projects.find((x) => x.id === sessionsListMatch[1]);
                    if (!proj?.path) {
                        res.writeHead(404).end(JSON.stringify({error: 'Project not found'}));
                        return;
                    }
                    const sessions = listSessions(proj.path);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({sessions}));
                    return;
                }

                if (req.method === 'POST' && sessionsListMatch) {
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            const title = d.title || 'New Session';
                            const projects = loadProjects(cwd);
                            const proj = projects.find((x) => x.id === sessionsListMatch[1]);
                            if (!proj?.path) {
                                res.writeHead(404).end(JSON.stringify({error: 'Project not found'}));
                                return;
                            }
                            const session = {
                                id: `sess_${Date.now()}`,
                                projectId: proj.id,
                                title,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                messages: [],
                            };
                            saveSession(proj.path, session);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({success: true, session}));
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                const sessionDetailMatch = p.match(/^\/projects\/([^/]+)\/sessions\/([^/]+)$/);
                if (req.method === 'GET' && sessionDetailMatch) {
                    const projects = loadProjects(cwd);
                    const proj = projects.find((x) => x.id === sessionDetailMatch[1]);
                    if (!proj?.path) {
                        res.writeHead(404).end(JSON.stringify({error: 'Project not found'}));
                        return;
                    }
                    const session = loadSession(proj.path, sessionDetailMatch[2]);
                    if (!session) {
                        res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(session));
                    return;
                }

                if (req.method === 'PUT' && sessionDetailMatch) {
                    let body = '';
                    req.on('data', (c) => (body += c));
                    req.on('end', () => {
                        try {
                            const d = JSON.parse(body || '{}');
                            const projects = loadProjects(cwd);
                            const proj = projects.find((x) => x.id === sessionDetailMatch[1]);
                            if (!proj?.path) {
                                res.writeHead(404).end(JSON.stringify({error: 'Project not found'}));
                                return;
                            }
                            const existing = loadSession(proj.path, sessionDetailMatch[2]);
                            if (!existing) {
                                res.writeHead(404).end(JSON.stringify({error: 'Session not found'}));
                                return;
                            }
                            const session = {
                                ...existing,
                                ...(d.title !== undefined && {title: d.title}),
                                ...(d.messages !== undefined && {messages: d.messages}),
                                updatedAt: new Date().toISOString(),
                            };
                            saveSession(proj.path, session);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({success: true, session}));
                        } catch (e) {
                            res.writeHead(400).end(JSON.stringify({error: String(e?.message || e)}));
                        }
                    });
                    return;
                }

                if (req.method === 'DELETE' && sessionDetailMatch) {
                    const projects = loadProjects(cwd);
                    const proj = projects.find((x) => x.id === sessionDetailMatch[1]);
                    if (!proj?.path) {
                        res.writeHead(404).end(JSON.stringify({error: 'Project not found'}));
                        return;
                    }
                    deleteSession(proj.path, sessionDetailMatch[2]);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({success: true}));
                    return;
                }

                next();
            });
        },
    };
}
