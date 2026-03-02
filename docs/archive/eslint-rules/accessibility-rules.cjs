/**
 * ESLint правило: accessibility-rules
 *
 * Проверяет семантическую доступность в Vue компонентах согласно WCAG 2.1 AA.
 * Согласно ADR 1023: Component Accessibility Compliance Framework
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Проверяет соответствие WCAG 2.1 AA стандартам доступности в Vue компонентах',
            category: 'Accessibility',
            recommended: true,
            url: 'docs/architecture/adr/1023-component-accessibility-compliance-framework.md'
        },
        schema: [],
        messages: {
            buttonMissingLabel: 'Button must have aria-label attribute or visible text content',
            buttonEmpty: 'Button cannot be empty - add text content or aria-label',
            tableMissingCaption: 'Table must have a caption element describing its content',
            staticStatusRole: 'role="status" should only be used for dynamic content. For static content, consider removing the role or using role="img" with aria-label.',
            invalidAriaLive: 'aria-live must be one of: "off", "polite", "assertive"',
            invalidAriaCurrent: 'aria-current must be one of: "page", "step", "location", "date", "time", true, false',
            inputMissingLabel: 'Input element must have an associated label (via id/for or aria-labelledby)',
            inputMissingId: 'Input element must have an id attribute when used with label',
            redundantAriaLabel: 'Individual aria-label on grouped elements may be redundant. Consider using aria-label on the group container instead.'
        }
    },
    create(context) {
        return {
            // Проверка кнопок на наличие доступных имен
            'VElement[name="button"]'(node) {
                // Проверяем наличие aria-label
                const hasAriaLabel = node.startTag.attributes.some(
                    attr => attr.key.name === 'aria-label' || attr.key.name === 'aria-labelledby'
                )

                // Проверяем наличие видимого текста
                const hasVisibleText = node.children.some(child => {
                    return child.type === 'VText' && child.value.trim().length > 0
                })

                // Проверяем слоты
                const hasSlots = node.children.some(child => {
                    return child.type === 'VElement' && child.name === 'slot'
                })

                if (!hasAriaLabel && !hasVisibleText && !hasSlots) {
                    context.report({
                        node,
                        messageId: 'buttonMissingLabel',
                    })
                }
            },

            // Проверка таблиц на наличие caption
            'VElement[name="table"]'(node) {
                const hasCaption = node.children.some(child => {
                    return child.type === 'VElement' && child.name === 'caption'
                })

                if (!hasCaption) {
                    context.report({
                        node,
                        messageId: 'tableMissingCaption',
                    })
                }
            },

            // Проверка role="status" для статического контента
            'VAttribute[key.name="role"]'(node) {
                if (node.value && node.value.value === 'status') {
                    // Проверяем, есть ли динамические директивы (v-if, v-show)
                    const element = node.parent.parent
                    const hasDynamicDirectives = element.startTag.attributes.some(attr => {
                        return ['v-if', 'v-show', 'v-for'].includes(attr.key.name)
                    })

                    // Если нет динамических директив, это вероятно статический контент
                    if (!hasDynamicDirectives) {
                        context.report({
                            node,
                            messageId: 'staticStatusRole',
                        })
                    }
                }
            },

            // Проверка корректных значений ARIA атрибутов
            'VAttribute[key.name="aria-live"]'(node) {
                const validValues = ['off', 'polite', 'assertive']
                if (node.value && node.value.value && !validValues.includes(node.value.value)) {
                    context.report({
                        node,
                        messageId: 'invalidAriaLive',
                    })
                }
            },

            'VAttribute[key.name="aria-current"]'(node) {
                const validValues = ['page', 'step', 'location', 'date', 'time', 'true', 'false']
                if (node.value && node.value.value && !validValues.includes(node.value.value)) {
                    context.report({
                        node,
                        messageId: 'invalidAriaCurrent',
                    })
                }
            },

            // Проверка input элементов на связанные label
            'VElement[name="input"]'(node) {
                const hasId = node.startTag.attributes.some(attr => attr.key.name === 'id')
                const hasAriaLabelledBy = node.startTag.attributes.some(
                    attr => attr.key.name === 'aria-labelledby'
                )
                const hasAriaLabel = node.startTag.attributes.some(
                    attr => attr.key.name === 'aria-label'
                )

                // Проверяем тип input - скрытые inputs могут не нуждаться в label
                const typeAttr = node.startTag.attributes.find(attr => attr.key.name === 'type')
                const inputType = typeAttr ? typeAttr.value.value : 'text'

                if (inputType === 'hidden') {
                    return // Скрытые inputs не нуждаются в label
                }

                if (!hasId && !hasAriaLabelledBy && !hasAriaLabel) {
                    context.report({
                        node,
                        messageId: 'inputMissingId',
                    })
                }
            },

            // Проверка label элементов
            'VElement[name="label"]'(node) {
                const hasFor = node.startTag.attributes.some(attr => attr.key.name === 'for')

                if (!hasFor) {
                    // Label должен содержать input или иметь for атрибут
                    const hasInputChild = node.children.some(child => {
                        return child.type === 'VElement' && child.name === 'input'
                    })

                    if (!hasInputChild) {
                        context.report({
                            node,
                            messageId: 'inputMissingLabel',
                        })
                    }
                }
            },

            // Проверка избыточных aria-label в группах элементов
            'VAttribute[key.name="aria-label"]'(node) {
                // Проверяем, находится ли элемент внутри группы с role="group"
                let parent = node.parent.parent
                let isInGroup = false

                while (parent && parent.type === 'VElement') {
                    const hasGroupRole = parent.startTag.attributes.some(attr => {
                        return attr.key.name === 'role' && attr.value && attr.value.value === 'group'
                    })

                    if (hasGroupRole) {
                        isInGroup = true
                        break
                    }

                    parent = parent.parent
                }

                if (isInGroup) {
                    context.report({
                        node,
                        messageId: 'redundantAriaLabel',
                    })
                }
            }
        }
    }
}
