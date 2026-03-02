/**
 * ESLint правило: powershell-syntax-validation
 *
 * Проверяет синтаксис и лучшие практики PowerShell скриптов.
 * Включает проверки на правильное использование cmdlet'ов,
 * операторов сравнения, строковых литералов и других конструкций.
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверка синтаксиса и лучших практик PowerShell',
            category: 'Best Practices',
            recommended: true,
            url: '.cursor/rules/powershell-syntax-validation.md'
        },
        schema: [],
        messages: {
            useApprovedVerbs: 'Используйте одобренные глаголы PowerShell вместо "{{verb}}". Рекомендуется: {{suggested}}',
            avoidWriteHost: 'Избегайте Write-Host в функциях и модулях. Используйте Write-Output или Write-Verbose',
            preferSplatting: 'Для команд с множеством параметров используйте splatting (@{{paramObject}})',
            avoidPositionalParameters: 'Используйте именованные параметры вместо позиционных для читаемости',
            useStrictMode: 'Добавьте Set-StrictMode -Version Latest в начало скрипта',
            avoidBackticks: 'Избегайте обратных кавычек (`) для переноса строк. Используйте splatting или Here-Strings',
            preferJoinPath: 'Используйте Join-Path вместо строковой конкатенации для путей',
            avoidAliasInScripts: 'Избегайте алиасов в скриптах. Используйте полные имена командлетов',
            useConsistentQuoting: 'Используйте одинарные кавычки для строк без переменных',
            avoidEmptyCatch: 'Блоки catch не должны быть пустыми. Добавьте обработку ошибок',
            useParamBlock: 'Используйте [Parameter()] атрибуты для документирования параметров',
            avoidGlobalVariables: 'Избегайте глобальных переменных. Используйте scoped переменные',
            usePipelineCorrectly: 'Правильно используйте pipeline. Избегайте ненужных промежуточных переменных',
            preferFilterOverWhere: 'Используйте Where-Object (или ?) вместо where для фильтрации'
        }
    },

    create(context) {
        const filename = context.getFilename()
        const isPs1File = filename.endsWith('.ps1')

        if (!isPs1File) return {}

        const sourceCode = context.sourceCode
        const lines = sourceCode.getText().split('\n')

        return {
            Program(node) {
                const fullText = sourceCode.getText()

                // Проверка Set-StrictMode
                if (!fullText.includes('Set-StrictMode')) {
                    context.report({
                        node,
                        messageId: 'useStrictMode'
                    })
                }

                // Проверка использования алиасов
                const aliases = ['%', '?', 'sort', 'select', 'group', 'measure', 'foreach', 'where']
                aliases.forEach(alias => {
                    // Экранируем специальные символы regex
                    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    let regex
                    if (['%', '?'].includes(alias)) {
                        // Для специальных символов используем проверку на границы слов или пробелы
                        regex = new RegExp(`(?:^|\\s|;|\\|)${escapedAlias}(?:$|\\s|;|\\|)`, 'g')
                    } else {
                        regex = new RegExp(`\\b${escapedAlias}\\b`, 'g')
                    }
                    let match
                    while ((match = regex.exec(fullText)) !== null) {
                        // Проверяем контекст использования
                        const lineIndex = fullText.substring(0, match.index).split('\n').length - 1
                        const line = lines[lineIndex]

                        // Исключаем случаи, когда это часть более длинного слова или в комментариях
                        if (!line.trim().startsWith('#') &&
                            !line.includes(`$${alias}`) &&
                            !line.includes(`${alias}(`) &&
                            !line.includes(`${alias}[`)) {
                            context.report({
                                node,
                                messageId: 'avoidAliasInScripts',
                                data: {alias: alias}
                            })
                        }
                    }
                })

                // Проверка использования обратных кавычек
                const backtickMatches = fullText.match(/`[^\n]*$/gm)
                if (backtickMatches) {
                    backtickMatches.forEach(match => {
                        context.report({
                            node,
                            messageId: 'avoidBackticks'
                        })
                    })
                }

                // Проверка пустых catch блоков
                const emptyCatchRegex = /catch\s*\{\s*\}/g
                if (emptyCatchRegex.test(fullText)) {
                    context.report({
                        node,
                        messageId: 'avoidEmptyCatch'
                    })
                }

                // Проверка глобальных переменных
                const globalVarRegex = /\$global:/g
                if (globalVarRegex.test(fullText)) {
                    context.report({
                        node,
                        messageId: 'avoidGlobalVariables'
                    })
                }
            },

            CallExpression(node) {
                if (node.callee && node.callee.name) {
                    const functionName = node.callee.name

                    // Проверка одобренных глаголов
                    const unapprovedVerbs = checkApprovedVerbs(functionName)
                    if (unapprovedVerbs) {
                        context.report({
                            node,
                            messageId: 'useApprovedVerbs',
                            data: {
                                verb: unapprovedVerbs.verb,
                                suggested: unapprovedVerbs.suggested
                            }
                        })
                    }

                    // Проверка Write-Host
                    if (functionName === 'Write-Host') {
                        context.report({
                            node,
                            messageId: 'avoidWriteHost'
                        })
                    }

                    // Проверка использования where вместо Where-Object
                    if (functionName === 'where') {
                        context.report({
                            node,
                            messageId: 'preferFilterOverWhere'
                        })
                    }
                }

                // Проверка позиционных параметров
                if (node.arguments && node.arguments.length > 3) {
                    // Если команда имеет много аргументов без именованных параметров
                    const hasNamedParams = node.arguments.some(arg =>
                        arg.type === 'AssignmentExpression' ||
                        (arg.type === 'BinaryExpression' && arg.operator === '=')
                    )

                    if (!hasNamedParams) {
                        context.report({
                            node,
                            messageId: 'avoidPositionalParameters'
                        })
                    }
                }
            },

            BinaryExpression(node) {
                // Проверка конкатенации путей
                if (node.operator === '+' || node.operator === '+=') {
                    const leftText = sourceCode.getText(node.left)
                    const rightText = sourceCode.getText(node.right)

                    // Проверяем, является ли это конкатенацией путей
                    if ((leftText.includes('\\') || leftText.includes('/')) &&
                        (rightText.includes('\\') || rightText.includes('/'))) {
                        context.report({
                            node,
                            messageId: 'preferJoinPath'
                        })
                    }
                }
            },

            Literal(node) {
                // Проверка кавычек в строках
                if (typeof node.value === 'string') {
                    const text = node.raw || sourceCode.getText(node)

                    // Проверяем двойные кавычки для строк без переменных
                    if (text.startsWith('"') && text.endsWith('"') &&
                        !text.includes('$') && !text.includes('`')) {
                        context.report({
                            node,
                            messageId: 'useConsistentQuoting'
                        })
                    }
                }
            }
        }
    }
}

/**
 * Проверяет использование одобренных глаголов PowerShell
 */
