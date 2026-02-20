/**
 * Neuron Store — in-memory registry of neurons
 */

import type { Neuron } from './neuron.types.js';

const neurons: Map<string, Neuron> = new Map();

export function registerNeuron(neuron: Neuron): void {
  neurons.set(neuron.id, neuron);
}

export function getNeuron(id: string): Neuron | undefined {
  return neurons.get(id);
}

export function getAllNeurons(): Neuron[] {
  return Array.from(neurons.values());
}

export function getNeuronsByCategory(category: Neuron['category']): Neuron[] {
  return getAllNeurons().filter((n) => n.category === category);
}

export function clearNeurons(): void {
  neurons.clear();
}
