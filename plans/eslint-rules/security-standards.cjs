/**
 * ESLint правило: security-standards
 *
 * Проверяет соблюдение стандартов безопасности согласно ADR 403.
 * Предотвращает распространенные уязвимости и обеспечивает compliance.
 *
 * Согласно ADR 403: Security Architecture
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Проверяет соблюдение стандартов безопасности согласно ADR 403',
      category: 'Security',
      recommended: true,
      url: 'docs/architecture/adr/403-security-architecture.md'
    },
    schema: [],
    messages: {
      dangerousInnerHtml: 'Использование v-html создает XSS уязвимость. Используйте безопасную альтернативу.',
      unsafeEval: 'Использование eval() создает security уязвимость. Избегайте динамического выполнения кода.',
      insecureRandom: 'Использование Math.random() для security-sensitive операций небезопасно. Используйте crypto.getRandomValues().',
      hardcodedSecret: 'Обнаружен хардкоженный секрет или API ключ. Используйте переменные окружения.',
      unsafeDeserialization: 'Использование JSON.parse() без валидации может привести к prototype pollution.',
      missingInputValidation: 'Отсутствует валидация входных данных. Все пользовательские данные должны валидироваться.',
      insecureCookie: 'Cookie без secure флага может быть перехвачен. Добавьте secure: true для HTTPS.',
      missingCsrfProtection: 'Отсутствует CSRF защита для формы. Добавьте CSRF токен.',
      unsafeFileUpload: 'Загрузка файлов без проверки типа и размера создает уязвимость.',
      sqlInjectionRisk: 'Потенциальная SQL инъекция. Используйте prepared statements или ORM.'
    }
  },
  create(context) {
    const sourceCode = context.sourceCode
    const filename = context.getFilename()

    return {
      // Проверяем опасные директивы Vue
      'VAttribute[key.name="v-html"]'(node) {
        context.report({
          node,
          messageId: 'dangerousInnerHtml'
        })
      },

      // Проверяем опасные вызовы функций
      CallExpression(node) {
        // Проверяем использование eval
        if (node.callee.name === 'eval') {
          context.report({
            node,
            messageId: 'unsafeEval'
          })
          return
        }

        // Проверяем использование Math.random для чувствительных операций
        if (node.callee.object &&
            node.callee.object.name === 'Math' &&
            node.callee.property.name === 'random') {

          // Проверяем контекст использования
          const ancestors = context.sourceCode.getAncestors(node)
          const hasSecurityContext = ancestors.some(ancestor => {
            if (ancestor.type === 'VariableDeclarator' && ancestor.id) {
              const varName = ancestor.id.name.toLowerCase()
              return varName.includes('token') || varName.includes('key') ||
                     varName.includes('secret') || varName.includes('password')
            }
            return false
          })

          if (hasSecurityContext) {
            context.report({
              node,
              messageId: 'insecureRandom'
            })
          }
          return
        }

        // Проверяем небезопасное использование JSON.parse
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.name === 'JSON' &&
            node.callee.property.name === 'parse') {

          // Проверяем, есть ли дополнительная валидация
          const parentBlock = context.sourceCode.getAncestors(node).find(ancestor =>
            ancestor.type === 'BlockStatement'
          )

          if (parentBlock) {
            // Простая проверка - ищем валидацию после JSON.parse
            const hasValidation = parentBlock.body.some(stmt => {
              return stmt.type === 'VariableDeclaration' &&
                     stmt.declarations.some(decl =>
                       decl.init && decl.init.type === 'CallExpression' &&
                       decl.init.callee.property && decl.init.callee.property.name === 'validate'
                     )
            })

            if (!hasValidation) {
              context.report({
                node,
                messageId: 'unsafeDeserialization'
              })
            }
          }
        }
      },

      // Проверяем хардкоженные секреты (упрощенная версия)
      Literal(node) {
        if (typeof node.value === 'string') {
          const value = node.value.toLowerCase()

          // Простая проверка на ключевые слова
          const hasSecretKeywords = value.includes('secret') ||
                                   value.includes('password') ||
                                   value.includes('key') ||
                                   value.includes('token')

          if (hasSecretKeywords && value.length > 15) {
            // Проверяем, что это не в переменной окружения
            const ancestors = context.sourceCode.getAncestors(node)
            const isInEnv = ancestors.some(ancestor => {
              return ancestor.type === 'MemberExpression' &&
                     ancestor.object.name === 'process' &&
                     ancestor.property.name === 'env'
            })

            if (!isInEnv) {
              context.report({
                node,
                messageId: 'hardcodedSecret'
              })
            }
          }
        }
      },

      // Проверяем использование document.cookie
      MemberExpression(node) {
        if (node.object.name === 'document' && node.property.name === 'cookie') {
          context.report({
            node,
            messageId: 'insecureCookie'
          })
        }
      },

      // Проверяем формы без CSRF защиты
      'VElement[name="form"]'(node) {
        const hasCsrfToken = node.children.some(child =>
          child.type === 'VElement' &&
          child.name === 'input' &&
          child.startTag.attributes.some(attr =>
            attr.key.name === 'name' && attr.value.value === '_token'
          )
        )

        if (!hasCsrfToken) {
          context.report({
            node,
            messageId: 'missingCsrfProtection'
          })
        }
      },

      // Проверяем загрузку файлов
      'VElement[name="input"]'(node) {
        const hasTypeFile = node.startTag.attributes.some(attr =>
          attr.key.name === 'type' && attr.value.value === 'file'
        )

        if (hasTypeFile) {
          // Проверяем, есть ли обработчик файла в компоненте
          // Это упрощенная проверка - в реальности нужно проверять методы компонента
          context.report({
            node,
            messageId: 'unsafeFileUpload'
          })
        }
      }
    }
  }
}
