/**
 * Neuron Flow Integration Tests
 * Verifies: neurons activate → result has request_files
 * Uses processNewTaskToContext directly (neurons loaded in app at import)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { registerBaseNeurons } from '../../src/knowledge/neurons/base/index.js';
import { processNewTaskToContext } from '../../src/knowledge/context-handler.js';

beforeAll(() => registerBaseNeurons());

describe('Neuron flow integration', () => {
  it('etalon B: new_task + architectural_features → validation neuron → request_files', () => {
    const ctx = {
      version: '1.0',
      project_path: 'C:/workspace/example',
      new_task: ['add validation'],
      architectural_features: ['FormRequest', 'Laravel'],
    };
    const { context, activatedNeurons } = processNewTaskToContext(ctx, []);
    expect(activatedNeurons.some((a) => a.neuron.id === 'neuron-validation')).toBe(true);
    expect(context.request_files).toBeDefined();
    expect((context.request_files as string[])).toContain('app/Http/Requests/*.php');
  });

  it('etalon D: new_task + codeBlocks (model) → eloquent neuron → request_files', () => {
    const ctx = {
      version: '1.0',
      project_path: 'C:/workspace/example',
      new_task: ['refactor model'],
      architectural_features: ['Laravel'],
    };
    const codeBlocks = [
      {
        path: 'app/Models/User.php',
        content: `<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class User extends Model {
  public function posts() { return $this->hasMany(Post::class); }
}`,
      },
    ];
    const { context } = processNewTaskToContext(ctx, codeBlocks);
    expect(context.request_files).toBeDefined();
    const rf = context.request_files as string[];
    expect(rf.length).toBeGreaterThan(0);
    expect(rf.some((p) => p.includes('Models') || p.includes('migrations'))).toBe(true);
  });
});
