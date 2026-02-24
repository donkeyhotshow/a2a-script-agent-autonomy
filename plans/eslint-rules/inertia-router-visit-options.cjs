/**
 * ESLint правило: inertia/router-visit-options
 *
 * Проверяет, что router.visit содержит preserveState и preserveScroll параметры.
 * Согласно ADR 522: Архитектурные нарушения в использовании Inertia.js
 *
 * @see ADR 522: Архитектурные нарушения в использовании Inertia.js
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет, что router.visit содержит preserveState и preserveScroll параметры.',
      category: 'Best Practices',
      recommended: true
    },
    schema: [],
    messages: {
      missingOptions: 'router.visit должен содержать preserveState и preserveScroll параметры.',
      missingPreserveState: 'router.visit должен содержать preserveState: true.',
      missingPreserveScroll: 'router.visit должен содержать preserveScroll: true.'
    }
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.object &&
            node.callee.object.name === 'router' &&
            node.callee.property.name === 'visit') {

          // Проверяем наличие второго аргумента (options)
          if (node.arguments.length < 2) {
            context.report({
              node,
              messageId: 'missingOptions'
            })
            return
          }

          const options = node.arguments[1]

          // Проверяем, что options - это объект
          if (options.type !== 'ObjectExpression') {
            return
          }

          // Проверяем наличие preserveState и preserveScroll
          const properties = options.properties || []
          const hasPreserveState = properties.some(prop =>
            prop.key && prop.key.name === 'preserveState'
          )
          const hasPreserveScroll = properties.some(prop =>
            prop.key && prop.key.name === 'preserveScroll'
          )

          if (!hasPreserveState) {
            context.report({
              node,
              messageId: 'missingPreserveState'
            })
          }

          if (!hasPreserveScroll) {
            context.report({
              node,
              messageId: 'missingPreserveScroll'
            })
          }
        }
      }
    }
  }
}
