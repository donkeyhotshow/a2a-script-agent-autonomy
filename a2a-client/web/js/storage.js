/**
 * Storage - reads from project .a2a folders via /api/a2a.
 * Projects list from .a2a-client/projects.json (served by vite plugin).
 */
const API = '/api/a2a';

const Storage = {
  async loadProjects() {
    try {
      const r = await fetch(`${API}/projects`);
      const d = await r.json();
      return d.projects || [];
    } catch {
      return [];
    }
  },

  async saveProjects(projects) {
    const r = await fetch(`${API}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects }),
    });
    if (!r.ok) throw new Error('Failed to save');
    const d = await r.json();
    return d.projects || projects;
  },

  async loadProjectData(projectId) {
    try {
      const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/data`);
      return r.ok ? await r.json() : { index: {}, files: [] };
    } catch {
      return { index: {}, files: [] };
    }
  },

  async loadFile(projectId, filePath) {
    const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(filePath)}`);
    if (!r.ok) return null;
    return r.text();
  },

  getCurrentProjectId() {
    return localStorage.getItem('a2a_currentProject') || null;
  },

  setCurrentProject(id) {
    if (id) localStorage.setItem('a2a_currentProject', id);
    else localStorage.removeItem('a2a_currentProject');
  },

  getSessions(projectId) {
    const raw = localStorage.getItem(`a2a_sessions_${projectId}`);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveSession(projectId, session) {
    const list = this.getSessions(projectId);
    const i = list.findIndex((s) => s.id === session.id);
    if (i >= 0) list[i] = session;
    else list.unshift(session);
    localStorage.setItem(`a2a_sessions_${projectId}`, JSON.stringify(list));
  },

  getSession(projectId, id) {
    return this.getSessions(projectId).find((s) => s.id === id);
  },
};

window.Storage = Storage;
