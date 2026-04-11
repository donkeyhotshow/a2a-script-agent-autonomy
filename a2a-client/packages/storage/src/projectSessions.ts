import fs from 'fs';
import path from 'path';
import { compareSessionCreatedAtDesc } from '@a2a-client/storage/session-sort.mjs';
import { getProjectDotA2aSessionsDir } from '@a2a-client/storage/session-paths.ts';
import { loadProjects } from './projects.ts';
import { pathExists, joinPaths, ensureDir } from '@a2a-client/execution/fs-utils';

/** Same idea as newSessions.normalizeSessionIdForDir — session JSON may use numeric id. */
function normalizeSessionIdForFile(id) {
  if (id == null) return '';
  const s = typeof id === 'string' ? id : String(id);
  return s.trim();
}

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
  if (typeof projectPath !== 'string' || !projectPath.trim()) {
    return null;
  }
  try {
    return getProjectDotA2aSessionsDir(projectPath.trim());
  } catch {
    return null;
  }
}

export function listSessions(projectPath) {
   if (typeof projectPath !== 'string' || !projectPath.trim()) {
     return [];
   }
   const dir = getSessionsDir(projectPath);
   if (!dir || !pathExists(dir)) return [];
   return fs.readdirSync(dir)
     .filter((f) => f.endsWith('.json'))
     .map((f) => {
       try {
         const raw = fs.readFileSync(joinPaths(dir, f), 'utf8');
         const s = JSON.parse(raw);
         return {id: s.id, title: s.title || s.id, createdAt: s.createdAt};
       } catch (err) {
         console.error(`[projectSessions] Failed to parse session file ${f}:`, err);
         return null;
       }
     })
     .filter(Boolean)
     .sort(compareSessionCreatedAtDesc);
 }

import { readJsonFileSync, writeJsonFileSync } from './utils.ts';

export function loadSession(projectPath, sessionId) {
  if (typeof projectPath !== 'string' || !projectPath.trim()) {
    return null;
  }
  const sid = normalizeSessionIdForFile(sessionId);
  if (!sid) {
    return null;
  }
  const dir = getSessionsDir(projectPath);
  if (!dir) return null;
  const file = path.join(dir, `${sid}.json`);
  return readJsonFileSync(file, 'projectSessions');
}

export function saveSession(projectPath, session) {
   if (typeof projectPath !== 'string' || !projectPath.trim()) {
     throw new Error('[projectSessions] saveSession: projectPath must be a non-empty string');
   }
   const sid = normalizeSessionIdForFile(session?.id);
   if (!sid) {
     throw new Error('[projectSessions] saveSession: session.id is required');
   }
   const dir = getSessionsDir(projectPath);
   if (!dir) {
     throw new Error('[projectSessions] saveSession: invalid projectPath');
   }
   if (!pathExists(dir)) ensureDir(dir);
   const file = joinPaths(dir, `${sid}.json`);
   const payload = session && typeof session === 'object' ? { ...session, id: sid } : { id: sid };
   fs.writeFileSync(file, JSON.stringify(payload, null, 2));
 }

export function deleteSession(projectPath, sessionId) {
   if (typeof projectPath !== 'string' || !projectPath.trim()) {
     return;
   }
   const sid = normalizeSessionIdForFile(sessionId);
   if (!sid) {
     return;
   }
   const dir = getSessionsDir(projectPath);
   if (!dir) return;
   const file = joinPaths(dir, `${sid}.json`);
   if (pathExists(file)) fs.unlinkSync(file);
 }

export function getProjectPathForSessions(cwd) {
  const resolved = resolveSessionProjectPath(cwd, {});
  if (typeof resolved === 'string' && resolved.trim()) {
    return resolved;
  }
  const fb = typeof cwd === 'string' && cwd.trim() ? cwd : process.cwd();
  const n = normalizeProjectPath(fb);
  return n && n.trim() ? n : process.cwd();
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
    } catch (e) {
      console.error('[projectSessions] resolve projectRoot failed:', projectRoot, e?.message || e);
      return null;
    }
  }
  if (projectId) {
    try {
      return resolveSessionProjectPath(cwd, { projectId });
    } catch (e) {
      console.error('[projectSessions] resolve projectId failed:', projectId, e?.message || e);
      return null;
    }
  }
  return findSessionProjectPath(cwd, sessionId);
}
