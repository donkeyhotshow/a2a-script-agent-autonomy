/**
 * External AI Trigger Neuron
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Триггер для внешнего AI для финальной обработки задачи
 *
 * Активируется на последнем этапе итерации для передачи задачи внешнему AI
 */

import type {Neuron} from '../types/knowledge.types.js';

export const externalAiTriggerNeuron: Neuron = {
    id: 'neuron-external-ai-trigger',
    name: 'External AI Trigger',
    category: 'external_ai',
    triggers: [
        'completed',
        'ready-for-ai',
        'iteration-complete',
    ],
    knowledge: {
        description: 'Triggers external AI for advanced task processing',
        conditions: [
            'all_required_files_collected',
            'context_detected',
            'task_detail_level_determined',
        ],
        aiProviders: [
            'openai',
            'anthropic',
            'google-ai',
            'local-llm',
        ],
    },
    actions: [
        {type: 'trigger', target: 'external-ai'},
    ],
    triggersMode: 'any',
    priority: 1, // lowest priority - runs last in iteration
};
