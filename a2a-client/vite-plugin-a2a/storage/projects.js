import fs from 'fs';
import path from 'path';
import { getStorageRoot, ensureDir } from './root.js';

const PROJECTS_FILE = 'projects.json';

export function loadProjects(cwd) {
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
