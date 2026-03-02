/**
 * ESLint правило: component-styling-standards
 *
 * Проверяет соблюдение стандартов стилизации компонентов.
 * Запрещает BEM, scoped styles и @apply - разрешает только Tailwind utility classes.
 *
 * Согласно архитектурным стандартам проекта.
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверяет соблюдение стандартов стилизации: только Tailwind utility classes',
            category: 'Best Practices',
            recommended: true
        },
        schema: [],
        messages: {
            noScopedStyles: 'Запрещено использовать <style scoped>. Используйте только Tailwind utility classes.',
            noBemClasses: 'Запрещено использовать BEM классы. Используйте только Tailwind utility classes.',
            noApplyDirective: 'Запрещено использовать @apply. Используйте только Tailwind utility classes в class атрибуте.',
            noCustomCss: 'Запрещено использовать пользовательские CSS классы. Используйте только Tailwind utility classes.',
            noStyleTag: 'Запрещено использовать <style> теги. Все стили должны быть через Tailwind utility classes.',
            missingResponsiveClasses: 'Отсутствуют responsive классы для всех экранов. Добавьте классы для sm:, md:, lg:, xl:, 2xl:',
            colorWithoutDarkMode: 'Цвет {{color}} используется без соответствующего dark: варианта. Добавьте dark:{{color}} или dark:bg-{{color}}.',
            textColorWithoutDarkMode: 'Цвет текста {{color}} используется без соответствующего dark: варианта. Добавьте dark:text-{{color}}.',
            bgColorWithoutDarkMode: 'Фоновый цвет {{color}} используется без соответствующего dark: варианта. Добавьте dark:bg-{{color}}.',
            borderColorWithoutDarkMode: 'Цвет границы {{color}} используется без соответствующего dark: варианта. Добавьте dark:border-{{color}}.',
            noCssVariables: 'Запрещено использовать CSS переменные (var()) в class атрибутах. Используйте только Tailwind utility classes.'
        }
    },
    create(context) {
        const sourceCode = context.sourceCode
        const filename = context.getFilename()

        // Проверяем типы файлов
        const isVueFile = filename.endsWith('.vue')
        const isCssFile = /\.(css|scss|sass)$/.test(filename)

        return {
            // Проверяем class атрибуты на responsive и dark mode
            'VAttribute[key.name="class"]'(node) {
                if (!isVueFile) return

                const classValue = getClassValue(node)
                if (!classValue) return

                // Проверяем на CSS переменные
                checkCssVariables(context, node, classValue)

                const classes = parseTailwindClasses(classValue)

                // Проверяем responsive классы
                checkResponsiveClasses(context, node, classes)

                // Проверяем dark mode для цветов
                checkDarkModeColors(context, node, classes)
            },

            // Проверяем class атрибуты в HTML
            'HTMLAttribute[key.value="class"]'(node) {
                const classValue = getClassValue(node)
                if (!classValue) return

                // Проверяем на CSS переменные
                checkCssVariables(context, node, classValue)

                const classes = parseTailwindClasses(classValue)

                // Проверяем responsive классы
                checkResponsiveClasses(context, node, classes)

                // Проверяем dark mode для цветов
                checkDarkModeColors(context, node, classes)
            },

            // Проверяем обычные атрибуты class в JSX/HTML
            'JSXAttribute[name.name="className"]'(node) {
                const classValue = getClassValue(node)
                if (!classValue) return

                // Проверяем на CSS переменные
                checkCssVariables(context, node, classValue)

                const classes = parseTailwindClasses(classValue)

                // Проверяем responsive классы
                checkResponsiveClasses(context, node, classes)

                // Проверяем dark mode для цветов
                checkDarkModeColors(context, node, classes)
            },
            // Проверяем <style> теги (только в Vue файлах)
            'VElement[name="style"]'(node) {
                if (!isVueFile) return

                const hasScoped = node.startTag.attributes.some(attr =>
                    attr.key.name === 'scoped'
                )

                if (hasScoped) {
                    context.report({
                        node,
                        messageId: 'noScopedStyles'
                    })
                } else {
                    context.report({
                        node,
                        messageId: 'noStyleTag'
                    })
                }
            },

            // Проверяем содержимое файла на паттерны
            Program(node) {

                const sourceText = sourceCode.getText()

                // Проверяем на BEM классы
                const bemRegex = /\b\w+(__)\w+\b/g
                let match
                const processedIndexes = new Set()

                while ((match = bemRegex.exec(sourceText)) !== null) {
                    if (!processedIndexes.has(match.index)) {
                        processedIndexes.add(match.index)
                        const loc = sourceCode.getLocFromIndex(match.index)

                        context.report({
                            loc: {
                                start: loc,
                                end: sourceCode.getLocFromIndex(match.index + match[0].length)
                            },
                            messageId: 'noBemClasses'
                        })
                    }
                }

                // Проверяем на @apply
                const applyRegex = /@apply\s+[^;]+;/g
                const applyProcessedIndexes = new Set()
                while ((match = applyRegex.exec(sourceText)) !== null) {
                    if (!applyProcessedIndexes.has(match.index)) {
                        applyProcessedIndexes.add(match.index)
                        const loc = sourceCode.getLocFromIndex(match.index)

                        context.report({
                            loc: {
                                start: loc,
                                end: sourceCode.getLocFromIndex(match.index + match[0].length)
                            },
                            messageId: 'noApplyDirective'
                        })
                    }
                }

                // Проверяем на <style scoped>
                const scopedRegex = /<style[^>]*scoped[^>]*>/g
                const scopedProcessedIndexes = new Set()
                while ((match = scopedRegex.exec(sourceText)) !== null) {
                    if (!scopedProcessedIndexes.has(match.index)) {
                        scopedProcessedIndexes.add(match.index)
                        const loc = sourceCode.getLocFromIndex(match.index)

                        context.report({
                            loc: {
                                start: loc,
                                end: sourceCode.getLocFromIndex(match.index + match[0].length)
                            },
                            messageId: 'noScopedStyles'
                        })
                    }
                }

                // Проверяем на <style> без scoped
                const styleRegex = /<style(?![^>]*scoped)[^>]*>/g
                const styleProcessedIndexes = new Set()
                while ((match = styleRegex.exec(sourceText)) !== null) {
                    if (!styleProcessedIndexes.has(match.index)) {
                        styleProcessedIndexes.add(match.index)
                        const loc = sourceCode.getLocFromIndex(match.index)

                        context.report({
                            loc: {
                                start: loc,
                                end: sourceCode.getLocFromIndex(match.index + match[0].length)
                            },
                            messageId: 'noStyleTag'
                        })
                    }
                }
            },

            // Проверяем @apply директивы в CSS файлах
            AtRule(node) {
                if (node.name === 'apply') {
                    context.report({
                        node,
                        messageId: 'noApplyDirective'
                    })
                }
            },

        }
    }
}

/**
 * Проверяет, является ли класс Tailwind utility class
 * Это упрощенная проверка основных паттернов Tailwind
 */
