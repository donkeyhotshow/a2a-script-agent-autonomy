import { resolveInjections, mergeInjectedContext } from '../../../src/knowledge/context-injector.js';
import type { ActivatedNeuron } from '../../../src/knowledge/neurons/neuron.types.js';

describe('context-injector', () => {
  it('returns empty when no inject actions', () => {
    const activated: ActivatedNeuron[] = [
      {
        neuron: {
          id: 'n1',
          name: 'N1',
          category: 'validation',
          triggers: [],
          knowledge: { entities: [], relations: [], description: '' },
        },
        matchedTriggers: [],
      },
    ];
    expect(resolveInjections(activated)).toEqual([]);
  });

  it('returns empty for null/undefined/non-array activated', () => {
    expect(resolveInjections(null)).toEqual([]);
    expect(resolveInjections(undefined)).toEqual([]);
    expect(resolveInjections({} as ActivatedNeuron[])).toEqual([]);
  });

  it('resolves inject action for neuron-context-laravel-11', () => {
    const activated: ActivatedNeuron[] = [
      {
        neuron: {
          id: 'project-detector',
          name: 'Project Detector',
          category: 'architecture',
          triggers: ['composer.json'],
          knowledge: { entities: [], relations: [], description: '' },
          actions: [{ type: 'inject', target: 'neuron-context-laravel-11' }],
        },
        matchedTriggers: ['composer.json'],
      },
    ];
    const result = resolveInjections(activated);
    expect(result).toHaveLength(1);
    expect(result[0]?.target).toBe('neuron-context-laravel-11');
    expect(result[0]?.content).toContain('app/Models/');
  });

  it('skips unknown inject targets', () => {
    const activated: ActivatedNeuron[] = [
      {
        neuron: {
          id: 'n1',
          name: 'N1',
          category: 'architecture',
          triggers: [],
          knowledge: { entities: [], relations: [], description: '' },
          actions: [{ type: 'inject', target: 'unknown-target' }],
        },
        matchedTriggers: [],
      },
    ];
    expect(resolveInjections(activated)).toEqual([]);
  });

  it('skips malformed actions: missing type, empty target', () => {
    const activated: ActivatedNeuron[] = [
      {
        neuron: {
          id: 'n1',
          name: 'N1',
          category: 'architecture',
          triggers: [],
          knowledge: { entities: [], relations: [], description: '' },
          actions: [
            { type: 'inject', target: '' },
            { type: 'other' as 'inject', target: 'neuron-context-laravel-11' },
            { type: 'inject' },
          ] as unknown as { type: 'inject'; target: string }[],
        },
        matchedTriggers: [],
      },
    ];
    const result = resolveInjections(activated);
    expect(result).toEqual([]);
  });

  it('handles neuron with undefined actions', () => {
    const activated: ActivatedNeuron[] = [
      {
        neuron: {
          id: 'n1',
          name: 'N1',
          category: 'validation',
          triggers: [],
          knowledge: { entities: [], relations: [], description: '' },
        },
        matchedTriggers: [],
      },
    ];
    expect(resolveInjections(activated)).toEqual([]);
  });

  it('deduplicates same target from multiple neurons', () => {
    const activated: ActivatedNeuron[] = [
      {
        neuron: {
          id: 'n1',
          name: 'N1',
          category: 'architecture',
          triggers: [],
          knowledge: { entities: [], relations: [], description: '' },
          actions: [{ type: 'inject', target: 'neuron-context-laravel-11' }],
        },
        matchedTriggers: [],
      },
      {
        neuron: {
          id: 'n2',
          name: 'N2',
          category: 'architecture',
          triggers: [],
          knowledge: { entities: [], relations: [], description: '' },
          actions: [{ type: 'inject', target: 'neuron-context-laravel-11' }],
        },
        matchedTriggers: [],
      },
    ];
    const result = resolveInjections(activated);
    expect(result).toHaveLength(1);
  });

  it('mergeInjectedContext uses double newline separator', () => {
    const injected = [
      { target: 'a', content: 'Content A' },
      { target: 'b', content: 'Content B' },
    ];
    expect(mergeInjectedContext(injected)).toBe('Content A\n\nContent B');
  });

  it('mergeInjectedContext returns empty for null/undefined/empty', () => {
    expect(mergeInjectedContext(null)).toBe('');
    expect(mergeInjectedContext(undefined)).toBe('');
    expect(mergeInjectedContext([])).toBe('');
  });

  it('mergeInjectedContext handles single block', () => {
    expect(mergeInjectedContext([{ target: 'a', content: 'Only' }])).toBe(
      'Only'
    );
  });
});
