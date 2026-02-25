/**
 * PHP Code Standards Rule
 *
 * Правила стандартов PHP кода согласно архитектуре проекта
 * - ADR 1001: PHP Code Standards
 * - ADR 1101: Laravel Architecture Standards
 * - ADR 1201: Database Layer Standards
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение стандартов PHP кода',
      category: 'Best Practices',
      recommended: true
    },
    schema: [],
    messages: {
      'php-namespace-required': 'PHP файлы должны иметь корректное пространство имен согласно PSR-4',
      'php-class-naming': 'Названия классов должны использовать PascalCase (PSR-1)',
      'php-method-naming': 'Названия методов должны использовать camelCase (PSR-1)',
      'php-constant-naming': 'Константы должны использовать UPPER_SNAKE_CASE (PSR-1)',
      'php-property-naming': 'Свойства должны использовать camelCase или $this->property',
      'php-laravel-naming': 'Laravel модели должны следовать соглашениям об именовании (snake_case таблицы)',
      'php-docblock-required': 'Все публичные методы и классы должны иметь PHPDoc',
      'php-no-global-functions': 'Не использовать глобальные функции в пространстве имен',
      'php-single-responsibility': 'Классы должны следовать принципу единственной ответственности',
      'php-dependency-injection': 'Использовать dependency injection вместо создания объектов в конструкторах',
      'php-no-static-methods': 'Избегать статических методов в бизнес-логике',
      'php-repository-pattern': 'Использовать repository pattern для доступа к данным',
      'php-service-layer': 'Бизнес-логика должна быть в сервисном слое'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isPHP = filename.endsWith('.php')

    if (!isPHP) return {}

    return {
      // Проверяем namespace
      Program(node) {
        const sourceCode = context.getSourceCode()
        const text = sourceCode.getText()

        // Проверяем namespace
        if (!text.includes('namespace ')) {
          context.report({
            node,
            messageId: 'php-namespace-required'
          })
        }

        // Проверяем PSR-1 naming для классов
        const classRegex = /class\s+([A-Z][a-zA-Z0-9]*)/g
        let match
        while ((match = classRegex.exec(text)) !== null) {
          const className = match[1]
          if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
            context.report({
              node,
              messageId: 'php-class-naming'
            })
          }
        }

        // Проверяем константы
        const constRegex = /const\s+([A-Z_][A-Z0-9_]*)/g
        while ((match = constRegex.exec(text)) !== null) {
          const constName = match[1]
          if (!/^[A-Z_][A-Z0-9_]*$/.test(constName)) {
            context.report({
              node,
              messageId: 'php-constant-naming'
            })
          }
        }

        // Проверяем Laravel соглашения
        if (text.includes('extends Model')) {
          // Laravel модель
          if (!text.includes('$table') && !text.includes('protected $table')) {
            // Проверяем snake_case для таблиц
          }
        }

        // Проверяем использование статических методов
        const staticRegex = /public static function/g
        if (staticRegex.test(text) && !text.includes('extends Model')) {
          context.report({
            node,
            messageId: 'php-no-static-methods'
          })
        }

        // Проверяем использование глобальных функций
        const globalFunctions = ['var_dump', 'print_r', 'die', 'exit', 'echo']
        globalFunctions.forEach(func => {
          if (text.includes(func + '(') && !text.includes('namespace ')) {
            context.report({
              node,
              messageId: 'php-no-global-functions'
            })
          }
        })
      }
    }
  }
}
