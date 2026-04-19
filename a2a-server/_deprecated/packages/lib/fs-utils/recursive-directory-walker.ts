/**
 * Utility functions for recursive directory walking
 * Created to eliminate code duplication in file system traversal
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';

/**
 * Recursively list all files in a directory with optional filtering
 * @param {string} dir - Directory to scan
 * @param {Object} options - Configuration options
 * @param {Function} options.filter - Function to filter files (receives { rel, full, stats })
 * @param {boolean} options.includeDirs - Whether to include directories in results
 * @param {string} options.base - Base directory for relative paths (defaults to dir)
 * @returns {Array<Object>} Array of file objects with { rel, full, stats }
 */
export function walkFilesRecursive(dir, options = {}) {
  const {
    filter = () => true,
    includeDirs = false,
    base = dir
  } = options;

  const out = [];

  if (!existsSync(dir)) return out;

  // Resolve once so all containment checks use a stable absolute root
  const resolvedBase = resolve(base) + sep;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    // CWE-22/23: skip any entry whose resolved path escapes the base directory
    if (!resolve(full).startsWith(resolvedBase)) continue;
    const stats = statSync(full);

    if (entry.isDirectory()) {
      if (includeDirs) {
        const rel = relative(base, full).replace(/\\/g, '/');
        if (filter({ rel, full, stats })) {
          out.push({ rel, full, stats });
        }
      }
      // Recurse into subdirectory
      out.push(...walkFilesRecursive(full, {
        filter,
        includeDirs,
        base
      }));
    } else {
      const rel = relative(base, full).replace(/\\/g, '/');
      if (filter({ rel, full, stats })) {
        out.push({ rel, full, stats });
      }
    }
  }

  return out;
}

/**
 * Recursively list all directories in a directory
 * @param {string} dir - Directory to scan
 * @param {Function} filter - Function to filter directories (receives directory name)
 * @returns {Array<string>} Array of relative directory paths
 */
export function walkDirsRecursive(dir, filter = () => true) {
  const out = [];

  if (!existsSync(dir)) return out;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const full = join(dir, entry.name);
      if (filter(entry.name)) {
        out.push(full);
      }
      // Recurse into subdirectory
      out.push(...walkDirsRecursive(full, filter));
    }
  }

  return out;
}

/**
 * Simple recursive file lister (matches original duplication pattern)
 * @param {string} dir - Directory to scan
 * @param {string} base - Base directory for relative paths (defaults to dir)
 * @returns {Array<Object>} Array of file objects with { rel, full, size }
 */
export function listFilesRecursive(dir, base = dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listFilesRecursive(full, base));
    } else {
      const rel = path.relative(base, full);
      let size = 0;
      try {
        size = fs.statSync(full).size;
      } catch (_) {}
      out.push({ rel, full, size });
    }
  }
  return out;
}

/**
 * List numeric step directories (matches duplicate pattern in session storage audit)
 * @param {string} sessionDir - Session directory to scan for step subdirectories
 * @returns {Array<number>} Sorted array of step numbers
 */
export function listStepDirs(sessionDir) {
  try {
    return fs
      .readdirSync(sessionDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
      .map((d) => Number(d.name))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}