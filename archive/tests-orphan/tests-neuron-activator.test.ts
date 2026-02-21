/**
 * Neuron Activator Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearNeurons, registerNeuron } from '../../src/knowledge/neurons/neuron-store.js';
import { activateNeurons } from '../../src/knowledge/neurons/neuron-activator.js';
import type { Neuron } from '../../src/knowledge/neurons/neuron.types.js';

const BUILTIN_CTX = 'neuron-context-validation';
beforeEach(() => clearNeurons());

function makeNeuron(overrides: Partial<Neuron> = {}): Neuron {
  return {
    id: 'test-neuron',
    name: 'Test',
    category: 'validation',
    triggers: ['FormRequest', 'rules()'],
    knowledge: { entities: [], relations: [], description: '' },
    actions: [{ type: 'inject', target: BUILTIN_CTX }],
    ...overrides,
  };
}

describe('Neuron Activator', () => {
  it('activates when trigger matches content', () => {
    registerNeuron(makeNeuron());
    const activated = activateNeurons({
      filePaths: [],
      fileContents: { 'a.php': 'class X extends FormRequest { rules() {} }' },
    });
    expect(activated).toHaveLength(1);
    expect(activated[0].neuron.id).toBe('test-neuron');
    expect(activated[0].matchedTriggers).toContain('FormRequest');
    expect(activated[0].matchedTriggers).toContain('rules()');
  });

  it('does not activate when no trigger matches', () => {
    registerNeuron(makeNeuron());
    const activated = activateNeurons({
      filePaths: [],
      fileContents: { 'a.php': 'class X {}' },
    });
    expect(activated).toHaveLength(0);
  });

  it('activates from projectStructure', () => {
    registerNeuron(makeNeuron());
    const activated = activateNeurons({
      filePaths: [],
      projectStructure: ['FormRequest', 'laravel'],
    });
    expect(activated).toHaveLength(1);
  });

  it('respects triggersMode all', () => {
    registerNeuron(makeNeuron({ triggersMode: 'all', triggers: ['A', 'B'] }));
    expect(activateNeurons({ filePaths: [], fileContents: { x: 'A' } })).toHaveLength(0);
    expect(activateNeurons({ filePaths: [], fileContents: { x: 'A B' } })).toHaveLength(1);
  });

  it('respects dependsOn', () => {
    registerNeuron(makeNeuron({ id: 'dep', triggers: ['dep'] }));
    registerNeuron(makeNeuron({ id: 'child', triggers: ['child'], dependsOn: ['dep'] }));
    const activated = activateNeurons({
      filePaths: [],
      fileContents: { x: 'child' },
    });
    expect(activated).toHaveLength(0);
    const activated2 = activateNeurons({
      filePaths: [],
      fileContents: { x: 'dep child' },
    });
    expect(activated2).toHaveLength(2);
  });

  it('respects conflictsWith', () => {
    registerNeuron(makeNeuron({ id: 'a', triggers: ['a'] }));
    registerNeuron(makeNeuron({ id: 'b', triggers: ['b'], conflictsWith: ['a'] }));
    const activated = activateNeurons({
      filePaths: [],
      fileContents: { x: 'a b' },
    });
    const ids = activated.map((a) => a.neuron.id);
    expect(ids).toContain('a');
    expect(ids).not.toContain('b');
  });

  it('supports triggersRegex', () => {
    registerNeuron(makeNeuron({ id: 're', triggers: ['Model\\.php'], triggersRegex: true }));
    const activated = activateNeurons({
      filePaths: [],
      fileContents: { x: 'app/Models/User.Model.php' },
    });
    expect(activated).toHaveLength(1);
  });

  describe('Etalon scenarios (θ = startup)', () => {
    it('A: empty context → 0 neurons', () => {
      registerNeuron(makeNeuron());
      const activated = activateNeurons({
        filePaths: [],
      });
      expect(activated).toHaveLength(0);
    });

    it('B: arch only (projectStructure) → content-triggered neuron', () => {
      registerNeuron(makeNeuron());
      const activated = activateNeurons({
        filePaths: [],
        projectStructure: ['FormRequest', 'Laravel'],
      });
      expect(activated).toHaveLength(1);
      expect(activated[0].neuron.id).toBe('test-neuron');
    });

    it('D: task + codeBlocks → content-triggered from file content', () => {
      registerNeuron(makeNeuron({ id: 'eloquent', triggers: ['extends Model', 'belongsTo'] }));
      const activated = activateNeurons({
        filePaths: ['app/Models/User.php'],
        fileContents: {
          'app/Models/User.php': 'class User extends Model { public function posts() { return $this->hasMany(Post::class); } }',
        },
      });
      expect(activated).toHaveLength(1);
      expect(activated[0].neuron.id).toBe('eloquent');
      expect(activated[0].matchedTriggers).toContain('extends Model');
    });

    it('E: taskText only → task-triggered neuron', () => {
      registerNeuron(makeNeuron({ id: 'task-val', triggers: ['validation', 'rules'] }));
      const activated = activateNeurons({
        filePaths: [],
        taskText: 'add user validation',
      });
      expect(activated).toHaveLength(1);
      expect(activated[0].neuron.id).toBe('task-val');
      expect(activated[0].matchedTriggers).toContain('validation');
    });
  });
});
