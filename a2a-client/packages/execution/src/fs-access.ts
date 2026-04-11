import { access, constants } from 'node:fs/promises';

/**
 * Check if a file or directory exists and is accessible
 * @param {string} path - Path to check
 * @returns {Promise<boolean>} - True if accessible, false otherwise
 */
export async function checkPathAccess(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
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
export function checkPathAccessSync(path: string): boolean {
  try {
    const { accessSync } = require('node:fs');
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}