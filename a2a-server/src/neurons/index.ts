import type { Neuron } from '../types/knowledge.types.js';

// Реализация на основе плана: plans/custom-lint-neurons.md

// New task analysis neurons
import { taskSemanticAnalyzerNeuron } from './task-semantic-analyzer.neuron.js';
import { projectContextDetectorNeuron } from './project-context-detector.neuron.js';
import { fileCollectorNeuron } from './file-collector.neuron.js';
import { externalAiTriggerNeuron } from './external-ai-trigger.neuron.js';
import { validationNeuron } from './validation.neuron.js';

// Custom lint neurons
import { lintInertiaNeurons } from './lint-inertia.neuron.js';
import { lintAccessibilityNeurons } from './lint-accessibility.neuron.js';
import { lintPhpNeurons } from './lint-php.neuron.js';
import { lintPowershellNeurons } from './lint-powershell.neuron.js';
import { lintTestingNeurons } from './lint-testing.neuron.js';

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
  // Custom lint neurons (priority 5-9 based on severity)
  // Inertia.js lint neurons
  ...lintInertiaNeurons,
  // Accessibility lint neurons
  ...lintAccessibilityNeurons,
  // PHP lint neurons
  ...lintPhpNeurons,
  // PowerShell lint neurons
  ...lintPowershellNeurons,
  // Testing lint neurons
  ...lintTestingNeurons,
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
  // Lint neurons
  lintInertiaNeurons,
  lintAccessibilityNeurons,
  lintPhpNeurons,
  lintPowershellNeurons,
  lintTestingNeurons,
};
