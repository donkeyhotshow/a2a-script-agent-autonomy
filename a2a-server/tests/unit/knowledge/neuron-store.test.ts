import {
  registerNeuron,
  getNeuron,
  getAllNeurons,
  getNeuronsByCategory,
  clearNeurons,
} from '../../../src/knowledge/neurons/neuron-store.js';
import type { Neuron } from '../../../src/knowledge/neurons/neuron.types.js';

const mockNeuron: Neuron = {
  id: 'neuron-test',
  name: 'Test',
  category: 'validation',
  triggers: ['FormRequest'],
  knowledge: {
    entities: ['FormRequest'],
    relations: [],
    description: 'Test neuron',
  },
};

describe('neuron-store', () => {
  beforeEach(() => clearNeurons());

  describe('registerNeuron', () => {
    it('registers neuron and retrieves by id', () => {
      registerNeuron(mockNeuron);
      expect(getNeuron('neuron-test')).toEqual(mockNeuron);
    });

    it('overwrites existing neuron with same id', () => {
      registerNeuron(mockNeuron);
      const updated = { ...mockNeuron, name: 'Updated' };
      registerNeuron(updated);
      expect(getNeuron('neuron-test')?.name).toBe('Updated');
    });
  });

  describe('getNeuron', () => {
    it('returns undefined for unknown id', () => {
      expect(getNeuron('unknown')).toBeUndefined();
    });
  });

  describe('getAllNeurons', () => {
    it('returns empty array when no neurons', () => {
      expect(getAllNeurons()).toEqual([]);
    });

    it('returns all registered neurons', () => {
      registerNeuron(mockNeuron);
      registerNeuron({ ...mockNeuron, id: 'neuron-2', name: 'Test2' });
      expect(getAllNeurons()).toHaveLength(2);
    });
  });

  describe('getNeuronsByCategory', () => {
    it('filters by category', () => {
      registerNeuron(mockNeuron);
      registerNeuron({ ...mockNeuron, id: 'n2', category: 'auth' });
      expect(getNeuronsByCategory('validation')).toHaveLength(1);
      expect(getNeuronsByCategory('auth')).toHaveLength(1);
    });
  });

  describe('clearNeurons', () => {
    it('removes all neurons', () => {
      registerNeuron(mockNeuron);
      clearNeurons();
      expect(getAllNeurons()).toEqual([]);
      expect(getNeuron('neuron-test')).toBeUndefined();
    });
  });
});
