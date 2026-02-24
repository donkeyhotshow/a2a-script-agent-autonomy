/**
 * Пример конфигурации ESLint для правил стилизации
 * 
 * Добавьте эти настройки в ваш .eslintrc.cjs
 */

module.exports = {
  // ... существующая конфигурация
  
  plugins: [
    'inertia',
    // ... другие плагины
  ],
  
  rules: {
    // ============================================
    // ПРАВИЛА СТИЛИЗАЦИИ
    // ============================================
    
    // 1. Обнаружение неактуальных классов (ОБЯЗАТЕЛЬНО)
    // Предотвращает опечатки и использование несуществующих классов
    'inertia/no-invalid-classes': 'error',
    
    // 2. Проверка responsive и dark mode (РЕКОМЕНДУЕТСЯ)
    // Напоминает о необходимости адаптивного дизайна и темной темы
    'inertia/require-responsive-classes': 'warn',
    
    // 3. Интеллектуальные рекомендации (ЭКСПЕРИМЕНТАЛЬНО)
    // Предлагает улучшения на основе контекста элемента
    // Рекомендуется отключить или использовать 'warn' при большом количестве предупреждений
    'inertia/suggest-styling-improvements': 'off',
    
    // ... остальные правила
  },
  
  // Переопределение для конкретных файлов/папок
  overrides: [
    {
      // Для компонентов дизайн-системы - строже
      files: ['features/shared/design-system/**/*.vue'],
      rules: {
        'inertia/no-invalid-classes': 'error',
        'inertia/require-responsive-classes': 'error',
        'inertia/suggest-styling-improvements': 'warn',
      },
    },
    {
      // Для legacy компонентов - мягче
      files: ['features/**/legacy/**/*.vue'],
      rules: {
        'inertia/no-invalid-classes': 'warn',
        'inertia/require-responsive-classes': 'off',
        'inertia/suggest-styling-improvements': 'off',
      },
    },
    {
      // Для тестовых файлов - отключить
      files: ['**/*.test.vue', '**/*.spec.vue'],
      rules: {
        'inertia/no-invalid-classes': 'off',
        'inertia/require-responsive-classes': 'off',
        'inertia/suggest-styling-improvements': 'off',
      },
    },
  ],
}

// ============================================
// ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
// ============================================

/**
 * Пример 1: Строгая конфигурация для production
 */
const strictConfig = {
  rules: {
    'inertia/no-invalid-classes': 'error',
    'inertia/require-responsive-classes': 'error',
    'inertia/suggest-styling-improvements': 'warn',
  },
}

/**
 * Пример 2: Мягкая конфигурация для development
 */
const softConfig = {
  rules: {
    'inertia/no-invalid-classes': 'warn',
    'inertia/require-responsive-classes': 'warn',
    'inertia/suggest-styling-improvements': 'off',
  },
}

/**
 * Пример 3: Только критичные проверки
 */
const minimalConfig = {
  rules: {
    'inertia/no-invalid-classes': 'error',
    'inertia/require-responsive-classes': 'off',
    'inertia/suggest-styling-improvements': 'off',
  },
}

// ============================================
// КОМАНДЫ ДЛЯ ЗАПУСКА
// ============================================

/**
 * Проверка всех Vue файлов:
 * npx eslint "features/**\/*.vue"
 * 
 * Проверка с автоисправлением:
 * npx eslint "features/**\/*.vue" --fix
 * 
 * Проверка только ошибок:
 * npx eslint "features/**\/*.vue" --quiet
 * 
 * Проверка конкретного правила:
 * npx eslint "features/**\/*.vue" --rule "inertia/no-invalid-classes: error"
 * 
 * Проверка с выводом в файл:
 * npx eslint "features/**\/*.vue" -o eslint-report.txt
 */
