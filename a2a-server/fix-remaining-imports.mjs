#!/usr/bin/env node
/**
 * Fix remaining import path issues across all packages.
 * Handles depth-specific corrections and workspace package aliases.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, dirname, relative, resolve } from 'path';

function walk(dir) {
  const r = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
        walk(full).forEach(f => r.push(f));
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        r.push(full);
      }
    }
  } catch {}
  return r;
}
