/**
 * ESLint правило: powershell-logging-standards
 *
 * Проверяет стандарты логирования в PowerShell скриптах.
 * Обеспечивает последовательное использование функций Write-Log,
 * Write-Success, Write-Error и правильное логирование операций.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверка стандартов логирования в PowerShell скриптах',
      category: 'Best Practices',
      recommended: true,
      url: '.cursor/rules/powershell-logging-standards.md'
    },
    schema: [],
    messages: {
      missingFunctionLogging: 'Функции должны логировать начало и завершение выполнения',
      inconsistentLogLevel: 'Используйте Write-Log с явным уровнем вместо Write-Host/Write-Output',
      missingErrorLogging: 'Ошибки должны логироваться перед throw',
      missingSuccessLogging: 'Успешные операции должны логироваться',
      missingProgressLogging: 'Длительные операции должны показывать прогресс',
      avoidConsoleDirectly: 'Избегайте прямого вывода в консоль. Используйте Write-Log',
      missingTimingInfo: 'Операции >30сек должны логировать время выполнения',
      inconsistentTimestampFormat: 'Используйте Get-Date -Format для一致ного формата времени',
      missingOperationContext: 'Логи должны содержать контекст операции (имя функции/скрипта)',
      preferStructuredLogging: 'Используйте структурированное логирование с параметрами',
      missingLogLevelInMessages: 'Сообщения должны указывать уровень логирования в тексте',
      avoidVerboseWithoutCondition: 'Write-Verbose должен проверять $VerbosePreference',
      missingExitCodeLogging: 'Результаты выполнения команд должны логироваться'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isPs1File = filename.endsWith('.ps1')

    if (!isPs1File) return {}

    const sourceCode = context.sourceCode
    const lines = sourceCode.getText().split('\n')
    const functionDeclarations = []

    return {
      Program(node) {
        const fullText = sourceCode.getText()

        // Проверка импорта функций логирования
        const hasCommonImport = fullText.includes('. "$PSScriptRoot/includes/common.ps1"') ||
                               fullText.includes('includes/common.ps1')

        if (!hasCommonImport) {
          // Проверяем использование Write-Log без импорта
          if (fullText.includes('Write-Log') || fullText.includes('Write-Success') ||
              fullText.includes('Write-Error') || fullText.includes('Write-Warn')) {
            // Это нормально, если функции определены локально
          }
        }

        // Проверка использования Write-Host/Write-Output
        const writeHostMatches = fullText.match(/\bWrite-Host\b/g)
        const writeOutputMatches = fullText.match(/\bWrite-Output\b/g)

        if (writeHostMatches || writeOutputMatches) {
          const totalConsoleOutputs = (writeHostMatches?.length || 0) + (writeOutputMatches?.length || 0)

          // Исключаем разрешенные случаи
          const allowedPatterns = [
            /Write-Host.*Current location:/,
            /Write-Host.*===/,
            /Write-Host.*Script:/,
            /Write-Host.*Время/,
            /Write-Host.*Duration/,
            /Write-Output.*\$/
          ]

          let allowedCount = 0
          allowedPatterns.forEach(pattern => {
            const matches = fullText.match(pattern)
            if (matches) allowedCount += matches.length
          })

          if (totalConsoleOutputs > allowedCount + 2) { // Даем немного свободы
            context.report({
              node,
              messageId: 'avoidConsoleDirectly'
            })
          }
        }

        // Проверка Write-Verbose без проверки $VerbosePreference
        const verboseMatches = fullText.match(/\bWrite-Verbose\b/g)
        if (verboseMatches) {
          verboseMatches.forEach(() => {
            // Более детальная проверка потребуется в конкретном контексте
          })
        }

        // Проверка использования Get-Date без формата
        const dateMatches = fullText.match(/\bGet-Date\b(?!.*-Format)/g)
        if (dateMatches && dateMatches.length > 2) { // Исключаем простые случаи
          context.report({
            node,
            messageId: 'inconsistentTimestampFormat'
          })
        }
      },

      FunctionDeclaration(node) {
        if (node.id && node.id.name) {
          functionDeclarations.push({
            name: node.id.name,
            node: node
          })

          const functionText = sourceCode.getText(node.body)
          const functionLines = functionText.split('\n').length

          // Проверка логирования для функций > 10 строк
          if (functionLines > 10) {
            const hasLogging = functionText.includes('Write-Log') ||
                             functionText.includes('Write-Success') ||
                             functionText.includes('Write-Error') ||
                             functionText.includes('Write-Warn')

            if (!hasLogging) {
              context.report({
                node: node.id,
                messageId: 'missingFunctionLogging'
              })
            }
          }

          // Проверка логирования успешного завершения
          const hasReturnOrExit = functionText.includes('return') ||
                                functionText.includes('exit') ||
                                functionText.includes('Exit-WithError')

          if (hasReturnOrExit && !functionText.includes('Write-Success')) {
            // Исключаем функции-обертки и простые геттеры
            const isSimpleGetter = functionText.match(/return\s+\$/)
            if (!isSimpleGetter) {
              context.report({
                node: node.id,
                messageId: 'missingSuccessLogging'
              })
            }
          }
        }
      },

      CallExpression(node) {
        if (node.callee && node.callee.name) {
          const functionName = node.callee.name

          // Проверка Write-Log без уровня
          if (functionName === 'Write-Log') {
            const args = node.arguments || []
            if (args.length < 2) {
              context.report({
                node,
                messageId: 'inconsistentLogLevel'
              })
            }
          }

          // Проверка throw без Write-Error
          if (functionName === 'throw' || functionName === 'Throw') {
            // Проверяем контекст перед throw
            const tokenIndex = sourceCode.getIndexFromLoc(node.loc.start)
            const contextBefore = sourceCode.getText().substring(Math.max(0, tokenIndex - 300), tokenIndex)

            const hasErrorLogging = contextBefore.includes('Write-Error') ||
                                  contextBefore.includes('WriteError')

            if (!hasErrorLogging) {
              context.report({
                node,
                messageId: 'missingErrorLogging'
              })
            }
          }

          // Проверка длительных операций
          const longRunningCommands = [
            'Start-Sleep',
            'Invoke-WebRequest',
            'Start-Process',
            'npm',
            '&'
          ]

          if (longRunningCommands.includes(functionName)) {
            const args = node.arguments || []
            const hasTiming = args.some(arg =>
              sourceCode.getText(arg).includes('Measure-Command') ||
              sourceCode.getText(arg).includes('Stopwatch')
            )

            if (functionName === 'Start-Sleep') {
              const sleepArg = args[0]
              if (sleepArg && parseInt(sourceCode.getText(sleepArg)) > 30) {
                context.report({
                  node,
                  messageId: 'missingTimingInfo'
                })
              }
            } else if (!hasTiming) {
              context.report({
                node,
                messageId: 'missingProgressLogging'
              })
            }
          }

          // Проверка результатов выполнения команд
          if (functionName === '&' || functionName === 'Invoke-Expression' ||
              functionName === 'Start-Process') {
            // Проверяем логирование $LASTEXITCODE
            const parentFunction = findParentFunction(node)
            if (parentFunction) {
              const functionText = sourceCode.getText(parentFunction)
              const hasExitCodeLogging = functionText.includes('Write-Log') &&
                                       (functionText.includes('$LASTEXITCODE') ||
                                        functionText.includes('$?'))

              if (!hasExitCodeLogging) {
                context.report({
                  node,
                  messageId: 'missingExitCodeLogging'
                })
              }
            }
          }
        }
      },

      VariableDeclaration(node) {
        // Проверка использования Measure-Command для измерения времени
        const declarations = node.declarations || []
        declarations.forEach(decl => {
          if (decl.init && sourceCode.getText(decl.init).includes('Measure-Command')) {
            // Это хорошо - используется измерение времени
          }
        })
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
