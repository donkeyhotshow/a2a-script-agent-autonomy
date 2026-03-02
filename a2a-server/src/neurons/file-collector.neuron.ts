/**
 * File Collector Neuron
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Собирает необходимые файлы для обработки задачи
 *
 * Активируется при наличии явных файловых путей или когда задача требует контекста
 */

import type {Neuron} from '../types/knowledge.types.js';

export const fileCollectorNeuron: Neuron = {
    id: 'neuron-file-collector',
    name: 'File Collector',
    category: 'file_management',
    triggers: [
        'request_files',
        'path',
        'file',
        'directory',
        'controller',
        'model',
        'component',
        'service',
        'route',
        'migration',
    ],
    knowledge: {
        description: 'Collects required files based on task context',
        filePatterns: {
            laravel: [
                'app/Http/Controllers/**/*.php',
                'app/Models/**/*.php',
                'app/Services/**/*.php',
                'routes/**/*.php',
                'database/migrations/**/*.php',
                'resources/views/**/*.blade.php',
            ],
            vue: [
                'resources/js/components/**/*.vue',
                'resources/js/pages/**/*.vue',
                'resources/js/composables/**/*.ts',
            ],
            common: [
                'package.json',
                'composer.json',
                'tsconfig.json',
                'vite.config.*',
                'webpack.config.*',
            ],
        },
    },
    actions: [
        {type: 'collect', target: 'required-files'},
        {type: 'request_files', items: ['package.json', 'composer.json']},
    ],
    triggersMode: 'any',
    priority: 8, // runs after context detection
};
