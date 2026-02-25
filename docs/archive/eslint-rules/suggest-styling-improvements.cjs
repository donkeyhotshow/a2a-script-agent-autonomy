/**
 * ESLint правило: suggest-styling-improvements (ЭКСПЕРИМЕНТАЛЬНОЕ)
 *
 * Экспериментально определяет потребность в указании дополнительных классов:
 * - Анализирует контекст элемента (тип, родитель, соседи)
 * - Предлагает улучшения на основе паттернов UI
 * - Определяет недостающие стили для типичных компонентов
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Экспериментально предлагает улучшения стилизации на основе контекста элемента',
      category: 'Best Practices',
      recommended: false
    },
    schema: [],
    messages: {
      suggestBackground: 'Элемент {{tag}} обычно имеет фон. Рекомендуется добавить bg-* класс',
      suggestBorder: 'Элемент {{tag}} типа {{type}} обычно имеет границу. Рекомендуется добавить border и rounded-* классы',
      suggestShadow: 'Карточка или контейнер обычно имеет тень. Рекомендуется добавить shadow-* класс',
      suggestPadding: 'Контейнер с фоном должен иметь padding. Добавьте p-* классы',
      suggestTextColor: 'Элемент с фоном должен иметь явный цвет текста. Добавьте text-* класс',
      suggestHoverState: 'Интерактивный элемент должен иметь hover состояние. Добавьте hover:* классы',
      suggestFocusState: 'Интерактивный элемент должен иметь focus состояние для доступности. Добавьте focus:* классы',
      suggestTransition: 'Элемент с hover/focus состояниями должен иметь transition. Добавьте transition-* класс',
      suggestSpacing: 'Контейнер с несколькими дочерними элементами должен иметь gap или space. Добавьте gap-* или space-* классы',
      suggestAlignment: 'Flex/Grid контейнер должен иметь выравнивание. Добавьте justify-* и items-* классы',
      suggestResponsiveText: 'Заголовок должен иметь responsive размеры текста. Добавьте sm:text-*, md:text-* классы',
      suggestAccessibility: 'Интерактивный элемент должен иметь cursor-pointer для UX',
      suggestContrast: 'Комбинация фона {{bg}} и текста {{text}} может иметь низкий контраст. Проверьте доступность'
    }
  },
  create(context) {
    const filename = context.getFilename()
    if (!filename.endsWith('.vue')) return {}

    return {
      'VElement'(node) {
        analyzeElement(context, node)
      }
    }
  }
}

function analyzeElement(context, node) {
  const tag = node.name
  const classAttr = node.startTag.attributes.find(attr => attr.key?.name === 'class')
  
  if (!classAttr) return
  
  const classValue = getClassValue(classAttr)
  if (!classValue) return
  
  const classes = classValue.split(/\s+/).filter(Boolean)
  const elementType = detectElementType(tag, classes, node)
  
  // Анализ на основе типа элемента
  switch (elementType) {
    case 'card':
      analyzeCard(context, classAttr, classes)
      break
    case 'button':
      analyzeButton(context, classAttr, classes)
      break
    case 'input':
      analyzeInput(context, classAttr, classes)
      break
    case 'container':
      analyzeContainer(context, classAttr, classes, node)
      break
    case 'heading':
      analyzeHeading(context, classAttr, classes)
      break
    case 'link':
      analyzeLink(context, classAttr, classes)
      break
  }
  
  // Общие проверки
  analyzeInteractivity(context, classAttr, classes, tag)
  analyzeColorContrast(context, classAttr, classes)
}

function detectElementType(tag, classes, node) {
  if (tag === 'button' || classes.some(c => c.includes('btn'))) return 'button'
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input'
  if (tag === 'a') return 'link'
  if (/^h[1-6]$/.test(tag)) return 'heading'
  
  const hasCard = classes.some(c => /card|panel|box/.test(c))
  const hasBackground = classes.some(c => /^bg-/.test(c))
  const hasBorder = classes.some(c => /^border/.test(c))
  
  if (hasCard || (hasBackground && hasBorder)) return 'card'
  
  const isFlex = classes.some(c => c === 'flex')
  const isGrid = classes.some(c => c === 'grid')
  
  if (isFlex || isGrid) return 'container'
  
  return 'unknown'
}

function analyzeCard(context, node, classes) {
  const hasBackground = classes.some(c => /^bg-/.test(c) && !c.includes('transparent'))
  const hasBorder = classes.some(c => /^border/.test(c))
  const hasShadow = classes.some(c => /^shadow/.test(c))
  const hasPadding = classes.some(c => /^p[xytblr]?-/.test(c))
  const hasRounded = classes.some(c => /^rounded/.test(c))
  
  let issueCount = 0
  
  if (!hasBackground) {
    context.report({ node, messageId: 'suggestBackground', data: { tag: 'card' } })
    issueCount++
  }
  
  if (!hasBorder && !hasShadow) {
    context.report({ node, messageId: 'suggestShadow' })
    issueCount++
  }
  
  if (!hasPadding) {
    context.report({ node, messageId: 'suggestPadding' })
    issueCount++
  }
  
  // Только если есть несколько проблем
  if (!hasRounded && issueCount < 2) {
    context.report({ node, messageId: 'suggestBorder', data: { tag: 'card', type: 'контейнер' } })
  }
}

function analyzeButton(context, node, classes) {
  const hasBackground = classes.some(c => /^bg-/.test(c) && !c.includes('transparent'))
  const hasHover = classes.some(c => c.includes('hover:'))
  const hasFocus = classes.some(c => c.includes('focus:'))
  const hasTransition = classes.some(c => /^transition/.test(c))
  const hasPadding = classes.some(c => /^p[xy]?-/.test(c))
  const hasRounded = classes.some(c => /^rounded/.test(c))
  
  let issueCount = 0
  
  if (!hasHover) {
    context.report({ node, messageId: 'suggestHoverState' })
    issueCount++
  }
  
  if (!hasFocus) {
    context.report({ node, messageId: 'suggestFocusState' })
    issueCount++
  }
  
  // Ограничиваем количество предупреждений
  if ((hasHover || hasFocus) && !hasTransition && issueCount < 2) {
    context.report({ node, messageId: 'suggestTransition' })
  }
}

function analyzeInput(context, node, classes) {
  const hasBorder = classes.some(c => /^border/.test(c))
  const hasFocus = classes.some(c => c.includes('focus:'))
  const hasPadding = classes.some(c => /^p[xy]?-/.test(c))
  const hasRounded = classes.some(c => /^rounded/.test(c))
  
  if (!hasBorder) {
    context.report({ node, messageId: 'suggestBorder', data: { tag: 'input', type: 'поле ввода' } })
  }
  
  if (!hasFocus) {
    context.report({ node, messageId: 'suggestFocusState' })
  }
  
  if (!hasPadding) {
    context.report({ node, messageId: 'suggestPadding' })
  }
  
  if (!hasRounded) {
    context.report({ node, messageId: 'suggestBorder', data: { tag: 'input', type: 'поле ввода' } })
  }
}

function analyzeContainer(context, node, classes, element) {
  const hasGap = classes.some(c => /^gap-/.test(c))
  const hasSpace = classes.some(c => /^space-/.test(c))
  const hasJustify = classes.some(c => /^justify-/.test(c))
  const hasItems = classes.some(c => /^items-/.test(c))
  
  // Проверяем количество дочерних элементов
  const childrenCount = element.children?.filter(c => c.type === 'VElement').length || 0
  
  if (childrenCount > 2 && !hasGap && !hasSpace) {
    context.report({ node, messageId: 'suggestSpacing' })
  }
  
  // Ограничиваем предупреждения
  if ((!hasJustify || !hasItems) && childrenCount > 1) {
    context.report({ node, messageId: 'suggestAlignment' })
  }
}

function analyzeHeading(context, node, classes) {
  const hasResponsiveText = classes.some(c => /^(sm|md|lg|xl|2xl):text-/.test(c))
  
  if (!hasResponsiveText) {
    context.report({ node, messageId: 'suggestResponsiveText' })
  }
}

function analyzeLink(context, node, classes) {
  const hasHover = classes.some(c => c.includes('hover:'))
  const hasTransition = classes.some(c => /^transition/.test(c))
  
  if (!hasHover) {
    context.report({ node, messageId: 'suggestHoverState' })
  }
  
  if (hasHover && !hasTransition) {
    context.report({ node, messageId: 'suggestTransition' })
  }
}

function analyzeInteractivity(context, node, classes, tag) {
  const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tag) ||
                       classes.some(c => /^cursor-pointer/.test(c))
  
  const hasCursor = classes.some(c => /^cursor-/.test(c))
  
  if (isInteractive && !hasCursor && tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
    context.report({ node, messageId: 'suggestAccessibility' })
  }
}

function analyzeColorContrast(context, node, classes) {
  const bgClass = classes.find(c => /^bg-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-(\d+)$/.test(c))
  const textClass = classes.find(c => /^text-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-(\d+)$/.test(c))
  
  if (bgClass && textClass) {
    const bgShade = parseInt(bgClass.match(/-(\d+)$/)?.[1] || '500')
    const textShade = parseInt(textClass.match(/-(\d+)$/)?.[1] || '500')
    
    // Простая эвристика: если оттенки близки, может быть низкий контраст
    if (Math.abs(bgShade - textShade) < 300) {
      context.report({
        node,
        messageId: 'suggestContrast',
        data: { bg: bgClass, text: textClass }
      })
    }
  }
}

function getClassValue(node) {
  if (node.value?.value) return node.value.value
  if (node.value?.expression?.value) return node.value.expression.value
  return null
}
