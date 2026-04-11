/**
 * Repository root resolution utility
 * Created to eliminate code duplication in path resolution patterns
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Get the directory name of the current module (ESM equivalent of __dirname)
 * @returns {string} Directory name of the current module
 */
export function getModuleDirname() {
  return dirname(fileURLToPath(import.meta.url));
}

/**
 * Get the repository root directory (two levels up from current module)
 * @returns {string} Absolute path to repository root
 */
export function getRepoRoot() {
  const moduleDirname = getModuleDirname();
  return dirname(moduleDirname); // Go up two levels: script dir -> scripts dir -> repo root
}

/**
 * Get the repository root directory (configurable levels up)
 * @param {number} levelsUp - Number of directory levels to go up (default: 2)
 * @returns {string} Absolute path to the calculated root
 */
export function getRootByLevels(levelsUp = 2) {
  let path = getModuleDirname();
  for (let i = 0; i < levelsUp; i++) {
    path = dirname(path);
  }
  return path;
}