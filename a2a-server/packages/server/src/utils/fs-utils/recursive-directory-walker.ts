/**
 * Utility functions for recursive directory walking
 * Created to eliminate code duplication in file system traversal
 */

import { existsSync, readdirSync, statSync, Stats } from 'fs';
import { join, relative, resolve, sep } from 'path';

interface WalkEntry {
  rel: string;
  full: string;
  stats: Stats;
}

interface WalkOptions {
  filter?: (entry: WalkEntry) => boolean;
  includeDirs?: boolean;
  base?: string;
}

interface ListEntry {
  rel: string;
  full: string;
  size: number;
}

/**
 * Recursively list all files in a directory with optional filtering.
 * @param dir - Directory to scan
 * @param options - Configuration options
 * @returns Array of file objects with { rel, full, stats }
 */
export function walkFilesRecursive(dir: string, options: WalkOptions = {}): WalkEntry[] {
  const {
    filter = () => true,
    includeDirs = false,
    base = dir,
  } = options;

  const out: WalkEntry[] = [];

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
      out.push(...walkFilesRecursive(full, { filter, includeDirs, base }));
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
 * Recursively list all directories in a directory.
 * @param dir - Directory to scan
 * @param filter - Function to filter directories (receives directory name)
 * @returns Array of absolute directory paths
 */
export function walkDirsRecursive(dir: string, filter: (name: string) => boolean = () => true): string[] {
  const out: string[] = [];

  if (!existsSync(dir)) return out;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const full = join(dir, entry.name);
      if (filter(entry.name)) {
        out.push(full);
      }
      out.push(...walkDirsRecursive(full, filter));
    }
  }

  return out;
}

/**
 * Simple recursive file lister.
 * @param dir - Directory to scan
 * @param base - Base directory for relative paths (defaults to dir)
 * @returns Array of file objects with { rel, full, size }
 */
export function listFilesRecursive(dir: string, base: string = dir): ListEntry[] {
  const out: ListEntry[] = [];
  if (!existsSync(dir)) return out;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...listFilesRecursive(full, base));
    } else {
      const rel = relative(base, full);
      let size = 0;
      try {
        size = statSync(full).size;
      } catch (err: unknown) {
        // File may have been deleted between readdir and stat (TOCTOU) — skip it.
        console.warn('[walkFiles] stat failed, skipping:', full, err instanceof Error ? err.message : String(err));
      }
      out.push({ rel, full, size });
    }
  }
  return out;
}

/**
 * List numeric step directories sorted ascending.
 * @param sessionDir - Session directory to scan for step sub-directories
 * @returns Sorted array of step numbers
 */
export function listStepDirs(sessionDir: string): number[] {
  try {
    return readdirSync(sessionDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
      .map((d) => Number(d.name))
      .sort((a, b) => a - b);
  } catch (err: unknown) {
    console.warn('[listStepDirs] readdirSync failed:', sessionDir, err instanceof Error ? err.message : String(err));
    return [];
  }
}
