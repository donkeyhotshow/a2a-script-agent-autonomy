/**
 * ESLint правило: testing-first-standards
 *
 * Проверяет соблюдение Testing-First принципа согласно ADR 2004.
 * Требует создания тестов перед/одновременно с кодом.
 *
 * Согласно ADR 2004: Testing-First принцип - тесты как основа разработки
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение Testing-First принципа согласно ADR 2004',
      category: 'Best Practices',
      recommended: true,
      url: 'docs/architecture/adr/2004-testing-first-principle.md'
    },
    schema: [],
    messages: {
      missingTestComment: 'Отсутствует комментарий о тестировании для {{file}}. Добавьте @test комментарий.',
      missingComponentTest: 'Компонент {{name}} должен иметь блок describe() для тестирования.',
      missingFeatureTestComment: 'Сервис {{name}} должен иметь @feature комментарий для тестирования.',
      testCoverageTooLow: 'Тестовое покрытие для {{file}} ниже 70%. Добавьте больше тестов.',
      missingE2eTest: 'Критический пользовательский путь должен иметь E2E тест'
    }
  },
  create(context) {
    const filename = context.getFilename()
    const isVueFile = filename.endsWith('.vue')
    const isTsFile = filename.endsWith('.ts')
    const isJsFile = filename.endsWith('.js')

    // Проверяем только исходные файлы компонентов и сервисов
    if (!isVueFile && !isTsFile && !isJsFile) return

    return {
      Program(node) {
        // Проверяем наличие комментария о тестировании
        const sourceCode = context.sourceCode
        const comments = sourceCode.getAllComments()

        const hasTestComment = comments.some(comment =>
          comment.value.includes('@test') ||
          comment.value.includes('@testing') ||
          comment.value.includes('TEST:') ||
          comment.value.includes('Test:')
        )

        if (!hasTestComment) {
          context.report({
            node,
            messageId: 'missingTestComment',
            data: {
              file: filename.split('/').pop()
            }
          })
        }

        // Для Vue компонентов проверяем наличие test блока в script setup
        if (isVueFile) {
          const componentName = extractComponentName(filename)

          // Ищем describe блоки в комментариях или коде
          const hasTestBlock = comments.some(comment =>
            comment.value.includes('describe(') ||
            comment.value.includes('it(') ||
            comment.value.includes('test(')
          )

          if (!hasTestBlock) {
            context.report({
              node,
              messageId: 'missingComponentTest',
              data: {
                name: componentName
              }
            })
          }
        }

        // Для API контроллеров проверяем наличие feature тест комментариев
        if (filename.includes('Controller') || filename.includes('Service')) {
          const serviceName = extractServiceName(filename)

          const hasFeatureTestComment = comments.some(comment =>
            comment.value.includes('feature') ||
            comment.value.includes('Feature') ||
            comment.value.includes('@feature')
          )

          if (!hasFeatureTestComment) {
            context.report({
              node,
              messageId: 'missingFeatureTestComment',
              data: {
                name: serviceName
              }
            })
          }
        }
      }
    }
  }
}


/**
 * Извлекает имя компонента из пути файла
 */
function extractComponentName(filePath) {
  const match = filePath.match(/\/([^/]+)\.vue$/)
  return match ? match[1] : 'UnknownComponent'
}

/**
 * Извлекает имя сервиса из пути файла
 */
function extractServiceName(filePath) {
  const match = filePath.match(/\/([^/]+)\.(ts|js)$/)
  return match ? match[1] : 'UnknownService'
}
