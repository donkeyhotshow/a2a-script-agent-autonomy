/**
 * ESLint правило: powershell-naming-conventions
 *
 * Проверяет соглашения об именовании в PowerShell скриптах.
 * Обеспечивает последовательное использование PascalCase, camelCase
 * и других стандартов именования согласно PowerShell best practices.
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверка соглашений об именовании в PowerShell скриптах',
            category: 'Stylistic Issues',
            recommended: true,
            url: '.cursor/rules/powershell-naming-conventions.md'
        },
        schema: [],
        messages: {
            invalidFunctionName: 'Имя функции "{{name}}" должно использовать Verb-Noun формат с одобренными глаголами',
            invalidVariableName: 'Имя переменной "{{name}}" должно использовать PascalCase или camelCase',
            invalidParameterName: 'Имя параметра "{{name}}" должно использовать PascalCase',
            avoidHungarianNotation: 'Избегайте венгерской нотации. Используйте описательные имена',
            inconsistentScriptName: 'Имя скрипта должно отражать его назначение',
            invalidConstantName: 'Константы должны использовать UPPER_CASE',
            avoidSingleLetterVars: 'Избегайте однобуквенных переменных кроме стандартных ($_, $i, $j)',
            invalidCmdletName: 'Имя cmdlet должно использовать Verb-Noun формат',
            missingNounPrefix: 'Имя функции должно содержать префикс, описывающий область действия',
            invalidModuleName: 'Имя модуля должно быть описательным и без пробелов',
            avoidAbbreviationOverload: 'Избегайте неоднозначных сокращений',
            inconsistentNamingStyle: 'Поддерживайте一致ный стиль именования в рамках скрипта',
            invalidFileName: 'Имя файла скрипта должно использовать PascalCase или kebab-case',
            avoidReservedWords: 'Избегайте использования зарезервированных слов PowerShell'
        }
    },

    create(context) {
        const filename = context.getFilename()
        const isPs1File = filename.endsWith('.ps1')

        if (!isPs1File) return {}

        const sourceCode = context.sourceCode
        const lines = sourceCode.getText().split('\n')
        const variables = new Set()
        const functions = new Set()

        return {
            Program(node) {
                const fullText = sourceCode.getText()

                // Проверка имени файла скрипта
                const scriptName = filename.split('/').pop().split('\\').pop().replace('.ps1', '')
                if (!isValidScriptName(scriptName)) {
                    context.report({
                        node,
                        messageId: 'invalidFileName'
                    })
                }

                // Проверка имени скрипта в SYNOPSIS
                const synopsisMatch = fullText.match(/\.SYNOPSIS\s+(.+)/)
                if (synopsisMatch) {
                    const synopsis = synopsisMatch[1].trim()
                    // Проверка, что SYNOPSIS описывает назначение скрипта
                }

                // Сбор всех переменных для проверки一致ности
                const varMatches = fullText.match(/\$[a-zA-Z_][a-zA-Z0-9_]*/g)
                if (varMatches) {
                    varMatches.forEach(varMatch => {
                        variables.add(varMatch.substring(1)) // Убираем $
                    })
                }

                // Сбор всех функций
                const funcMatches = fullText.match(/function\s+[A-Za-z][A-Za-z0-9_-]*/g)
                if (funcMatches) {
                    funcMatches.forEach(funcMatch => {
                        const funcName = funcMatch.replace('function', '').trim()
                        functions.add(funcName)
                    })
                }

                // Проверка一致ности стиля именования переменных
                const varNames = Array.from(variables)
                const namingStyles = varNames.map(name => detectNamingStyle(name))

                const hasMultipleStyles = new Set(namingStyles).size > 1
                if (hasMultipleStyles && varNames.length > 5) {
                    context.report({
                        node,
                        messageId: 'inconsistentNamingStyle'
                    })
                }
            },

            FunctionDeclaration(node) {
                if (node.id && node.id.name) {
                    const functionName = node.id.name

                    // Проверка формата Verb-Noun
                    if (!isValidFunctionName(functionName)) {
                        context.report({
                            node: node.id,
                            messageId: 'invalidFunctionName',
                            data: {
                                name: functionName
                            }
                        })
                    }

                    // Проверка использования одобренных глаголов
                    const verbNounMatch = functionName.match(/^([A-Z][a-z]+)-(.+)$/)
                    if (verbNounMatch) {
                        const verb = verbNounMatch[1]
                        if (!isApprovedVerb(verb)) {
                            context.report({
                                node: node.id,
                                messageId: 'invalidCmdletName'
                            })
                        }
                    }

                    // Проверка на венгерскую нотацию
                    if (hasHungarianNotation(functionName)) {
                        context.report({
                            node: node.id,
                            messageId: 'avoidHungarianNotation'
                        })
                    }

                    // Проверка на сокращения
                    if (hasAmbiguousAbbreviations(functionName)) {
                        context.report({
                            node: node.id,
                            messageId: 'avoidAbbreviationOverload'
                        })
                    }

                    // Проверка на зарезервированные слова
                    if (isReservedWord(functionName)) {
                        context.report({
                            node: node.id,
                            messageId: 'avoidReservedWords'
                        })
                    }
                }
            },

            VariableDeclaration(node) {
                const declarations = node.declarations || []
                declarations.forEach(decl => {
                    if (decl.id && decl.id.name) {
                        const varName = decl.id.name

                        // Проверка однобуквенных переменных
                        if (varName.length === 1 && !isStandardSingleLetterVar(varName)) {
                            context.report({
                                node: decl.id,
                                messageId: 'avoidSingleLetterVars'
                            })
                        }

                        // Проверка общего стиля именования
                        if (!isValidVariableName(varName)) {
                            context.report({
                                node: decl.id,
                                messageId: 'invalidVariableName',
                                data: {
                                    name: '$' + varName
                                }
                            })
                        }

                        // Проверка венгерской нотации
                        if (hasHungarianNotation(varName)) {
                            context.report({
                                node: decl.id,
                                messageId: 'avoidHungarianNotation'
                            })
                        }

                        // Проверка констант (переменные в UPPER_CASE)
                        const initText = decl.init ? sourceCode.getText(decl.init) : ''
                        if (isLikelyConstant(varName, initText)) {
                            if (!isValidConstantName(varName)) {
                                context.report({
                                    node: decl.id,
                                    messageId: 'invalidConstantName'
                                })
                            }
                        }
                    }
                })
            },

            // Анализ параметров функций
            'FunctionDeclaration > BlockStatement > VariableDeclaration'(node) {
                // Ищем param() блоки
                const paramMatches = sourceCode.getText(node).match(/\[Parameter\([^)]*\)\]\s*\[(\w+)\]\$(\w+)/g)
                if (paramMatches) {
                    paramMatches.forEach(paramMatch => {
                        const paramNameMatch = paramMatch.match(/\$(\w+)/)
                        if (paramNameMatch) {
                            const paramName = paramNameMatch[1]
                            if (!isValidParameterName(paramName)) {
                                context.report({
                                    node,
                                    messageId: 'invalidParameterName',
                                    data: {
                                        name: paramName
                                    }
                                })
                            }
                        }
                    })
                }
            }
        }
    }
}

