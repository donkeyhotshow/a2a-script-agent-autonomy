# Pivot 3: DSL с Composability

> **Сложность:** Высокая  
> **Статус:** Вариант для рассмотрения

## Концепция

Ввести Domain-Specific Language с наследованием, миксинами и composition.

## Формат YAML

```yaml
# fix-vue-imports.yaml
id: fix-vue-imports
version: 1.0

mixins:
  - file-scanner
  - patch-applier

context:
  framework: vue

steps:
  - $mixin: detect-broken-imports
    output: broken_imports
    
  - id: resolve
    input: broken_imports
    script: resolver
    
  - $mixin: apply-patches
    input: patches
```

## Миксины

```yaml
# mixins/detect-broken-imports.yaml
mixin: detect-broken-imports
script: vue-import-detector
input:
  rootDir: string
output:
  broken_imports: BrokenImport[]
```

## Преимущества

| Преимущество | Описание |
|--------------|----------|
| Устранение дублирования | Mixins вместо копипаста |
| Легче поддерживать | Изменение в одном месте |
| Версионирование | YAML версионируется |
| Composition | Наследование + миксины |

## Недостатки

| Недостаток | Описание |
|------------|----------|
| Новый формат | Нужно изучить DSL |
| Требует парсер | Писать YAML парсер |
| Сложная реализация | Миксины, наследование |

## Компоненты DSL

| Компонент | Описание |
|-----------|----------|
| Parser | Парсит YAML в AST |
| Resolver | Разрешает $mixin ссылки |
| Generator | Генерирует TypeScript код |
| Validator | Валидирует схему |

## Миграция

- [ ] [Разработать DSL спецификацию](#разработать-dsl-спецификацию)
- [ ] [Написать парсер + resolver](#написать-парсер--resolver)
- [ ] [Выделить 3-5 общих миксинов](#выделить-3-5-общих-миксинов)
- [ ] [Перевести 2-3 actions в YAML](#перевести-2-3-actions-в-yaml)
- [ ] [Постепенно мигрировать остальные](#постепенно-мигрировать-остальные)

## Когда выбрать

- Много дублирования в actions
- Нужен мощный composition
- Команда знакома с YAML

---

### Разработать DSL спецификацию


### Написать парсер + resolver


### Выделить 3-5 общих миксинов


### Перевести 2-3 actions в YAML


### Постепенно мигрировать остальные
