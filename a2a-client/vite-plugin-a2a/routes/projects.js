import fs from 'fs';
import path from 'path';
import { loadProjects, saveProjects } from '../storage/projects.js';
import { getProjectPathForSessions } from '../storage/projectSessions.js';
import { safePath } from '../utils/server.js';

const API_PREFIX = '/api/a2a';
const PROJECT_PREFIX = `${API_PREFIX}/projects`;

export function createProjectRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(PROJECT_PREFIX)) {
            return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(API_PREFIX.length);

        if (req.method === 'GET' && p === '/projects') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ projects: loadProjects(cwd) }));
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
                        res.end(JSON.stringify({ success: true, projects }));
                    } else {
                        res.writeHead(400).end(JSON.stringify({ error: 'projects array required' }));
                    }
                } catch (e) {
                    res.writeHead(400).end(JSON.stringify({ error: String(e?.message || e) }));
                }
            });
            return;
        }

        const dataMatch = p.match(/^\/projects\/([^/]+)\/data$/);
        if (req.method === 'GET' && dataMatch) {
            const projects = loadProjects(cwd);
            const proj = projects.find((x) => x.id === dataMatch[1]);
            if (!proj?.path) {
                res.writeHead(404).end(JSON.stringify({ error: 'Project not found' }));
                return;
            }
            const a2aDir = path.join(proj.path, '.a2a');
            if (!fs.existsSync(a2aDir)) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ index: {}, files: [] }));
                return;
            }
            const out = { index: {}, files: [] };
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

        next();
    };
}
