import path from 'path';
import fs from 'fs';

export function getStorageRoot() {
  if (process.env.A2A_CLIENT_STORAGE_DIR) return process.env.A2A_CLIENT_STORAGE_DIR;
  return path.join(process.cwd(), 'storage');
}

export function ensureDir(dirPath) {
  if (!dirPath) return;
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
