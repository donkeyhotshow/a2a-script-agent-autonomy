# План: Custom Lint Neurons

> **Относится к:** a2a-server (neurons)

## Текущее состояние

### Существующая система
- **ESLint плагин**: `plans/eslint-rules/index.cjs` - содержит 40+ правил
- **Категории правил**:
  - Inertia.js правила (навигация, формы, компоненты)
  - Accessibility правила
  - PHP правила (code standards, security, testing)
  - PowerShell правила (syntax, error handling, security)
  - Testing правила (JS/TS/PHP)
  - Database правила
  - Configuration правила

### Существующие нейроны
- **Neurons** в `a2a-client/src/neurons/`: 60+ нейронов
- **Типы**: detect-*, suggest-*, generate-*, apply-*
- **Структура**: id, name, category, triggers, knowledge, actions

## План реализации

### 1. Новая категория нейронов: `custom_lint`
- [ ] [Создать категорию `custom_lint` для всех lint-нейронов](#создать-категорию-custom_lint-для-всех-lint-нейронов)
- [ ] [Определить структуру нейрона для lint правил](#определить-структуру-нейрона-для-lint-правил)
- [ ] [Добавить в систему активации нейронов](#добавить-в-систему-активации-нейронов)
- [ ] [Приоритет: высокий](#приоритет-высокий)

### 2. Конвертация ESLint правил в нейроны
- [ ] [**Inertia.js нейроны**](#inertiajs-нейроны):
  - detect-inertia-anchor-navigation
  - detect-inertia-window-location
  - detect-inertia-missing-localization
  - detect-inertia-no-meta-tags
  - detect-inertia-fetch-usage
  - detect-inertia-router-options
  - detect-inertia-useform-required
  - Приоритет: высокий

- [ ] [**Accessibility нейроны**](#accessibility-нейроны):
  - detect-a11y-missing-alt
  - detect-a11y-missing-aria
  - detect-a11y-keyboard-issues
  - detect-a11y-color-contrast
  - Приоритет: высокий

- [ ] [**PHP нейроны**](#php-нейроны):
  - detect-php-code-standards
  - detect-php-security-issues
  - detect-php-invalid-use
  - detect-database-layer-issues
  - Приоритет: средний

- [ ] [**PowerShell нейроны**](#powershell-нейроны):
  - detect-powershell-syntax-errors
  - detect-powershell-error-handling
  - detect-powershell-security-issues
  - detect-powershell-naming-conventions
  - Приоритет: средний

- [ ] [**Testing нейроны**](#testing-нейроны):
  - detect-missing-tests
  - detect-missing-feature-tests
  - detect-testing-best-practices
  - Приоритет: средний

### 3. Улучшенная структура lint нейрона
```typescript
interface LintNeuron extends Neuron {
  lintRule: {
    name: string;
    severity: 'error' | 'warning' | 'info';
    patterns: RegExp[];
    fix?: (match: RegExpMatchArray) => string;
    message: string;
  };
  category: 'custom_lint';
  language: 'javascript' | 'typescript' | 'php' | 'powershell' | 'vue';
}
```

### 4. Интеграция с ESLint
- [ ] [Экспорт нейронов обратно в ESLint формат](#экспорт-нейронов-обратно-в-eslint-формат)
- [ ] [Возможность генерации .eslintrc из нейронов](#возможность-генерации-eslintrc-из-нейронов)
- [ ] [CI/CD интеграция](#cicd-интеграция)
- [ ] [Приоритет: средний](#приоритет-средний)

### 5. Улучшенные действия (actions)
- [ ] [`lint` - запустить линтер на коде](#lint---запустить-линтер-на-коде)
- [ ] [`fix` - автоматически исправить проблему](#fix---автоматически-исправить-проблему)
- [ ] [`explain` - объяснить проблему подробнее](#explain---объяснить-проблему-подробнее)
- [ ] [`suggest_fix` - предложить исправление](#suggest_fix---предложить-исправление)
- [ ] [Приоритет: высокий](#приоритет-высокий-1)

## Критерии приёмки

1. Категория `custom_lint` работает в системе активации
2. Минимум 20 нейронов из ESLint правил созданы
3. Lint нейроны могут автоматически исправлять код
4. Интеграция с CI/CD работает
5. Обратная совместимость с существующими нейронами

---

### Создать категорию `custom_lint` для всех lint-нейронов


### Определить структуру нейрона для lint правил


### Добавить в систему активации нейронов


### Inertia.js нейроны


### Accessibility нейроны


### PHP нейроны


### PowerShell нейроны


### Testing нейроны


### Экспорт нейронов обратно в ESLint формат


### Возможность генерации .eslintrc из нейронов


### CI/CD интеграция


### lint - запустить линтер на коде


### fix - автоматически исправить проблему


### explain - объяснить проблему подробнее


### suggest_fix - предложить исправление
