/**
 * Neuron Store — in-memory registry of neurons
 */

import { hasContextBlock } from '../context-store.js';
import type { Neuron, NeuronAction } from './neuron.types.js';

const neurons: Map<string, Neuron> = new Map();

function validateNeuron(neuron: Neuron): void {
  if (!neuron.id || typeof neuron.id !== 'string') {
    throw new Error('Neuron id required');
  }
  if (neurons.has(neuron.id)) {
    throw new Error(`Neuron id already registered: ${neuron.id}`);
  }
  if (!Array.isArray(neuron.triggers) || neuron.triggers.length === 0) {
    throw new Error(`Neuron ${neuron.id}: triggers required (non-empty array)`);
  }
  const actions = neuron.actions;
  if (actions && actions.length > 0) {
    for (const a of actions) {
      if ((a as NeuronAction).type === 'inject') {
        const target = (a as { target: string }).target;
        if (!target || !hasContextBlock(target)) {
          throw new Error(
            `Neuron ${neuron.id}: inject target "${target ?? ''}" not in context-store`
          );
        }
      }
      if ((a as NeuronAction).type === 'request_files') {
        const items = (a as { items: unknown[] }).items;
        if (!Array.isArray(items)) {
          throw new Error(
            `Neuron ${neuron.id}: request_files items must be array`
          );
        }
      }
    }
  }
}

export function registerNeuron(neuron: Neuron): void {
  validateNeuron(neuron);
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
