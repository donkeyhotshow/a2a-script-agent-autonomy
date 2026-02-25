/**
 * Test: load all action definitions from disk and match AUTO_AI index.
 */

import { describe, it, expect } from 'vitest';
import path from 'path';
import { parseAllActionsFromDirectory } from '../../src/actions/action-parser.js';
import { AUTO_AI_ACTION_IDS } from '../../src/actions/definitions/auto-ai-index.js';

const DEFINITIONS_DIR = path.resolve(process.cwd(), 'src/actions/definitions');

describe('definitions load', () => {
  it('loads all MD files from definitions (recursive)', async () => {
    const actions = await parseAllActionsFromDirectory(DEFINITIONS_DIR);
    expect(actions.length).toBeGreaterThan(0);
    const ids = new Set(actions.map((a) => a.id));
    expect(ids.size).toBe(actions.length);
  });

  it('every AUTO_AI_ACTION_IDS has a definition file', async () => {
    const actions = await parseAllActionsFromDirectory(DEFINITIONS_DIR);
    const loadedIds = new Set(actions.map((a) => a.id));
    const missing: string[] = [];
    for (const id of AUTO_AI_ACTION_IDS) {
      if (!loadedIds.has(id)) missing.push(id);
    }
    expect(missing).toEqual([]);
  });

  it('each loaded action has subActions array', async () => {
    const actions = await parseAllActionsFromDirectory(DEFINITIONS_DIR);
    for (const a of actions) {
      expect(Array.isArray(a.subActions)).toBe(true);
    }
  });
});
