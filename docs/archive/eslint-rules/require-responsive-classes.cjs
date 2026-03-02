/**
 * ESLint правило: require-responsive-classes
 *
 * Анализирует классы элементов и проверяет:
 * - Наличие классов для всех экранов (sm, md, lg, xl, 2xl)
 * - Наличие dark mode вариантов для светлой темы
 * - Достаточность стилизации (фон, рамка, тень, цвет шрифта)
 */

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Проверяет полноту responsive и dark mode классов для элементов',
            category: 'Best Practices',
            recommended: true
        },
        schema: [],
        messages: {
            missingResponsive: 'Отсутствуют responsive классы для экранов: {{screens}}. Рекомендуется добавить варианты для всех breakpoints',
            missingDarkMode: 'Класс {{className}} не имеет dark mode варианта. Добавьте dark:{{suggestion}}',
            insufficientStyling: 'Элемент недостаточно стилизован. Отсутствуют: {{missing}}. Рекомендуется добавить для полноты дизайна'
        }
    },
    create(context) {
        const filename = context.getFilename()
        if (!filename.endsWith('.vue')) return {}

        return {
            'VAttribute[key.name="class"]'(node) {
                analyzeClasses(context, node)
            },
            'JSXAttribute[name.name="className"]'(node) {
                analyzeClasses(context, node)
            }
        }
    }
}

function analyzeClasses(context, node) {
    const classValue = getClassValue(node)
    if (!classValue) return

    const classes = classValue.split(/\s+/).filter(Boolean)

    // Проверка responsive классов
    checkResponsiveCompleteness(context, node, classes)

    // Проверка dark mode
    checkDarkModeCompleteness(context, node, classes)

    // Проверка достаточности стилизации
    checkStylingCompleteness(context, node, classes)
}

function checkResponsiveCompleteness(context, node, classes) {
    const breakpoints = ['sm', 'md', 'lg', 'xl', '2xl']
    const responsiveClasses = {
        sm: classes.filter(c => c.startsWith('sm:')),
        md: classes.filter(c => c.startsWith('md:')),
        lg: classes.filter(c => c.startsWith('lg:')),
        xl: classes.filter(c => c.startsWith('xl:')),
        '2xl': classes.filter(c => c.startsWith('2xl:'))
    }

    // Проверяем важные базовые классы
    const hasImportantClasses = classes.some(c =>
        /^(flex|grid|block|hidden|w-|h-|text-|p-|m-|space-)/.test(c) &&
        !/^(sm|md|lg|xl|2xl|dark|hover|focus):/.test(c)
    )

    if (hasImportantClasses) {
        const missingScreens = breakpoints.filter(bp => responsiveClasses[bp].length === 0)

        // Только если отсутствуют большинство breakpoints
        if (missingScreens.length >= 4) {
            context.report({
                node,
                messageId: 'missingResponsive',
                data: {screens: missingScreens.join(', ')}
            })
        }
    }
}

function checkDarkModeCompleteness(context, node, classes) {
    const colorClasses = classes.filter(c => {
        const clean = c.replace(/^(sm|md|lg|xl|2xl|hover|focus):/, '')
        return /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-?(\d+|50|100|200|300|400|500|600|700|800|900|950)?$/.test(clean) ||
            /^(bg|text|border)-(white|black)$/.test(clean)
    })

    const darkClasses = classes.filter(c => c.includes('dark:'))

    // Пропускаем CSS переменные
    const nonVarColorClasses = colorClasses.filter(c => !c.includes('[var('))

    nonVarColorClasses.forEach(cls => {
        if (cls.includes('dark:')) return

        const type = cls.match(/^(bg|text|border)-/)?.[1]
        if (!type) return

        const color = cls.replace(/^(bg|text|border)-/, '')
        const expectedDark = `dark:${type}-${color}`

        if (!darkClasses.some(d => d === expectedDark || d.includes(`dark:${cls}`))) {
            context.report({
                node,
                messageId: 'missingDarkMode',
                data: {
                    className: cls,
                    suggestion: `${type}-${color}`
                }
            })
        }
    })
}

function checkStylingCompleteness(context, node, classes) {
    const hasBackground = classes.some(c => /^(bg-|dark:bg-)/.test(c) && !c.includes('transparent'))
    const hasBorder = classes.some(c => /^(border|rounded|dark:border)/.test(c))
    const hasShadow = classes.some(c => /^shadow/.test(c))
    const hasTextColor = classes.some(c => /^(text-|dark:text-)/.test(c))
    const hasPadding = classes.some(c => /^p[xytblr]?-/.test(c))

    const missing = []

    // Эвристика: если есть фон, вероятно нужны padding
    if (hasBackground && !hasPadding) {
        missing.push('padding (p-*)')
    }

    // Если есть border, возможно нужна тень для глубины
    if (hasBorder && !hasShadow && hasBackground) {
        missing.push('тень (shadow-*) для визуальной глубины')
    }

    // Только если есть несколько проблем
    if (missing.length >= 2) {
        context.report({
            node,
            messageId: 'insufficientStyling',
            data: {missing: missing.join(', ')}
        })
    }
}

function getClassValue(node) {
    if (node.value?.value) return node.value.value
    if (node.value?.expression?.value) return node.value.expression.value
    return null
}