function isTailwindUtilityClass(className) {
    // Убираем модификаторы responsive (sm:, md:, lg:, xl:, 2xl:)
    const withoutResponsive = className.replace(/^(sm|md|lg|xl|2xl):/, '')

    // Убираем модификаторы состояния (hover:, focus:, active:, etc.)
    const withoutState = withoutResponsive.replace(/^(hover|focus|active|visited|disabled|first|last|odd|even|focus-within|focus-visible|checked|invalid|required|optional|valid|in-range|out-of-range|placeholder-shown|autofill|read-only|empty|target|before|after|first-letter|first-line|marker|selection|backdrop|placeholder|file|open|default|checked|indeterminate|required|valid|invalid|in-range|out-of-range|read-only|read-write):/, '')

    // Убираем модификаторы dark mode (dark:)
    const cleanClass = withoutState.replace(/^dark:/, '')

    // Проверяем на известные Tailwind паттерны
    const tailwindPatterns = [
        // Layout
        /^flex$/,
        /^block$/,
        /^inline$/,
        /^inline-block$/,
        /^hidden$/,
        /^grid$/,
        /^inline-grid$/,
        /^flow-root$/,
        /^table$/,
        /^table-row$/,
        /^table-cell$/,
        /^contents$/,
        /^list-item$/,

        // Positioning
        /^static$/,
        /^fixed$/,
        /^absolute$/,
        /^relative$/,
        /^sticky$/,

        // Spacing (margin, padding)
        /^m[xytblr]?-\d+$/,
        /^p[xytblr]?-\d+$/,
        /^-m[xytblr]?-\d+$/,
        /^-p[xytblr]?-\d+$/,
        /^space-[xy]-\d+$/,
        /^-space-[xy]-\d+$/,

        // Sizing
        /^w-\d+$/,
        /^h-\d+$/,
        /^max-w-\w+$/,
        /^max-h-\w+$/,
        /^min-w-\w+$/,
        /^min-h-\w+$/,

        // Typography
        /^text-\w+$/,
        /^font-\w+$/,
        /^leading-\w+$/,
        /^tracking-\w+$/,
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,

        // Colors
        /^bg-\w+$/,
        /^text-\w+$/,
        /^border-\w+$/,

        // Borders
        /^border$/,
        /^border-\d+$/,
        /^rounded$/,
        /^rounded-\w+$/,

        // Effects
        /^shadow$/,
        /^shadow-\w+$/,
        /^opacity-\d+$/,

        // Interactivity
        /^cursor-\w+$/,
        /^pointer-events-\w+$/,

        // Flexbox
        /^flex$/,
        /^flex-\d+$/,
        /^flex-\w+$/,
        /^justify-\w+$/,
        /^items-\w+$/,
        /^self-\w+$/,

        // Grid
        /^grid-cols-\d+$/,
        /^col-span-\d+$/,
        /^row-span-\d+$/,

        // Transforms
        /^transform$/,
        /^translate-\w+$/,
        /^scale-\w+$/,
        /^rotate-\w+$/,

        // Transitions
        /^transition$/,
        /^duration-\d+$/,
        /^ease-\w+$/,

        // Animations
        /^animate-\w+$/,

        // Accessibility
        /^sr-only$/,
        /^not-sr-only$/,

        // Responsive utilities
        /^container$/,
        /^aspect-\w+$/
    ]

    return tailwindPatterns.some(pattern => pattern.test(cleanClass))
}

