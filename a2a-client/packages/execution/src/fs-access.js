/**
 * Check if a file or directory exists and is accessible
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} - True if accessible, false otherwise
 */
export async function checkPathAccess(path) {
  try {
    await import('node:fs/promises').then(fs => fs.access(path));
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file or directory exists and is accessible (sync version)
 * @param {string} path - Path to check
 * @returns {boolean} - True if accessible, false otherwise
 */
export function checkPathAccessSync(path) {
  try {
    const fs = require('node:fs');
    fs.accessSync(path);
    return true;
  } catch {
    return false;
  }
}