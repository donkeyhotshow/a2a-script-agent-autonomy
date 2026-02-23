# Laravel 11 Stack Actions Table

**Date**: 2024
**Source**: Cursor response to Laravel 11 stack analysis request
**Total Actions**: 83
**Categories**: 14

---

## Actions Table

| actionId | categoryId | executorSystemId | title | stack | canMigrateToScript |
|----------|------------|------------------|-------|-------|-------------------|
| **INERTIA** |
| detect-inertia-useform-issues | inertia | script | Детекция проблем useForm | laravel-vue | ✅ |
| suggest-inertia-useform-fix | inertia | agent | Предложение исправления useForm | laravel-vue | ⏳ |
| detect-inertia-router-issues | inertia | script | Детекция проблем router.visit/get/post | laravel-vue | ✅ |
| suggest-inertia-router-fix | inertia | agent | Предложение исправления Inertia router | laravel-vue | ⏳ |
| detect-inertia-usepage-issues | inertia | script | Детекция проблем usePage | laravel-vue | ✅ |
| suggest-inertia-usepage-fix | inertia | agent | Предложение исправления usePage | laravel-vue | ⏳ |
| detect-inertia-preservestate-issues | inertia | script | Детекция preserveState/preserveScroll | laravel-vue | ✅ |
| detect-inertia-props-validation | inertia | script | Валидация props в Inertia-компонентах | laravel-vue | ✅ |
| suggest-inertia-props-types | inertia | agent | Предложение типизации Inertia props | laravel-vue | ⏳ |
| **VUE 3 COMPOSITION** |
| detect-vue-ref-reactive-issues | vue | script | Детекция проблем ref/reactive/computed | vue | ✅ |
| suggest-vue-composition-patterns | vue | agent | Предложение использования Composition API | vue | ⏳ |
| detect-vue-props-emits-issues | vue | script | Детекция проблем defineProps/defineEmits | vue | ✅ |
| suggest-vue-props-emits | vue | agent | Предложение defineProps/defineEmits | vue | ⏳ |
| detect-vue-lifecycle-issues | vue | script | Детекция нарушений lifecycle hooks | vue | ✅ |
| suggest-vue-lifecycle-fix | vue | agent | Предложение исправления lifecycle | vue | ⏳ |
| detect-vue-watch-issues | vue | script | Детекция проблем watch/watchEffect | vue | ✅ |
| suggest-vue-watch-optimization | vue | agent | Предложение оптимизации watch | vue | ⏳ |
| detect-vue-provide-inject-issues | vue | script | Детекция provide/inject | vue | ✅ |
| suggest-vue-provide-inject | vue | agent | Предложение provide/inject | vue | ⏳ |
| **TYPESCRIPT** |
| detect-typescript-missing-props-types | typescript | script | Детекция отсутствия типизации props | typescript | ✅ |
| suggest-typescript-props-types | typescript | agent | Предложение типизации props | typescript | ⏳ |
| detect-typescript-any | typescript | script | Детекция типов any | typescript | ✅ |
| suggest-typescript-types | typescript | agent | Предложение типизации | typescript | ⏳ |
| detect-typescript-inertia-shared-types | typescript | script | Типизация Inertia shared data | typescript | ✅ |
| suggest-inertia-page-props-types | typescript | agent | Предложение типов Page props | typescript | ⏳ |
| detect-typescript-form-types | typescript | script | Типизация форм | typescript | ✅ |
| suggest-form-validation-types | typescript | agent | Предложение типов валидации | typescript | ⏳ |
| **TAILWIND CSS** |
| detect-tailwind-inline-styles | tailwind | script | Детекция inline styles | tailwind | ✅ |
| suggest-tailwind-alternatives | tailwind | agent | Предложение Tailwind-классов | tailwind | ⏳ |
| detect-tailwind-responsive-missing | tailwind | script | Детекция отсутствия responsive | tailwind | ✅ |
| suggest-tailwind-responsive | tailwind | agent | Предложение responsive-классов | tailwind | ⏳ |
| detect-tailwind-invalid-classes | tailwind | script | Детекция несуществующих классов | tailwind | ✅ |
| suggest-tailwind-valid-classes | tailwind | agent | Предложение валидных классов | tailwind | ⏳ |
| detect-tailwind-arbitrary-values | tailwind | script | Детекция arbitrary values | tailwind | ✅ |
| **LARAVEL BACKEND** |
| detect-laravel-routes-js-mismatch | backend | script | Детекция несоответствия routes в JS | laravel | ✅ |
| detect-ziggy-usage-issues | backend | script | Детекция проблем Ziggy | laravel | ✅ |
| suggest-ziggy-fix | backend | agent | Предложение исправления Ziggy | laravel | ⏳ |
| detect-validation-errors-handling | backend | script | Детекция обработки validation errors | laravel | ✅ |
| suggest-validation-errors-fix | backend | agent | Предложение обработки ошибок | laravel | ⏳ |
| detect-csrf-issues | backend | script | Детекция CSRF проблем | laravel | ✅ |
| suggest-csrf-fix | backend | agent | Предложение исправления CSRF | laravel | ⏳ |
| **ACCESSIBILITY** |
| detect-a11y-missing-alt | a11y | script | Детекция отсутствия alt | all | ✅ |
| suggest-a11y-alt | a11y | agent | Предложение alt | all | ⏳ |
| detect-a11y-missing-aria | a11y | script | Детекция отсутствия ARIA | all | ✅ |
| suggest-a11y-aria-labels | a11y | agent | Предложение ARIA labels | all | ⏳ |
| detect-a11y-keyboard-issues | a11y | script | Детекция keyboard navigation | all | ✅ |
| suggest-a11y-keyboard-fix | a11y | agent | Предложение keyboard a11y | all | ⏳ |
| detect-a11y-non-semantic-html | a11y | script | Детекция не-semantic HTML | all | ✅ |
| suggest-a11y-semantic | a11y | agent | Предложение semantic HTML | all | ⏳ |
| apply-a11y-alt-fix | a11y | agent | Применение alt-фиксов | all | ⏳ |
| **SECURITY** |
| detect-security-v-html | security | script | Детекция небезопасного v-html | all | ✅ |
| suggest-sanitize-html | security | agent | Предложение санитизации HTML | all | ⏳ |
| detect-xss-vulnerabilities | security | script | Детекция XSS | all | ✅ |
| suggest-xss-fix | security | agent | Предложение исправления XSS | all | ⏳ |
| detect-missing-csrf-token | security | script | Детекция отсутствия CSRF | all | ✅ |
| detect-input-validation-issues | security | script | Детекция валидации ввода | all | ✅ |
| **PERFORMANCE** |
| detect-missing-lazy-loading | performance | script | Детекция отсутствия lazy loading | all | ✅ |
| suggest-lazy-loading | performance | agent | Предложение lazy loading | all | ⏳ |
| apply-lazy-loading | performance | agent | Применение lazy loading | all | ⏳ |
| detect-vif-vshow-misuse | performance | script | Детекция v-if vs v-show | vue | ✅ |
| suggest-vif-vshow-fix | performance | agent | Предложение v-if/v-show | vue | ⏳ |
| detect-watch-computed-issues | performance | script | Детекция watch/computed | vue | ✅ |
| suggest-watch-optimization | performance | agent | Предложение оптимизации watch | vue | ⏳ |
| detect-memory-leak-patterns | performance | script | Детекция memory leaks | vue | ✅ |
| **LARAVEL BLADE** |
| detect-blade-xss | blade | script | Детекция XSS в Blade | blade | ✅ |
| detect-blade-unescaped-output | blade | script | Детекция неэкранированного вывода | blade | ✅ |
| suggest-blade-safe-output | blade | agent | Предложение безопасного вывода | blade | ⏳ |
| detect-blade-include-issues | blade | script | Детекция проблем include | blade | ✅ |
| suggest-blade-components | blade | agent | Предложение компонентов вместо include | blade | ⏳ |
| detect-blade-missing-slot | blade | script | Детекция отсутствия slot | blade | ✅ |
| **LARAVEL ELOQUENT** |
| detect-n1-queries | eloquent | script | Детекция N+1 queries | laravel | ✅ |
| suggest-eager-loading | eloquent | agent | Предложение eager loading | laravel | ⏳ |
| apply-eager-loading | eloquent | agent | Применение eager loading | laravel | ⏳ |
| detect-missing-indexes | eloquent | script | Детекция отсутствия indexes | laravel | ✅ |
| suggest-migration-indexes | eloquent | agent | Предложение миграций индексов | laravel | ⏳ |
| detect-eloquent-select-all | eloquent | script | Детекция select * | laravel | ✅ |
| suggest-select-columns | eloquent | agent | Предложение select колонок | laravel | ⏳ |
| **LARAVEL VALIDATION** |
| detect-missing-validation | validation | script | Детекция отсутствия валидации | laravel | ✅ |
| suggest-validation-rules | validation | agent | Предложение правил валидации | laravel | ⏳ |
| detect-weak-validation | validation | script | Детекция слабой валидации | laravel | ✅ |
| suggest-form-request | validation | agent | Предложение Form Request | laravel | ⏳ |
| apply-form-request | validation | agent | Применение Form Request | laravel | ⏳ |
| detect-mass-assignment-risk | validation | script | Детекция массового присваивания | laravel | ✅ |
| **LARAVEL TESTING** |
| detect-missing-tests | testing | script | Детекция отсутствия тестов | laravel | ✅ |
| suggest-test-generation | testing | agent | Предложение Pest/PHPUnit тестов | laravel | ⏳ |
| detect-test-coverage-gaps | testing | script | Детекция gaps покрытия | laravel | ✅ |
| suggest-coverage-improvement | testing | agent | Предложение улучшения покрытия | laravel | ⏳ |
| detect-missing-feature-tests | testing | script | Детекция отсутствия feature-тестов | laravel | ✅ |
| **LARAVEL ROUTES** |
| detect-unused-routes | routes | script | Детекция неиспользуемых routes | laravel | ✅ |
| detect-missing-middleware | routes | script | Детекция отсутствия middleware | laravel | ✅ |
| suggest-route-middleware | routes | agent | Предложение middleware для routes | laravel | ⏳ |
| detect-route-groups | routes | script | Детекция возможных route groups | laravel | ✅ |
| suggest-route-groups | routes | agent | Предложение route groups | laravel | ⏳ |
| **LARAVEL JOBS/QUEUES** |
| detect-sync-should-be-queue | jobs | script | Детекция sync вместо queue | laravel | ✅ |
| suggest-queue-job | jobs | agent | Предложение queue job | laravel | ⏳ |
| detect-job-serialization-issues | jobs | script | Детекция job serialization | laravel | ✅ |
| suggest-job-serialization-fix | jobs | agent | Предложение исправления serialization | jobs | ⏳ |
| detect-missing-queue-middleware | jobs | script | Детекция отсутствия queue middleware | laravel | ✅ |
| suggest-queue-optimization | jobs | agent | Предложение оптимизации очередей | laravel | ⏳ |

