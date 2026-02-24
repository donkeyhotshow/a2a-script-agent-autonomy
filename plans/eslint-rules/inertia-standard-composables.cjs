/**
 * ESLint правило: inertia-standard-composables
 *
 * Рекомендует использование стандартизованных composable'ов для работы с Inertia.js.
 * Согласно ADR 522: Архитектурные нарушения в использовании Inertia.js
 *
 * @see ADR 522: Архитектурные нарушения в использовании Inertia.js
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Рекомендует использование стандартизованных composable\'ов для работы с Inertia.js.',
      category: 'Best Practices',
      recommended: true
    },
    schema: [],
    messages: {
      preferUseInertiaRequest: 'Рекомендуется использовать useInertiaRequest вместо прямых вызовов router.',
      preferUseStandardForm: 'Рекомендуется использовать useStandardForm для форм.',
      preferUseErrorHandler: 'Рекомендуется использовать useErrorHandler для обработки ошибок.'
    }
  },
  create(context) {
    let hasUseInertiaRequest = false
    let hasUseStandardForm = false
    let hasUseErrorHandler = false

    return {
      ImportDeclaration(node) {
        // Проверяем импорты стандартизованных composable'ов
        if (node.source.value && node.source.value.includes('@/composables/')) {
          node.specifiers.forEach(specifier => {
            if (specifier.imported) {
              const name = specifier.imported.name
              if (name === 'useInertiaRequest') hasUseInertiaRequest = true
              if (name === 'useStandardForm') hasUseStandardForm = true
              if (name === 'useErrorHandler') hasUseErrorHandler = true
            }
          })
        }
      },

      CallExpression(node) {
        // Проверяем вызовы router без useInertiaRequest
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'router' &&
            !hasUseInertiaRequest) {
          context.report({
            node,
            messageId: 'preferUseInertiaRequest'
          })
        }

        // Проверяем вызовы useForm без useStandardForm
        if (node.callee.name === 'useForm' && !hasUseStandardForm) {
          context.report({
            node,
            messageId: 'preferUseStandardForm'
          })
        }

        // Проверяем обработку ошибок без useErrorHandler
        if (node.callee.name === 'console.error' &&
            node.arguments.some(arg => arg.value && arg.value.includes('error')) &&
            !hasUseErrorHandler) {
          context.report({
            node,
            messageId: 'preferUseErrorHandler'
          })
        }
      }
    }
  }
}
