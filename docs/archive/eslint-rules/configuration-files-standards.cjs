/**
 * Configuration Files Standards Rule
 *
 * Правила для конфигурационных файлов (vite, vitest, playwright, postcss, tailwind)
 * - ADR 1301: Configuration Files Standards
 * - Build Tools Best Practices
 * - Testing Configuration Standards
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение стандартов конфигурационных файлов',
      category: 'Configuration',
      recommended: true
    },
    schema: [],
    messages: {
      'config-file-naming': 'Конфигурационные файлы должны иметь правильное именование',
      'config-structure-validation': 'Конфигурационные файлы должны иметь правильную структуру',
      'config-environment-variables': 'Используйте переменные окружения для чувствительных данных',
      'config-build-optimization': 'Включайте оптимизации сборки для production',
      'config-testing-isolation': 'Тестовые конфигурации должны обеспечивать изоляцию',
      'config-playwright-setup': 'Playwright конфигурация должна иметь правильную настройку',
      'config-vite-setup': 'Vite конфигурация должна следовать лучшим практикам',
      'config-vitest-setup': 'Vitest конфигурация должна быть оптимизирована',
      'config-module-exports': 'ES модули должны правильно экспортировать',
      'config-script-standards': 'Скрипты сборки должны следовать стандартам'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isConfigFile = filename.includes('.config.') || filename.endsWith('.mjs') ||
                        filename.endsWith('.cjs') || filename.includes('vite.config') ||
                        filename.includes('vitest.config') || filename.includes('playwright.config')

    if (!isConfigFile) return {}

    return {
      Program(node) {
        const sourceCode = context.getSourceCode()
        const text = sourceCode.getText()

        // Проверяем Vite конфигурацию
        if (filename.includes('vite.config')) {
          if (!text.includes('build') || !text.includes('optimizeDeps')) {
            context.report({
              node,
              messageId: 'config-vite-setup'
            })
          }

          if (!text.includes('minify') || !text.includes('sourcemap')) {
            context.report({
              node,
              messageId: 'config-build-optimization'
            })
          }
        }

        // Проверяем Vitest конфигурацию
        if (filename.includes('vitest.config')) {
          if (!text.includes('environment') || !text.includes('setupFiles')) {
            context.report({
              node,
              messageId: 'config-vitest-setup'
            })
          }

          if (!text.includes('globals') || !text.includes('test')) {
            context.report({
              node,
              messageId: 'config-testing-isolation'
            })
          }
        }

        // Проверяем Playwright конфигурацию
        if (filename.includes('playwright.config')) {
          if (!text.includes('use') || !text.includes('projects')) {
            context.report({
              node,
              messageId: 'config-playwright-setup'
            })
          }

          if (!text.includes('baseURL') || !text.includes('headless')) {
            context.report({
              node,
              messageId: 'config-playwright-setup'
            })
          }
        }

        // Проверяем ES модули
        if (filename.endsWith('.mjs') || filename.endsWith('.cjs')) {
          if (!text.includes('export') && !text.includes('module.exports')) {
            if (!text.includes('import') && !text.includes('require')) {
              // Возможно это просто исполняемый скрипт
            } else {
              context.report({
                node,
                messageId: 'config-module-exports'
              })
            }
          }
        }

        // Проверяем на жестко закодированные секреты
        const secretPatterns = [
          /password\s*[:=]\s*['"][^'"]*['"]/i,
          /secret\s*[:=]\s*['"][^'"]*['"]/i,
          /key\s*[:=]\s*['"][^'"]*['"]/i,
          /token\s*[:=]\s*['"][^'"]*['"]/i
        ]

        secretPatterns.forEach(pattern => {
          if (pattern.test(text) && !text.includes('process.env') && !text.includes('import.meta.env')) {
            context.report({
              node,
              messageId: 'config-environment-variables'
            })
          }
        })

        // Проверяем структуру конфигурационных файлов
        if (filename.includes('.config.')) {
          if (!text.includes('module.exports =') && !text.includes('module.exports') &&
              !text.includes('export const') && !text.includes('exports.')) {
            context.report({
              node,
              messageId: 'config-structure-validation'
            })
          }
        }
      }
    }
  }
}
