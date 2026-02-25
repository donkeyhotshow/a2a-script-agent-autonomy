/**
 * ESLint правило: powershell-structure-validation
 *
 * Проверяет структуру и организацию PowerShell скриптов.
 * Обеспечивает правильную организацию кода, разделение на секции,
 * и соблюдение стандартов структурирования скриптов.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверка структуры и организации PowerShell скриптов',
      category: 'Best Practices',
      recommended: true,
      url: '.cursor/rules/powershell-structure-validation.md'
    },
    schema: [],
    messages: {
      missingScriptStructure: 'Скрипт должен иметь четкую структуру с разделами комментариев',
      missingParameterBlock: 'Параметры должны быть организованы в param() блок',
      inconsistentFunctionOrder: 'Функции должны быть упорядочены по назначению',
      missingRegionComments: 'Используйте #region/#endregion для группировки кода',
      avoidGlobalCode: 'Избегайте глобального кода вне функций. Используйте функцию main',
      missingScriptMetadata: 'Скрипт должен содержать метаданные (автор, версия, дата)',
      inconsistentIndentation: 'Используйте一致ную вложенность (4 пробела)',
      missingFunctionDocumentation: 'Функции должны иметь structured комментарии',
      avoidLongFunctions: 'Функции длиннее 50 строк должны быть разделены',
      missingDependencyChecks: 'Проверяйте наличие зависимостей в начале скрипта',
      inconsistentSectionOrder: 'Соблюдайте порядок секций: комментарии, параметры, функции, main',
      missingExampleUsage: 'Скрипт должен содержать примеры использования',
      avoidScriptLevelVariables: 'Избегайте переменных уровня скрипта. Используйте локальные переменные',
      missingCleanupSection: 'Добавьте секцию очистки ресурсов',
      inconsistentCommentStyle: 'Используйте一致ный стиль комментариев'
    }
  },

  create(context) {
    const filename = context.getFilename()
    const isPs1File = filename.endsWith('.ps1')

    if (!isPs1File) return {}

    const sourceCode = context.sourceCode
    const lines = sourceCode.getText().split('\n')
    const functions = []

    return {
      Program(node) {
        const fullText = sourceCode.getText()

        // Проверка общей структуры скрипта
        const hasProperStructure = checkScriptStructure(fullText, lines)
        if (!hasProperStructure) {
          context.report({
            node,
            messageId: 'missingScriptStructure'
          })
        }

        // Проверка наличия param() блока для скриптов с параметрами
        const hasParamKeyword = fullText.includes('param(') || fullText.includes('param ')
        const hasParameters = fullText.match(/\[Parameter\([^)]*\)\]/g)

        if (hasParameters && hasParameters.length > 0 && !hasParamKeyword) {
          context.report({
            node,
            messageId: 'missingParameterBlock'
          })
        }

        // Проверка метаданных скрипта
        const hasMetadata = lines.some(line =>
          line.includes('@author') ||
          line.includes('@version') ||
          line.includes('@date') ||
          line.includes('Created:') ||
          line.includes('Modified:')
        )

        if (!hasMetadata && lines.length > 20) {
          context.report({
            node,
            messageId: 'missingScriptMetadata'
          })
        }

        // Проверка наличия примеров использования
        const hasExamples = fullText.includes('.EXAMPLE') ||
                          fullText.includes('Examples:') ||
                          fullText.includes('Пример:')

        if (!hasExamples && lines.length > 30) {
          context.report({
            node,
            messageId: 'missingExampleUsage'
          })
        }

        // Проверка использования #region
        const hasRegions = fullText.includes('#region') || fullText.includes('#endregion')
        const functionCount = (fullText.match(/function\s+/g) || []).length

        if (!hasRegions && functionCount > 3) {
          context.report({
            node,
            messageId: 'missingRegionComments'
          })
        }

        // Проверка глобального кода
        const hasMainFunction = fullText.includes('function Invoke-Main') ||
                               fullText.includes('function Main') ||
                               fullText.includes('Invoke-Main') ||
                               fullText.includes('Main')

        const executableLines = lines.filter((line, index) => {
          const trimmed = line.trim()
          // Пропускаем комментарии, пустые строки, объявления функций и параметры
          return trimmed &&
                 !trimmed.startsWith('#') &&
                 !trimmed.startsWith('<#') &&
                 !trimmed.startsWith('function') &&
                 !trimmed.startsWith('param') &&
                 !trimmed.startsWith('[') &&
                 !trimmed.includes('=')
        })

        if (executableLines.length > 5 && !hasMainFunction) {
          context.report({
            node,
            messageId: 'avoidGlobalCode'
          })
        }

        // Проверка зависимостей
        const hasDependencyChecks = fullText.includes('Test-Dependencies') ||
                                   fullText.includes('Test-Path') ||
                                   fullText.includes('Get-Command')

        if (!hasDependencyChecks && (fullText.includes('npm') || fullText.includes('php'))) {
          context.report({
            node,
            messageId: 'missingDependencyChecks'
          })
        }

        // Проверка длины скрипта и разделения на секции
        if (lines.length > 100) {
          const hasSections = checkScriptSections(fullText)
          if (!hasSections) {
            context.report({
              node,
              messageId: 'inconsistentSectionOrder'
            })
          }
        }

        // Проверка переменных уровня скрипта
        const scriptVariables = fullText.match(/^\$[a-zA-Z_][a-zA-Z0-9_]*\s*=/gm)
        if (scriptVariables && scriptVariables.length > 3) {
          context.report({
            node,
            messageId: 'avoidScriptLevelVariables'
          })
        }

        // Проверка стиля комментариев
        const commentStyles = checkCommentConsistency(lines)
        if (!commentStyles.consistent) {
          context.report({
            node,
            messageId: 'inconsistentCommentStyle'
          })
        }

        // Проверка отступов (простая проверка)
        const indentationIssues = checkIndentationConsistency(lines)
        if (indentationIssues > lines.length * 0.1) { // > 10% строк с проблемами
          context.report({
            node,
            messageId: 'inconsistentIndentation'
          })
        }
      },

      FunctionDeclaration(node) {
        if (node.id && node.id.name) {
          functions.push({
            name: node.id.name,
            node: node,
            line: node.loc.start.line
          })

          // Проверка длины функции
          const functionLines = sourceCode.getText(node.body).split('\n').length
          if (functionLines > 50) {
            context.report({
              node: node.id,
              messageId: 'avoidLongFunctions'
            })
          }

          // Проверка документации функции
          const comments = sourceCode.getCommentsBefore(node)
          const hasStructuredComment = comments.some(comment =>
            comment.value.includes(node.id.name) ||
            comment.value.includes('.SYNOPSIS') ||
            comment.value.includes('.DESCRIPTION') ||
            comment.value.includes('Функция')
          )

          if (!hasStructuredComment) {
            context.report({
              node: node.id,
              messageId: 'missingFunctionDocumentation'
            })
          }
        }
      },

      // Проверка порядка функций после сбора всех
      'Program:exit'(node) {
        if (functions.length > 2) {
          const functionOrder = checkFunctionOrder(functions)
          if (!functionOrder) {
            context.report({
              node,
              messageId: 'inconsistentFunctionOrder'
            })
          }
        }
      }
    }
  }
}

/**
 * Проверяет общую структуру скрипта
 */
