/**
 * ESLint правило: inertia/use-standard-composables
 *
 * Рекомендует использовать стандартизованные composable вместо прямого импорта из @inertiajs.
 * Согласно ADR 522: Архитектурные нарушения в использовании Inertia.js
 *
 * @see ADR 522: Архитектурные нарушения в использовании Inertia.js
 */

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Рекомендует использовать стандартизованные composable вместо прямого импорта из @inertiajs.',
            category: 'Best Practices',
            recommended: true
        },
        schema: [],
        messages: {
            useStandardForm: 'Используйте useStandardForm вместо прямого импорта useForm из @inertiajs/vue3.',
            useInertiaRequest: 'Используйте useInertiaRequest вместо прямого импорта router из @inertiajs/vue3 для HTTP запросов.'
        }
    },
    create(context) {
        return {
            ImportDeclaration(node) {
                if (node.source.value === '@inertiajs/vue3') {
                    const specifiers = node.specifiers || []

                    specifiers.forEach(specifier => {
                        if (specifier.imported && specifier.imported.name === 'useForm') {
                            context.report({
                                node: specifier,
                                messageId: 'useStandardForm'
                            })
                        }

                        if (specifier.imported && specifier.imported.name === 'router') {
                            // Проверяем, используется ли router только для HTTP запросов
                            // (это сложная проверка, поэтому даем общее предупреждение)
                            context.report({
                                node: specifier,
                                messageId: 'useInertiaRequest'
                            })
                        }
                    })
                }
            }
        }
    }
}
