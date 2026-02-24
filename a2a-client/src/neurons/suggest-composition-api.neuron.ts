import type { Neuron } from '../types/knowledge.types.js';

export const suggestCompositionApiNeuron: Neuron = {
  id: 'neuron-suggest-composition-api',
  name: 'Suggest Composition API',
  category: 'framework',
  triggers: ["data()", "methods:", "computed:", "props:", "Options API", "export default {"],
  knowledge: {
    pattern: 'Composition API with <script setup>',
    benefits: [
      'Better logic reuse through Composables',
      'Improved TypeScript support',
      'More concise code with <script setup>',
      'Easier to group related logical concerns together'
    ],
    expert_advice: [
      'Use "ref" for primitive values and "reactive" for deeply nested objects.',
      "Always use \"shallowRef\" for large objects that don't need deep reactivity to improve performance.",
      'Extract reusable logic into "useX" composable functions (e.g., useAuth.ts).',
      'Prefer <script setup> as it reduces boilerplate and provides better runtime performance.',
    ],
    remediation_example: {
      before: 'Options API with methods and data spread across the file.',
      after: 'Composition API using setup() or <script setup> where related variables and functions are co-located.'
    }
  },
  actions: [
    { type: 'inject', target: 'neuron-suggest-composition-api-context' },
    { type: 'request_files', items: ['resources/js/**/*.vue', 'src/components/**/*.vue'] },
  ],
  triggersMode: 'any',
  priority: 6,
};
