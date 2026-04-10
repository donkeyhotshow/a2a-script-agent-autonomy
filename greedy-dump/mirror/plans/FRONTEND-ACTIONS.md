# Frontend Actions Table

| actionId | categoryId | executorSystemId | title | framework | canMigrateToScript |
|----------|-----------|------------------|-------|-----------|-------------------|
| detect-state-management | state | script | Детекция state management | all | ✅ |
| suggest-pinia | state | compat_llm | Предложение Pinia | vue | ✅ |
| suggest-redux | state | compat_llm | Предложение Redux | react | ✅ |
| suggest-ngrx | state | compat_llm | Предложение NgRx | angular | ✅ |
| migrate-to-pinia | state | agent | Миграция на Pinia | vue | ⏳ |
| migrate-to-redux-toolkit | state | agent | Миграция на Redux Toolkit | react | ⏳ |
| detect-prop-drilling | component | script | Детекция prop drilling | all | ✅ |
| suggest-context | component | compat_llm | Предложение Context API | react | ✅ |
| suggest-provide-inject | component | compat_llm | Предложение provide/inject | vue | ✅ |
| detect-memo-opportunities | performance | script | Детекция мемоизации | react | ✅ |
| suggest-usememo | performance | compat_llm | Предложение useMemo | react | ✅ |
| suggest-computed | performance | compat_llm | Предложение computed | vue | ✅ |
| detect-unnecessary-rerenders | performance | script | Детекция лишних рендеров | react | ✅ |
| optimize-rerenders | performance | agent | Оптимизация рендеров | react | ⏳ |
| detect-large-bundles | performance | script | Детекция больших бандлов | all | ✅ |
| suggest-code-splitting | performance | compat_llm | Предложение code splitting | all | ✅ |
| apply-lazy-loading | performance | agent | Применение lazy loading | all | ⏳ |
| detect-accessibility-issues | a11y | script | Детекция A11y проблем | all | ✅ |
| suggest-aria-labels | a11y | compat_llm | Предложение ARIA labels | all | ✅ |
| add-keyboard-navigation | a11y | agent | Добавление keyboard navigation | all | ⏳ |
| detect-responsive-issues | responsive | script | Детекция responsive проблем | all | ✅ |
| suggest-breakpoints | responsive | compat_llm | Предложение breakpoints | all | ✅ |
| detect-hooks-rules | hooks | script | Детекция нарушений правил hooks | react | ✅ |
| suggest-custom-hooks | hooks | compat_llm | Предложение custom hooks | react | ✅ |
| extract-custom-hooks | hooks | agent | Извлечение custom hooks | react | ⏳ |
| detect-composables | composables | script | Детекция composables | vue | ✅ |
| suggest-composables | composables | compat_llm | Предложение composables | vue | ✅ |
| extract-composables | composables | agent | Извлечение composables | vue | ⏳ |
| detect-services | services | script | Детекция services | angular | ✅ |
| suggest-dependency-injection | services | compat_llm | Предложение DI | angular | ✅ |
| detect-virtual-scroll | performance | script | Детекция виртуализации | all | ✅ |
| suggest-virtual-scroll | performance | compat_llm | Предложение виртуализации | all | ✅ |
| implement-virtual-scroll | performance | agent | Реализация виртуализации | all | ⏳ |
| detect-form-validation | forms | script | Детекция валидации форм | all | ✅ |
| suggest-form-library | forms | compat_llm | Предложение библиотеки форм | all | ✅ |
| migrate-to-react-hook-form | forms | agent | Миграция на React Hook Form | react | ⏳ |
| detect-routing-issues | routing | script | Детекция проблем роутинга | all | ✅ |
| suggest-route-guards | routing | compat_llm | Предложение route guards | all | ✅ |
| detect-css-in-js | styling | script | Детекция CSS-in-JS | all | ✅ |
| suggest-styled-components | styling | compat_llm | Предложение styled-components | react | ✅ |
| detect-animation-performance | animation | script | Детекция производительности анимаций | all | ✅ |
| suggest-animation-library | animation | compat_llm | Предложение библиотеки анимаций | all | ✅ |

## Активация по контексту

```json
{
  "react": {
    "detectors": ["package.json:react", "*.jsx", "*.tsx"],
    "actions": ["suggest-redux", "suggest-usememo", "detect-hooks-rules"]
  },
  "vue": {
    "detectors": ["package.json:vue", "*.vue"],
    "actions": ["suggest-pinia", "suggest-computed", "detect-composables"]
  },
  "angular": {
    "detectors": ["package.json:@angular/core", "*.component.ts"],
    "actions": ["suggest-ngrx", "detect-services"]
  },
  "pinia": {
    "detectors": ["package.json:pinia", "stores/*.ts"],
    "actions": ["migrate-to-pinia", "suggest-composables"]
  }
}
```

## Статистика
- Всего: 40 действий
- script: 20 (50%)
- compat_llm: 13 (32.5%)
- agent: 7 (17.5%)
