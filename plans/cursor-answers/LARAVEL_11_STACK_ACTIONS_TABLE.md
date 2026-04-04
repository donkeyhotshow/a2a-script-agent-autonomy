# Laravel 11 Stack Actions Table

## Main Table

| actionId | categoryId | executorSystemId | title | stack | canMigrateToScript |
|----------|-----------|------------------|-------|-------|-------------------|
| detect-inertia-useform-issues | inertia | script | Детекция проблем useForm | laravel-vue | ✅ |
| suggest-inertia-useform-fix | inertia | ollama | Предложение исправления useForm | laravel-vue | ✅ |
| detect-inertia-router-visit | inertia | script | Детекция проблем router.visit/get/post | laravel-vue | ✅ |
| suggest-inertia-router-fix | inertia | ollama | Предложение исправления router | laravel-vue | ✅ |
| detect-inertia-usepage-issues | inertia | script | Детекция неправильного usePage | laravel-vue | ✅ |
| suggest-inertia-usepage-fix | inertia | ollama | Предложение исправления usePage | laravel-vue | ✅ |
| detect-inertia-preservestate | inertia | script | Детекция preserveState/preserveScroll | laravel-vue | ✅ |
| suggest-inertia-preservestate-fix | inertia | ollama | Предложение preserveState/preserveScroll | laravel-vue | ✅ |
| detect-inertia-props-validation | inertia | script | Валидация props в Inertia компонентах | laravel-vue | ✅ |
| suggest-inertia-props-types | inertia | ollama | Предложение типизации Inertia props | laravel-vue | ✅ |
| detect-vue-ref-reactive-issues | vue | script | Детекция проблем ref/reactive/computed | vue | ✅ |
| suggest-vue-composition-fix | vue | ollama | Предложение Composition API | vue | ✅ |
| detect-vue-defineprops-emits | vue | script | Детекция defineProps/defineEmits | vue | ✅ |
| suggest-vue-props-emits-fix | vue | ollama | Предложение исправления props/emits | vue | ✅ |
| detect-vue-lifecycle-issues | vue | script | Детекция нарушений lifecycle hooks | vue | ✅ |
| suggest-vue-lifecycle-fix | vue | ollama | Предложение lifecycle hooks | vue | ✅ |
| detect-vue-watch-issues | vue | script | Детекция проблем watch/watchEffect | vue | ✅ |
| suggest-vue-watch-fix | vue | ollama | Предложение watch/watchEffect | vue | ✅ |
| detect-vue-provide-inject | vue | script | Детекция неправильного provide/inject | vue | ✅ |
| suggest-vue-provide-inject-fix | vue | ollama | Предложение provide/inject | vue | ✅ |
| detect-typescript-props-missing | typescript | script | Детекция отсутствия типизации props | typescript | ✅ |
| detect-typescript-any | typescript | script | Детекция any типов | typescript | ✅ |
| detect-typescript-inertia-shared | typescript | script | Детекция типизации Inertia shared data | typescript | ✅ |
| detect-typescript-form-types | typescript | script | Детекция типизации форм | typescript | ✅ |
| suggest-typescript-types | typescript | ollama | Предложение типизации | typescript | ✅ |
| detect-tailwind-inline-styles | tailwind | script | Детекция inline styles | tailwind | ✅ |
| detect-tailwind-responsive-missing | tailwind | script | Детекция отсутствия responsive классов | tailwind | ✅ |
| detect-tailwind-invalid-classes | tailwind | script | Детекция несуществующих классов | tailwind | ✅ |
| suggest-tailwind-alternatives | tailwind | ollama | Предложение Tailwind альтернатив | tailwind | ✅ |
| detect-laravel-routes-js | laravel-backend | script | Детекция проблем routes в JS | laravel-vue | ✅ |
| detect-laravel-ziggy-issues | laravel-backend | script | Детекция неправильного Ziggy | laravel-vue | ✅ |
| detect-laravel-validation-errors | laravel-backend | script | Детекция validation errors | laravel-vue | ✅ |
| detect-laravel-csrf-issues | laravel-backend | script | Детекция CSRF проблем | laravel-vue | ✅ |
| suggest-laravel-backend-fix | laravel-backend | ollama | Предложение исправления backend | laravel-vue | ✅ |
| detect-a11y-missing-alt | a11y | script | Детекция отсутствия alt | all | ✅ |
| detect-a11y-aria-labels | a11y | script | Детекция отсутствия ARIA labels | all | ✅ |
| detect-a11y-keyboard-nav | a11y | script | Детекция keyboard navigation | all | ✅ |
| detect-a11y-nonsemantic-html | a11y | script | Детекция не-semantic HTML | all | ✅ |
| suggest-a11y-fix | a11y | ollama | Предложение ARIA/accessibility | all | ✅ |
| detect-security-v-html | security | script | Детекция небезопасного v-html | all | ✅ |
| detect-security-xss | security | script | Детекция XSS уязвимостей | all | ✅ |
| detect-security-csrf-missing | security | script | Детекция отсутствия CSRF токенов | all | ✅ |
| detect-security-input-validation | security | script | Детекция проблем валидации ввода | all | ✅ |
| suggest-security-fix | security | ollama | Предложение исправления безопасности | all | ✅ |
| detect-perf-lazy-loading | performance | script | Детекция отсутствия lazy loading | all | ✅ |
| detect-perf-vif-vshow | performance | script | Детекция v-if vs v-show | all | ✅ |
| detect-perf-watch-computed | performance | script | Детекция неоптимальных watch/computed | all | ✅ |
| detect-perf-memory-leaks | performance | script | Детекция memory leaks | all | ✅ |
| suggest-perf-optimization | performance | ollama | Предложение оптимизации | all | ✅ |
| apply-lazy-loading | performance | agent | Применение lazy loading | all | ⏳ |
| detect-blade-issues | blade | script | Детекция проблем Blade шаблонов | laravel | ✅ |
| detect-blade-xss | blade | script | Детекция XSS в Blade | laravel | ✅ |
| suggest-blade-components | blade | ollama | Предложение компонентов вместо includes | laravel | ✅ |
| detect-eloquent-n-plus-one | eloquent | script | Детекция N+1 queries | laravel | ✅ |
| detect-eloquent-missing-indexes | eloquent | script | Детекция missing indexes | laravel | ✅ |
| suggest-eloquent-eager-loading | eloquent | ollama | Предложение eager loading | laravel | ✅ |
| apply-eloquent-eager-loading | eloquent | agent | Применение eager loading | laravel | ⏳ |
| detect-validation-missing | validation | script | Детекция отсутствия валидации | laravel | ✅ |
| detect-validation-weak | validation | script | Детекция слабой валидации | laravel | ✅ |
| suggest-form-requests | validation | ollama | Предложение Form Requests | laravel | ✅ |
| apply-form-request | validation | agent | Применение Form Request | laravel | ⏳ |
| detect-testing-missing | testing | script | Детекция отсутствия тестов | laravel | ✅ |
| detect-testing-coverage | testing | script | Детекция неполного покрытия | laravel | ✅ |
| suggest-pest-phpunit-tests | testing | ollama | Предложение Pest/PHPUnit тестов | laravel | ✅ |
| apply-test-stub | testing | agent | Применение теста | laravel | ⏳ |
| detect-routes-unused | routes | script | Детекция неиспользуемых routes | laravel | ✅ |
| detect-routes-middleware-missing | routes | script | Детекция отсутствия middleware | laravel | ✅ |
| suggest-route-groups | routes | ollama | Предложение route groups | laravel | ✅ |
| detect-queues-sync-should-queue | queues | script | Детекция синхронных операций (должны в queue) | laravel | ✅ |
| detect-queues-serialization | queues | script | Детекция проблем job serialization | laravel | ✅ |
| suggest-queue-optimization | queues | ollama | Предложение queue optimization | laravel | ✅ |
| apply-queue-job | queues | agent | Применение queue job | laravel | ⏳ |

