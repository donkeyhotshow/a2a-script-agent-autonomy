import type { Neuron } from '../types/knowledge.types.js';

export const detectSqlInjectionNeuron: Neuron = {
  id: 'neuron-detect-sql-injection',
  name: 'Detect Sql Injection',
  category: 'custom_pattern',
  triggers: ["whereRaw","DB::raw","selectRaw"],
  knowledge: {},
  actions: [
    { type: 'inject', target: 'neuron-detect-sql-injection-context' },
    { type: 'request_files', items: ['app/**/*.php', 'resources/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 5,
};
