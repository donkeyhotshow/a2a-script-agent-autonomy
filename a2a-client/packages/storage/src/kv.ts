import path from 'path';
import { getStorageKvRoot, ensureDir } from './root.ts';
import { readJsonFileSync, writeJsonFileSync } from './utils.ts';
import { pathExists, joinPaths } from '@a2a-client/execution/fs-utils';

function kvNamespacePath(namespace) {
  return path.join(getStorageKvRoot(), namespace);
}

export function getKvDir(cwd, namespace) {
  const dir = kvNamespacePath(namespace);
  ensureDir(dir);
  return dir;
}

export function kvGet(cwd, namespace, key) {
   const file = joinPaths(getKvDir(cwd, namespace), `${key}.json`);
   try {
     return readJsonFileSync(file, 'kv', null, true);
   } catch (err) {
     const parseError = new Error(`Failed to parse KV value for ${namespace}/${key}`);
     parseError.code = 'KV_PARSE_ERROR';
     parseError.namespace = namespace;
     parseError.key = key;
     throw parseError;
   }
 }

export function kvSet(cwd, namespace, key, data) {
   const file = joinPaths(getKvDir(cwd, namespace), `${key}.json`);
   fs.writeFileSync(file, JSON.stringify(data, null, 2));
 }

export function kvDelete(cwd, namespace, key) {
   const file = joinPaths(getKvDir(cwd, namespace), `${key}.json`);
   if (pathExists(file)) fs.unlinkSync(file);
 }

export function kvKeys(cwd, namespace) {
   const dir = getKvDir(cwd, namespace);
   if (!pathExists(dir)) return [];
   return fs.readdirSync(dir)
     .filter(f => f.endsWith('.json'))
     .map(f => f.replace(/\.json$/, ''));
 }

export function kvClear(cwd, namespace) {
  const dir = kvNamespacePath(namespace);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}