## Активация по контексту

```json
{
  "laravel-inertia-vue": {
    "detectors": ["composer.json:laravel/framework", "package.json:@inertiajs/vue3", "package.json:vue"],
    "actions": [
      "detect-inertia-useform-issues",
      "detect-inertia-router-visit",
      "detect-inertia-usepage-issues",
      "detect-inertia-preservestate",
      "detect-inertia-props-validation",
      "detect-vue-ref-reactive-issues",
      "detect-vue-defineprops-emits",
      "detect-vue-lifecycle-issues",
      "detect-vue-watch-issues",
      "detect-vue-provide-inject",
      "detect-laravel-routes-js",
      "detect-laravel-ziggy-issues",
      "detect-laravel-validation-errors",
      "detect-laravel-csrf-issues"
    ]
  },
  "tailwind": {
    "detectors": ["tailwind.config.js", "package.json:tailwindcss"],
    "actions": [
      "detect-tailwind-inline-styles",
      "detect-tailwind-responsive-missing",
      "detect-tailwind-invalid-classes",
      "suggest-tailwind-alternatives"
    ]
  },
  "typescript": {
    "detectors": ["tsconfig.json", "package.json:typescript"],
    "actions": [
      "detect-typescript-props-missing",
      "detect-typescript-any",
      "detect-typescript-inertia-shared",
      "detect-typescript-form-types",
      "suggest-typescript-types"
    ]
  },
  "a11y": {
    "detectors": [],
    "actions": [
      "detect-a11y-missing-alt",
      "detect-a11y-aria-labels",
      "detect-a11y-keyboard-nav",
      "detect-a11y-nonsemantic-html",
      "suggest-a11y-fix"
    ]
  },
  "security": {
    "detectors": [],
    "actions": [
      "detect-security-v-html",
      "detect-security-xss",
      "detect-security-csrf-missing",
      "detect-security-input-validation",
      "suggest-security-fix"
    ]
  },
  "performance": {
    "detectors": ["package.json:vue"],
    "actions": [
      "detect-perf-lazy-loading",
      "detect-perf-vif-vshow",
      "detect-perf-watch-computed",
      "detect-perf-memory-leaks",
      "suggest-perf-optimization",
      "apply-lazy-loading"
    ]
  },
  "laravel-blade": {
    "detectors": ["composer.json:laravel/framework", "resources/views/**/*.blade.php"],
    "actions": ["detect-blade-issues", "detect-blade-xss", "suggest-blade-components"]
  },
  "laravel-eloquent": {
    "detectors": ["composer.json:laravel/framework", "app/Models"],
    "actions": ["detect-eloquent-n-plus-one", "detect-eloquent-missing-indexes", "suggest-eloquent-eager-loading", "apply-eloquent-eager-loading"]
  },
  "laravel-validation": {
    "detectors": ["composer.json:laravel/framework", "app/Http/Controllers"],
    "actions": ["detect-validation-missing", "detect-validation-weak", "suggest-form-requests", "apply-form-request"]
  },
  "laravel-testing": {
    "detectors": ["composer.json:laravel/framework", "phpunit.xml", "tests"],
    "actions": ["detect-testing-missing", "detect-testing-coverage", "suggest-pest-phpunit-tests", "apply-test-stub"]
  },
  "laravel-routes": {
    "detectors": ["routes/*.php", "composer.json:laravel/framework"],
    "actions": ["detect-routes-unused", "detect-routes-middleware-missing", "suggest-route-groups"]
  },
  "laravel-queues": {
    "detectors": ["config/queue.php", "app/Jobs", "composer.json:laravel/framework"],
    "actions": ["detect-queues-sync-should-queue", "detect-queues-serialization", "suggest-queue-optimization", "apply-queue-job"]
  }
}
```

## Статистика

| Метрика | Значение |
|---------|----------|
| **Всего действий** | 76 |
| **script** | 52 (68%) |
| **ollama** | 21 (28%) |
| **agent** | 3 (4%) |
| **canMigrateToScript ✅** | 70 (92%) |
| **canMigrateToScript ⏳** | 6 (8%) |

### По категориям

| categoryId | detect (script) | suggest (ollama) | apply (agent) |
|------------|-----------------|------------------|---------------|
| inertia | 5 | 5 | 0 |
| vue | 5 | 5 | 0 |
| typescript | 4 | 1 | 0 |
| tailwind | 3 | 1 | 0 |
| laravel-backend | 4 | 1 | 0 |
| a11y | 4 | 1 | 0 |
| security | 4 | 1 | 0 |
| performance | 4 | 1 | 1 |
| blade | 2 | 1 | 0 |
| eloquent | 2 | 1 | 1 |
| validation | 2 | 1 | 1 |
| testing | 2 | 1 | 1 |
| routes | 2 | 1 | 0 |
| queues | 2 | 1 | 1 |