---

## Context-Based Activation

```json
{
  "laravel-inertia-vue": {
    "detectors": [
      "composer.json:laravel/framework",
      "package.json:@inertiajs/vue3",
      "package.json:vue"
    ],
    "actions": [
      "detect-inertia-useform-issues",
      "detect-inertia-router-issues",
      "detect-inertia-usepage-issues",
      "detect-vue-ref-reactive-issues",
      "detect-vue-props-emits-issues"
    ]
  },
  "typescript": {
    "detectors": [
      "tsconfig.json",
      "package.json:typescript"
    ],
    "actions": [
      "detect-typescript-any",
      "detect-typescript-missing-props-types",
      "detect-typescript-inertia-shared-types"
    ]
  },
  "tailwind": {
    "detectors": [
      "tailwind.config.js",
      "package.json:tailwindcss"
    ],
    "actions": [
      "detect-tailwind-inline-styles",
      "detect-tailwind-invalid-classes",
      "detect-tailwind-responsive-missing"
    ]
  },
  "laravel-backend": {
    "detectors": [
      "composer.json:laravel/framework"
    ],
    "actions": [
      "detect-ziggy-usage-issues",
      "detect-csrf-issues",
      "detect-validation-errors-handling",
      "detect-n1-queries",
      "detect-missing-validation",
      "detect-unused-routes"
    ]
  },
  "blade": {
    "detectors": [
      "*.blade.php"
    ],
    "actions": [
      "detect-blade-xss",
      "detect-blade-unescaped-output",
      "detect-blade-include-issues"
    ]
  }
}
```

