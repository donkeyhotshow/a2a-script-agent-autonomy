/**
 * Lint Neurons: Testing
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Нейроны для обнаружения проблем с тестированием:
 * - missing tests
 * - missing feature tests
 * - testing best practices
 */

import type {Neuron} from '../types/knowledge.types.js';

// Missing tests detector
export const detectMissingTests: Neuron = {
    id: 'lint-detect-missing-tests',
    name: 'Detect Missing Tests',
    category: 'custom_lint',
    triggers: ['test', 'spec', 'describe', 'it('],
    knowledge: {
        description: 'Обнаруживает отсутствие тестов для файлов',
        rule: {
            name: 'testing/missing-tests',
            severity: 'warning',
            message: 'Для каждого файла должны быть написаны тесты',
            patterns: [
                /\.vue(?![^.]*\.spec)/gi,
                /\.ts(?![^.]*\.test)/gi,
            ],
        },
        language: 'javascript',
        framework: 'testing',
        fix: 'Создайте соответствующие тестовые файлы: ComponentName.spec.ts',
        examples: {
            bad: 'src/utils/helper.ts без tests/helper.test.ts',
            good: 'src/utils/helper.ts с tests/helper.test.ts',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 6,
};

// Missing feature tests detector
export const detectMissingFeatureTests: Neuron = {
    id: 'lint-detect-missing-feature-tests',
    name: 'Detect Missing Feature Tests',
    category: 'custom_lint',
    triggers: ['feature', 'integration', 'e2e'],
    knowledge: {
        description: 'Обнаруживает отсутствие feature/интеграционных тестов',
        rule: {
            name: 'testing/missing-feature-tests',
            severity: 'warning',
            message: 'Для бизнес-логики должны быть feature тесты',
            patterns: [
                /class\s+\w+Controller/gi,
                /function\s+\w+Service/gi,
            ],
        },
        language: 'javascript',
        framework: 'testing',
        fix: 'Создайте feature тесты: tests/Feature/ScenarioNameTest.php',
        examples: {
            bad: 'app/Http/Controllers/UserController.php без tests/Feature/UserControllerTest.php',
            good: 'tests/Feature/UserControllerTest.php с тестами CRUD операций',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 6,
};

// Testing best practices detector
export const detectTestingBestPractices: Neuron = {
    id: 'lint-detect-testing-best-practices',
    name: 'Detect Testing Best Practices',
    category: 'custom_lint',
    triggers: ['expect', 'assert', 'should'],
    knowledge: {
        description: 'Обнаруживает нарушения лучших практик тестирования',
        rule: {
            name: 'testing/best-practices',
            severity: 'warning',
            message: 'Тесты должны следовать лучшим практикам',
            patterns: [
                /expect\([^)]*\)\.toBe\([^)]*===/gi,
                /assertTrue\([^)]*false[^)]*\)/gi,
            ],
        },
        language: 'javascript',
        framework: 'testing',
        fix: 'Избегайте жёстких сравнений, используйте правильные assertions, тестируйте поведение, не реализацию',
        examples: {
            bad: 'expect(result).toBe(true === isValid)',
            good: 'expect(result).toBe(true) или expect(result).toBeValid()',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 5,
};

// Export all Testing lint neurons
export const lintTestingNeurons: Neuron[] = [
    detectMissingTests,
    detectMissingFeatureTests,
    detectTestingBestPractices,
];
