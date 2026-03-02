/**
 * Lint Neurons: PHP
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Нейроны для обнаружения проблем в PHP коде:
 * - code standards violations
 * - security issues
 * - invalid use statements
 * - database layer issues
 */

import type {Neuron} from '../types/knowledge.types.js';

// PHP code standards detector
export const detectPhpCodeStandards: Neuron = {
    id: 'lint-detect-php-code-standards',
    name: 'Detect PHP Code Standards',
    category: 'custom_lint',
    triggers: ['php', 'class', 'function', 'psr'],
    knowledge: {
        description: 'Обнаруживает нарушения PHP PSR стандартов кодирования',
        rule: {
            name: 'php/code-standards',
            severity: 'warning',
            message: 'Код должен соответствовать PSR-12 стандартам',
            patterns: [
                /function\s+[a-z][a-zA-Z0-9]*\s*\(/g, // не camelCase
                /\$\w+[A-Z]\w*/g, // не snake_case переменные
            ],
        },
        language: 'php',
        framework: 'laravel',
        fix: 'Используйте PSR-12: snake_case для переменных, camelCase для методов',
        examples: {
            bad: 'function GetUsers() { $userName = ... }',
            good: 'function getUsers() { $user_name = ... }',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 6,
};

// PHP security issues detector
export const detectPhpSecurityIssues: Neuron = {
    id: 'lint-detect-php-security-issues',
    name: 'Detect PHP Security Issues',
    category: 'custom_lint',
    triggers: ['sql', 'query', 'eval', 'password', 'security'],
    knowledge: {
        description: 'Обнаруживает потенциальные уязвимости безопасности в PHP коде',
        rule: {
            name: 'php/security-standards',
            severity: 'error',
            message: 'Обнаружена потенциальная уязвимость безопасности',
            patterns: [
                /\beval\s*\(/gi,
                /\$\_GET/gi,
                /\$\_POST/gi,
                /\$\_REQUEST/gi,
                /sql\s*concat/gi,
                /password_hash\s*\(\s*\)/gi, // пустой вызов
            ],
        },
        language: 'php',
        framework: 'laravel',
        fix: 'Используйте параметризованные запросы, валидацию, хеширование паролей через password_hash()',
        examples: {
            bad: 'eval($userInput) или $query = "SELECT * FROM users WHERE id = " . $id',
            good: 'User::find($id) или DB::select("SELECT * FROM users WHERE id = ?", [$id])',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 9, // высокий приоритет для security
};

// PHP invalid use statements detector
export const detectPhpInvalidUse: Neuron = {
    id: 'lint-detect-php-invalid-use',
    name: 'Detect PHP Invalid Use',
    category: 'custom_lint',
    triggers: ['use statement', 'import', 'class'],
    knowledge: {
        description: 'Обнаруживает неиспользуемые или неправильные use statements',
        rule: {
            name: 'php/invalid-use-statements',
            severity: 'warning',
            message: 'Неиспользуемые use statements должны быть удалены',
            patterns: [
                /^use\s+[\\a-zA-Z0-9_]+;$/gm,
            ],
        },
        language: 'php',
        framework: 'laravel',
        fix: 'Удалите неиспользуемые use statements для чистоты кода',
        examples: {
            bad: 'use App\\Models\\User; // не используется в файле',
            good: 'Удалить неиспользуемые imports',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 5,
};

// PHP database layer issues detector
export const detectDatabaseLayerIssues: Neuron = {
    id: 'lint-detect-database-layer-issues',
    name: 'Detect Database Layer Issues',
    category: 'custom_lint',
    triggers: ['database', 'model', 'eloquent', 'query', 'migration'],
    knowledge: {
        description: 'Обнаруживает проблемы с архитектурой базы данных',
        rule: {
            name: 'database/layer-standards',
            severity: 'warning',
            message: 'Обнаружена проблема с архитектурой базы данных',
            patterns: [
                /whereRaw\s*\(/gi,
                /join\s*\([^)]*on[^)]*\)/gi,
            ],
        },
        language: 'php',
        framework: 'laravel',
        fix: 'Используйте Eloquent relationships и scope методы вместо сырых запросов',
        examples: {
            bad: 'User::whereRaw("active = 1")->get()',
            good: 'User::where("active", true)->get() или scopeActive($query)',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 6,
};

// Export all PHP lint neurons
export const lintPhpNeurons: Neuron[] = [
    detectPhpCodeStandards,
    detectPhpSecurityIssues,
    detectPhpInvalidUse,
    detectDatabaseLayerIssues,
];
