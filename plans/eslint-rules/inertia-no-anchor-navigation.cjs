/**
 * ESLint правило: inertia/no-anchor-navigation
 *
 * Запрещает использование <a href> для внутренних Inertia.js маршрутов.
 * Требует использования <Link> компонента для SPA навигации.
 *
 * @see ADR 508: Стратегия навигации в Inertia.js приложении
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Запрещает использование <a> для внутренних маршрутов Inertia.js',
      category: 'Best Practices',
      recommended: true
    },
    fixable: null,
    schema: [],
    messages: {
      noAnchorNavigation: 'Используйте <Link> вместо <a> для внутренних маршрутов Inertia.js. Для внешних ссылок добавьте external prop.',
      missingRel: 'Ссылки с target="_blank" должны иметь rel="noopener noreferrer"'
    }
  },

  create(context) {
    return {
      // Ищем <a> теги в шаблонах Vue
      'VElement[name=a]'(node) {
        // Проверяем атрибуты
        const hrefAttr = node.startTag.attributes.find(
          attr => attr.key.name === 'href' || attr.key.rawName === 'href'
        )

        if (!hrefAttr || !hrefAttr.value) {
          return // Нет href атрибута
        }

        const hrefValue = hrefAttr.value.value || hrefAttr.value.raw

        // Разрешенные случаи (не требуют Link)
        if (isAllowedAnchor(hrefValue)) {
          return
        }

        // Проверяем, есть ли target="_blank"
        const targetAttr = node.startTag.attributes.find(
          attr => attr.key.name === 'target' || attr.key.rawName === 'target'
        )

        if (targetAttr && (targetAttr.value.value === '_blank' || targetAttr.value.raw === '_blank')) {
          // target="_blank" разрешен, но должен иметь rel="noopener noreferrer"
          const relAttr = node.startTag.attributes.find(
            attr => attr.key.name === 'rel' || attr.key.rawName === 'rel'
          )

          if (!relAttr || !relAttr.value) {
            context.report({
              node: node.startTag,
              messageId: 'missingRel'
            })
            return
          }

          const relValue = relAttr.value.value || relAttr.value.raw || ''
          if (!relValue.includes('noopener') || !relValue.includes('noreferrer')) {
            context.report({
              node: node.startTag,
              messageId: 'missingRel'
            })
          }
          return
        }

        // Это внутренний маршрут - требует Link
        context.report({
          node: node.startTag,
          messageId: 'noAnchorNavigation'
        })
      }
    }
  }
}

/**
 * Определяет, разрешен ли <a> для данного href значения
 */
function isAllowedAnchor(hrefValue) {
  // Внешние ссылки
  if (hrefValue.startsWith('http://') || hrefValue.startsWith('https://')) {
    return true
  }

  // Специальные протоколы
  if (hrefValue.startsWith('mailto:') ||
      hrefValue.startsWith('tel:') ||
      hrefValue.startsWith('sms:')) {
    return true
  }

  // Якорные ссылки
  if (hrefValue.startsWith('#')) {
    return true
  }

  // Blob и data URLs
  if (hrefValue.startsWith('blob:') || hrefValue.startsWith('data:')) {
    return true
  }

  // JavaScript (хотя и не рекомендуется)
  if (hrefValue.startsWith('javascript:')) {
    return true
  }

  return false
}
