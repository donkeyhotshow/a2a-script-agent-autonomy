/**
 * ESLint правило: icon-usage-framework
 *
 * Проверяет правильное использование иконок согласно Unified Icon Usage Framework.
 * Согласно ADR 1027: Unified Icon Usage Framework
 *
 * Требует использования компонента Icon вместо прямого импорта иконок из @heroicons/vue
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Требует использования унифицированного компонента Icon вместо прямого импорта иконок',
      category: 'Best Practices',
      recommended: true,
      url: 'docs/architecture/adr/1027-unified-icon-usage-framework.md'
    },
    schema: [],
    messages: {
      useUnifiedIcon: 'Используйте компонент <Icon name="iconName"> вместо прямого импорта из @heroicons/vue',
      avoidDirectImport: 'Не импортируйте иконки напрямую из @heroicons/vue. Используйте унифицированный компонент Icon.'
    }
  },
  create(context) {
    return {
      // Проверяем импорты иконок из @heroicons/vue
      ImportDeclaration(node) {
        if (node.source.value === '@heroicons/vue/24/outline' ||
            node.source.value === '@heroicons/vue/24/solid' ||
            node.source.value.startsWith('@heroicons/vue')) {

          context.report({
            node,
            messageId: 'avoidDirectImport'
          })
        }
      },

      // Проверяем использование иконок как компонентов
      'VElement'(node) {
        // Проверяем, является ли это иконкой из @heroicons/vue
        if (node.name && (
            node.name.endsWith('Icon') ||
            node.rawName && (
              node.rawName.includes('heroicons') ||
              node.rawName.includes('HeroIcon')
            )
        )) {
          // Проверяем, что это не компонент Icon
          if (node.name !== 'Icon' && node.name !== 'BaseIcon') {
            context.report({
              node: node.startTag,
              messageId: 'useUnifiedIcon'
            })
          }
        }
      }
    }
  }
}
