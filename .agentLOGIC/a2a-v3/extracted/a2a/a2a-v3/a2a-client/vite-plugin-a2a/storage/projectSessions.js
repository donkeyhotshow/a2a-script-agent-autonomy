import fs from 'fs';
import path from 'path';
import { loadProjects } from './projects.js';

export function normalizeProjectPath(p) {
  if (typeof p !== 'string' || !p.trim()) return '';
  return path.resolve(p.trim());
}

export function projectPathsEqual(a, b) {
  const na = normalizeProjectPath(a);
  const nb = normalizeProjectPath(b);
  if (!na || !nb) return false;
  if (process.platform === 'win32') {
    return na.toLowerCase() === nb.toLowerCase();
  }
  return na === nb;
}

/**
 * Resolve filesystem root for session JSON in project storage mode.
 * @param {string} cwd - Vite / client workspace root
 * @param {{ projectId?: string, projectRoot?: string }} [opts]
 * @returns {string} Absolute project path
 */
export function resolveSessionProjectPath(cwd, opts = {}) {
  const projects = loadProjects(cwd);
  const projectId = typeof opts.projectId === 'string' ? opts.projectId.trim() : '';
  const projectRootRaw = typeof opts.projectRoot === 'string' ? opts.projectRoot.trim() : '';

  if (projectRootRaw) {
    const hit = projects.find((p) => p.path && projectPathsEqual(p.path, projectRootRaw));
    if (!hit) {
      throw new Error(
        `[projectSessions] projectRoot does not match any registered project path: ${projectRootRaw}`
      );
    }
    return normalizeProjectPath(hit.path);
  }

  if (projectId) {
    const hit = projects.find((p) => p.id === projectId);
    if (!hit?.path) {
      throw new Error(`[projectSessions] Unknown projectId: ${projectId}`);
    }
    return normalizeProjectPath(hit.path);
  }

  const fallback = projects.find((p) => p.path) || projects[0] || { path: cwd };
  return normalizeProjectPath(fallback?.path || cwd);
}

/**
 * Locate which registered project holds this session (flat .a2a/sessions/{id}.json).
 * @param {string} cwd
 * @param {string} sessionId
 * @returns {string|null} Absolute project path
 */
export function findSessionProjectPath(cwd, sessionId) {
  for (const p of loadProjects(cwd)) {
    if (!p.path) continue;
    const abs = normalizeProjectPath(p.path);
    if (loadSession(abs, sessionId)) return abs;
  }
  return null;
}

export function getSessionsDir(projectPath) {
  return path.join(projectPath, '.a2a', 'sessions');
}

export function listSessions(projectPath) {
  const dir = getSessionsDir(projectPath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const raw = fs.readFileSync(path.join(dir, f), 'utf8');
        const s = JSON.parse(raw);
        return {id: s.id, title: s.title || s.id, createdAt: s.createdAt};
      } catch (err) {
        console.error(`[projectSessions] Failed to parse session file ${f}:`, err);
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function loadSession(projectPath, sessionId) {
  const file = path.join(getSessionsDir(projectPath), `${sessionId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`[projectSessions] Failed to parse session ${sessionId}:`, err);
    return null;
  }
}

export function saveSession(projectPath, session) {
  const dir = getSessionsDir(projectPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, `${session.id}.json`);
  fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

export function deleteSession(projectPath, sessionId) {
  const file = path.join(getSessionsDir(projectPath), `${sessionId}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function getProjectPathForSessions(cwd) {
  return resolveSessionProjectPath(cwd, {});
}

/**
 * Resolve project root for Client API calls that carry optional projectId / projectRoot (body or query).
 * Falls back to scanning registered projects for a session file.
 */
export function resolveProjectPathForApi(cwd, sessionId, sources = {}) {
  const projectRoot =
    typeof sources.projectRoot === 'string' && sources.projectRoot.trim()
      ? sources.projectRoot.trim()
      : '';
  const projectId =
    typeof sources.projectId === 'string' && sources.projectId.trim()
      ? sources.projectId.trim()
      : '';
  if (projectRoot) {
    try {
      return resolveSessionProjectPath(cwd, { projectRoot });
    } catch {
      return null;
    }
  }
  if (projectId) {
    try {
      return resolveSessionProjectPath(cwd, { projectId });
    } catch {
      return null;
    }
  }
  return findSessionProjectPath(cwd, sessionId);
}
