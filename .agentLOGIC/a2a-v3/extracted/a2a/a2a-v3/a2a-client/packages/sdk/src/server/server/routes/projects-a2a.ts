/**
 * Vite-compatible /api/a2a/projects for standalone Client API (port 3001).
 */
import {Router} from 'express';
import type {Project} from '../../models/session.model.js';
import {loadProjects, saveProjects} from '../../services/projects.service.js';

export function createProjectsA2aRouter(): Router {
    const r = Router();

    r.get('/projects', async (_req, res) => {
        try {
            const projects = await loadProjects();
            res.json({projects});
        } catch (e) {
            res.status(500).json({error: String(e)});
        }
    });

    r.post('/projects', async (req, res) => {
        try {
            const body = req.body || {};
            let incoming: Project[] | null = body.projects ?? (Array.isArray(body) ? body : null);
            if (!incoming && typeof body.name === 'string' && body.name.trim()) {
                const id =
                    typeof body.id === 'string' && body.id.trim()
                        ? body.id.trim()
                        : `proj_${Date.now()}`;
                incoming = [
                    {
                        id,
                        name: body.name.trim(),
                        path: typeof body.path === 'string' ? body.path : '',
                    },
                ];
            }
            if (!Array.isArray(incoming)) {
                res.status(400).json({error: 'projects array or { name } required'});
                return;
            }
            const existing = await loadProjects();
            const existingIds = new Set(existing.map((p) => p.id));
            const uniqueNew = incoming.filter((p) => p?.id && !existingIds.has(p.id));
            const merged = [...existing, ...uniqueNew];
            await saveProjects(merged);
            res.json({success: true, projects: merged});
        } catch (e) {
            res.status(400).json({error: String((e as Error)?.message || e)});
        }
    });

    return r;
}
