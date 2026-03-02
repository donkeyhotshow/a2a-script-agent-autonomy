/**
 * ESLint правило: inertia/no-fetch
 *
 * Запрещает использование fetch() в компонентах Vue.
 * Согласно ADR 522: Архитектурные нарушения в использовании Inertia.js
 *
 * @see ADR 522: Архитектурные нарушения в использовании Inertia.js
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Запрещает использование fetch в компонентах Vue. Используйте useInertiaRequest.',
            category: 'Best Practices',
            recommended: true
        },
        schema: [],
        messages: {
            noFetch: 'Использование fetch запрещено. Используйте useInertiaRequest для HTTP запросов.'
        }
    },
    create(context) {
        return {
            CallExpression(node) {
                if (node.callee.name === 'fetch' ||
                    (node.callee.type === 'MemberExpression' &&
                        node.callee.object.name === 'window' &&
                        node.callee.property.name === 'fetch')) {

                    // Исключаем использование в сервис-воркерах и конфигурационных файлах
                    const filename = context.getFilename()
                    if (filename.includes('service-worker') ||
                        filename.includes('config') ||
                        filename.includes('test')) {
                        return
                    }

                    context.report({
                        node,
                        messageId: 'noFetch'
                    })
                }
            }
        }
    }
}
