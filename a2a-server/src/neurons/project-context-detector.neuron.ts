/**
 * Project Context Detector Neuron
 * Определяет контекст проекта на основе фреймворка и архитектуры
 * 
 * Активируется при наличии технических терминов в задаче
 */

import type { Neuron } from '../types/knowledge.types.js';

export const projectContextDetectorNeuron: Neuron = {
  id: 'neuron-project-context-detector',
  name: 'Project Context Detector',
  category: 'context_gathering',
  triggers: [
    'laravel', 'vue', 'react', 'angular', 'inertia', 'api', 'rest',
    'controller', 'model', 'migration', 'service', 'middleware',
    'component', 'route', 'view', 'blade', 'typescript', 'javascript',
    'database', 'sql', 'mysql', 'postgresql', 'redis',
  ],
  knowledge: {
    description: 'Detects project framework and architecture context',
    frameworks: {
      backend: ['laravel', 'express', 'django', 'spring', 'rails', 'nestjs'],
      frontend: ['vue', 'react', 'angular', 'svelte', 'inertia'],
    },
    triggersMode: 'any',
  },
  actions: [
    { type: 'inject', target: 'framework-context' },
  ],
  triggersMode: 'any',
  priority: 9, // second highest - runs after semantic analyzer
};
