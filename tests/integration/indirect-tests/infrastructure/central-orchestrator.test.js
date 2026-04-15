/**
 * Contract tests for [central-orchestrator.mjs](../../central-orchestrator.mjs) (no full pipeline).
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** infrastructure → indirect-tests → integration → tests → repo root */
const REPO_ROOT = path.resolve(__dirname, '../../../..');

describe('central-orchestrator.mjs', () => {
  it('exits 2 when extra CLI arguments are passed', () => {
    const script = path.join(REPO_ROOT, 'scripts', 'orchestrator-runbook', 'central-orchestrator.mjs');
    const r = spawnSync(process.execPath, [script, 'bogus'], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
    expect(r.status).toBe(2);
    const err = `${r.stderr || ''}${r.stdout || ''}`;
    expect(err).toMatch(/no CLI arguments/);
  });
});
