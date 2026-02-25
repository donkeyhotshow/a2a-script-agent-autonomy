/**
 * ESLint правило: Запрещает использование мета-тегов в шаблонах Vue компонентов
 *
 * Согласно ADR 1025: Архитектура использования Head компонента в Inertia.js
 * Все мета-теги должны устанавливаться через Head компонент из @inertiajs/vue3
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Запрещает использование <meta>, <title>, <link> тегов в шаблонах Vue компонентов. Используйте Head компонент из @inertiajs/vue3.',
      category: 'Best Practices',
      recommended: true,
      url: 'docs/architecture/adr/1025-inertia-js-head-component-architecture.md'
    },
    schema: [],
    messages: {
      noMetaTag: 'Использование <meta> тегов запрещено в шаблонах Vue компонентов. Перенесите мета-теги в Head компонент из @inertiajs/vue3.',
      noTitleTag: 'Использование <title> тегов запрещено в шаблонах Vue компонентов. Перенесите title в Head компонент из @inertiajs/vue3.',
      noLinkTag: 'Использование <link> тегов запрещено в шаблонах Vue компонентов. Перенесите link теги в Head компонент из @inertiajs/vue3.'
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      // Проверяем Program (весь файл) на наличие запрещенных тегов
      Program() {
        const text = sourceCode.getText();
        // Эти обертки считаем допустимыми контейнерами для спец-тегов.
        // Добавляйте новые теги сюда по мере необходимости.
        const allowedWrapperTags = ['Head'];

        const ignoreRanges = [];
        for (const tag of allowedWrapperTags) {
          const wrapperRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
          let wrapperMatch;
          while ((wrapperMatch = wrapperRegex.exec(text)) !== null) {
            const start = sourceCode.getIndexFromLoc({ line: 1, column: 0 }) + wrapperMatch.index;
            const end = start + wrapperMatch[0].length;
            ignoreRanges.push({ start, end });
          }
        }

        const isIgnored = (index) =>
          ignoreRanges.some((range) => index >= range.start && index < range.end);

        // Ищем <meta> теги
        const metaRegex = /<meta[^>]*>/gi;
        let match;
        while ((match = metaRegex.exec(text)) !== null) {
          if (isIgnored(match.index)) {
            continue;
          }
          const start = sourceCode.getIndexFromLoc({ line: 1, column: 0 }) + match.index;
          const end = start + match[0].length;
          const loc = sourceCode.getLocFromIndex(start);

          context.report({
            loc: {
              start: loc,
              end: sourceCode.getLocFromIndex(end)
            },
            messageId: 'noMetaTag'
          });
        }

        // Ищем <title> теги
        const titleRegex = /<title[^>]*>[\s\S]*?<\/title>/gi;
        while ((match = titleRegex.exec(text)) !== null) {
          if (isIgnored(match.index)) {
            continue;
          }
          const start = sourceCode.getIndexFromLoc({ line: 1, column: 0 }) + match.index;
          const end = start + match[0].length;
          const loc = sourceCode.getLocFromIndex(start);

          context.report({
            loc: {
              start: loc,
              end: sourceCode.getLocFromIndex(end)
            },
            messageId: 'noTitleTag'
          });
        }

        // Ищем <link> теги (HTML link, не Vue компоненты)
        const linkRegex = /<link\s+(?:rel|href|type|media|sizes|crossorigin)[^>]*>/gi;
        while ((match = linkRegex.exec(text)) !== null) {
          if (isIgnored(match.index)) {
            continue;
          }
          const start = sourceCode.getIndexFromLoc({ line: 1, column: 0 }) + match.index;
          const end = start + match[0].length;
          const loc = sourceCode.getLocFromIndex(start);

          context.report({
            loc: {
              start: loc,
              end: sourceCode.getLocFromIndex(end)
            },
            messageId: 'noLinkTag'
          });
        }
      }
    };
  }
};
