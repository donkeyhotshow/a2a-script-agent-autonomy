/**
 * ESLint правило: base-components-usage
 *
 * Запрещает использование HTML элементов форм вместо соответствующих Base* компонентов
 * из дизайн-системы согласно ADR 1036: Component Refactoring Standards.
 *
 * Запрещенные элементы:
 * - input (кроме type="hidden") → BaseInput, BasePasswordInput, BaseCheckbox
 * - select → BaseSelect
 * - textarea → BaseTextarea
 * - button → BaseButton
 * - input type="radio" → BaseRadioGroup
 */

module.exports = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Запрещает использование HTML элементов форм вместо Base* компонентов дизайн-системы',
            category: 'Best Practices',
            recommended: true,
            url: 'docs/architecture/adr/1036-component-refactoring-standards.md'
        },
        schema: [],
        messages: {
            noHtmlInput: 'Используйте BaseInput вместо <input> элемента',
            noHtmlPasswordInput: 'Используйте BasePasswordInput вместо <input type="password">',
            noHtmlCheckbox: 'Используйте BaseCheckbox вместо <input type="checkbox">',
            noHtmlRadio: 'Используйте BaseRadioGroup вместо <input type="radio">',
            noHtmlSelect: 'Используйте BaseSelect вместо <select> элемента',
            noHtmlTextarea: 'Используйте BaseTextarea вместо <textarea> элемента',
            noHtmlButton: 'Используйте BaseButton вместо <button> элемента'
        }
    },
    create(context) {
        // Проверяем, находимся ли мы в Base* компоненте (исключаем из проверки)
        const filename = context.filename || '';
        const isInBaseComponent = /\/Base[A-Z]\w*\.vue$/.test(filename);

        // Если мы в Base* компоненте, не применяем правило
        if (isInBaseComponent) {
            return {};
        }

        return {
            // Проверяем все VElement узлы
            VElement(node) {
                const tagName = node.name;

                if (tagName === 'input') {
                    const typeAttr = node.startTag.attributes.find(
                        attr => attr.key && attr.key.name === 'type'
                    );

                    const typeValue = typeAttr?.value?.value || 'text';

                    // Игнорируем hidden inputs (они могут быть нужны для форм)
                    if (typeValue === 'hidden') {
                        return;
                    }

                    let messageId;
                    switch (typeValue) {
                        case 'password':
                            messageId = 'noHtmlPasswordInput';
                            break;
                        case 'checkbox':
                            messageId = 'noHtmlCheckbox';
                            break;
                        case 'radio':
                            messageId = 'noHtmlRadio';
                            break;
                        default:
                            messageId = 'noHtmlInput';
                    }

                    context.report({
                        node,
                        messageId
                    });
                } else if (tagName === 'select') {
                    context.report({
                        node,
                        messageId: 'noHtmlSelect'
                    });
                } else if (tagName === 'textarea') {
                    context.report({
                        node,
                        messageId: 'noHtmlTextarea'
                    });
                } else if (tagName === 'button') {
                    context.report({
                        node,
                        messageId: 'noHtmlButton'
                    });
                }
            }
        };
    }
};
