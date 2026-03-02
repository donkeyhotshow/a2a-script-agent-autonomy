/**
 * Lint Neurons: Accessibility
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Нейроны для обнаружения проблем доступности (WCAG 2.1 AA):
 * - missing alt text
 * - missing aria labels
 * - keyboard navigation issues
 * - color contrast issues
 */

import type {Neuron} from '../types/knowledge.types.js';

// Accessibility missing alt detector
export const detectA11yMissingAlt: Neuron = {
    id: 'lint-detect-a11y-missing-alt',
    name: 'Detect A11y Missing Alt',
    category: 'custom_lint',
    triggers: ['<img', 'alt text', 'image accessibility'],
    knowledge: {
        description: 'Обнаруживает отсутствие alt атрибута у изображений',
        rule: {
            name: 'accessibility/missing-alt',
            severity: 'error',
            message: 'Изображение должно иметь alt атрибут для доступности',
            patterns: [
                /<img(?![^>]*alt)[^>]*>/gi,
            ],
        },
        language: 'vue',
        framework: 'accessibility',
        fix: 'Добавьте alt атрибут с описательным текстом или alt="" для декоративных изображений',
        examples: {
            bad: '<img src="photo.jpg">',
            good: '<img src="photo.jpg" alt="Description of photo">',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 8,
};

// Accessibility missing aria detector
export const detectA11yMissingAria: Neuron = {
    id: 'lint-detect-a11y-missing-aria',
    name: 'Detect A11y Missing Aria',
    category: 'custom_lint',
    triggers: ['aria-label', 'aria-live', 'button accessibility'],
    knowledge: {
        description: 'Обнаруживает отсутствие необходимых ARIA атрибутов',
        rule: {
            name: 'accessibility/missing-aria',
            severity: 'error',
            message: 'Интерактивные элементы должны иметь доступные имена',
            patterns: [
                /<button(?![^>]*aria-label)[^>]*>/gi,
                /<input(?![^>]*aria-label)[^>]*>/gi,
            ],
        },
        language: 'vue',
        framework: 'accessibility',
        fix: 'Добавьте aria-label или видимый текст внутри элемента',
        examples: {
            bad: '<button><-icon /></button>',
            good: '<button aria-label="Close dialog"><Icon /></button>',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 8,
};

// Accessibility keyboard navigation issues
export const detectA11yKeyboardIssues: Neuron = {
    id: 'lint-detect-a11y-keyboard-issues',
    name: 'Detect A11y Keyboard Issues',
    category: 'custom_lint',
    triggers: ['tabindex', 'keyboard', 'focus', 'tab order'],
    knowledge: {
        description: 'Обнаруживает проблемы с клавиатурной навигацией',
        rule: {
            name: 'accessibility/keyboard-issues',
            severity: 'warning',
            message: 'Все интерактивные элементы должны быть доступны с клавиатуры',
            patterns: [
                /<div(?![^>]*role)[^>]*onclick/gi,
            ],
        },
        language: 'vue',
        framework: 'accessibility',
        fix: 'Используйте семантические элементы (button, a) или добавьте role и tabindex',
        examples: {
            bad: '<div onclick="handleClick()">Click me</div>',
            good: '<button @click="handleClick()">Click me</button>',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 7,
};

// Accessibility color contrast issues
export const detectA11yColorContrast: Neuron = {
    id: 'lint-detect-a11y-color-contrast',
    name: 'Detect A11y Color Contrast',
    category: 'custom_lint',
    triggers: ['color', 'contrast', 'background', 'text color'],
    knowledge: {
        description: 'Обнаруживает проблемы с контрастом цветов',
        rule: {
            name: 'accessibility/color-contrast',
            severity: 'warning',
            message: 'Текст должен иметь достаточный контраст с фоном (минимум 4.5:1 для обычного текста)',
            patterns: [
                /style\s*=\s*["'][^"']*color:\s*#[0-9a-fA-F]{3,6}/gi,
            ],
        },
        language: 'vue',
        framework: 'accessibility',
        fix: 'Увеличьте контраст между текстом и фоном. Используйте цвета с достаточной разницей в яркости',
        examples: {
            bad: 'color: #999999 на белом фоне',
            good: 'color: #333333 на белом фоне (минимум 4.5:1)',
        },
    },
    actions: [
        {type: 'analyze', target: 'code-blocks'},
        {type: 'inject', target: 'lint-results'},
    ],
    triggersMode: 'any',
    priority: 6,
};

// Export all Accessibility lint neurons
export const lintAccessibilityNeurons: Neuron[] = [
    detectA11yMissingAlt,
    detectA11yMissingAria,
    detectA11yKeyboardIssues,
    detectA11yColorContrast,
];
