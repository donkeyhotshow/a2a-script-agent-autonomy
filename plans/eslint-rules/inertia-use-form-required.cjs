/**
 * ESLint правило: inertia-use-form-required
 *
 * Требует использования useForm() из Inertia.js для форм вместо reactive().
 * Согласно ADR 522: Архитектурные нарушения в использовании Inertia.js
 *
 * @see ADR 522: Архитектурные нарушения в использовании Inertia.js
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Требует использования useForm() из Inertia.js для форм вместо reactive().',
      category: 'Best Practices',
      recommended: true
    },
    schema: [],
    messages: {
      useFormRequired: 'Для форм используйте useForm() из Inertia.js вместо reactive(). См. ADR 522.',
      missingUseFormImport: 'Необходимо импортировать useForm из @inertiajs/vue3.'
    }
  },
  create(context) {
    let hasUseFormImport = false
    let hasReactiveForm = false

    return {
      ImportDeclaration(node) {
        // Проверяем импорт useForm
        if (node.source.value === '@inertiajs/vue3') {
          node.specifiers.forEach(specifier => {
            if (specifier.imported && specifier.imported.name === 'useForm') {
              hasUseFormImport = true
            }
          })
        }
      },

      VariableDeclaration(node) {
        // Ищем reactive() вызовы с 'form' в названии переменной
        node.declarations.forEach(declaration => {
          if (declaration.id && declaration.id.name && declaration.id.name.toLowerCase().includes('form')) {
            if (declaration.init && declaration.init.type === 'CallExpression' && declaration.init.callee.name === 'reactive') {
              hasReactiveForm = true
            }
          }
        })
      },

      'Program:exit'() {
        if (hasReactiveForm && !hasUseFormImport) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'useFormRequired'
          })
        }
      }
    }
  }
}
