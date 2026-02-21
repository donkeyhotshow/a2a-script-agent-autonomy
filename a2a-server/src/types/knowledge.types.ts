/** Knowledge types: neurons, questions. */

export interface BuiltQuestion {
  question: string;
}

export type NeuronCategory = 'custom_pattern' | 'framework' | 'directory_structure' | 'naming_convention';

export type NeuronAction =
  | { type: 'inject'; target: string }
  | { type: 'request_files'; items: string[] };

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
