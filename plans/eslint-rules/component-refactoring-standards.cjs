/**
 * ESLint правило: component-refactoring-standards
 *
 * Проверяет соблюдение стандартов рефакторинга компонентов согласно ADR 1036.
 * Запрещает проблемные паттерны и требует следования архитектурным стандартам.
 *
 * Согласно ADR 1036: Component Refactoring Standards
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение стандартов рефакторинга компонентов согласно ADR 1036',
      category: 'Best Practices',
      recommended: true,
      url: 'docs/architecture/adr/1036-component-refactoring-standards.md'
    },
    schema: [],
    messages: {
      noJsonStringifyComparison: 'Запрещено использовать JSON.stringify для сравнения объектов. Используйте сравнение по полям или флаг с бэкенда.',
      noAlertUsage: 'Запрещено использовать alert(). Используйте toast уведомления из design-system.',
      noWindowLocationReload: 'Запрещено использовать window.location.reload(). Используйте router.reload() или обновление данных через Inertia.',
      largeTemplateDetected: 'Компонент имеет слишком большой шаблон ({{lines}} строк). Разбейте на подкомпоненты согласно ADR 1036.',
      hardcodedStringDetected: 'Обнаружена захардкоженная строка "{{text}}". Используйте i18n для локализации.',
      noAnyTypeForAddress: 'Запрещено использовать any для типизации адресов. Используйте тип Address из foundation.'
    }
  },
  create(context) {
    const sourceCode = context.sourceCode
    let templateLines = 0
    let hasTemplate = false

    return {
      // Считаем строки в шаблоне
      VElement() {
        if (!hasTemplate) {
          hasTemplate = true
          const templateNode = context.sourceCode.getAncestors(node).find(ancestor =>
            ancestor.type === 'VElement' && ancestor.name === 'template'
          )
          if (templateNode) {
            const templateText = sourceCode.getText(templateNode)
            templateLines = templateText.split('\n').length
          }
        }
      },

      // Проверяем использование JSON.stringify в сравнениях
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'JSON' &&
            node.callee.property.name === 'stringify') {

          // Проверяем, используется ли результат в сравнении
          const parent = context.sourceCode.getAncestors(node).find(ancestor =>
            ancestor.type === 'BinaryExpression' &&
            (ancestor.operator === '===' || ancestor.operator === '!==' ||
             ancestor.operator === '==' || ancestor.operator === '!=')
          )

          if (parent) {
            context.report({
              node,
              messageId: 'noJsonStringifyComparison'
            })
          }
        }
      },

      // Проверяем использование alert
      CallExpression(node) {
        if (node.callee.name === 'alert') {
          context.report({
            node,
            messageId: 'noAlertUsage'
          })
        }
      },

      // Проверяем использование window.location.reload
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'MemberExpression' &&
            node.callee.object.object.name === 'window' &&
            node.callee.object.property.name === 'location' &&
            node.callee.property.name === 'reload') {

          context.report({
            node,
            messageId: 'noWindowLocationReload'
          })
        }
      },

      // Проверяем захардкоженные строки (теперь это делает правило i18n-standards)
      // Удалено для избежания дублирования

      // Проверяем использование any для адресов
      TSTypeReference(node) {
        if (node.typeName.name === 'any') {
          // Проверяем, используется ли это для адресов
          const variableDeclarator = context.sourceCode.getAncestors(node).find(ancestor =>
            ancestor.type === 'VariableDeclarator' || ancestor.type === 'PropertyDefinition'
          )

          if (variableDeclarator) {
            const varName = variableDeclarator.id ? variableDeclarator.id.name : ''
            if (varName.toLowerCase().includes('address') ||
                varName.toLowerCase().includes('shipping') ||
                varName.toLowerCase().includes('billing')) {
              context.report({
                node,
                messageId: 'noAnyTypeForAddress'
              })
            }
          }
        }
      },

      // Проверяем размер шаблона в конце
      'Program:exit'() {
        if (hasTemplate && templateLines > 100) { // Порог в 100 строк
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'largeTemplateDetected',
            data: { lines: templateLines }
          })
        }
      }
    }
  }
}