function checkApprovedVerbs(functionName) {
    // Разбираем имя функции на глагол-существительное
    const verbNounMatch = functionName.match(/^([A-Z][a-z]+)-(.+)$/)
    if (!verbNounMatch) return null

    const verb = verbNounMatch[1]

    // Неодобренные глаголы и их замены
    const unapprovedVerbs = {
        'Append': 'Add',
        'Attach': 'Add',
        'Concatenate': 'Add',
        'Insert': 'Add',
        'Delete': 'Remove',
        'Kill': 'Stop',
        'Terminate': 'Stop',
        'Halt': 'Stop',
        'Ping': 'Test',
        'Pinged': 'Test',
        'Exists': 'Test',
        'Find': 'Get',
        'Locate': 'Get',
        'Obtain': 'Get',
        'Retrieve': 'Get',
        'Return': 'Get',
        'Create': 'New',
        'Build': 'New',
        'Allocate': 'New',
        'Instantiate': 'New',
        'Change': 'Set',
        'Modify': 'Set',
        'Alter': 'Set',
        'Update': 'Set',
        'Execute': 'Invoke',
        'Run': 'Invoke',
        'Launch': 'Start',
        'Boot': 'Start',
        'Init': 'Initialize',
        'Setup': 'Initialize'
    }

    if (unapprovedVerbs[verb]) {
        return {
            verb: verb,
            suggested: unapprovedVerbs[verb]
        }
    }

    return null
}
