/**
 * vue-import-apply — Etalon script.
 * Produced by decomposition scenario (vue-import-fix).
 * Applies resolved import patches to files.
 */

import { readFileSync, writeFileSync } from 'node:fs';

export const SCRIPT_ID = 'vue-import-apply';

export interface ResolvedPatch {
  file: string;
  line: number;
  from: string;
  to: string;
}

export function applyPatches(patches: ResolvedPatch[]): void {
  const byFile = groupByFile(patches);
  for (const [file, filePatches] of Object.entries(byFile)) {
    let content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const sorted = [...filePatches].sort((a, b) => b.line - a.line);
    for (const p of sorted) {
      const idx = p.line - 1;
      if (idx >= 0 && idx < lines.length) {
        lines[idx] = lines[idx].replace(p.from, p.to);
      }
    }
    content = lines.join('\n');
    writeFileSync(file, content);
  }
}

function groupByFile(patches: ResolvedPatch[]): Record<string, ResolvedPatch[]> {
  const map: Record<string, ResolvedPatch[]> = {};
  for (const p of patches) {
    (map[p.file] ??= []).push(p);
  }
  return map;
}
