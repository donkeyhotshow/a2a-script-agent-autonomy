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

- **Neurons** в `a2a-server/src/neurons/`: 60+ нейронов
- **Типы**: detect-*, suggest-*, generate-*, apply-*
- **Структура**: id, name, category, triggers, knowledge, actions

## План реализации

### 1. Новая категория нейронов: `custom_lint`

- [x] [Создать категорию `custom_lint` для всех lint-нейронов](#создать-категорию-custom_lint-для-всех-lint-нейронов) ✅
- [x] [Определить структуру нейрона для lint правил](#определить-структуру-нейрона-для-lint-правил) ✅
- [x] [Добавить в систему активации нейронов](#добавить-в-систему-активации-нейронов) ✅
- [x] [Приоритет: высокий](#приоритет-высокий) ✅

### 2. Конвертация ESLint правил в нейроны

- [x] [**Inertia.js нейроны**](#inertiajs-нейроны) ✅:
    - detect-inertia-anchor-navigation
    - detect-inertia-window-location
    - detect-inertia-missing-localization
    - detect-inertia-no-meta-tags
    - detect-inertia-fetch-usage
    - detect-inertia-router-options
    - detect-inertia-useform-required

- [x] [**Accessibility нейроны**](#accessibility-нейроны) ✅:
    - detect-a11y-missing-alt
    - detect-a11y-missing-aria
    - detect-a11y-keyboard-issues
    - detect-a11y-color-contrast

- [x] [**PHP нейроны**](#php-нейроны) ✅:
    - detect-php-code-standards
    - detect-php-security-issues
    - detect-php-invalid-use
    - detect-database-layer-issues

- [x] [**PowerShell нейроны**](#powershell-нейроны) ✅:
    - detect-powershell-syntax-errors
    - detect-powershell-error-handling
    - detect-powershell-security-issues
    - detect-powershell-naming-conventions

- [x] [**Testing нейроны**](#testing-нейроны) ✅:
    - detect-missing-tests
    - detect-missing-feature-tests
    - detect-testing-best-practices

### 3. Улучшенная структура lint нейрона

```
typescript
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

### 5. Улучшенные действия (actions)

- [ ] [`lint` - запустить линтер на коде](#lint---запустить-линтер-на-коде)
  (#fix---автоматически-исправить-проблему)
- [ ] [`explain` - объяснить проблему подробнее](#explain---объяснить-проблему-подробнее)
- [ ] [`suggest_fix` - предложить исправление](#suggest_fix---предложить-исправление)
- [ ] [Приоритет: высокий](#приоритет-высокий-1)

## Реализованные файлы

### Новые файлы

- `a2a-server/src/neurons/lint-inertia.neuron.ts` - 7 Inertia.js lint нейронов
- `a2a-server/src/neurons/lint-accessibility.neuron.ts` - 4 Accessibility lint нейрона
- `a2a-server/src/neurons/lint-php.neuron.ts` - 4 PHP lint нейрона
- `a2a-server/src/neurons/lint-powershell.neuron.ts` - 4 PowerShell lint нейрона
- `a2a-server/src/neurons/lint-testing.neuron.ts` - 3 Testing lint нейрона

### Обновлённые файлы

- `a2a-server/src/types/knowledge.types.ts` - добавлена категория `custom_lint`
- `a2a-server/src/neurons/index.ts` - зарегистрированы все lint нейроны

## Критерии приёмки

1. [x] Категория `custom_lint` работает в системе активации
2. [x] 22 lint нейрона созданы (7 + 4 + 4 + 4 + 3 = 22)
5. [x] Обратная совместимость с существующими нейронами

---

## Реализация

### Создать категорию `custom_lint` для всех lint-нейронов ✅

Добавлено в NeuronCategory: `'custom_lint'`

### Определить структуру нейрона для lint правил ✅

Структура определена в knowledge нейрона с полями:

- rule.name - имя правила
- rule.severity - уровень серьёзности
- rule.patterns - массив регулярных выражений
- rule.message - сообщение об ошибке

### Добавить в систему активации нейронов ✅

Нейроны добавлены в neurons/index.ts

### Inertia.js нейроны ✅

7 нейронов созданы с приоритетами 5-8

### Accessibility нейроны ✅

4 нейрона созданы с приоритетами 6-8

### PHP нейроны ✅

4 нейрона созданы с приоритетами 5-9

### PowerShell нейроны ✅

4 нейрона созданы с приоритетами 5-9

### Testing нейроны ✅

3 нейрона созданы с приоритетами 5-6
