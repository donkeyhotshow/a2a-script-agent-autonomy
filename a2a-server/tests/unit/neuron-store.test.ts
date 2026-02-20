/**
 * Neuron Store Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { clearNeurons, registerNeuron, getNeuron, getAllNeurons, getNeuronsByCategory } from '../../src/knowledge/neurons/neuron-store.js';
import type { Neuron } from '../../src/knowledge/neurons/neuron.types.js';

const BUILTIN = 'neuron-context-validation';

beforeEach(() => clearNeurons());

function makeNeuron(overrides: Partial<Neuron> = {}): Neuron {
  return {
    id: 'test-n',
    name: 'Test',
    category: 'validation',
    triggers: ['x'],
    knowledge: { entities: [], relations: [], description: '' },
    actions: [{ type: 'inject', target: BUILTIN }],
    ...overrides,
  };
}

describe('Neuron Store', () => {
  it('registers and retrieves neuron', () => {
    const n = makeNeuron();
    registerNeuron(n);
    expect(getNeuron('test-n')).toEqual(n);
    expect(getAllNeurons()).toHaveLength(1);
  });

  it('throws on duplicate id', () => {
    registerNeuron(makeNeuron());
    expect(() => registerNeuron(makeNeuron())).toThrow('already registered');
  });

  it('throws on empty triggers', () => {
    expect(() => registerNeuron(makeNeuron({ triggers: [] }))).toThrow('triggers required');
  });

  it('throws on invalid inject target', () => {
    expect(() =>
      registerNeuron(makeNeuron({ actions: [{ type: 'inject', target: 'nonexistent-xyz-123' }] }))
    ).toThrow('not in context-store');
  });

  it('throws on request_files with non-array items', () => {
    expect(() =>
      registerNeuron(makeNeuron({ actions: [{ type: 'request_files', items: 'x' as unknown as string[] }] }))
    ).toThrow('items must be array');
  });

  it('filters by category', () => {
    registerNeuron(makeNeuron({ id: 'v1', category: 'validation' }));
    registerNeuron(makeNeuron({ id: 'a1', category: 'auth' }));
    expect(getNeuronsByCategory('validation')).toHaveLength(1);
    expect(getNeuronsByCategory('auth')).toHaveLength(1);
  });
});
