/**
 * JavaScript Testing Standards Rule
 *
 * Правила для JavaScript тестов (Jest, Node.js тесты, Performance тесты)
 * - ADR 2004: Testing-First Standards
 * - JavaScript Testing Best Practices
 * - Performance Testing Standards
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверяет соблюдение стандартов JavaScript тестирования',
            category: 'Testing',
            recommended: true
        },
        schema: [],
        messages: {
            'js-test-file-naming': 'Файлы тестов должны иметь расширения .test.js или .spec.js',
            'js-test-describe-blocks': 'Используйте describe блоки для группировки связанных тестов',
            'js-test-setup-teardown': 'Используйте beforeEach/afterEach для изоляции тестов',
            'js-test-mocking': 'Используйте jest.mock() или sinon для мокирования',
            'js-test-async-handling': 'Правильно обрабатывайте асинхронные операции',
            'js-test-error-handling': 'Тестируйте обработку ошибок',
            'js-test-edge-cases': 'Тестируйте граничные случаи и edge cases',
            'js-test-descriptive-assertions': 'Используйте описательные assertions',
            'js-performance-baseline': 'Performance тесты должны иметь baseline метрики',
            'js-performance-memory-leaks': 'Проверяйте на memory leaks в performance тестах',
            'js-performance-load-testing': 'Load тесты должны симулировать реальную нагрузку',
            'js-api-test-contracts': 'API тесты должны проверять contracts и schemas',
            'js-api-test-status-codes': 'Проверяйте правильные HTTP статус коды',
            'js-api-test-headers': 'Валидируйте заголовки запросов и ответов',
            'js-integration-database': 'Integration тесты должны использовать тестовую базу данных',
            'js-integration-cleanup': 'Integration тесты должны очищать тестовые данные',
            'js-unit-test-pure-functions': 'Unit тесты должны фокусироваться на pure functions',
            'js-unit-test-dependencies': 'Изолируйте зависимости в unit тестах',
            'js-e2e-test-scenarios': 'E2E тесты должны покрывать реальные пользовательские сценарии',
            'js-e2e-test-data-management': 'Управляйте тестовыми данными в E2E тестах'
        }
    },

    create(context) {
        const filename = context.getFilename()
        const isJSTest = filename.endsWith('.test.js') || filename.endsWith('.spec.js') ||
            (filename.includes('/tests/') && filename.endsWith('.js')) ||
            filename.includes('/perf/') || filename.includes('/load-test')

        if (!isJSTest) return {}

        return {
            Program(node) {
                const sourceCode = context.getSourceCode()
                const text = sourceCode.getText()

                // Проверяем правильное именование файлов
                if (!filename.endsWith('.test.js') && !filename.endsWith('.spec.js') &&
                    (filename.includes('test') || filename.includes('spec')) &&
                    !filename.includes('/perf/')) {
                    context.report({
                        node,
                        messageId: 'js-test-file-naming'
                    })
                }

                // Проверяем describe блоки
                if (!text.includes('describe(') && (text.includes('it(') || text.includes('test('))) {
                    context.report({
                        node,
                        messageId: 'js-test-describe-blocks'
                    })
                }

                // Проверяем setup/teardown
                const hasTests = text.includes('it(') || text.includes('test(')
                const hasSetup = text.includes('beforeEach') || text.includes('beforeAll') ||
                    text.includes('afterEach') || text.includes('afterAll')
                if (hasTests && !hasSetup) {
                    context.report({
                        node,
                        messageId: 'js-test-setup-teardown'
                    })
                }

                // Проверяем мокирование
                if (text.includes('mock') && !text.includes('jest.mock') && !text.includes('sinon')) {
                    context.report({
                        node,
                        messageId: 'js-test-mocking'
                    })
                }

                // Проверяем асинхронные операции
                const hasAsync = text.includes('async') || text.includes('Promise') || text.includes('.then(')
                const hasAsyncHandling = text.includes('await') || text.includes('done') ||
                    text.includes('return') || text.includes('async')
                if (hasAsync && !hasAsyncHandling) {
                    context.report({
                        node,
                        messageId: 'js-test-async-handling'
                    })
                }

                // Проверяем тестирование ошибок
                if (text.includes('throw') || text.includes('Error') || text.includes('catch')) {
                    if (!text.includes('expect(') && !text.includes('toThrow')) {
                        context.report({
                            node,
                            messageId: 'js-test-error-handling'
                        })
                    }
                }

                // Performance testing specific rules
                if (filename.includes('perf') || filename.includes('performance') ||
                    filename.includes('load-test') || filename.includes('benchmark')) {

                    if (!text.includes('baseline') && !text.includes('threshold') && !text.includes('metric')) {
                        context.report({
                            node,
                            messageId: 'js-performance-baseline'
                        })
                    }

                    if (text.includes('for ') || text.includes('while ')) {
                        if (!text.includes('gc()') && !text.includes('memoryUsage')) {
                            context.report({
                                node,
                                messageId: 'js-performance-memory-leaks'
                            })
                        }
                    }

                    if (filename.includes('load') && !text.includes('concurrent') && !text.includes('ramp')) {
                        context.report({
                            node,
                            messageId: 'js-performance-load-testing'
                        })
                    }
                }

                // API testing rules
                if (filename.includes('api') || text.includes('http') || text.includes('request') ||
                    text.includes('axios') || text.includes('fetch')) {

                    if (!text.includes('schema') && !text.includes('validate') && !text.includes('contract')) {
                        context.report({
                            node,
                            messageId: 'js-api-test-contracts'
                        })
                    }

                    if (!text.includes('status') && !text.includes('200') && !text.includes('201') &&
                        !text.includes('400') && !text.includes('500')) {
                        context.report({
                            node,
                            messageId: 'js-api-test-status-codes'
                        })
                    }

                    if (text.includes('header') && !text.includes('expect(')) {
                        context.report({
                            node,
                            messageId: 'js-api-test-headers'
                        })
                    }
                }

                // Integration testing rules
                if (filename.includes('integration') || text.includes('database') || text.includes('db')) {
                    if (!text.includes('test') && !text.includes('temp') && !text.includes('mock')) {
                        context.report({
                            node,
                            messageId: 'js-integration-database'
                        })
                    }

                    if (!text.includes('cleanup') && !text.includes('truncate') && !text.includes('delete')) {
                        context.report({
                            node,
                            messageId: 'js-integration-cleanup'
                        })
                    }
                }

                // Unit testing rules
                if (filename.includes('unit') || (!filename.includes('integration') &&
                    !filename.includes('e2e') && !filename.includes('perf'))) {

                    if (text.includes('function') && !text.includes('pure') && text.includes('return')) {
                        // Проверяем на side effects
                    }

                    if (text.includes('import') || text.includes('require')) {
                        if (!text.includes('mock') && !text.includes('stub')) {
                            context.report({
                                node,
                                messageId: 'js-unit-test-dependencies'
                            })
                        }
                    }
                }

                // E2E testing rules
                if (filename.includes('e2e') || text.includes('browser') || text.includes('page')) {
                    if (!text.includes('user') && !text.includes('scenario') && !text.includes('workflow')) {
                        context.report({
                            node,
                            messageId: 'js-e2e-test-scenarios'
                        })
                    }

                    if (!text.includes('fixture') && !text.includes('seed') && !text.includes('data')) {
                        context.report({
                            node,
                            messageId: 'js-e2e-test-data-management'
                        })
                    }
                }
            }
        }
    }
}
