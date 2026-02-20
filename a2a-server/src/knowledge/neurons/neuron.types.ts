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

/**
 * Free-format file request: paths, masks, or semantic terms.
 * Client resolves items (exact path, glob, or search).
 */
export interface NeuronActionRequestFiles {
  type: 'request_files';
  items: string[];
}

export interface NeuronActionInject {
  type: 'inject';
  target: string;
}

export type NeuronAction = NeuronActionInject | NeuronActionRequestFiles;

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
  /** Activate only if these neuron ids are already activated */
  dependsOn?: string[];
  /** Do not activate if any of these neuron ids are activated */
  conflictsWith?: string[];
  /** 'any' = at least one trigger matches (default), 'all' = all must match */
  triggersMode?: 'any' | 'all';
  /** If true, treat each trigger as regex pattern */
  triggersRegex?: boolean;
  /** 1-10, higher = earlier in injection order. Default 5. */
  priority?: number;
}

export interface ActivationContext {
  filePaths: string[];
  fileContents?: Record<string, string>;
  projectStructure?: string[];
  /** new_task joined — used for task-triggered neuron activation */
  taskText?: string;
}

export interface ActivatedNeuron {
  neuron: Neuron;
  matchedTriggers: string[];
}
