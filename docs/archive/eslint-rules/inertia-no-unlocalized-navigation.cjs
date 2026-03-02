/**
 * ESLint правило: inertia/no-unlocalized-navigation
 *
 * Требует использования getLocalizedUrl() для всех router.visit() вызовов
 * в многоязычных Inertia.js приложениях.
 *
 * @see ADR 508: Стратегия навигации в Inertia.js приложении
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Требует getLocalizedUrl() для всех router.visit() вызовов',
            category: 'Best Practices',
            recommended: true
        },
        fixable: null,
        schema: [],
        messages: {
            unlocalizedNavigation: 'Используйте getLocalizedUrl() для локализации URL в router.visit() вызовах.',
            missingGetLocalizedUrl: 'router.visit() должен использовать getLocalizedUrl() для поддержки мультиязычности.'
        }
    },

    create(context) {
        return {
            // Ищем вызовы router.visit()
            'CallExpression[callee.object.name="router"][callee.property.name="visit"]'(node) {
                if (!node.arguments || node.arguments.length === 0) {
                    return
                }

                const firstArg = node.arguments[0]

                // Проверяем, является ли первый аргумент вызовом getLocalizedUrl()
                if (firstArg.type === 'CallExpression' &&
                    firstArg.callee.name === 'getLocalizedUrl') {
                    // Правильно - используется getLocalizedUrl()
                    return
                }

                // Проверяем, является ли первый аргумент строковым литералом или выражением
                if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
                    // Это строковый литерал - проверяем, начинается ли с '/'
                    if (firstArg.value.startsWith('/')) {
                        context.report({
                            node: firstArg,
                            messageId: 'missingGetLocalizedUrl'
                        })
                    }
                    // Абсолютные URL могут быть оправданы для внешних ссылок
                } else if (firstArg.type === 'TemplateLiteral') {
                    // Шаблонные литералы - проверяем, содержат ли они переменные пути
                    // Это сложная проверка, но для простоты запретим все шаблонные литералы без getLocalizedUrl()
                    context.report({
                        node: firstArg,
                        messageId: 'missingGetLocalizedUrl'
                    })
                }
            }
        }
    }
}
