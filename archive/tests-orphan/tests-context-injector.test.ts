/**
 * Context Injector Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  sortByPriority,
  resolveInjections,
  resolveRequestFiles,
  mergeInjectedContext,
} from '../../src/knowledge/context-injector.js';
import type { ActivatedNeuron, Neuron } from '../../src/knowledge/neurons/neuron.types.js';

function an(id: string, priority?: number, actions?: Neuron['actions']): ActivatedNeuron {
  return {
    neuron: {
      id,
      name: id,
      category: 'validation',
      triggers: [],
      knowledge: { entities: [], relations: [], description: '' },
      priority,
      actions,
    },
    matchedTriggers: [],
  };
}

describe('Context Injector', () => {
  describe('sortByPriority', () => {
    it('sorts higher priority first', () => {
      const list = [an('a', 3), an('b', 8), an('c', 5)];
      expect(sortByPriority(list).map((x) => x.neuron.id)).toEqual(['b', 'c', 'a']);
    });
    it('defaults priority to 5', () => {
      const list = [an('a'), an('b')];
      expect(sortByPriority(list)).toHaveLength(2);
    });
  });

  describe('resolveRequestFiles', () => {
    it('collects items from request_files actions', () => {
      const activated: ActivatedNeuron[] = [
        an('n1', 5, [{ type: 'request_files', items: ['a.php', 'b.php'] }]),
      ];
      expect(resolveRequestFiles(activated)).toEqual(['a.php', 'b.php']);
    });
    it('deduplicates items', () => {
      const activated: ActivatedNeuron[] = [
        an('n1', 5, [{ type: 'request_files', items: ['a.php'] }]),
        an('n2', 5, [{ type: 'request_files', items: ['a.php', 'b.php'] }]),
      ];
      expect(resolveRequestFiles(activated)).toEqual(['a.php', 'b.php']);
    });
    it('returns empty for null/undefined', () => {
      expect(resolveRequestFiles(null)).toEqual([]);
      expect(resolveRequestFiles(undefined)).toEqual([]);
    });
  });

  describe('mergeInjectedContext', () => {
    it('joins with double newline', () => {
      const injected = [
        { target: 't1', content: 'c1' },
        { target: 't2', content: 'c2' },
      ];
      expect(mergeInjectedContext(injected)).toBe('c1\n\nc2');
    });
    it('returns empty for empty array', () => {
      expect(mergeInjectedContext([])).toBe('');
    });
  });
});
