/**
 * Storage - reads from project .a2a folders via /api/a2a.
 * Projects list from .a2a-client/projects.json (served by vite plugin).
 */
const API = '/api/a2a';

const Storage = {
  async loadProjects() {
    const r = await fetch(`${API}/projects`);
    if (!r.ok) throw new Error('Failed to load');
    try {
      const d = await r.json();
      return d.projects || [];
    } catch {
      throw new Error('Failed to load');
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
    const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/data`);
    if (!r.ok) throw new Error('Failed to load');
    return r.json();
  },

  async loadFile(projectId, filePath) {
    const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(filePath)}`);
    if (!r.ok) return null;
    return r.text();
  },

  getCurrentProjectId() {
    const m = document.cookie.split('; ').find((row) => row.startsWith('a2a_currentProject='));
    return m ? m.split('=')[1] : null;
  },

  setCurrentProject(id) {
    if (id) document.cookie = `a2a_currentProject=${id}; path=/; max-age=31536000`;
    else document.cookie = 'a2a_currentProject=; path=/; max-age=0';
  },

  async getSessions(projectId) {
    try {
      const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/sessions`);
      if (!r.ok) return [];
      const d = await r.json();
      return d.sessions || [];
    } catch {
      return [];
    }
  },

  async saveSession(projectId, session) {
    const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(session.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (!r.ok) throw new Error('Failed to save session');
    const d = await r.json();
    return d.session;
  },

  async getSession(projectId, id) {
    try {
      const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(id)}`);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  },

  async deleteSession(projectId, sessionId) {
    const r = await fetch(`${API}/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
    return r.ok;
  },
};

window.Storage = Storage;