/**
 * Извлекает значение class атрибута
 */
function getClassValue(node) {
    if (node.value && node.value.value) {
        return node.value.value
    }
    if (node.value && node.value.expression && node.value.expression.value) {
        return node.value.expression.value
    }
    return null
}

/**
 * Парсит Tailwind классы из строки
 */
function parseTailwindClasses(classString) {
    if (!classString || typeof classString !== 'string') return []

    return classString
        .split(/\s+/)
        .map(cls => cls.trim())
        .filter(cls => cls.length > 0)
}

/**
 * Проверяет наличие responsive классов для всех экранов
 */
function checkResponsiveClasses(context, node, classes) {
    // Находим базовые классы без responsive префиксов
    const baseClasses = classes.filter(cls => !/^(sm|md|lg|xl|2xl):/.test(cls))

    // Группируем responsive классы по размерам экранов
    const responsiveClasses = {
        sm: classes.filter(cls => cls.startsWith('sm:')),
        md: classes.filter(cls => cls.startsWith('md:')),
        lg: classes.filter(cls => cls.startsWith('lg:')),
        xl: classes.filter(cls => cls.startsWith('xl:')),
        '2xl': classes.filter(cls => cls.startsWith('2xl:'))
    }

    // Проверяем важные базовые классы на наличие responsive версий
    const importantClasses = baseClasses.filter(cls =>
        // Layout классы
        /^(flex|grid|block|hidden|inline|inline-block)$/.test(cls) ||
        // Spacing классы
        /^(m|p)[xytrbl]?-\d+$/.test(cls) ||
        // Sizing классы
        /^(w|h)-\d+$/.test(cls) ||
        // Typography классы
        /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/.test(cls) ||
        // Color классы
        /^(bg|text|border)-(white|black|gray|red|blue|green|yellow|purple|pink|indigo)$/.test(cls)
    )

    // Если есть важные базовые классы, проверяем наличие responsive версий
    if (importantClasses.length > 0) {
        const missingBreakpoints = []

        if (responsiveClasses.sm.length === 0) missingBreakpoints.push('sm')
        if (responsiveClasses.md.length === 0) missingBreakpoints.push('md')
        if (responsiveClasses.lg.length === 0) missingBreakpoints.push('lg')
        if (responsiveClasses.xl.length === 0) missingBreakpoints.push('xl')
        if (responsiveClasses['2xl'].length === 0) missingBreakpoints.push('2xl')

        if (missingBreakpoints.length > 0) {
            context.report({
                node,
                messageId: 'missingResponsiveClasses',
                data: {
                    missing: missingBreakpoints.join(', ')
                }
            })
        }
    }
}

