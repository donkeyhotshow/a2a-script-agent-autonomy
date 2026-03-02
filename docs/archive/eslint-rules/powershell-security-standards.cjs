/**
 * ESLint правило: powershell-security-standards
 *
 * Проверяет безопасность PowerShell скриптов согласно стандартам проекта.
 * Включает проверки на Execution Policy, небезопасные практики,
 * валидацию вводимых данных и защиту от распространенных уязвимостей.
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверка безопасности PowerShell скриптов',
            category: 'Security',
            recommended: true,
            url: '.cursor/rules/powershell-security-standards.md'
        },
        schema: [],
        messages: {
            avoidExecutionPolicyBypass: 'Избегайте обхода Execution Policy. Используйте -ExecutionPolicy RemoteSigned',
            insecureStringExpansion: 'Небезопасное расширение строк. Используйте -f оператор или splatting',
            missingInputValidation: 'Входные параметры должны валидироваться перед использованием',
            avoidHardcodedCredentials: 'Избегайте hardcoded учетных данных. Используйте защищенное хранилище',
            insecureFileOperations: 'Файловые операции должны проверять разрешения и существование',
            avoidInvokeExpression: 'Invoke-Expression уязвим для инъекций. Используйте безопасные альтернативы',
            missingSecureString: 'Пароли должны использовать SecureString или PSCredential',
            avoidPlainTextPasswords: 'Избегайте хранения паролей в открытом виде',
            insecureWebRequests: 'HTTP запросы должны использовать HTTPS и проверку сертификатов',
            missingPathValidation: 'Пути должны валидироваться на безопасность и существование',
            avoidDotSourcingUntrusted: 'Избегайте dot-sourcing непроверенных скриптов',
            insecureRegistryAccess: 'Доступ к реестру должен проверять разрешения',
            avoidCodeInjection: 'Код должен быть защищен от инъекций через переменные',
            missingTlsValidation: 'Отключение TLS валидации уязвимо. Используйте [Net.ServicePointManager]::SecurityProtocol',
            insecureRandomGeneration: 'Используйте System.Security.Cryptography.RNGCryptoServiceProvider для случайных чисел',
            avoidEnvVarForSecrets: 'Избегайте хранения секретов в переменных окружения без шифрования'
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

                // Проверка обхода Execution Policy
                if (fullText.includes('-ExecutionPolicy Bypass') ||
                    fullText.includes('-ExecutionPolicy Unrestricted') ||
                    fullText.includes('-ep Bypass')) {
                    context.report({
                        node,
                        messageId: 'avoidExecutionPolicyBypass'
                    })
                }

                // Проверка Invoke-Expression
                if (fullText.includes('Invoke-Expression') || fullText.includes('iex')) {
                    context.report({
                        node,
                        messageId: 'avoidInvokeExpression'
                    })
                }

                // Проверка hardcoded паролей
                const passwordPatterns = [
                    /password\s*[:=]\s*['"][^'"]*['"]/gi,
                    /pwd\s*[:=]\s*['"][^'"]*['"]/gi,
                    /secret\s*[:=]\s*['"][^'"]*['"]/gi,
                    /token\s*[:=]\s*['"][^'"]*['"]/gi
                ]

                passwordPatterns.forEach(pattern => {
                    const matches = fullText.match(pattern)
                    if (matches) {
                        context.report({
                            node,
                            messageId: 'avoidHardcodedCredentials'
                        })
                    }
                })

                // Проверка отключения TLS валидации
                if (fullText.includes('SkipCertificateCheck') ||
                    fullText.includes('SkipHeaderValidation') ||
                    fullText.includes('-SkipCertificateCheck')) {
                    context.report({
                        node,
                        messageId: 'missingTlsValidation'
                    })
                }

                // Проверка использования Random вместо RNGCryptoServiceProvider
                if (fullText.includes('Random') && !fullText.includes('RNGCryptoServiceProvider')) {
                    const randomMatches = fullText.match(/\bRandom\b/g)
                    if (randomMatches) {
                        context.report({
                            node,
                            messageId: 'insecureRandomGeneration'
                        })
                    }
                }

                // Проверка переменных окружения для секретов
                const envSecrets = fullText.match(/\$env:[A-Z_]+/g)
                if (envSecrets) {
                    envSecrets.forEach(envVar => {
                        const varName = envVar.toLowerCase()
                        if (varName.includes('password') || varName.includes('secret') ||
                            varName.includes('token') || varName.includes('key')) {
                            context.report({
                                node,
                                messageId: 'avoidEnvVarForSecrets'
                            })
                        }
                    })
                }

                // Проверка dot-sourcing
                const dotSourceMatches = fullText.match(/\.\s+['"]?\$\w+['"]?/g)
                if (dotSourceMatches) {
                    context.report({
                        node,
                        messageId: 'avoidDotSourcingUntrusted'
                    })
                }
            },

            CallExpression(node) {
                if (node.callee && node.callee.name) {
                    const functionName = node.callee.name

                    // Проверка веб-запросов
                    if (functionName === 'Invoke-WebRequest' || functionName === 'Invoke-RestMethod') {
                        const args = node.arguments || []

                        // Проверяем использование HTTP вместо HTTPS
                        const hasHttpUrl = args.some(arg => {
                            const argText = sourceCode.getText(arg)
                            return argText.includes('http://') && !argText.includes('localhost')
                        })

                        if (hasHttpUrl) {
                            context.report({
                                node,
                                messageId: 'insecureWebRequests'
                            })
                        }
                    }

                    // Проверка операций с реестром
                    if (functionName === 'Get-ItemProperty' || functionName === 'Set-ItemProperty' ||
                        functionName === 'New-Item' || functionName === 'Remove-Item') {
                        const args = node.arguments || []
                        const hasRegistryPath = args.some(arg => {
                            const argText = sourceCode.getText(arg)
                            return argText.includes('HKLM:') || argText.includes('HKCU:') ||
                                argText.includes('Registry::')
                        })

                        if (hasRegistryPath) {
                            context.report({
                                node,
                                messageId: 'insecureRegistryAccess'
                            })
                        }
                    }

                    // Проверка операций с файлами
                    if (functionName === 'Get-Content' || functionName === 'Set-Content' ||
                        functionName === 'Add-Content' || functionName === 'Out-File') {
                        const args = node.arguments || []

                        // Проверяем, есть ли валидация пути
                        const parentFunction = findParentFunction(node)
                        if (parentFunction) {
                            const functionText = sourceCode.getText(parentFunction)
                            const hasPathValidation = functionText.includes('Test-Path') ||
                                functionText.includes('Resolve-Path') ||
                                functionText.includes('Split-Path')

                            if (!hasPathValidation) {
                                context.report({
                                    node,
                                    messageId: 'insecureFileOperations'
                                })
                            }
                        }
                    }
                }

                // Проверка строкового расширения с переменными
                const callText = sourceCode.getText(node)
                if (callText.includes('$') && (callText.includes('+') || callText.includes('='))) {
                    // Проверяем, является ли это потенциально небезопасным расширением
                    const hasVariableExpansion = callText.match(/".*\$[a-zA-Z_][a-zA-Z0-9_]*.*"/)
                    if (hasVariableExpansion) {
                        context.report({
                            node,
                            messageId: 'insecureStringExpansion'
                        })
                    }
                }
            },

            VariableDeclaration(node) {
                const declarations = node.declarations || []
                declarations.forEach(decl => {
                    if (decl.id && decl.id.name) {
                        const varName = decl.id.name.toLowerCase()

                        // Проверка переменных с паролями
                        if (varName.includes('password') || varName.includes('pwd') ||
                            varName.includes('credential')) {
                            const initText = decl.init ? sourceCode.getText(decl.init) : ''

                            if (!initText.includes('SecureString') && !initText.includes('PSCredential') &&
                                !initText.includes('Read-Host -AsSecureString')) {
                                context.report({
                                    node: decl.id,
                                    messageId: 'missingSecureString'
                                })
                            }
                        }
                    }
                })
            },

            AssignmentExpression(node) {
                // Проверка присваивания потенциально опасных значений
                if (node.left && node.left.name) {
                    const varName = node.left.name.toLowerCase()

                    if (varName.includes('password') || varName.includes('secret')) {
                        const rightText = sourceCode.getText(node.right)

                        if (rightText.includes('"') || rightText.includes("'")) {
                            context.report({
                                node,
                                messageId: 'avoidPlainTextPasswords'
                            })
                        }
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
