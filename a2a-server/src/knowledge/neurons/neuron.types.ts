/**
 * Neuron types — A2A Knowledge Graph
 * Neurons hold Laravel 11 DNA (standards, conventions, paths)
 */

export type NeuronCategory =
  | 'validation'
  | 'auth'
  | 'eloquent'
  | 'routing'
  | 'views'
  | 'testing'
  | 'architecture';

export interface NeuronKnowledge {
  entities: string[];
  relations: string[];
  description: string;
}

export interface NeuronAction {
  type: 'inject';
  target: string;
}

export interface NeuronContract {
  method?: string;
  property?: string;
}

export interface Neuron {
  id: string;
  name: string;
  category: NeuronCategory;
  triggers: string[];
  knowledge: NeuronKnowledge;
  actions?: NeuronAction[];
  contracts?: NeuronContract[];
  store?: Record<string, unknown>;
}

export interface ActivationContext {
  filePaths: string[];
  fileContents?: Record<string, string>;
  projectStructure?: string[];
}

export interface ActivatedNeuron {
  neuron: Neuron;
  matchedTriggers: string[];
}
