/**
 * ESLint правило: powershell-script-standards
 *
 * Комплексное правило для анализа PowerShell скриптов согласно стандартам проекта.
 * Проверяет структуру, безопасность, логирование и лучшие практики.
 *
 * Проверяет:
 * - Правильную структуру скрипта (Requires, комментарии, функции)
 * - Безопасность (ExecutionPolicy, параметры)
 * - Логирование (Write-Log, Write-Success, Write-Error)
 * - Обработку ошибок (try/catch, $ErrorActionPreference)
 * - Соглашения об именовании (функции, переменные)
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Комплексная проверка стандартов PowerShell скриптов',
            category: 'Best Practices',
            recommended: true,
            url: '.cursor/rules/powershell-script-standards.md'
        },
        schema: [],
        messages: {
            missingRequiresVersion: 'Скрипт должен начинаться с #Requires -Version 7.0',
            missingSynopsis: 'Отсутствует SYNOPSIS комментарий в начале скрипта',
            missingParameterValidation: 'Параметр {{param}} должен иметь валидацию типа данных',
            inconsistentLogging: 'Используйте Write-Log вместо прямых Write-Host/Write-Output для логирования',
            missingErrorHandling: 'Функция должна иметь try/catch блок для обработки ошибок',
            insecureExecution: 'Использование & для вызова команд требует проверки безопасности',
            missingFunctionComment: 'Функция {{name}} должна иметь комментарий с описанием',
            invalidVariableNaming: 'Переменная {{name}} должна использовать PascalCase или camelCase',
            missingStateManagement: 'Скрипт должен использовать функции управления состоянием (Save-TestState, Load-TestState)',
            unsafePathHandling: 'Пути файлов должны проверяться на существование и безопасность'
        }
    },

    create(context) {
        const filename = context.getFilename()
        const isPs1File = filename.endsWith('.ps1')

        // Проверяем только .ps1 файлы
        if (!isPs1File) return {}

        const sourceCode = context.sourceCode
        const lines = sourceCode.getText().split('\n')
        let hasRequiresVersion = false
        let hasSynopsis = false
        let hasErrorActionPreference = false
        let hasStateManagement = false
        const functionDeclarations = []
        const variableDeclarations = []

        return {
            Program(node) {
                // Проверка #Requires -Version
                if (lines[0] && lines[0].trim().startsWith('#Requires -Version 7.0')) {
                    hasRequiresVersion = true
                } else {
                    context.report({
                        node,
                        messageId: 'missingRequiresVersion'
                    })
                }

                // Проверка SYNOPSIS комментария
                const synopsisFound = lines.some(line =>
                    line.trim().startsWith('<#') ||
                    line.includes('.SYNOPSIS')
                )
                if (!synopsisFound) {
                    context.report({
                        node,
                        messageId: 'missingSynopsis'
                    })
                }

                // Проверка наличия функций управления состоянием
                const hasSaveTestState = sourceCode.getText().includes('Save-TestState')
                const hasLoadTestState = sourceCode.getText().includes('Load-TestState')

                if (hasSaveTestState || hasLoadTestState) {
                    hasStateManagement = true
                } else {
                    // Проверяем, является ли это тестовым скриптом
                    const isTestScript = filename.includes('test') || filename.includes('Test')
                    if (isTestScript) {
                        context.report({
                            node,
                            messageId: 'missingStateManagement'
                        })
                    }
                }
            },

            VariableDeclaration(node) {
                // Сбор информации о переменных для проверки именования
                if (node.kind === 'var' || node.kind === 'let' || node.kind === 'const') {
                    const declarations = node.declarations || []
                    declarations.forEach(decl => {
                        if (decl.id && decl.id.name) {
                            variableDeclarations.push({
                                name: decl.id.name,
                                node: decl
                            })
                        }
                    })
                }
            },

            FunctionDeclaration(node) {
                if (node.id && node.id.name) {
                    functionDeclarations.push({
                        name: node.id.name,
                        node: node,
                        hasComment: false
                    })

                    // Проверка комментария функции
                    const comments = sourceCode.getCommentsBefore(node)
                    const hasFunctionComment = comments.some(comment =>
                        comment.value.includes(node.id.name) ||
                        comment.value.includes('function') ||
                        comment.value.includes('Функция')
                    )

                    if (!hasFunctionComment) {
                        context.report({
                            node: node.id,
                            messageId: 'missingFunctionComment',
                            data: {
                                name: node.id.name
                            }
                        })
                    }

                    // Проверка наличия try/catch в теле функции
                    const functionBody = node.body
                    if (functionBody && functionBody.body) {
                        const hasTryCatch = functionBody.body.some(stmt =>
                            stmt.type === 'TryStatement' ||
                            (stmt.type === 'ExpressionStatement' &&
                                stmt.expression &&
                                stmt.expression.callee &&
                                (stmt.expression.callee.name === 'try' ||
                                    stmt.expression.callee.name?.includes('catch')))
                        )

                        // Более простая проверка на наличие try в тексте функции
                        const functionText = sourceCode.getText(functionBody)
                        const hasTryStatement = functionText.includes('try') && functionText.includes('catch')

                        if (!hasTryStatement && functionText.includes('$ErrorActionPreference')) {
                            // Если используется ErrorActionPreference, try/catch может быть не нужен
                        } else if (!hasTryStatement && (functionText.includes('&') || functionText.includes('Invoke-'))) {
                            context.report({
                                node: node.id,
                                messageId: 'missingErrorHandling'
                            })
                        }
                    }
                }
            },

            CallExpression(node) {
                // Проверка использования Write-Host/Write-Output вместо Write-Log
                if (node.callee && node.callee.name) {
                    const functionName = node.callee.name

                    if (functionName === 'Write-Host' || functionName === 'Write-Output') {
                        // Исключения для некоторых случаев
                        const args = node.arguments || []
                        const isAllowed = args.some(arg =>
                            arg.type === 'Literal' &&
                            (arg.value.includes('Current location:') ||
                                arg.value.includes('===') ||
                                arg.value.includes('Script:'))
                        )

                        if (!isAllowed) {
                            context.report({
                                node,
                                messageId: 'inconsistentLogging'
                            })
                        }
                    }

                    // Проверка небезопасного выполнения команд
                    if (functionName === '&' || functionName === 'Invoke-Expression') {
                        context.report({
                            node,
                            messageId: 'insecureExecution'
                        })
                    }
                }

                // Проверка использования Test-Path для путей
                if (node.callee && node.callee.name === 'Join-Path') {
                    // Предупреждаем о необходимости проверки существования пути
                    const parentFunction = findParentFunction(node)
                    if (parentFunction) {
                        const functionText = sourceCode.getText(parentFunction)
                        if (!functionText.includes('Test-Path')) {
                            context.report({
                                node,
                                messageId: 'unsafePathHandling'
                            })
                        }
                    }
                }
            },

            // Анализ текста файла для PowerShell-специфичных конструкций
            'Program:exit'(node) {
                const fullText = sourceCode.getText()

                // Проверка $ErrorActionPreference
                if (fullText.includes('$ErrorActionPreference')) {
                    hasErrorActionPreference = true
                }

                // Проверка параметров с типами
                const paramMatches = fullText.match(/\[Parameter\([^)]*\)\]\s*\[(\w+)\]\$(\w+)/g)
                if (paramMatches) {
                    paramMatches.forEach(match => {
                        const paramName = match.match(/\$(\w+)/)?.[1]
                        if (paramName && !match.includes('[string]') && !match.includes('[int]') &&
                            !match.includes('[bool]') && !match.includes('[switch]')) {
                            context.report({
                                node,
                                messageId: 'missingParameterValidation',
                                data: {
                                    param: paramName
                                }
                            })
                        }
                    })
                }

                // Проверка именования переменных (PowerShell стиль)
                const varMatches = fullText.match(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g)
                if (varMatches) {
                    varMatches.forEach(match => {
                        const varName = match.substring(1) // Убираем $
                        // PowerShell использует PascalCase для переменных в некоторых контекстах
                        if (varName && !isValidPowerShellVariableName(varName)) {
                            context.report({
                                node,
                                messageId: 'invalidVariableNaming',
                                data: {
                                    name: '$' + varName
                                }
                            })
                        }
                    })
                }
            }
        }
    }
}

/**
 * Проверяет валидность имени переменной PowerShell
 */
function isValidPowerShellVariableName(name) {
    // PowerShell переменные могут использовать различные стили
    // PascalCase, camelCase, UPPER_CASE, и некоторые специальные имена
    return (
        /^[A-Z][a-zA-Z0-9]*$/.test(name) || // PascalCase
        /^[a-z][a-zA-Z0-9]*$/.test(name) || // camelCase
        /^[A-Z][A-Z0-9_]*$/.test(name) ||   // UPPER_CASE
        name.startsWith('_') ||             // Специальные переменные
        name.length <= 3                    // Короткие имена
    )
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
