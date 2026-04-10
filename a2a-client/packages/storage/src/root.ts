import path from 'path';
import { pathExists, ensureDir as fsEnsureDir, joinPaths } from '@a2a-client/execution/fs-utils';

export function getStorageRoot() {
  if (process.env.A2A_CLIENT_STORAGE_DIR) return process.env.A2A_CLIENT_STORAGE_DIR;
  return joinPaths(process.cwd(), 'storage');
}

export function getStorageKvRoot() {
  return joinPaths(getStorageRoot(), 'kv');
}

export function getStorageSessionsRoot() {
  return joinPaths(getStorageRoot(), 'sessions');
}

export function ensureDir(dirPath) {
  if (!dirPath) return;
  if (!pathExists(dirPath)) fsEnsureDir(dirPath);
}
