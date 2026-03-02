/**
 * Task Semantic Analyzer Neuron
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Анализирует детализацию входящей задачи и определяет её уровень
 *
 * Активируется всегда (triggers: ['*']) как первый нейрон в цепочке анализа
 */

import type {Neuron} from '../types/knowledge.types.js';

export const taskSemanticAnalyzerNeuron: Neuron = {
    id: 'neuron-task-semantic-analyzer',
    name: 'Task Semantic Analyzer',
    category: 'task_analysis',
    triggers: ['*'], // активируется всегда при наличии new_task
    knowledge: {
        description: 'Analyzes incoming task text to determine detail level',
        detailLevels: {
            short: 'Task requires clarification - brief, vague, or missing context',
            medium: 'Task understandable - has structure but needs files',
            detailed: 'Task ready - has technical terms and/or file paths',
        },
        analysisCriteria: [
            'text_length_words',
            'text_length_chars',
            'technical_terms_count',
            'file_paths_present',
            'framework_indicators',
        ],
    },
    actions: [
        {type: 'analyze', target: 'task-detail-level'},
        {type: 'classify', target: 'task-type'},
    ],
    triggersMode: 'any',
    priority: 10, // highest priority - runs first
};
