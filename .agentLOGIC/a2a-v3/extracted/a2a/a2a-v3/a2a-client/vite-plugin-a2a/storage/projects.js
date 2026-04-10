import fs from 'fs';
import path from 'path';
import { getStorageRoot, ensureDir } from './root.js';

const PROJECTS_FILE = 'projects.json';

/**
 * Load projects from multiple sources.
 * Priority: A2A_CLIENT_PROJECTS_PATH env > storage/projects.json > default
 */
export function loadProjects(cwd) {
  // 1. Check environment variable for external projects file
  const externalPath = process.env.A2A_CLIENT_PROJECTS_PATH;
  if (externalPath && fs.existsSync(externalPath)) {
    try {
      const raw = fs.readFileSync(externalPath, 'utf8');
      const d = JSON.parse(raw);
      const list = Array.isArray(d.projects) ? d.projects : [];
      if (list.length) {
        console.log('[projects] Loaded from external:', externalPath);
        return list;
      }
    } catch (err) {
      console.warn('[projects] Failed to load external:', err.message);
    }
  }

  // 2. Check storage root
  const storageRoot = getStorageRoot();
  const file = path.join(storageRoot, PROJECTS_FILE);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const d = JSON.parse(raw);
    const list = Array.isArray(d.projects) ? d.projects : [];
    return list.length ? list : [{id: 'default', name: 'Workspace', path: cwd}];
  } catch {
    return [{id: 'default', name: 'Workspace', path: cwd}];
  }
}

export function saveProjects(cwd, projects) {
  const storageRoot = getStorageRoot();
  ensureDir(storageRoot);
  fs.writeFileSync(path.join(storageRoot, PROJECTS_FILE), JSON.stringify({projects}, null, 2));
}
