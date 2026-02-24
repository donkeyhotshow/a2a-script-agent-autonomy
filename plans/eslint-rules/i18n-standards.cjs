/**
 * ESLint правило: i18n-standards
 *
 * Проверяет использование i18n для локализации согласно ADR 1036.
 * Требует использования $t() для всех пользовательских строк в шаблонах Vue.
 *
 * Согласно ADR 1036: Component Refactoring Standards (пункт 6 - Локализация)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Требует использования i18n для всех пользовательских строк в Vue компонентах',
      category: 'Best Practices',
      recommended: true,
      url: 'docs/architecture/adr/1036-component-refactoring-standards.md'
    },
    schema: [],
    messages: {
      hardcodedUserString: 'Пользовательская строка "{{text}}" должна использовать i18n. Замените на $t(\'key\').',
      hardcodedAriaLabel: 'aria-label должен использовать i18n: $t(\'key\')',
      hardcodedTitle: 'title атрибут должен использовать i18n: $t(\'key\')',
      hardcodedPlaceholder: 'placeholder должен использовать i18n: $t(\'key\')',
      hardcodedAlt: 'alt атрибут должен использовать i18n: $t(\'key\')',
      hardcodedButtonText: 'Текст кнопки должен использовать i18n: $t(\'key\')',
      hardcodedLinkText: 'Текст ссылки должен использовать i18n: $t(\'key\')'
    }
  },
  create(context) {
    // Список атрибутов, которые должны использовать i18n
    const i18nRequiredAttributes = [
      'aria-label', 'aria-labelledby', 'title', 'placeholder', 'alt'
    ]

    // Функция для проверки, является ли строка пользовательским текстом
    function isUserFacingText(text) {
      if (typeof text !== 'string' || text.length < 2) return false

      // Игнорируем если уже использует i18n
      if (text.includes('$t(') || text.includes('i18n')) return false

      // Игнорируем технические строки
      if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(text)) return false // CSS классы, ID
      if (/^\d+$/.test(text)) return false // Числа
      if (/^#[a-fA-F0-9]{3,6}$/.test(text)) return false // Цвета
      if (/^https?:\/\//.test(text)) return false // URLs
      if (/^data:/.test(text)) return false // Data URLs
      if (/^\w+@\w+\.\w+$/.test(text)) return false // Email
      if (/^\+?[\d\s\-\(\)]+$/.test(text)) return false // Телефоны

      // Проверяем на кириллицу или слова на английском
      return /[а-яё]/i.test(text) || /\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|has|have|had|will|would|can|could|should|may|might|must|do|does|did|make|made|get|got|take|took|see|saw|come|came|go|went|know|knew|think|thought|say|said|tell|told|work|worked|help|helped|need|needed|want|wanted|use|used|find|found|give|gave|take|took|put|put|look|looked|ask|asked|try|tried|call|called|start|started|run|ran|move|moved|play|played|live|lived|believe|believed|bring|brought|build|built|buy|bought|catch|caught|choose|chose|come|came|cost|cost|cut|cut|do|did|draw|drew|drink|drank|drive|drove|eat|ate|fall|fell|feel|felt|fight|fought|find|found|fly|flew|forget|forgot|get|got|give|gave|go|went|grow|grew|hang|hung|have|had|hear|heard|hide|hid|hit|hit|hold|held|hurt|hurt|keep|kept|know|knew|lay|laid|lead|led|learn|learned|leave|left|lend|lent|let|let|lie|lay|light|lit|lose|lost|make|made|mean|meant|meet|met|pay|paid|put|put|quit|quit|read|read|ride|rode|ring|rung|rise|rose|run|ran|say|said|see|saw|seek|sought|sell|sold|send|sent|set|set|shake|shook|shine|shone|shoot|shot|show|showed|shut|shut|sing|sang|sink|sank|sit|sat|sleep|slept|slide|slid|speak|spoke|spend|spent|spin|spun|spread|spread|stand|stood|steal|stole|stick|stuck|strike|struck|string|strung|swim|swam|swing|swung|take|took|teach|taught|tear|tore|tell|told|think|thought|throw|threw|understand|understood|wake|woke|wear|wore|win|won|write|wrote)\b/i.test(text)
    }

    return {
      // Проверяем текстовые узлы в шаблонах Vue
      VText(node) {
        const text = node.value.trim()
        if (isUserFacingText(text)) {
          context.report({
            node,
            messageId: 'hardcodedUserString',
            data: { text: text.length > 30 ? text.substring(0, 30) + '...' : text }
          })
        }
      },

      // Проверяем атрибуты, которые должны использовать i18n
      VAttribute(node) {
        if (i18nRequiredAttributes.includes(node.key.name) && node.value) {
          const value = node.value.value || node.value.raw
          if (isUserFacingText(value)) {
            const messageId = node.key.name === 'aria-label' ? 'hardcodedAriaLabel' :
                             node.key.name === 'title' ? 'hardcodedTitle' :
                             node.key.name === 'placeholder' ? 'hardcodedPlaceholder' :
                             'hardcodedAlt'

            context.report({
              node: node.value,
              messageId
            })
          }
        }
      },

      // Специальная проверка для кнопок
      'VElement[name="button"]'(node) {
        // Проверяем текстовое содержимое кнопки
        const textContent = node.children
          .filter(child => child.type === 'VText')
          .map(child => child.value.trim())
          .join('')
          .trim()

        if (isUserFacingText(textContent)) {
          context.report({
            node: node.children.find(child => child.type === 'VText'),
            messageId: 'hardcodedButtonText'
          })
        }
      },

      // Специальная проверка для ссылок
      'VElement[name="a"]'(node) {
        // Проверяем текстовое содержимое ссылки
        const textContent = node.children
          .filter(child => child.type === 'VText')
          .map(child => child.value.trim())
          .join('')
          .trim()

        if (isUserFacingText(textContent)) {
          context.report({
            node: node.children.find(child => child.type === 'VText'),
            messageId: 'hardcodedLinkText'
          })
        }
      }
    }
  }
}
