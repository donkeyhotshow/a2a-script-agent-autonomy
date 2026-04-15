/**
 * @a2a/fs-utils — ESM barrel: scan/ignore utilities live in @a2a-client/execution (single source).
 */
export * from '../../execution/src/file-scanner.js';
export * from '../../execution/src/glob-matcher.js';
export * from '../../execution/src/ignore-detector.js';
export * from '../../execution/src/file-scanner.ignore.js';

import fs from 'node:fs';

export function pathExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
