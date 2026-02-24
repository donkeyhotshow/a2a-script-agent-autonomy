/**
 * vue-import-cleanup — Etalon script.
 * Produced by decomposition scenario (vue-import-fix).
 * Cleans up temporary artifacts.
 */

import { readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export const SCRIPT_ID = 'vue-import-cleanup';

const TEMP_EXTENSIONS = ['.patch', '.tmp', '.bak'];

export function cleanup(cwd: string, patterns: string[] = TEMP_EXTENSIONS): number {
  let removed = 0;
  const entries = readdirSync(cwd, { withFileTypes: true });
  for (const e of entries) {
    const full = join(cwd, e.name);
    if (e.isDirectory()) {
      removed += cleanup(full, patterns);
    } else if (patterns.some((ext) => e.name.endsWith(ext))) {
      unlinkSync(full);
      removed++;
    }
  }
  return removed;
}