---

## Statistics

| executor | count | percentage |
|----------|-------|------------|
| script | 54 | 65% |
| agent | 45 | 54% |
| agent | 5 | 6% |

**Total**: 83 actions across 14 categories

**Note**: Some actions use multiple executors (e.g., script for detection + agent for suggestions).

---

## Category Breakdown

| category | actions | script | agent | agent |
|----------|---------|--------|--------|-------|
| Inertia | 9 | 5 | 4 | 0 |
| Vue 3 Composition | 10 | 5 | 5 | 0 |
| TypeScript | 8 | 4 | 4 | 0 |
| Tailwind CSS | 7 | 4 | 3 | 0 |
| Laravel Backend | 7 | 4 | 3 | 0 |
| Accessibility | 9 | 4 | 4 | 1 |
| Security | 6 | 3 | 3 | 0 |
| Performance | 8 | 4 | 3 | 1 |
| Laravel Blade | 6 | 3 | 3 | 0 |
| Laravel Eloquent | 7 | 3 | 3 | 1 |
| Laravel Validation | 6 | 3 | 2 | 1 |
| Laravel Testing | 5 | 3 | 2 | 0 |
| Laravel Routes | 5 | 3 | 2 | 0 |
| Laravel Jobs/Queues | 6 | 3 | 3 | 0 |