/**
 * Проверяет использование CSS переменных
 */
function checkCssVariables(context, node, classValue) {
    // Проверяем на наличие var() в значении class
    if (classValue.includes('var(')) {
        context.report({
            node,
            messageId: 'noCssVariables'
        })
    }
}

/**
 * Проверяет наличие dark mode стилей для цветов
 */
function checkDarkModeColors(context, node, classes) {
    // Находим все цветовые классы
    const colorClasses = classes.filter(cls => {
        const withoutModifiers = cls.replace(/^(sm|md|lg|xl|2xl|hover|focus|active|dark):/, '')
        return /^(bg|text|border)-(white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+$/.test(withoutModifiers) ||
            /^(bg|text|border)-(white|black)$/.test(withoutModifiers)
    })

    // Группируем по типу цвета
    const colorGroups = {
        bg: colorClasses.filter(cls => cls.includes('bg-')),
        text: colorClasses.filter(cls => cls.includes('text-')),
        border: colorClasses.filter(cls => cls.includes('border-'))
    }

    // Проверяем каждый тип цвета
    Object.entries(colorGroups).forEach(([type, colorClasses]) => {
        const lightColors = colorClasses.filter(cls => !cls.includes('dark:'))
        const darkColors = colorClasses.filter(cls => cls.includes('dark:'))

        lightColors.forEach(lightClass => {
            // Извлекаем цвет из класса (без responsive префиксов)
            const cleanClass = lightClass.replace(/^(sm|md|lg|xl|2xl):/, '')
            const colorMatch = cleanClass.match(new RegExp(`${type}-([a-z]+(?:-\\d+)?)$`))
            if (colorMatch) {
                const color = colorMatch[1]
                const expectedDarkClass = `dark:${type}-${color}`

                // Проверяем, есть ли соответствующий dark класс
                const hasDarkVariant = darkColors.some(darkClass =>
                    darkClass === expectedDarkClass ||
                    darkClass === `dark:${cleanClass}`
                )

                if (!hasDarkVariant) {
                    const messageId = type === 'text' ? 'textColorWithoutDarkMode' :
                        type === 'bg' ? 'bgColorWithoutDarkMode' :
                            'borderColorWithoutDarkMode'

                    context.report({
                        node,
                        messageId,
                        data: {
                            color: cleanClass
                        }
                    })
                }
            }
        })
    })
}
