import type { Neuron } from '../types/knowledge.types.js';

// Реализация на основе плана: plans/custom-lint-neurons.md

// New task analysis neurons
import { taskSemanticAnalyzerNeuron } from './task-semantic-analyzer.neuron.js';
import { projectContextDetectorNeuron } from './project-context-detector.neuron.js';
import { fileCollectorNeuron } from './file-collector.neuron.js';
import { externalAiTriggerNeuron } from './external-ai-trigger.neuron.js';
import { validationNeuron } from './validation.neuron.js';

/**
 * Neurons registry
 *
 * Legacy neurons moved to archive/neurons-legacy/
 * New architecture uses task analysis neurons with iterative processing
 */
export const neurons: Neuron[] = [
  // Task analysis neurons (highest priority - run first)
  taskSemanticAnalyzerNeuron,
  projectContextDetectorNeuron,
  fileCollectorNeuron,
  validationNeuron,
  // External AI trigger (lowest priority - runs last)
  externalAiTriggerNeuron,
];

/**
 * Get neurons by category
 */
export function getNeuronsByCategory(category: string): Neuron[] {
  return neurons.filter(n => n.category === category);
}

/**
 * Get neurons sorted by priority (highest first)
 */
export function getNeuronsByPriority(): Neuron[] {
  return [...neurons].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// Re-export individual neurons for direct access
export {
  taskSemanticAnalyzerNeuron,
  projectContextDetectorNeuron,
  fileCollectorNeuron,
  validationNeuron,
  externalAiTriggerNeuron,
};
