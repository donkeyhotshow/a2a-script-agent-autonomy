import fs from 'fs';
import path from 'path';
import { loadProjects } from './projects.js';

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
      } catch {
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
  } catch {
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
  const projects = loadProjects(cwd);
  const proj = projects.find((p) => p.path) || projects[0] || {path: cwd};
  return proj?.path || cwd;
}