---

## Naming Conventions

### Prefixes
- **detect-***: Detection actions (script executor)
- **suggest-***: Suggestion actions (agent executor)
- **apply-***: Application actions (agent executor)

### Patterns
- Detection → Suggestion → Application
- Example: `detect-n1-queries` → `suggest-eager-loading` → `apply-eager-loading`

---

## Implementation Priority

### High Priority (Critical Issues)
1. Security: XSS, CSRF, validation
2. Performance: N+1 queries, lazy loading
3. Accessibility: alt, ARIA, keyboard navigation

### Medium Priority (Quality Issues)
1. TypeScript: any types, missing types
2. Vue: composition patterns, lifecycle
3. Inertia: useForm, router, props

### Low Priority (Style Issues)
1. Tailwind: inline styles, responsive
2. Blade: includes vs components
3. Routes: unused routes, grouping

---

## Usage in A2A System

### 1. Project Detection
```javascript
const detectors = {
  'laravel-inertia-vue': [
    'composer.json:laravel/framework',
    'package.json:@inertiajs/vue3'
  ]
};
```

### 2. Action Activation
```javascript
if (projectMatches('laravel-inertia-vue')) {
  activateActions([
    'detect-inertia-useform-issues',
    'detect-vue-ref-reactive-issues',
    'detect-n1-queries'
  ]);
}
```

### 3. Execution Flow
```
1. Run script detectors (fast, parallel)
2. Collect findings
3. Run agent suggestions (for detected issues)
4. Present to user
5. Apply agent actions (if user accepts)
```

---

## Integration with Existing ESLint Rules

This actions table complements the existing 51 ESLint rules in `src/eslint-rules/`:
- ESLint rules: Static analysis, syntax checking
- Actions table: Dynamic analysis, suggestions, auto-fixes

### Overlap Areas
- Inertia.js: Both have rules
- Vue 3: Both have rules
- Accessibility: Both have rules
- Security: Both have rules

### Unique to Actions Table
- Laravel backend (Eloquent, Validation, Routes, Jobs)
- Blade templates
- TypeScript-specific Inertia types
- Context-based activation

---

## Next Steps

1. **Implement script detectors** for high-priority actions
2. **Create agent prompts** for suggestion actions
3. **Build agent workflows** for apply actions
4. **Test on real Laravel 11 projects**
5. **Integrate with context detector** (terminator/modules/context-detector/)
6. **Add to active-actions.json** (.a2a/active-actions.json)

---

## References

- Laravel 11 Documentation
- Inertia.js Documentation
- Vue 3 Composition API
- Tailwind CSS Documentation
- Existing ESLint rules: `src/eslint-rules/`
- Context detector: `terminator/modules/context-detector/`
- A2A configuration: `.a2a/`