/**
 * Проверяет валидность имени скрипта
 */
function isValidScriptName(name) {
    // PascalCase или kebab-case для скриптов
    return /^[A-Z][a-zA-Z0-9]*$/.test(name) || // PascalCase
        /^[a-z][a-z0-9-]*$/.test(name)     // kebab-case
}

/**
 * Проверяет валидность имени функции (Verb-Noun формат)
 */
function isValidFunctionName(name) {
    // Должен быть в формате Verb-Noun
    const verbNounPattern = /^[A-Z][a-z]+-[A-Z][a-zA-Z0-9]*$/
    return verbNounPattern.test(name)
}

/**
 * Проверяет одобренные глаголы PowerShell
 */
function isApprovedVerb(verb) {
    const approvedVerbs = [
        'Add', 'Clear', 'Close', 'Copy', 'Enter', 'Exit', 'Find', 'Format', 'Get',
        'Hide', 'Join', 'Lock', 'Move', 'New', 'Open', 'Optimize', 'Pop', 'Push',
        'Redo', 'Remove', 'Rename', 'Reset', 'Resize', 'Search', 'Select', 'Set',
        'Show', 'Skip', 'Split', 'Step', 'Switch', 'Undo', 'Unlock', 'Watch',
        'Backup', 'Checkpoint', 'Compare', 'Compress', 'Convert', 'ConvertFrom',
        'ConvertTo', 'Dismount', 'Edit', 'Expand', 'Export', 'Group', 'Import',
        'Initialize', 'Limit', 'Merge', 'Mount', 'Out', 'Publish', 'Restore',
        'Save', 'Sync', 'Unpublish', 'Update', 'Write', 'Approve', 'Assert',
        'Complete', 'Confirm', 'Deny', 'Disable', 'Enable', 'Install', 'Invoke',
        'Register', 'Request', 'Restart', 'Resume', 'Start', 'Stop', 'Submit',
        'Suspend', 'Uninstall', 'Unregister', 'Wait', 'Debug', 'Measure', 'Ping',
        'Repair', 'Resolve', 'Test', 'Trace', 'Connect', 'Disconnect', 'Read',
        'Receive', 'Send', 'Use', 'Block', 'Grant', 'Protect', 'Revoke', 'Unblock',
        'Unprotect'
    ]

    return approvedVerbs.includes(verb)
}

