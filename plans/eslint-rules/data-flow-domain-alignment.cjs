/**
 * ESLint правило: data-flow-domain-alignment
 *
 * Проверяет правильность data flow между Laravel Domain Services и Inertia Components
 * согласно ADR 1103: Data Flow Domain Alignment Framework.
 *
 * Требует типизированного data flow и соблюдения границ ответственности.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет правильность data flow между Laravel и Vue согласно ADR 1103',
      category: 'Best Practices',
      recommended: true,
      url: 'docs/architecture/adr/1103-data-flow-domain-alignment-framework.md'
    },
    schema: [],
    messages: {
      missingPropsInterface: 'Компонент должен иметь типизированный интерфейс для props из Laravel',
      businessLogicInComponent: 'Бизнес-логика обнаружена в компоненте. Перенесите в domain service или composable',
      directApiCallInComponent: 'Прямой API вызов в компоненте запрещен. Используйте domain service или composable',
      missingDomainType: 'Отсутствует типизация для данных из домена. Используйте типы из foundation',
      invalidDataTransformation: 'Неправильная трансформация данных в компоненте. Используйте DTO mapper',
      missingErrorHandling: 'Отсутствует обработка ошибок для data flow',
      propsMutationDetected: 'Запрещено мутировать props напрямую. Используйте локальное состояние'
    }
  },
  create(context) {
    let hasPropsInterface = false
    let hasBusinessLogic = false
    let hasDirectApiCall = false
    let hasDomainTypes = false

    return {
      // Проверяем объявление компонента
      ExportDefaultDeclaration(node) {
        if (node.declaration.type === 'ObjectExpression') {
          const properties = node.declaration.properties

          // Проверяем наличие props с типизацией
          const propsProperty = properties.find(prop =>
            prop.key.name === 'props' && prop.type === 'Property'
          )

          if (propsProperty) {
            hasPropsInterface = true
          }
        }
      },

      // Проверяем TypeScript интерфейсы
      TSInterfaceDeclaration(node) {
        if (node.id.name.includes('Props') || node.id.name.includes('Data')) {
          hasDomainTypes = true
        }
      },

      // Проверяем прямые API вызовы
      CallExpression(node) {
        // Проверяем axios/fetch вызовы
        if (node.callee.name === 'axios' ||
            node.callee.name === 'fetch' ||
            (node.callee.type === 'MemberExpression' &&
             node.callee.object.name === 'axios')) {

          // Исключаем вызовы в composables или сервисах
          const ancestors = context.sourceCode.getAncestors(node)
          const isInComposable = ancestors.some(ancestor =>
            ancestor.type === 'FunctionDeclaration' &&
            ancestor.id && ancestor.id.name &&
            ancestor.id.name.startsWith('use')
          )

          const isInService = ancestors.some(ancestor =>
            ancestor.type === 'FunctionDeclaration' &&
            ancestor.id && ancestor.id.name &&
            ancestor.id.name.toLowerCase().includes('service')
          )

          if (!isInComposable && !isInService) {
            hasDirectApiCall = true
            context.report({
              node,
              messageId: 'directApiCallInComponent'
            })
          }
        }

        // Проверяем бизнес-логику (сложные вычисления, валидация)
        if (node.callee.name === 'validate' ||
            node.callee.name === 'calculate' ||
            node.callee.name === 'process' ||
            node.callee.property && node.callee.property.name === 'validate') {

          const ancestors = context.sourceCode.getAncestors(node)
          const isInComposable = ancestors.some(ancestor =>
            ancestor.type === 'FunctionDeclaration' &&
            ancestor.id && ancestor.id.name &&
            ancestor.id.name.startsWith('use')
          )

          if (!isInComposable) {
            hasBusinessLogic = true
            context.report({
              node,
              messageId: 'businessLogicInComponent'
            })
          }
        }
      },

      // Проверяем мутацию props
      AssignmentExpression(node) {
        if (node.left.type === 'MemberExpression' &&
            node.left.object.type === 'ThisExpression' &&
            node.left.property.name &&
            node.left.property.name.startsWith('$props.')) {

          context.report({
            node,
            messageId: 'propsMutationDetected'
          })
        }
      },

      // Проверяем try-catch блоки для обработки ошибок
      TryStatement(node) {
        // Это хорошо - есть обработка ошибок
      },

      // Проверяем использование DTO мапперов
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' &&
            node.callee.property.name === 'map' &&
            node.arguments.some(arg => arg.type === 'ArrowFunctionExpression')) {

          // Проверяем, является ли это DTO маппингом
          const arg = node.arguments.find(arg => arg.type === 'ArrowFunctionExpression')
          if (arg && arg.body.type === 'ObjectExpression') {
            // Это может быть DTO маппинг - пропускаем
            return
          }

          context.report({
            node,
            messageId: 'invalidDataTransformation'
          })
        }
      },

      // Финальная проверка в конце файла
      'Program:exit'() {
        if (!hasPropsInterface) {
          // Проверяем, есть ли props в компоненте
          const sourceCode = context.sourceCode
          const text = sourceCode.getText()

          // Ищем props определение
          if (!text.includes('props:') && !text.includes('Props')) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'missingPropsInterface'
            })
          }
        }

        if (!hasDomainTypes) {
          // Проверяем, есть ли типы из домена
          const sourceCode = context.sourceCode
          const text = sourceCode.getText()

          if (!text.includes('import type') && !text.includes(': {') && text.includes('props')) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: 'missingDomainType'
            })
          }
        }
      }
    }
  }
}
