/**
 * ESLint правило: inertia/no-window-location
 *
 * Запрещает использование window.location для навигации в Inertia.js приложениях.
 * Требует использования router.visit() с правильной локализацией.
 *
 * @see ADR 522: Архитектурные нарушения в использовании Inertia.js
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Запрещает использование window.location для навигации в Inertia.js',
            category: 'Best Practices',
            recommended: true
        },
        fixable: null,
        schema: [],
        messages: {
            noWindowLocation: 'Используйте router.visit() вместо window.location для SPA навигации в Inertia.js приложениях.',
            noWindowLocationHref: 'Используйте router.visit() с getLocalizedUrl() вместо window.location.href.'
        }
    },

    create(context) {
        return {
            // Ищем window.location или window.location.href
            'MemberExpression[object.name="window"][property.name="location"]'(node) {
                // Проверяем, является ли это window.location.href
                if (node.parent && node.parent.property && node.parent.property.name === 'href') {
                    context.report({
                        node: node.parent,
                        messageId: 'noWindowLocationHref'
                    })
                } else {
                    context.report({
                        node,
                        messageId: 'noWindowLocation'
                    })
                }
            },

            // Ищем прямые присваивания window.location.href
            'AssignmentExpression[left.object.name="window"][left.property.name="location"][left.property.property.name="href"]'(node) {
                context.report({
                    node,
                    messageId: 'noWindowLocationHref'
                })
            }
        }
    }
}
