import fs from 'fs';
import path from 'path';
import { loadProjects, saveProjects } from '@a2a-client/storage/projects.ts';
import { safePath } from '@a2a-client/shared/safe-path.mjs';
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
            try {
                const projects = loadProjects(cwd);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ projects }));
            }
            catch (e) {
                console.error('[projects] Failed to load projects:', e?.message || e);
                res.writeHead(500).end(JSON.stringify({ error: 'Failed to load projects configuration' }));
            }
            return;
        }
        if (req.method === 'POST' && p === '/projects') {
            let body = '';
            req.on('data', (c) => (body += c));
            req.on('end', () => {
                try {
                    const d = JSON.parse(body || '{}');
                    const newProjects = d.projects ?? (Array.isArray(d) ? d : null);
                    if (Array.isArray(newProjects)) {
                        // Load existing projects and filter out duplicates by ID
                        let existingProjects;
                        try {
                            existingProjects = loadProjects(cwd);
                        }
                        catch (e) {
                            console.error('[projects] Failed to load existing projects:', e?.message || e);
                            res.writeHead(500).end(JSON.stringify({ error: 'Failed to load projects configuration' }));
                            return;
                        }
                        const existingIds = new Set(existingProjects.map(p => p.id));
                        // Add only new projects that don't already exist
                        const uniqueNewProjects = newProjects.filter(p => !existingIds.has(p.id));
                        const mergedProjects = [...existingProjects, ...uniqueNewProjects];
                        saveProjects(cwd, mergedProjects);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, projects: mergedProjects }));
                    }
                    else {
                        res.writeHead(400).end(JSON.stringify({ error: 'projects array required' }));
                    }
                }
                catch (e) {
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
                const ragFile = path.join(indexDir, 'rag-files.tson');
                if (fs.existsSync(ragFile)) {
                    try {
                        out.index = JSON.parse(fs.readFileSync(ragFile, 'utf8'));
                    }
                    catch (e) {
                        console.error('[projects] Failed to parse rag-files.tson:', ragFile, e?.message || e);
                        // Continue with empty index
                    }
                }
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(out));
            return;
        }
        const fileMatch = p.match(/^\/projects\/([^/]+)\/files\/(.+)$/);
        if (req.method === 'GET' && fileMatch) {
            let projects;
            try {
                projects = loadProjects(cwd);
            }
            catch (e) {
                console.error('[projects] Failed to load projects:', e?.message || e);
                res.writeHead(500).end(JSON.stringify({ error: 'Failed to load projects configuration' }));
                return;
            }
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
