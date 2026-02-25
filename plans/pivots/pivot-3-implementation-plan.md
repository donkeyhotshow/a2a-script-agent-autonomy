# Pivot 3: Детальный план реализации DSL

## Обзор

Цель: Ввести Domain-Specific Language с наследованием, миксинами и composition для action definitions.

## Этапы реализации

### Этап 1: Разработка DSL спецификации

| Задача | Описание | Статус |
|--------|----------|--------|
| 1.1 | [Определить YAML схему для actions](#определить-yaml-схему-для-actions) | [ ] |
| 1.2 | [Определить формат миксинов](#определить-формат-миксинов) | [ ] |
| 1.3 | [Определить систему наследования](#определить-систему-наследования) | [ ] |
| 1.4 | [Создать примеры .yaml файлов](#создать-примеры-yaml-файлов) | [ ] |

### Этап 2: Компоненты DSL

| Компонент | Путь | Описание |
|-----------|------|----------|
| Parser | `src/actions/dsl/parser.ts` | Парсит YAML в AST |
| Resolver | `src/actions/dsl/resolver.ts` | Разрешает $mixin ссылки |
| Validator | `src/actions/dsl/validator.ts` | Валидирует схему |
| Generator | `src/actions/dsl/generator.ts` | Генерирует TypeScript код |

### Этап 3: Миксины

На основе анализа существующих actions:

```yaml
# mixins/file-collector.yaml
mixin: file-collector
description: Сбор файлов по расширениям
input:
  rootDir: string
  extensions: string[]
output:
  files: string[]

# mixins/patch-applier.yaml
mixin: patch-applier
description: Применение патчей к файлам
input:
  patches: Patch[]
output:
  applied: number

# mixins/code-analyzer.yaml
mixin: code-analyzer
description: Анализ кода по регуляркам
input:
  pattern: string
  files: string[]
output:
  matches: Match[]
```

### Этап 4: Интеграция

| Задача | Описание | Статус |
|--------|----------|--------|
| 4.1 | [Обновить ActionRegistry для поддержки YAML](#обновить-actionregistry-для-поддержки-yaml) | [ ] |
| 4.2 | [Добавить fallback на .md формат](#добавить-fallback-на-md-формат) | [ ] |
| 4.3 | [Обновить ActionExecutor](#обновить-actionexecutor) | [ ] |
| 4.4 | [Написать тесты](#написать-тесты) | [ ] |

---

### Определить YAML схему для actions


### Определить формат миксинов


### Определить систему наследования


### Создать примеры .yaml файлов


### Обновить ActionRegistry для поддержки YAML


### Добавить fallback на .md формат


### Обновить ActionExecutor


### Написать тесты |

## Пример YAML action

```yaml
# actions/fix-vue-imports.yaml
id: fix-vue-imports
version: 1.0

extends: base-fix

mixins:
  - file-collector
  - patch-applier

context:
  framework: vue

steps:
  - id: detect
    $mixin: code-analyzer
    pattern: "(?:from\\s+|require\\s*\\()['\"]([^'\"]+)['\"]"
    extensions: ['.vue', '.ts', '.tsx']
    output: broken_imports
    
  - id: resolve
    script: resolve-imports
    input: broken_imports
    output: patches
    
  - id: apply
    $mixin: patch-applier
    input: patches
```

## Файловая структура

```
a2a-server/src/actions/
├── definitions/
│   ├── .yaml/           # Новые YAML definitions
│   │   ├── actions/
│   │   └── mixins/
│   └── .md/             # Старые MD definitions (fallback)
├── dsl/
│   ├── parser.ts
│   ├── resolver.ts
│   ├── validator.ts
│   ├── generator.ts
│   └── index.ts
└── registry.ts          # Обновить для YAML + MD
```

## Приоритеты реализации

| Приоритет | Задача |
|-----------|--------|
| 1 | Спецификация DSL |
| 2 | Базовый Parser + Validator |
| 3 | 3-5 ключевых миксинов |
| 4 | Resolver для $mixin |
| 5 | Generator TypeScript кода |
| 6 | Интеграция в ActionRegistry |
| 7 | Тесты |

## Миграция существующих actions

| Action | Миксины |
|--------|---------|
| fix-vue-imports | file-collector, code-analyzer, patch-applier |
| analyze-laravel | file-collector, code-analyzer |
| analyze-vue | file-collector, code-analyzer |

## Следующие шаги

1. Утвердить спецификацию DSL
2. Начать разработку Parser
3. Определить 5 базовых миксинов
4. Перевести 1 action в YAML как proof of concept
