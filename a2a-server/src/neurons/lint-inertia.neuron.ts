/**
 * Lint Neurons: Inertia.js
 *
 * Реализация на основе плана: plans/custom-lint-neurons.md
 *
 * Нейроны для обнаружения проблем в Inertia.js коде:
 * - anchor navigation (требует Link вместо <a>)
 * - window.location usage
 * - missing localization
 * - missing meta tags
 * - fetch usage
 * - router options
 * - useForm required fields
 */

import type { Neuron } from '../types/knowledge.types.js';

// Inertia.js anchor navigation detector
export const detectInertiaAnchorNavigation: Neuron = {
  id: 'lint-detect-inertia-anchor-navigation',
  name: 'Detect Inertia Anchor Navigation',
  category: 'custom_lint',
  triggers: ['<a href=', 'anchor navigation', 'inertia link'],
  knowledge: {
    description: 'Обнаруживает использование <a> тегов для внутренних Inertia.js маршрутов',
    rule: {
      name: 'inertia/no-anchor-navigation',
      severity: 'error',
      message: 'Используйте <Link> вместо <a> для внутренних маршрутов Inertia.js',
      patterns: [
        /<a[^>]+href=["'](?!\s*(http|mailto|tel|sms|#|blob|data|javascript:))/gi,
      ],
    },
    language: 'vue',
    framework: 'inertia',
    fix: 'Замените <a> на <Link> компонент из @inertiajs/vue3',
    examples: {
      bad: '<a href="/users">Users</a>',
      good: '<Link href="/users">Users</Link>',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 8, // высокий приоритет
};

// Inertia.js window.location detector
export const detectInertiaWindowLocation: Neuron = {
  id: 'lint-detect-inertia-window-location',
  name: 'Detect Inertia Window Location',
  category: 'custom_lint',
  triggers: ['window.location', 'window.href', 'inertia navigate'],
  knowledge: {
    description: 'Обнаруживает использование window.location для навигации в Inertia.js',
    rule: {
      name: 'inertia/no-window-location',
      severity: 'error',
      message: 'Используйте Inertia.visit() вместо window.location для навигации',
      patterns: [
        /window\.location\s*=/gi,
        /window\.location\.href\s*=/gi,
        /window\.navigate/gi,
      ],
    },
    language: 'javascript',
    framework: 'inertia',
    fix: 'Используйте Inertia.visit() или компонент <Link>',
    examples: {
      bad: 'window.location.href = "/users"',
      good: 'Inertia.visit("/users") или <Link href="/users">',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 8,
};

// Inertia.js missing localization detector
export const detectInertiaMissingLocalization: Neuron = {
  id: 'lint-detect-inertia-missing-localization',
  name: 'Detect Inertia Missing Localization',
  category: 'custom_lint',
  triggers: ['localization', 'translate', 'i18n', 't()'],
  knowledge: {
    description: 'Обнаруживает отсутствие локализации в навигации Inertia.js',
    rule: {
      name: 'inertia/no-unlocalized-navigation',
      severity: 'warning',
      message: 'Текст навигации должен быть обёрнут в функцию локализации',
      patterns: [
        /<Link[^>]*>[A-Za-zА-Яа-яёЁ]+<\/Link>/gi,
      ],
    },
    language: 'vue',
    framework: 'inertia',
    fix: 'Оберните текст в функцию локализации: t("route.name")',
    examples: {
      bad: '<Link href="/users">Users</Link>',
      good: '<Link href="/users">{{ t("menu.users") }}</Link>',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 7,
};

// Inertia.js missing meta tags detector
export const detectInertiaNoMetaTags: Neuron = {
  id: 'lint-detect-inertia-no-meta-tags',
  name: 'Detect Inertia Missing Meta Tags',
  category: 'custom_lint',
  triggers: ['meta tags', 'title', 'SEO', 'head'],
  knowledge: {
    description: 'Обнаруживает отсутствие мета-тегов в Vue шаблонах Inertia',
    rule: {
      name: 'inertia/no-meta-tags-in-vue-templates',
      severity: 'warning',
      message: 'В Vue шаблонах Inertia.js мета-теги должны определяться на серверной стороне',
      patterns: [
        /<title>/gi,
        /<meta[^>]+name=["'](description|keywords|author)["']/gi,
      ],
    },
    language: 'vue',
    framework: 'inertia',
    fix: 'Определите мета-теги в контроллере Laravel с помощью Inertia::setTitle() или useHead()',
    examples: {
      bad: '<title>My Page</title>',
      good: 'useHead({ title: "My Page" }) в Laravel контроллере',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 6,
};

// Inertia.js fetch usage detector
export const detectInertiaFetchUsage: Neuron = {
  id: 'lint-detect-inertia-fetch-usage',
  name: 'Detect Inertia Fetch Usage',
  category: 'custom_lint',
  triggers: ['fetch(', 'axios', 'inertia request'],
  knowledge: {
    description: 'Обнаруживает использование fetch/axios для данных вместо Inertia запросов',
    rule: {
      name: 'inertia/no-fetch',
      severity: 'warning',
      message: 'Для получения данных в Inertia.js используйте Inertia.get() или Inertia.post()',
      patterns: [
        /fetch\([^)]*\)/gi,
        /axios\.[get|post|put|delete]\(/gi,
      ],
    },
    language: 'javascript',
    framework: 'inertia',
    fix: 'Используйте Inertia.get() для получения данных или Inertia.reload() для обновления страницы',
    examples: {
      bad: 'fetch("/api/users").then(...)',
      good: 'Inertia.get("/users") или useForm для форм',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 7,
};

// Inertia.js router options detector
export const detectInertiaRouterOptions: Neuron = {
  id: 'lint-detect-inertia-router-options',
  name: 'Detect Inertia Router Options',
  category: 'custom_lint',
  triggers: ['router', 'visit options', 'inertia options'],
  knowledge: {
    description: 'Обнаруживает неправильные или отсутствующие опции в Inertia.visit()',
    rule: {
      name: 'inertia/router-visit-options',
      severity: 'warning',
      message: 'Inertia.visit() требует определённых опций для корректной работы',
      patterns: [
        /Inertia\.visit\([^)]*\)/gi,
      ],
    },
    language: 'javascript',
    framework: 'inertia',
    fix: 'Добавьте необходимые опции: method, data, replace, preserveState, etc.',
    examples: {
      bad: 'Inertia.visit("/users")',
      good: 'Inertia.visit("/users", { method: "get", preserveState: true })',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 5,
};

// Inertia.js useForm required detector
export const detectInertiaUseFormRequired: Neuron = {
  id: 'lint-detect-inertia-useform-required',
  name: 'Detect Inertia UseForm Required',
  category: 'custom_lint',
  triggers: ['useForm', 'form data', 'required field'],
  knowledge: {
    description: 'Обнаруживает отсутствие обязательных полей в useForm',
    rule: {
      name: 'inertia/use-form-required',
      severity: 'error',
      message: 'Поля формы должны иметь валидацию на сервере и проверку на клиенте',
      patterns: [
        /useForm\([^)]*\)/gi,
      ],
    },
    language: 'javascript',
    framework: 'inertia',
    fix: 'Добавьте required валидацию в Laravel контроллере и используйте useForm с полями',
    examples: {
      bad: 'const form = useForm({})',
      good: 'const form = useForm({ name: "", email: "" }) с валидацией в контроллере',
    },
  },
  actions: [
    { type: 'analyze', target: 'code-blocks' },
    { type: 'inject', target: 'lint-results' },
  ],
  triggersMode: 'any',
  priority: 7,
};

// Export all Inertia.js lint neurons
export const lintInertiaNeurons: Neuron[] = [
  detectInertiaAnchorNavigation,
  detectInertiaWindowLocation,
  detectInertiaMissingLocalization,
  detectInertiaNoMetaTags,
  detectInertiaFetchUsage,
  detectInertiaRouterOptions,
  detectInertiaUseFormRequired,
];
