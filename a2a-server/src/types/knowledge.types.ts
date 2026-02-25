/**
 * Knowledge types: neurons, questions
 *
 * Реализация на основе плана: plans/types-improvements.md
 */

export interface BuiltQuestion {
  question: string;
}

export type NeuronCategory = 
  | 'custom_pattern' 
  | 'framework' 
  | 'directory_structure' 
  | 'naming_convention'
  // New categories for task analysis system
  | 'task_analysis'
  | 'context_gathering'
  | 'file_management'
  | 'code_analysis'
  | 'generation'
  | 'external_ai';

export type NeuronAction =
  | { type: 'inject'; target: string }
  | { type: 'request_files'; items: string[] }
  // New action types for task analysis
  | { type: 'analyze'; target?: string }
  | { type: 'classify'; target?: string }
  | { type: 'collect'; target?: string }
  | { type: 'trigger'; target?: string };

export interface Neuron {
  id: string;
  name: string;
  category: NeuronCategory;
  triggers: string[];
  knowledge: Record<string, unknown>;
  actions?: NeuronAction[];
  dependsOn?: string[];
  conflictsWith?: string[];
  triggersMode?: 'any' | 'all';
  triggersRegex?: boolean;
  priority?: number;
}
