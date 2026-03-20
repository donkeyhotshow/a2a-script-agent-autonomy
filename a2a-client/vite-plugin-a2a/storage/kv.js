import fs from 'fs';
import path from 'path';
import { getStorageRoot, ensureDir } from './root.js';

export function getKvDir(cwd, namespace) {
  const dir = path.join(getStorageRoot(), 'kv', namespace);
  ensureDir(dir);
  return dir;
}

export function kvGet(cwd, namespace, key) {
  const file = path.join(getKvDir(cwd, namespace), `${key}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`[kv] Failed to parse JSON from ${file}:`, err);
    return null;
  }
}

export function kvSet(cwd, namespace, key, data) {
  const file = path.join(getKvDir(cwd, namespace), `${key}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function kvDelete(cwd, namespace, key) {
  const file = path.join(getKvDir(cwd, namespace), `${key}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function kvKeys(cwd, namespace) {
  const dir = getKvDir(cwd, namespace);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));
}

export function kvClear(cwd, namespace) {
  const dir = path.join(getStorageRoot(), 'kv', namespace);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}