function checkScriptStructure(fullText, lines) {
  let score = 0

  // Проверка наличия SYNOPSIS
  if (fullText.includes('.SYNOPSIS')) score++

  // Проверка наличия DESCRIPTION
  if (fullText.includes('.DESCRIPTION')) score++

  // Проверка наличия PARAMETERS
  if (fullText.includes('.PARAMETER')) score++

  // Проверка наличия EXAMPLE
  if (fullText.includes('.EXAMPLE')) score++

  // Проверка разделения на секции
  const sections = ['function', 'param', '#region', '<#']
  const hasSections = sections.some(section => fullText.includes(section))
  if (hasSections) score++

  // Проверка читаемости (не слишком много кода в строке)
  const longLines = lines.filter(line => line.length > 120)
  if (longLines.length < lines.length * 0.1) score++

  return score >= 3 // Минимум 3 из 5 критериев
}

/**
 * Проверяет разделение скрипта на секции
 */
function checkScriptSections(fullText) {
  const sections = [
    /#.*(?:header|comment|metadata)/i,
    /#.*(?:param|parameter)/i,
    /#.*(?:function|method)/i,
    /#.*(?:main|execution)/i
  ]

  let foundSections = 0
  sections.forEach(section => {
    if (section.test(fullText)) foundSections++
  })

  return foundSections >= 2
}

/**
 * Проверяет一致ность комментариев
 */
function checkCommentConsistency(lines) {
  let singleLineComments = 0
  let blockComments = 0
  let totalComments = 0

  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) singleLineComments++
    if (trimmed.startsWith('<#') || trimmed.includes('<#')) blockComments++
    if (trimmed.startsWith('#') || trimmed.startsWith('<#')) totalComments++
  })

  // Если комментариев мало,一致ность не проверяется
  if (totalComments < 3) return { consistent: true }

  // Проверяем преобладание одного стиля
  const singleLineRatio = singleLineComments / totalComments
  const blockRatio = blockComments / totalComments

  // Если один стиль > 80%, то一致ный
  return {
    consistent: singleLineRatio > 0.8 || blockRatio > 0.8
  }
}

/**
 * Проверяет一致ность отступов
 */
function checkIndentationConsistency(lines) {
  let issues = 0

  lines.forEach((line, index) => {
    if (index === 0) return // Пропускаем первую строку

    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return // Пропускаем пустые и комментарии

    const indent = line.length - line.trimStart().length

    // Проверяем кратность 4 пробелам (стандарт PowerShell)
    if (indent > 0 && indent % 4 !== 0) {
      issues++
    }
  })

  return issues
}

/**
 * Проверяет порядок функций
 */
function checkFunctionOrder(functions) {
  if (functions.length < 2) return true

  // Простая проверка: функции с похожими префиксами должны быть рядом
  const functionNames = functions.map(f => f.name)

  // Группируем функции по префиксам
  const prefixGroups = {}
  functionNames.forEach(name => {
    const prefix = name.split('-')[0]
    if (!prefixGroups[prefix]) prefixGroups[prefix] = []
    prefixGroups[prefix].push(name)
  })

  // Проверяем, что группы функций расположены близко друг к другу
  let wellGrouped = true
  Object.values(prefixGroups).forEach(group => {
    if (group.length > 1) {
      // Находим индексы функций в группе
      const indices = group.map(name =>
        functions.findIndex(f => f.name === name)
      ).sort((a, b) => a - b)

      // Проверяем, что максимальный разрыв не слишком большой
      const maxGap = Math.max(...indices) - Math.min(...indices)
      if (maxGap > functions.length * 0.5) { // Разрыв больше половины скрипта
        wellGrouped = false
      }
    }
  })

  return wellGrouped
}
