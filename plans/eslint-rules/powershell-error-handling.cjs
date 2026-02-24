/**
 * ESLint правило: powershell-error-handling
 *
 * Проверяет паттерны обработки ошибок в PowerShell скриптах.
 * Обеспечивает последовательное использование try/catch, $ErrorActionPreference,
 * и правильную обработку ошибок согласно стандартам проекта.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверка паттернов обработки ошибок в PowerShell скриптах',
      category: 'Best Practices',
      recommended: true,
      url: '.cursor/rules/powershell-error-handling.md'
    },
    schema: [],
    messages: {
      missingTryCatch: 'Критические операции должны быть обернуты в try/catch блок',
      inconsistentErrorAction: '$ErrorActionPreference должен быть установлен в начале скрипта',
      missingErrorVariable: 'Используйте $Error для обработки ошибок вместо глобальной переменной',
      avoidThrowWithoutMessage: 'Throw должен содержать описательное сообщение об ошибке',
      missingFinallyBlock: 'Используйте finally блок для очистки ресурсов',
      preferWriteError: 'Используйте Write-Error вместо throw для не-terminating ошибок',
      missingErrorHandling: 'Функции, вызывающие внешние команды, должны обрабатывать ошибки',
      avoidSilentContinue: 'Избегайте -ErrorAction SilentlyContinue без явной обработки ошибок',
      useTrapForCleanup: 'Используйте trap для глобальной обработки ошибок и очистки',
      missingExitCodeCheck: 'Проверяйте $LASTEXITCODE после вызова внешних команд',
      inconsistentErrorLogging: 'Ошибки должны логироваться с Write-Error перед throw'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isPs1File = filename.endsWith('.ps1')

    if (!isPs1File) return {}

    const sourceCode = context.sourceCode
    const lines = sourceCode.getText().split('\n')
    let hasErrorActionPreference = false
    let hasTrapStatement = false
    const functionCalls = []

    return {
      Program(node) {
        const fullText = sourceCode.getText()

        // Проверка $ErrorActionPreference
        if (fullText.includes('$ErrorActionPreference =') ||
            fullText.includes('$ErrorActionPreference=')) {
          hasErrorActionPreference = true
        } else {
          // Исключение для простых include файлов
          const isIncludeFile = filename.includes('includes\\') ||
                               filename.includes('includes/')
          if (!isIncludeFile) {
            context.report({
              node,
              messageId: 'inconsistentErrorAction'
            })
          }
        }

        // Проверка наличия trap для глобальной обработки ошибок
        if (fullText.includes('trap')) {
          hasTrapStatement = true
        }

        // Проверка использования -ErrorAction SilentlyContinue
        const silentContinueMatches = fullText.match(/-ErrorAction\s+SilentlyContinue/g)
        if (silentContinueMatches) {
          silentContinueMatches.forEach(match => {
            // Проверяем, есть ли рядом обработка ошибок
            const matchIndex = fullText.indexOf(match)
            const contextBefore = fullText.substring(Math.max(0, matchIndex - 200), matchIndex)
            const contextAfter = fullText.substring(matchIndex + match.length, matchIndex + match.length + 200)

            const hasErrorHandling = contextBefore.includes('try') ||
                                   contextAfter.includes('catch') ||
                                   contextAfter.includes('$Error') ||
                                   contextAfter.includes('Write-Error')

            if (!hasErrorHandling) {
              context.report({
                node,
                messageId: 'avoidSilentContinue'
              })
            }
          })
        }

        // Проверка критических операций без try/catch
        const criticalOperations = [
          'Invoke-WebRequest',
          'Invoke-RestMethod',
          '& {',
          'Start-Process',
          'New-Item',
          'Remove-Item',
          'Copy-Item',
          'Move-Item'
        ]

        criticalOperations.forEach(operation => {
          const regex = new RegExp(operation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          const matches = fullText.match(regex)

          if (matches) {
            matches.forEach(() => {
              // Проверяем, обернута ли операция в try/catch
              const operationIndex = fullText.indexOf(operation)
              if (operationIndex !== -1) {
                const contextBefore = fullText.substring(Math.max(0, operationIndex - 500), operationIndex)
                const contextAfter = fullText.substring(operationIndex, operationIndex + 500)

                const hasTryCatch = contextBefore.includes('try') &&
                                  (contextAfter.includes('catch') || contextBefore.includes('catch'))

                if (!hasTryCatch) {
                  context.report({
                    node,
                    messageId: 'missingTryCatch'
                  })
                }
              }
            })
          }
        })
      },

      CallExpression(node) {
        if (node.callee && node.callee.name) {
          const functionName = node.callee.name

          // Сбор информации о вызовах функций для последующего анализа
          functionCalls.push({
            name: functionName,
            node: node
          })

          // Проверка throw без сообщения
          if (functionName === 'throw' || functionName === 'Throw') {
            const args = node.arguments || []
            if (args.length === 0) {
              context.report({
                node,
                messageId: 'avoidThrowWithoutMessage'
              })
            }
          }

          // Проверка Write-Error vs throw
          if (functionName === 'Write-Error' || functionName === 'WriteError') {
            // Это хорошо, Write-Error не завершает выполнение
          }

          // Проверка внешних команд
          if (functionName === '&' || functionName === 'Invoke-Expression' ||
              functionName === 'Start-Process') {
            // Проверяем, есть ли проверка $LASTEXITCODE
            const parentFunction = findParentFunction(node)
            if (parentFunction) {
              const functionText = sourceCode.getText(parentFunction)
              if (!functionText.includes('$LASTEXITCODE') && !functionText.includes('$?')) {
                context.report({
                  node,
                  messageId: 'missingExitCodeCheck'
                })
              }
            }
          }
        }
      },

      VariableDeclaration(node) {
        // Проверка использования $Error
        if (node.kind === 'var' || node.kind === 'let') {
          const declarations = node.declarations || []
          declarations.forEach(decl => {
            if (decl.id && decl.id.name === 'Error') {
              context.report({
                node: decl,
                messageId: 'missingErrorVariable'
              })
            }
          })
        }
      },

      TryStatement(node) {
        // Проверка наличия finally блока для операций с ресурсами
        const hasResourceOperations = sourceCode.getText(node.block).includes('New-Object') ||
                                    sourceCode.getText(node.block).includes('Open-') ||
                                    sourceCode.getText(node.block).includes('Connect-')

        if (hasResourceOperations && !node.finalizer) {
          context.report({
            node,
            messageId: 'missingFinallyBlock'
          })
        }

        // Проверка логирования ошибок в catch блоках
        if (node.handler && node.handler.body) {
          const catchText = sourceCode.getText(node.handler.body)
          const hasThrow = catchText.includes('throw') || catchText.includes('Throw')

          if (hasThrow && !catchText.includes('Write-Error') &&
              !catchText.includes('WriteError')) {
            context.report({
              node: node.handler,
              messageId: 'inconsistentErrorLogging'
            })
          }
        }
      }
    }
  }
}

/**
 * Находит родительскую функцию для узла
 */
function findParentFunction(node) {
  let current = node
  while (current) {
    if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression') {
      return current
    }
    current = current.parent
  }
  return null
}