/**
 * Проверяет валидность имени переменной
 */
function isValidVariableName(name) {
    // PascalCase, camelCase, UPPER_CASE разрешены
    return /^[A-Z][a-zA-Z0-9]*$/.test(name) || // PascalCase
        /^[a-z][a-zA-Z0-9]*$/.test(name) || // camelCase
        /^[A-Z][A-Z0-9_]*$/.test(name)     // UPPER_CASE
}

/**
 * Проверяет валидность имени параметра
 */
function isValidParameterName(name) {
    // Параметры должны использовать PascalCase
    return /^[A-Z][a-zA-Z0-9]*$/.test(name)
}

/**
 * Проверяет валидность имени константы
 */
function isValidConstantName(name) {
    // Константы должны использовать UPPER_CASE
    return /^[A-Z][A-Z0-9_]*$/.test(name)
}

/**
 * Определяет стиль именования
 */
function detectNamingStyle(name) {
    if (/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'PascalCase'
    if (/^[a-z][a-zA-Z0-9]*$/.test(name)) return 'camelCase'
    if (/^[A-Z][A-Z0-9_]*$/.test(name)) return 'UPPER_CASE'
    return 'other'
}

/**
 * Проверяет венгерскую нотацию
 */
function hasHungarianNotation(name) {
    // Простая проверка на префиксы типа str, int, obj и т.д.
    const hungarianPrefixes = ['str', 'int', 'obj', 'arr', 'dict', 'bool', 'dbl']
    const lowerName = name.toLowerCase()

    return hungarianPrefixes.some(prefix => lowerName.startsWith(prefix))
}

/**
 * Проверяет неоднозначные сокращения
 */
function hasAmbiguousAbbreviations(name) {
    const ambiguousAbbrs = ['tmp', 'temp', 'val', 'var', 'data', 'info', 'cfg', 'conf']
    const lowerName = name.toLowerCase()

    return ambiguousAbbrs.some(abbr => lowerName.includes(abbr))
}

/**
 * Проверяет зарезервированные слова
 */
function isReservedWord(word) {
    const reservedWords = [
        'begin', 'break', 'catch', 'class', 'continue', 'data', 'define', 'do',
        'dynamicparam', 'else', 'elseif', 'end', 'exit', 'filter', 'finally',
        'for', 'foreach', 'from', 'function', 'if', 'in', 'inlinescript', 'parallel',
        'param', 'process', 'return', 'switch', 'throw', 'trap', 'try', 'until',
        'using', 'var', 'while', 'workflow'
    ]

    return reservedWords.includes(word.toLowerCase())
}

/**
 * Проверяет стандартные однобуквенные переменные
 */
function isStandardSingleLetterVar(name) {
    return ['_', 'i', 'j', 'k', 'x', 'y', 'z'].includes(name.toLowerCase())
}

/**
 * Определяет, является ли переменная константой
 */
function isLikelyConstant(name, initText) {
    // Переменные в UPPER_CASE или с постоянными значениями
    return /^[A-Z][A-Z0-9_]*$/.test(name) ||
        initText.includes('"') ||
        initText.includes("'") ||
        /^\d+$/.test(initText) ||
        initText.includes('$true') ||
        initText.includes('$false')
}
