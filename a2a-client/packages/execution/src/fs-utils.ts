import { existsSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, relative, resolve, sep } from 'path';

/**
 * Check if a path exists in the file system.
 * @param {string} p - Path to check
 * @returns {boolean} True if path exists, false otherwise
 */
export function pathExists(p: string): boolean {
  return existsSync(p);
}

/**
 * Ensure a directory exists, creating it if necessary.
 * @param {string} dirPath - Directory path to ensure exists
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Join path segments using platform-specific separator.
 * @param {...string} paths - Path segments to join
 * @returns {string} Joined path
 */
export function joinPaths(...paths: string[]): string {
  return join(...paths);
}

/**
 * Normalize a path, resolving '..' and '.' segments.
 * @param {string} p - Path to normalize
 * @returns {string} Normalized path
 */
export function normalizePath(p: string): string {
  return resolve(p);
}

/**
 * Get file stats if file exists.
 * @param {string} p - Path to file
 * @returns {any|null} File stats or null if file doesn't exist
 */
export function getFileStats(p: string): any {
  if (!existsSync(p)) return null;
  try {
    return statSync(p);
  } catch (_) {
    return null;
  }
}

/**
 * Read directory contents.
 * @param {string} dir - Directory to read
 * @param {Object} options - Reading options
 * @param {Object} options.withFileTypes - Whether to return Dirent objects
 * @returns {Array<any>} Directory contents
 */
export function readDir(dir: string, options: { withFileTypes?: boolean } = {}): any[] {
  return readdirSync(dir, options);
}