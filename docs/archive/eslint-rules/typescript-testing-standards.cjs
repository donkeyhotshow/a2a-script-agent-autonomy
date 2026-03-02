/**
 * TypeScript Testing Standards Rule
 *
 * Правила для TypeScript тестов (Vitest, Playwright, E2E)
 * - ADR 2004: Testing-First Standards
 * - Vitest Best Practices
 * - Playwright Best Practices
 * - E2E Testing Standards
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверяет соблюдение стандартов TypeScript тестирования',
            category: 'Testing',
            recommended: true
        },
        schema: [],
        messages: {
            'ts-test-file-naming': 'Файлы тестов должны иметь расширения .test.ts или .spec.ts',
            'ts-test-describe-blocks': 'Используйте describe блоки для группировки тестов',
            'ts-test-setup-teardown': 'Используйте beforeEach/afterEach для настройки окружения',
            'ts-test-mocking': 'Используйте vi.mock() для мокирования модулей',
            'ts-test-async-await': 'Используйте async/await вместо промисов в тестах',
            'ts-test-assertion-libraries': 'Используйте expect assertions вместо console.assert',
            'ts-test-isolation': 'Каждый тест должен быть изолирован',
            'ts-test-descriptive-names': 'Названия тестов должны быть описательными',
            'ts-e2e-page-objects': 'E2E тесты должны использовать Page Objects',
            'ts-e2e-selectors': 'Используйте data-testid атрибуты вместо CSS селекторов',
            'ts-e2e-wait-strategies': 'Используйте waitFor вместо жестких задержек',
            'ts-component-test-rendering': 'Component тесты должны проверять корректный рендеринг',
            'ts-component-test-props': 'Тестируйте различные комбинации props',
            'ts-component-test-events': 'Тестируйте пользовательские события',
            'ts-component-test-accessibility': 'Включайте accessibility проверки в component тесты',
            'ts-integration-api-calls': 'Integration тесты должны проверять API вызовы',
            'ts-integration-state-management': 'Тестируйте state management в integration тестах',
            'ts-performance-metrics': 'Performance тесты должны измерять метрики',
            'ts-visual-regression': 'Используйте visual regression testing для UI компонентов'
        }
    },

    create(context) {
        const filename = context.getFilename()
        const isTSTest = filename.endsWith('.test.ts') || filename.endsWith('.spec.ts') ||
            filename.includes('/tests/') || filename.includes('/e2e/')

        if (!isTSTest) return {}

        return {
            Program(node) {
                const sourceCode = context.getSourceCode()
                const text = sourceCode.getText()

                // Проверяем правильное именование файлов
                if (!filename.endsWith('.test.ts') && !filename.endsWith('.spec.ts') &&
                    (filename.includes('test') || filename.includes('spec'))) {
                    context.report({
                        node,
                        messageId: 'ts-test-file-naming'
                    })
                }

                // Проверяем использование describe блоков
                if (!text.includes('describe(') && text.includes('it(') || text.includes('test(')) {
                    context.report({
                        node,
                        messageId: 'ts-test-describe-blocks'
                    })
                }

                // Проверяем setup/teardown
                const hasTests = text.includes('it(') || text.includes('test(')
                const hasSetup = text.includes('beforeEach') || text.includes('beforeAll')
                if (hasTests && !hasSetup && text.includes('render') || text.includes('mount')) {
                    context.report({
                        node,
                        messageId: 'ts-test-setup-teardown'
                    })
                }

                // Проверяем мокирование
                if (text.includes('mock') && !text.includes('vi.mock') && !text.includes('jest.mock')) {
                    context.report({
                        node,
                        messageId: 'ts-test-mocking'
                    })
                }

                // Проверяем async/await
                if (text.includes('.then(') || text.includes('.catch(')) {
                    if (!text.includes('async') && !text.includes('await')) {
                        context.report({
                            node,
                            messageId: 'ts-test-async-await'
                        })
                    }
                }

                // Проверяем assertions
                const hasTests2 = text.includes('it(') || text.includes('test(')
                const hasExpect = text.includes('expect(')
                if (hasTests2 && !hasExpect && !text.includes('assert')) {
                    context.report({
                        node,
                        messageId: 'ts-test-assertion-libraries'
                    })
                }

                // E2E specific rules
                if (filename.includes('e2e') || filename.includes('spec.ts')) {
                    // Проверяем page objects
                    if (text.includes('page.') && !text.includes('class') && !text.includes('Page')) {
                        context.report({
                            node,
                            messageId: 'ts-e2e-page-objects'
                        })
                    }

                    // Проверяем селекторы
                    if (text.includes('getByText') || text.includes('getByRole')) {
                        // Хорошо
                    } else if (text.includes('querySelector') || text.includes('$')) {
                        context.report({
                            node,
                            messageId: 'ts-e2e-selectors'
                        })
                    }

                    // Проверяем wait стратегии
                    if (text.includes('waitForTimeout') || text.includes('delay(')) {
                        context.report({
                            node,
                            messageId: 'ts-e2e-wait-strategies'
                        })
                    }
                }

                // Component testing rules
                if (filename.includes('component') || text.includes('render(') || text.includes('mount(')) {
                    // Проверяем рендеринг
                    if (!text.includes('screen') && !text.includes('getByText') && !text.includes('container')) {
                        context.report({
                            node,
                            messageId: 'ts-component-test-rendering'
                        })
                    }

                    // Проверяем тестирование props
                    if (text.includes('props') && !text.includes('render') && !text.includes('rerender')) {
                        context.report({
                            node,
                            messageId: 'ts-component-test-props'
                        })
                    }

                    // Проверяем события
                    if (text.includes('onClick') || text.includes('onChange') ||
                        text.includes('@click') || text.includes('@change')) {
                        if (!text.includes('fireEvent') && !text.includes('userEvent')) {
                            context.report({
                                node,
                                messageId: 'ts-component-test-events'
                            })
                        }
                    }

                    // Проверяем accessibility
                    if (!text.includes('axe') && !text.includes('toHaveNoViolations')) {
                        context.report({
                            node,
                            messageId: 'ts-component-test-accessibility'
                        })
                    }
                }

                // Integration testing rules
                if (filename.includes('integration') || text.includes('api') || text.includes('fetch')) {
                    if (!text.includes('nock') && !text.includes('msw') && !text.includes('server')) {
                        context.report({
                            node,
                            messageId: 'ts-integration-api-calls'
                        })
                    }
                }

                // Performance testing rules
                if (filename.includes('perf') || filename.includes('performance')) {
                    if (!text.includes('performance.now') && !text.includes('measure') && !text.includes('metric')) {
                        context.report({
                            node,
                            messageId: 'ts-performance-metrics'
                        })
                    }
                }
            }
        }
    }
}
